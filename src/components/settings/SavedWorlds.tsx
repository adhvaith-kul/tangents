"use client";
// Settings, Worlds: each world is its own simulation. Save the one on screen
// under a name, load or delete a saved one, or start a new one. A loaded world
// resumes at the moment it was saved.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { bus, getJson, postJson, refreshMe } from "@/lib/client";
import { fullTime } from "@/lib/format";

interface SavedWorld {
  name: string;
  savedAt: number;
  simTime: number;
  posts: number;
  reader: string | null;
  /** A copy kept as it was saved. */
  kept: boolean;
}

const NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/;
const button = "h-8 rounded-full border border-x-border px-4 text-[14px] font-bold hover:bg-x-hover disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent";

function message(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  try {
    const j = JSON.parse(raw.replace(/^\d+\s/, "")) as { error?: unknown };
    if (typeof j.error === "string") return j.error;
  } catch {
    // not JSON
  }
  return raw;
}

interface WorldsResponse {
  worlds: SavedWorld[];
  /** The name the world on screen was last saved or loaded under. */
  current: string | null;
  /** The world on screen is a kept copy: leaving it does not save over it. */
  kept: boolean;
}

export function SavedWorlds() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<SavedWorld[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [kept, setKept] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ name: string; what: "load" | "remove" } | null>(null);

  const load = useCallback(() => {
    getJson<WorldsResponse>("/api/worlds")
      .then((r) => {
        setWorlds(r.worlds);
        setCurrent(r.current);
        setKept(r.kept);
        // Saving again updates the world on screen unless another name is typed.
        setName((typed) => typed || r.current || "");
      })
      .catch((e) => setNote(message(e)));
  }, []);
  useEffect(load, [load]);

  async function act(body: Record<string, string>, label: string, done: string) {
    setBusy(label);
    setNote(null);
    try {
      const r = await postJson<WorldsResponse>("/api/worlds", body);
      setWorlds(r.worlds);
      setCurrent(r.current);
      setKept(r.kept);
      if (body.load) setName(r.current ?? "");
      setNote(done);
      if (body.load) {
        // A different world is on screen now: everything refetches.
        await refreshMe();
        bus.emit("sim");
      }
    } catch (e) {
      setNote(message(e));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  /** A new world: the one on screen is wiped and sign-up starts again. */
  async function startNew() {
    setBusy("new");
    setNote(null);
    try {
      await postJson("/api/sim", { action: "reset" });
      await refreshMe();
      bus.emit("sim");
      router.push("/");
    } catch (e) {
      setNote(message(e));
      setBusy(null);
      setFresh(false);
    }
  }

  const trimmed = name.trim();
  const exists = worlds?.some((w) => w.name.toLowerCase() === trimmed.toLowerCase());
  const same = (a: string, b: string | null) => !!b && a.toLowerCase() === b.toLowerCase();
  /** Saved under another name, the world on screen is copied and keeps its own name. */
  const copying = !!current && !!trimmed && !same(trimmed, current);
  /** What happens to the world on screen when it is left. */
  const leaving = !current
    ? "The world on screen has no name, so it is not kept."
    : kept
      ? `“${current}” is a kept copy: it stays as it was saved.`
      : `“${current}” is saved first.`;

  return (
    <div>
      <div className="border-b border-x-border px-4 py-3 text-[15px] leading-5">
        {worlds === null ? (
          <span className="text-x-dim">&nbsp;</span>
        ) : current ? (
          <>
            <span className="text-x-dim">On screen: </span>
            <span className="font-bold">{current}</span>
            {kept ? <span className="text-x-dim"> · a kept copy, not saved over when you leave it</span> : null}
          </>
        ) : (
          <span className="text-x-dim">The world on screen has not been saved yet.</span>
        )}
      </div>
      <div className="border-b border-x-border px-4 py-3">
        <div className="text-[15px] font-bold leading-5">Save this world</div>
        <div className="mt-0.5 text-[13px] leading-4 text-x-dim">
          Keeps everything as it is now, under a name. Loading it later picks up at this exact moment.
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            aria-label="Name for the saved world"
            className="h-9 min-w-0 flex-1 rounded border border-x-border bg-transparent px-3 text-[15px] outline-none focus:border-x-blue"
          />
          <button
            type="button"
            disabled={!NAME.test(trimmed) || busy !== null}
            onClick={() =>
              void act(
                { save: trimmed },
                "save",
                copying ? `Saved a copy as "${trimmed}".` : exists ? `Saved "${trimmed}".` : `Saved as "${trimmed}".`,
              )
            }
            className={button}
          >
            {copying ? (exists ? "Replace that copy" : "Save a copy") : "Save"}
          </button>
        </div>
      </div>
      <div className="px-4 pb-1 pt-3 text-[15px] font-bold leading-5">Saved worlds</div>
      {worlds === null ? null : worlds.length === 0 ? (
        <div className="px-4 pb-3 text-[13px] leading-4 text-x-dim">None yet.</div>
      ) : (
        worlds.map((w) => (
          <div key={w.name} className="flex items-center gap-3 border-b border-x-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold leading-5">
                {w.name}
                {w.kept ? <span className="ml-2 text-[13px] font-normal text-x-dim">kept copy</span> : null}
              </div>
              <div className="text-[13px] leading-4 text-x-dim">
                {w.posts.toLocaleString("en-US")} posts{w.reader ? ` · ${w.reader}` : ""}
                {w.simTime ? ` · resumes at ${fullTime(w.simTime)}` : ""}
              </div>
            </div>
            {confirm?.name === w.name ? (
              <>
                <span className="text-[13px] text-x-dim">
                  {confirm.what === "remove"
                    ? "Delete it?"
                    : same(w.name, current)
                      ? "Go back to how it was last saved?"
                      : leaving}
                </span>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    void act(
                      confirm.what === "load" ? { load: w.name } : { remove: w.name },
                      confirm.what,
                      confirm.what === "load" ? `Loaded "${w.name}".` : `Deleted "${w.name}".`,
                    )
                  }
                  className={`${button} ${confirm.what === "remove" ? "text-x-red" : ""}`}
                >
                  {busy ? "Working…" : confirm.what === "remove" ? "Delete" : same(w.name, current) ? "Go back" : "Load"}
                </button>
                <button type="button" disabled={busy !== null} onClick={() => setConfirm(null)} className={button}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" disabled={busy !== null} onClick={() => setConfirm({ name: w.name, what: "load" })} className={button}>
                  Load
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setConfirm({ name: w.name, what: "remove" })}
                  className={`${button} text-x-dim`}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))
      )}
      <div className="flex items-center gap-3 border-b border-x-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-5">New world</div>
          <div className="mt-0.5 text-[13px] leading-4 text-x-dim">
            Starts again from sign-up: a new account, new stories, its own settings.
          </div>
        </div>
        {fresh ? (
          <>
            <span className="text-[13px] text-x-dim">{leaving}</span>
            <button type="button" disabled={busy !== null} onClick={() => void startNew()} className={`${button} text-x-red`}>
              {busy === "new" ? "Working…" : "Start new"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => setFresh(false)} className={button}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" disabled={busy !== null} onClick={() => setFresh(true)} className={button}>
            New world
          </button>
        )}
      </div>
      {note ? <div className="px-4 py-3 text-[13px] leading-4 text-x-dim">{note}</div> : null}
      <div className="px-4 py-3 text-[13px] leading-4 text-x-dim">
        Each world is its own simulation: its own account, stories, memory, settings and clock. One runs at a time; the
        others wait exactly as they were saved. A world with a name is saved whenever you leave it, by loading another
        or starting a new one. To keep a moment you can return to, such as the start of a demo, save a copy under
        another name: a copy stays as it was saved, even after you load it and play in it, until you save it yourself. Saved worlds are files in the project’s worlds folder
        and can be shared like any other file.
      </div>
    </div>
  );
}
