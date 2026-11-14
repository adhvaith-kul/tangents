/** The message the server sent with a refusal, for showing next to the input.
 *  `postJson` throws "<status> <body>"; the body is `{ error }` when the route refused. */
export function errorText(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  const body = m.replace(/^\d+\s/, "");
  try {
    const j = JSON.parse(body) as { error?: unknown };
    if (typeof j.error === "string") return j.error;
  } catch {
    // not JSON
  }
  return "Something went wrong. Try again.";
}
