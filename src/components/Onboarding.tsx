"use client";
// First-visit dialog in X's sign-up style, in two steps: name, handle and the
// subjects to start with; then, optionally, narrower interests under each
// subject. Rendered by Shell on every screen; renders nothing once there is a user.
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { bus, getJson, postJson, refreshMe, useMe } from "@/lib/client";
import { INTERESTS as NARROWER } from "@/lib/interests";
import { SUBJECTS, SUBJECT_INFO, type Subject } from "@/lib/subjects";
import type { MeResponse, OnboardRequest } from "@/lib/types";

// Named as in Settings, where each has a dial.
const INTERESTS: { value: Subject; label: string }[] = SUBJECTS.map((k) => ({ value: k, label: SUBJECT_INFO[k].label }));

function Field({
  label,
  value,
  onChange,
  max,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const raised = focused || value !== "";
  return (
    <label
      className={`relative block h-14 rounded border ${focused ? "border-x-blue ring-1 ring-x-blue" : "border-x-border"}`}
    >
      <span
        className={`pointer-events-none absolute left-2 transition-all ${
          raised ? "top-1.5 text-[13px] leading-4" : "top-4 text-[17px] leading-6"
        } ${focused ? "text-x-blue" : "text-x-dim"}`}
      >
        {label}
      </span>
      <span className="absolute inset-x-2 bottom-1.5 flex items-center text-[17px] leading-6">
        {prefix && raised && <span className="text-x-dim">{prefix}</span>}
        <input
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 bg-transparent outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </span>
      <span className="absolute right-2 top-1.5 text-[13px] leading-4 text-x-dim">
        {focused ? `${value.length} / ${max}` : ""}
      </span>
    </label>
  );
}

function serverMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const body = raw.replace(/^\d+\s/, "");
  try {
    const j = JSON.parse(body) as { error?: unknown };
    if (typeof j.error === "string") return j.error;
  } catch {
    // not JSON: fall through
  }
  return body;
}

export function Onboarding() {
  const me = useMe();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [interests, setInterests] = useState<Subject[]>([]);
  const [reactiveOnly, setReactiveOnly] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [picks, setPicks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [opening, setOpening] = useState(false);

  // Worlds saved earlier, offered under the form while there is no account.
  useEffect(() => {
    if (me !== null) return;
    getJson<{ worlds: { name: string }[] }>("/api/worlds")
      .then((r) => setSaved(r.worlds.map((w) => w.name)))
      .catch(() => setSaved([]));
  }, [me]);

  const openWorld = async (world: string) => {
    setOpening(true);
    setError(null);
    try {
      await postJson("/api/worlds", { load: world });
      await refreshMe();
      bus.emit("sim");
    } catch {
      setError("That world could not be opened.");
    } finally {
      setOpening(false);
    }
  };

  // The page behind the dialog does not scroll while it is up.
  const open = me === null;
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Each step starts at its top, wherever the last one was scrolled to.
  const panel = useRef<HTMLFormElement>(null);
  useEffect(() => {
    panel.current?.scrollTo(0, 0);
  }, [step]);

  if (!open) return null;

  const valid = name.trim().length >= 1 && name.trim().length <= 50 && /^\w{1,15}$/.test(handle) && interests.length > 0;
  const toggle = (s: Subject) => setInterests((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));
  const togglePick = (k: string) => setPicks((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]));
  // In the order the subjects are listed, whatever order they were picked in.
  const chosen = SUBJECTS.filter((k) => interests.includes(k));

  async function submit(withPicks: boolean) {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Only picks under subjects that are still chosen count.
      const kept = withPicks ? chosen.flatMap((k) => NARROWER[k].filter((i) => picks.includes(i.key)).map((i) => i.key)) : [];
      await postJson<MeResponse>(
        "/api/me",
        { name: name.trim(), handle, interests, picks: kept, reactiveOnly } satisfies OnboardRequest,
      );
      await refreshMe();
    } catch (e) {
      // What the server refuses (a taken handle) is fixed on the first step.
      setError(serverMessage(e));
      setStep(1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Create your account"
        className="max-h-full w-[600px] max-w-full overflow-y-auto overscroll-contain rounded-2xl bg-x-bg px-8 pb-12 pt-3 sm:px-20"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 1) {
            if (valid) setStep(2);
          } else void submit(true);
        }}
      >
        <div className="relative flex h-[53px] items-center justify-center">
          {step === 2 && (
            <button
              type="button"
              aria-label="Back"
              onClick={() => setStep(1)}
              className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full hover:bg-x-hover"
            >
              <Icon name="back" size={20} />
            </button>
          )}
          <Logo size={30} />
        </div>
        {step === 1 ? (
          <>
            <h1 className="mt-5 text-[31px] font-extrabold leading-9">Create your account</h1>
            <div className="mt-8 space-y-6">
              <Field label="Name" value={name} onChange={setName} max={50} />
              <Field
                label="Handle"
                value={handle}
                onChange={(v) => setHandle(v.replace(/[^A-Za-z0-9_]/g, ""))}
                max={15}
                prefix="@"
              />
            </div>
            <h2 className="mt-8 text-[17px] font-bold leading-6">What do you want to see on X?</h2>
            <p className="mt-1 text-[15px] leading-5 text-x-dim">Select at least one. You can change this later in Settings.</p>
            <div role="group" aria-label="Interests" className="mt-4 grid grid-cols-2 gap-3">
              {INTERESTS.map((o) => {
                const on = interests.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(o.value)}
                    className={`relative flex h-20 items-end rounded-lg border p-3 text-left text-[15px] font-bold leading-5 transition-colors ${
                      on ? "border-x-blue bg-x-blue text-white" : "border-x-border hover:bg-x-hover-soft"
                    }`}
                  >
                    {on && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-x-blue">
                        <Icon name="check" size={14} />
                      </span>
                    )}
                    <span>{o.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 rounded-xl border border-x-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[15px] font-bold leading-5">Reactive Sandbox Mode</div>
                  <p className="mt-1 text-[13px] leading-4 text-x-dim">
                    Turn off all real-world news feeds. The world will only react to your activity, posts, and What-if prompts.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={reactiveOnly}
                  onClick={() => setReactiveOnly(!reactiveOnly)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    reactiveOnly ? "bg-x-blue" : "bg-x-border"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      reactiveOnly ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="mt-4 text-[13px] text-x-red">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!valid}
              className="mt-8 h-[52px] w-full rounded-full bg-x-button text-[17px] font-bold text-black hover:bg-x-button-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
            {saved.length ? (
              // Not X's: a world saved earlier (or sent by someone else) can be opened in place of signing up.
              <div className="mt-6 text-[15px] leading-5 text-x-dim">
                Or open a saved world:{" "}
                {saved.map((w, i) => (
                  <span key={w}>
                    {i ? ", " : ""}
                    <button type="button" disabled={opening} onClick={() => void openWorld(w)} className="text-x-blue hover:underline disabled:opacity-50">
                      {w}
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h1 className="mt-5 text-[31px] font-extrabold leading-9">What do you want to see on X?</h1>
            <p className="mt-2 text-[15px] leading-5 text-x-dim">
              Pick what you follow most closely and your timeline starts there. Skip this and you follow everything in the subjects you chose.
            </p>
            {chosen.map((k) => (
              <section key={k} className="mt-7">
                <h2 className="text-[20px] font-extrabold leading-6">{SUBJECT_INFO[k].label}</h2>
                <div role="group" aria-label={SUBJECT_INFO[k].label} className="mt-3 flex flex-wrap gap-3">
                  {NARROWER[k].map((i) => {
                    const on = picks.includes(i.key);
                    return (
                      <button
                        key={i.key}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => togglePick(i.key)}
                        className={`flex h-9 items-center gap-1 rounded-full border px-4 text-[15px] font-bold transition-colors ${
                          on ? "border-x-blue bg-x-blue text-white" : "border-x-border hover:bg-x-hover-soft"
                        }`}
                      >
                        <span>{i.label}</span>
                        <Icon name={on ? "check" : "plus"} size={16} />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            <button
              type="submit"
              disabled={busy}
              className="mt-8 h-[52px] w-full rounded-full bg-x-button text-[17px] font-bold text-black hover:bg-x-button-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign up
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(false)}
              className="mt-3 h-[52px] w-full rounded-full border border-x-border text-[17px] font-bold hover:bg-x-hover disabled:opacity-50"
            >
              Skip for now
            </button>
          </>
        )}
      </form>
    </div>
  );
}
