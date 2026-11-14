// One adapter, two interchangeable backends.
//   cli: the Claude Code command line (`claude -p`), billed to the subscription. Default.
//   api: the Anthropic API through the SDK, billed to ANTHROPIC_API_KEY.
// Switch with LLM_BACKEND=cli|api. FROZEN after phase 1. Server-only.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
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

const MODELS: Record<LlmRole, string> = {
  director: process.env.DIRECTOR_MODEL ?? "claude-opus-5-5",
  crowd: process.env.CROWD_MODEL ?? "claude-haiku-5-5",
  desk: process.env.CROWD_MODEL ?? "claude-haiku-5-5",
};

type Effort = "low" | "medium" | "high";
const DIRECTOR_EFFORT = (process.env.DIRECTOR_EFFORT ?? "low") as Effort;

export function backend(): "cli" | "api" {
  return process.env.LLM_BACKEND === "api" ? "api" : "cli";
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
  const model = MODELS[opts.role];
  const which = backend();
  let ok = false;
  let usage = { inputTokens: 0, outputTokens: 0 };
  try {
    const res = which === "api" ? await viaApiSafe(opts, model) : await viaCli(opts, model);
    usage = res;
    const parsed = opts.schema.safeParse(res.value);
    ok = parsed.success;
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

async function viaApi<S extends z.ZodType>(opts: GenerateOptions<S>, model: string): Promise<Result> {
  // Fail fast on a hung connection instead of holding a tick for the SDK's ten minutes.
  client ??= new Anthropic({ timeout: 90_000, maxRetries: 1 });
  const system = [
    { type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } },
  ];
  const messages = [{ role: "user" as const, content: opts.user }];
  const format = zodOutputFormat(opts.schema);

  if (opts.role === "director") {
    // Opus 5.5: thinking is always on, so depth is set through effort. A request
    // declined by a safety classifier is re-run server-side on the fallback model.
    const res = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages,
      output_config: { effort: DIRECTOR_EFFORT, format },
    });
    return {
      value: res.stop_reason === "refusal" ? null : res.parsed_output,
      inputTokens: totalInput(res.usage),
      outputTokens: res.usage.output_tokens,
    };
  }

  // Haiku 5.5: short, high-volume crowd chatter needs no thinking.
  const res = await client.messages.parse({
    model,
    max_tokens: 8000,
    thinking: { type: "disabled" },
    system,
    messages,
    output_config: { format },
  });
  return {
    value: res.stop_reason === "refusal" ? null : res.parsed_output,
    inputTokens: totalInput(res.usage),
    outputTokens: res.usage.output_tokens,
  };
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

/** The same JSON Schema with "additionalProperties: false" removed at every level. */
function relax<T>(node: T): T {
  if (Array.isArray(node)) return node.map(relax) as T;
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "additionalProperties" && v === false) continue;
      out[k] = relax(v);
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
      const text = JSON.stringify((e.message as { content?: unknown } | undefined)?.content ?? "");
      if (text.includes("tool_use_error")) complaint = text.slice(0, 600);
    }
  }
  return complaint ? `its first answer was rejected: ${complaint}` : "its first answer was rejected";
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
