"use client";
// Settings, Worlds. Each world is its own simulation. This screen shows the
// one on screen and the others, and moves between them: switch, start a new
// one, rename, delete, or save a copy to come back to. Nothing here can lose a
// world by accident: the one being left is always saved first.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  WORLD_NAME, getWorlds, newWorld, postWorlds, removeWorld, switchWorld, worldError, type WorldsState,
} from "@/components/core/worlds";
import { fullTime } from "@/lib/format";

const quiet =
  "h-8 shrink-0 rounded-full border border-x-border px-4 text-[14px] font-bold leading-4 transition-colors hover:bg-x-hover disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent";
const primary =
  "h-8 shrink-0 rounded-full bg-x-button px-4 text-[14px] font-bold leading-4 text-[#0f1419] transition-colors hover:bg-x-button-hover disabled:cursor-default disabled:opacity-50";
const field =
  "h-9 min-w-0 flex-1 rounded border border-x-border bg-transparent px-3 text-[15px] outline-none focus:border-x-blue";

/** What the name field under "This world" is for at the moment. */
type Naming = "rename" | "copy" | null;

export function SavedWorlds() {
  const router = useRouter();
  const [state, setState] = useState<WorldsState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [naming, setNaming] = useState<Naming>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    getWorlds().then(setState).catch((e) => setNote(worldError(e)));
  }, []);
  useEffect(load, [load]);

  /** Run one change; `done` is what to say afterwards. */
  async function run(change: () => Promise<WorldsState | void>, done: string | null) {
    setBusy(true);
    setNote(null);
    try {
      const next = await change();
      if (next) setState(next);
      setNote(done);
      setNaming(null);
      setDeleting(null);
    } catch (e) {
      setNote(worldError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!state) return <div className="px-4 py-3 text-[13px] leading-4 text-x-dim">{note ?? "…"}</div>;

  const { here, worlds } = state;
  const same = (a: string, b: string | null) => !!b && a.toLowerCase() === b.toLowerCase();
  const others = worlds.filter((w) => !same(w.name, here.name));
  const trimmed = name.trim();
  const taken = worlds.some((w) => same(w.name, trimmed)) && !(naming === "rename" && same(trimmed, here.name));
  const canName = WORLD_NAME.test(trimmed) && !taken && !busy;

  const startNaming = (what: Exclude<Naming, null>) => {
    setNaming(what);
    setName(what === "rename" ? (here.name ?? here.willBe ?? "") : here.name ? `${here.name} copy` : "");
    setNote(null);
  };
  const applyName = () => {
    if (!canName) return;
    if (naming === "copy") return void run(() => postWorlds({ save: trimmed }), `Saved a copy as “${trimmed}”.`);
    // A world that was never saved is named by saving it; a saved one is renamed in place.
    return void run(
      () => (here.name ? postWorlds({ rename: here.name, to: trimmed }) : postWorlds({ save: trimmed })),
      `This world is now “${trimmed}”.`,
    );
  };

  return (
    <div>
      {/* ---- the world on screen */}
      <div className="border-b border-x-border px-4 py-4">
        <div className="text-[13px] font-bold uppercase leading-4 tracking-wide text-x-dim">This world</div>
        <div className="mt-2 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xl font-extrabold leading-6">{here.name ?? here.willBe ?? "A new world"}</div>
            <div className="mt-0.5 text-[13px] leading-4 text-x-dim">
              {here.posts.toLocaleString("en-US")} posts{here.reader ? ` · ${here.reader}` : ""}
            </div>
          </div>
          <button type="button" disabled={busy} onClick={() => startNaming("rename")} className={quiet}>
            Rename
          </button>
          <button type="button" disabled={busy} onClick={() => startNaming("copy")} className={quiet}>
            Save a copy
          </button>
        </div>
        {naming ? (
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyName();
            }}
          >
            <input
              autoFocus
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder={naming === "copy" ? "Name for the copy" : "Name"}
              aria-label={naming === "copy" ? "Name for the copy" : "Name for this world"}
              className={field}
            />
            <button type="submit" disabled={!canName} className={primary}>
              {naming === "copy" ? "Save copy" : "Rename"}
            </button>
            <button type="button" disabled={busy} onClick={() => setNaming(null)} className={quiet}>
              Cancel
            </button>
          </form>
        ) : null}
        {naming && taken ? <div className="mt-2 text-[13px] leading-4 text-x-red">A world already has that name.</div> : null}
        <div className="mt-3 text-[13px] leading-4 text-x-dim">
          {here.kept
            ? "This is a kept copy. It stays as it was saved: what you play here is not kept when you leave, unless you save a copy."
            : "It is saved by itself whenever you switch to another world or start a new one."}
        </div>
      </div>

      {/* ---- the others */}
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <div className="text-[13px] font-bold uppercase leading-4 tracking-wide text-x-dim">Your other worlds</div>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await newWorld();
              router.push("/");
            }, null)
          }
          className={primary}
        >
          New world
        </button>
      </div>
      {others.length === 0 ? (
        <div className="px-4 pb-4 pt-2 text-[13px] leading-4 text-x-dim">None yet. “New world” starts one from sign-up.</div>
      ) : (
        others.map((w) => (
          <div key={w.name} className="border-b border-x-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold leading-5">
                  {w.name}
                  {w.kept ? <span className="ml-2 text-[13px] font-normal text-x-dim">kept copy</span> : null}
                </div>
                <div className="truncate text-[13px] leading-4 text-x-dim">
                  {w.posts.toLocaleString("en-US")} posts{w.reader ? ` · ${w.reader}` : ""}
                  {w.simTime ? ` · at ${fullTime(w.simTime)}` : ""}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await switchWorld(w.name);
                    router.push("/");
                  }, null)
                }
                className={quiet}
              >
                Switch
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleting(deleting === w.name ? null : w.name)}
                className={`${quiet} text-x-dim`}
              >
                Delete
              </button>
            </div>
            {deleting === w.name ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-x-red/10 px-3 py-2">
                <span className="min-w-0 flex-1 text-[13px] leading-4 text-x-text">Delete “{w.name}” for good?</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => removeWorld(w.name, false), `Deleted “${w.name}”.`)}
                  className={`${quiet} border-x-red/60 text-x-red`}
                >
                  Delete
                </button>
                <button type="button" disabled={busy} onClick={() => setDeleting(null)} className={quiet}>
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        ))
      )}

      {/* ---- ending the world on screen */}
      {here.name ? (
        <div className="border-b border-x-border px-4 py-3">
          {deleting === "\0here" ? (
            <div className="flex items-center gap-2 rounded-lg bg-x-red/10 px-3 py-2">
              <span className="min-w-0 flex-1 text-[13px] leading-4 text-x-text">
                Delete “{here.name}”, the world on screen, for good? You go back to sign-up.
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await removeWorld(here.name!, true);
                    router.push("/");
                  }, null)
                }
                className={`${quiet} border-x-red/60 text-x-red`}
              >
                Delete
              </button>
              <button type="button" disabled={busy} onClick={() => setDeleting(null)} className={quiet}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => setDeleting("\0here")} className="text-[14px] leading-5 text-x-red hover:underline">
              Delete this world
            </button>
          )}
        </div>
      ) : null}

      {note ? <div className="px-4 py-3 text-[13px] leading-4 text-x-dim">{note}</div> : null}
      <div className="px-4 py-3 text-[13px] leading-4 text-x-dim">
        Each world is its own simulation: its own account, stories, memory, settings and clock. One runs at a time; the
        others wait as you left them. A copy is a moment to come back to, such as the start of a demo. Worlds are files in
        the project’s worlds folder and can be shared like any other file.
      </div>
    </div>
  );
}
