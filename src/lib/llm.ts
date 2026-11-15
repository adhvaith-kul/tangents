// One adapter, three interchangeable backends.
//   cli: the Claude Code command line (`claude -p`), billed to the subscription. Default.
//   api: the Anthropic API through the SDK, billed to ANTHROPIC_API_KEY.
//   gemini: the Google Gemini API, billed to GEMINI_API_KEY.
// Switch with LLM_BACKEND=cli|api|gemini. Server-only.
import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import os from "node:os";
import { z } from "zod";
import { db } from "./db";

/** desk is the news desk's classification pass; it runs on the crowd model. */
export type LlmRole = "director" | "crowd" | "desk";

export interface GenerateOptions<S extends z.ZodType> {
  role: LlmRole;
  system: string;
  user: string;
  schema: S;
}

type Effort = "low" | "medium" | "high";
const DIRECTOR_EFFORT = (process.env.DIRECTOR_EFFORT ?? "low") as Effort;

type Backend = "cli" | "api" | "gemini";
const isBackend = (v: string | undefined): v is Backend => v === "cli" || v === "api" || v === "gemini";

/** Development follows LLM_BACKEND; left unset, that is Gemini when only its
 *  key is present and otherwise the subscription through the CLI. A production
 *  build uses the Anthropic key whenever one is set, since that is what a demo
 *  or a deployment should run on; LLM_BACKEND_PRODUCTION overrides that. */
export function backend(): Backend {
  if (process.env.NODE_ENV === "production") {
    if (isBackend(process.env.LLM_BACKEND_PRODUCTION)) return process.env.LLM_BACKEND_PRODUCTION;
    if (process.env.ANTHROPIC_API_KEY) return "api";
  }
  if (isBackend(process.env.LLM_BACKEND)) return process.env.LLM_BACKEND;
  return process.env.GEMINI_API_KEY ? "gemini" : "cli";
}

/** The desk runs on the crowd model. */
export function modelFor(role: LlmRole, which: Backend = backend()): string {
  if (role === "director") {
    return process.env.DIRECTOR_MODEL ?? (which === "gemini" ? "gemini-3.5-flash" : "claude-opus-5-5");
  }
  return process.env.CROWD_MODEL ?? (which === "gemini" ? "gemini-3.5-flash" : "claude-haiku-5-5");
}

interface Result {
  value: unknown;
  inputTokens: number;
  outputTokens: number;
}

/** Ask a model for one schema-checked JSON object. Returns null if the model
 *  declined or the output did not match the schema; throws on transport errors. */
export async function generate<S extends z.ZodType>(
  opts: GenerateOptions<S>,
): Promise<z.infer<S> | null> {
  const started = Date.now();
  const which = backend();
  const model = modelFor(opts.role, which);
  let ok = false;
  let usage = { inputTokens: 0, outputTokens: 0 };
  try {
    const res =
      which === "gemini"
        ? await viaGemini(opts, model)
        : which === "api"
          ? await viaApiSafe(opts, model)
          : await viaCli(opts, model);
    usage = res;
    const parsed = opts.schema.safeParse(res.value);
    ok = parsed.success;
    if (!parsed.success) {
      console.error(`[llm] Schema validation failed (${opts.role}):`, JSON.stringify(parsed.error.issues, null, 2));
    }
    return parsed.success ? parsed.data : null;
  } finally {
    db()
      .prepare(
        `INSERT INTO llm_calls (role, backend, model, input_tokens, output_tokens, ms, ok, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        opts.role, which, model, usage.inputTokens, usage.outputTokens,
        Date.now() - started, ok ? 1 : 0, Date.now(),
      );
  }
}

// ------------------------------------------------------------------ gemini

function cleanSchemaForGemini(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(cleanSchemaForGemini);

  const copy = { ...(schema as Record<string, unknown>) };
  delete copy.$schema;
  delete copy.additionalProperties;

  if (Array.isArray(copy.type)) {
    const nonNull = copy.type.filter((t: unknown) => t !== "null");
    if (copy.type.includes("null")) {
      copy.nullable = true;
    }
    copy.type = nonNull.length === 1 ? nonNull[0] : nonNull[0] || "string";
  }

  if (Array.isArray(copy.anyOf)) {
    const anyOfList = copy.anyOf as Record<string, unknown>[];
    const nullIdx = anyOfList.findIndex((s) => s?.type === "null");
    if (nullIdx !== -1) {
      copy.nullable = true;
      const filtered = anyOfList.filter((_, i) => i !== nullIdx);
      if (filtered.length === 1) {
        Object.assign(copy, cleanSchemaForGemini(filtered[0]));
        delete copy.anyOf;
      } else {
        copy.anyOf = filtered.map(cleanSchemaForGemini);
      }
    } else {
      copy.anyOf = anyOfList.map(cleanSchemaForGemini);
    }
  }

  if (copy.properties && typeof copy.properties === "object") {
    const newProps: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(copy.properties)) {
      newProps[k] = cleanSchemaForGemini(v);
    }
    copy.properties = newProps;
  }

  if (copy.items && typeof copy.items === "object") {
    copy.items = cleanSchemaForGemini(copy.items);
  }

  return copy;
}

async function viaGemini<S extends z.ZodType>(opts: GenerateOptions<S>, model: string): Promise<Result> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const jsonSchema = cleanSchemaForGemini(z.toJSONSchema(opts.schema));
  // The key travels in a header, not in the address, so it cannot end up in a logged URL or an error message.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = {
    system_instruction: {
      parts: [{ text: opts.system }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: opts.user }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: jsonSchema,
    },
  };

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429 || res.status === 503) {
          lastError = new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
          continue;
        }
        throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };

      let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (text.startsWith("```json")) {
        text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (text.startsWith("```")) {
        text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch (e) {
        // The same slips the CLI's answers have are mended the same way before giving up.
        const mended = repairJson(text);
        if (mended !== undefined) parsed = mended;
        else console.error("[llm] Gemini JSON parse error:", e);
      }

      const usage = data.usageMetadata ?? {};
      return {
        value: parsed,
        inputTokens: usage.promptTokenCount ?? 0,
        outputTokens: usage.candidatesTokenCount ?? 0,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        continue;
      }
      if (attempt === 2) throw error;
    }
  }

  throw lastError ?? new Error("Gemini API call failed");
}

// ------------------------------------------------------------------ api

let client: Anthropic | null = null;

/** The SDK throws while parsing truncated or partial JSON (a refusal mid-output,
 *  or max_tokens). That is "nothing usable", not a transport failure. */
async function viaApiSafe<S extends z.ZodType>(opts: GenerateOptions<S>, model: string): Promise<Result> {
  try {
    return await viaApi(opts, model);
  } catch (err) {
    if (err instanceof Anthropic.AnthropicError && !(err instanceof Anthropic.APIError)) {
      console.error("[llm] unusable structured output:", err.message);
      return { value: null, inputTokens: 0, outputTokens: 0 };
    }
    throw err;
  }
}

/** The answer comes back as the input of one tool call. The schema is too
 *  large for the API's constrained structured outputs ("compiled grammar is too
 *  large"), so the tool is not strict: the model is shown the shape, and our
 *  own parse (with its fallbacks) is the check, as on the CLI. */
const ANSWER_TOOL = "answer";
const ANSWER_RULE = `\n\n# How to answer\n\nGive your whole answer by calling the ${ANSWER_TOOL} tool exactly once, with the answer as its input. Write nothing outside that call.`;

async function viaApi<S extends z.ZodType>(opts: GenerateOptions<S>, model: string): Promise<Result> {
  // Fail fast on a hung connection instead of holding a tick for the SDK's ten minutes.
  client ??= new Anthropic({ timeout: 120_000, maxRetries: 1 });
  const { $schema: _dialect, ...strict } = z.toJSONSchema(opts.schema);
  void _dialect;
  const schema = relax(strict) as { type: "object" } & Record<string, unknown>;
  // The rule is part of the cached prefix: it never changes between calls.
  const system = [
    { type: "text" as const, text: opts.system + ANSWER_RULE, cache_control: { type: "ephemeral" as const } },
  ];
  const tools = [
    {
      name: ANSWER_TOOL,
      description: "Deliver the answer. Call this once, with the complete answer as the input.",
      input_schema: schema,
    },
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: opts.user }];
  const result: Result = { value: null, inputTokens: 0, outputTokens: 0 };

  // An answer our own parse rejects is sent back once with the reason, as the
  // CLI does; the second request reads the first from the cache.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res =
      opts.role === "director"
        ? // Opus 5.5: thinking is always on, so depth is set through effort, and a
          // tool cannot be forced: the system prompt asks for the call. A request
          // declined by a safety classifier is re-run server-side on the fallback model.
          await client.beta.messages.create({
            model,
            max_tokens: 16000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            system,
            messages,
            tools,
            tool_choice: { type: "auto" },
            output_config: { effort: DIRECTOR_EFFORT },
          })
        : // Haiku 5.5: short, high-volume crowd chatter needs no thinking, and
          // without thinking the tool call can be forced.
          await client.messages.create({
            model,
            max_tokens: 8000,
            thinking: { type: "disabled" },
            system,
            messages: messages as Anthropic.MessageParam[],
            tools,
            tool_choice: { type: "tool", name: ANSWER_TOOL },
          });
    result.inputTokens += totalInput(res.usage);
    result.outputTokens += res.usage.output_tokens;
    if (res.stop_reason === "refusal") return { ...result, value: null };

    const content = res.content as Anthropic.Beta.BetaContentBlock[];
    const call = content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === ANSWER_TOOL,
    );
    result.value = call?.input ?? null;
    const check = opts.schema.safeParse(result.value);
    if (check.success) break;

    const why = call
      ? check.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(answer)"}: ${i.message}`).join("; ")
      : `no call to the ${ANSWER_TOOL} tool`;
    const again = attempt === 1 && res.stop_reason !== "max_tokens";
    console.warn(`[llm] ${opts.role} answer rejected (${why})${again ? "; asking once more" : ""}`);
    if (!again) break;
    messages.push({ role: "assistant", content });
    messages.push({
      role: "user",
      content: call
        ? [
            {
              type: "tool_result",
              tool_use_id: call.id,
              is_error: true,
              content: `The answer did not match the schema: ${why}. Call ${ANSWER_TOOL} again with the complete, corrected answer.`,
            },
          ]
        : `Give the whole answer by calling the ${ANSWER_TOOL} tool.`,
    });
  }
  return result;
}

function totalInput(u: {
  input_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): number {
  return u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
}

// ------------------------------------------------------------------ cli

interface CliOutput {
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  num_turns?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

/** The JSON Schema as the CLI should enforce it: looser than ours, because the
 *  CLI sends a whole answer back to be written again over one bad field.
 *  - "additionalProperties: false" is removed: an extra key is harmless.
 *  - A field with a fallback (a Zod `.catch()`, which appears here as a
 *    `default`) is shown but not enforced, and is not required: our own parse
 *    puts the fallback in when the value is wrong or missing. */
function relax<T>(node: T): T {
  if (Array.isArray(node)) return node.map(relax) as T;
  if (node && typeof node === "object") {
    const src = node as Record<string, unknown>;
    if ("default" in src) {
      const { default: _fallback, description, ...shape } = src;
      void _fallback;
      return { ...(description ? { description } : {}), anyOf: [relax(shape), {}] } as T;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      if (k === "additionalProperties" && v === false) continue;
      out[k] = relax(v);
    }
    const props = src.properties as Record<string, Record<string, unknown>> | undefined;
    if (props && Array.isArray(src.required)) {
      out.required = (src.required as string[]).filter((k) => !(props[k] && "default" in props[k]));
    }
    return out as T;
  }
  return node;
}

type StreamEvent = { type?: string } & Record<string, unknown>;

/** The CLI's streamed output: one JSON object per line. */
function streamEvents(out: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as StreamEvent);
    } catch {
      // A line that is not JSON (a warning on stdout) is not an event.
    }
  }
  return events;
}

/** Why an answer was sent back, for the log: the answer rebuilt from the
 *  stream and the place it stops being JSON, or else what the CLI said. */
function rejection(events: StreamEvent[]): string {
  let answer = "";
  let complaint = "";
  let said = ""; // the first thing the CLI sent back, error or not
  for (const e of events) {
    if (e.type === "stream_event") {
      const ev = e.event as { type?: string; content_block?: { type?: string }; delta?: { type?: string; partial_json?: string } };
      if (ev.type === "content_block_start" && ev.content_block?.type === "tool_use") answer = "";
      if (ev.type === "content_block_delta" && ev.delta?.type === "input_json_delta") answer += ev.delta.partial_json ?? "";
      if (ev.type === "content_block_stop" && answer) {
        try {
          JSON.parse(answer);
        } catch (err) {
          const at = Number(/position (\d+)/.exec(String(err))?.[1] ?? answer.length);
          return `its first answer was not valid JSON at character ${at} of ${answer.length}: ${JSON.stringify(answer.slice(Math.max(0, at - 160), at))} >>> ${JSON.stringify(answer.slice(at, at + 80))}`;
        }
        answer = "";
      }
    } else if (e.type === "user" && !complaint) {
      // The CLI's reply to an answer it would not take: an error result, in whatever words.
      const content = (e.message as { content?: unknown } | undefined)?.content;
      const refused = Array.isArray(content) && content.some((c) => (c as { is_error?: boolean })?.is_error);
      const text = JSON.stringify(content ?? "");
      if (refused || text.includes("tool_use_error")) complaint = text.slice(0, 600);
      said ||= text.slice(0, 300);
    }
  }
  if (complaint) return `its first answer was rejected: ${complaint}`;
  return said ? `no rejection recorded; the CLI first sent back ${said}` : "no rejection recorded";
}

/** An answer that is not quite JSON, parsed anyway when the slip is one seen
 *  in practice: a dangling `,"` or `,` before a closing bracket. The slip
 *  nearest the place parsing failed is removed and the parse tried again.
 *  Undefined when that does not make it parse. */
function repairJson(text: string): unknown {
  let s = text;
  for (let tries = 0; tries < 4; tries++) {
    try {
      return JSON.parse(s);
    } catch (err) {
      const at = Number(/position (\d+)/.exec(String(err))?.[1] ?? NaN);
      if (!Number.isFinite(at)) return undefined;
      const from = Math.max(0, at - 80);
      const slip = [...s.slice(from, at + 1).matchAll(/,\s*"?\s*(?=[}\]])/g)].at(-1);
      if (!slip) return undefined;
      s = s.slice(0, from + slip.index) + s.slice(from + slip.index + slip[0].length);
    }
  }
  return undefined;
}

// A healthy call takes 10 to 40 seconds. When the subscription's usage limit is
// reached the CLI hangs instead of failing, so give up early.
const CLI_TIMEOUT_MS = 120_000;

function viaCli<S extends z.ZodType>(opts: GenerateOptions<S>, model: string): Promise<Result> {
  // The CLI rejects the "$schema" dialect marker that Zod adds.
  const { $schema: _dialect, ...strict } = z.toJSONSchema(opts.schema);
  void _dialect;
  // An answer with one stray key is rejected whole and asked for again, which
  // doubles the cost of the call. Extra keys are harmless (parsing drops them),
  // so the schema the CLI enforces allows them.
  const jsonSchema = relax(strict);
  const args = [
    "-p",
    "--model", model,
    "--system-prompt", opts.system,
    "--json-schema", JSON.stringify(jsonSchema),
    // Streamed, so that a rejected first answer can be read back and explained.
    "--output-format", "stream-json", "--verbose", "--include-partial-messages",
    "--tools", "",
    "--no-session-persistence",
  ];
  // The reply writer and the news desk cannot have their reasoning switched off
  // on this model, but at low effort they spend about a third as much on it,
  // with no visible loss in the replies. The environment variable outranks the flag.
  const effort = opts.role === "director" ? DIRECTOR_EFFORT : "low";
  args.push("--effort", effort);

  // Without the key in its environment the CLI signs in with the subscription.
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_CODE_EFFORT_LEVEL: effort };
  delete env.ANTHROPIC_API_KEY;

  return new Promise((resolve, reject) => {
    // A neutral working directory keeps this project's own agent files out of the prompt.
    const child = spawn("claude", args, { cwd: os.tmpdir(), env });
    let out = "";
    let err = "";
    let done = false;
    const timer = setTimeout(() => {
      done = true;
      child.kill("SIGKILL");
      reject(new Error(`claude CLI timed out after ${CLI_TIMEOUT_MS / 1000}s`));
    }, CLI_TIMEOUT_MS);

    // The answer is followed as it streams. The CLI sends back one that is not
    // valid JSON and asks for it again, which doubles the cost of the call;
    // when the slip is a known one the answer is repaired here and kept, and
    // the CLI is stopped before it asks.
    let read = 0; // characters of `out` already split into events
    let answer = "";
    let rescued: unknown;
    let input = 0;
    const follow = () => {
      for (let nl = out.indexOf("\n", read); nl !== -1 && !done; nl = out.indexOf("\n", read)) {
        const [e] = streamEvents(out.slice(read, nl));
        read = nl + 1;
        if (e?.type !== "stream_event") continue;
        const ev = e.event as {
          type?: string;
          content_block?: { type?: string };
          delta?: { type?: string; partial_json?: string };
          message?: { usage?: CliOutput["usage"] };
          usage?: { output_tokens?: number };
        };
        if (ev.type === "message_start") {
          const u = ev.message?.usage ?? {};
          input = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
        } else if (ev.type === "content_block_start" && ev.content_block?.type === "tool_use") {
          answer = "";
        } else if (ev.type === "content_block_delta" && ev.delta?.type === "input_json_delta") {
          answer += ev.delta.partial_json ?? "";
        } else if (ev.type === "content_block_stop" && answer) {
          let valid = true;
          try {
            JSON.parse(answer);
          } catch {
            valid = false;
          }
          if (!valid) {
            const fixed = repairJson(answer);
            if (fixed !== undefined && opts.schema.safeParse(fixed).success) rescued = fixed;
          }
          answer = "";
        } else if (ev.type === "message_delta" && rescued !== undefined) {
          // The turn's token count arrives last; nothing more is needed from the CLI.
          done = true;
          clearTimeout(timer);
          child.kill("SIGTERM");
          console.warn(`[llm] ${opts.role} answer was not valid JSON; repaired and kept instead of being asked for again`);
          resolve({ value: rescued, inputTokens: input, outputTokens: ev.usage?.output_tokens ?? 0 });
        }
      }
    };

    child.stdout.on("data", (d) => {
      out += d;
      if (!done) follow();
    });
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      if (!done) reject(e);
      done = true;
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      const events = streamEvents(out);
      const parsed = events.findLast((e) => e.type === "result") as CliOutput | undefined;
      if (!parsed) {
        reject(new Error(`claude CLI exited ${code}: ${(err || out).slice(0, 400)}`));
        return;
      }
      if (parsed.is_error) {
        reject(new Error(`claude CLI error: ${String(parsed.result).slice(0, 400)}`));
        return;
      }
      const u = parsed.usage ?? {};
      // One turn carries the answer; more means the first answer was rejected
      // and asked for again, which doubles the cost of the call.
      if ((parsed.num_turns ?? 0) > 2) {
        console.warn(`[llm] ${opts.role} call took ${parsed.num_turns} turns: ${rejection(events)}`);
      }
      resolve({
        value: parsed.structured_output ?? null,
        inputTokens:
          (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
        outputTokens: u.output_tokens ?? 0,
      });
    });
    child.stdin.end(opts.user);
  });
}
