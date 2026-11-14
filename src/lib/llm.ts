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

export type LlmRole = "director" | "crowd";

export interface GenerateOptions<S extends z.ZodType> {
  role: LlmRole;
  system: string;
  user: string;
  schema: S;
}

const MODELS: Record<LlmRole, string> = {
  director: process.env.DIRECTOR_MODEL ?? "claude-opus-5-5",
  crowd: process.env.CROWD_MODEL ?? "claude-haiku-5-5",
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
    const res = which === "api" ? await viaApi(opts, model) : await viaCli(opts, model);
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

async function viaApi<S extends z.ZodType>(opts: GenerateOptions<S>, model: string): Promise<Result> {
  client ??= new Anthropic();
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
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

const CLI_TIMEOUT_MS = 240_000;

function viaCli<S extends z.ZodType>(opts: GenerateOptions<S>, model: string): Promise<Result> {
  const args = [
    "-p",
    "--model", model,
    "--system-prompt", opts.system,
    "--json-schema", JSON.stringify(z.toJSONSchema(opts.schema)),
    "--output-format", "json",
    "--tools", "",
    "--no-session-persistence",
  ];
  if (opts.role === "director") args.push("--effort", DIRECTOR_EFFORT);

  // Without the key in its environment the CLI signs in with the subscription.
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  return new Promise((resolve, reject) => {
    // A neutral working directory keeps this project's own agent files out of the prompt.
    const child = spawn("claude", args, { cwd: os.tmpdir(), env });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`claude CLI timed out after ${CLI_TIMEOUT_MS / 1000}s`));
    }, CLI_TIMEOUT_MS);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      let parsed: CliOutput;
      try {
        parsed = JSON.parse(out) as CliOutput;
      } catch {
        reject(new Error(`claude CLI exited ${code}: ${(err || out).slice(0, 400)}`));
        return;
      }
      if (parsed.is_error) {
        reject(new Error(`claude CLI error: ${String(parsed.result).slice(0, 400)}`));
        return;
      }
      const u = parsed.usage ?? {};
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
