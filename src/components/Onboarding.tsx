"use client";
// First-visit dialog in X's sign-up style, in two steps: name, handle, password and the
// subjects to start with; then, optionally, narrower interests under each
// subject. Also supports logging in to an existing account.
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { bus, getJson, postJson, refreshMe, useMe } from "@/lib/client";
import { INTERESTS as NARROWER } from "@/lib/interests";
import { SUBJECTS, SUBJECT_INFO, type Subject } from "@/lib/subjects";
import type { Subject as SubjectType } from "@/lib/subjects";

// Named as in Settings, where each has a dial.
const INTERESTS: { value: Subject; label: string }[] = SUBJECTS.map((k) => ({ value: k, label: SUBJECT_INFO[k].label }));

function Field({
  label,
  value,
  onChange,
  max,
  prefix,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  prefix?: string;
  type?: string;
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
          type={type}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 bg-transparent outline-none text-white"
          autoComplete={type === "password" ? "current-password" : "off"}
          spellCheck={false}
        />
      </span>
      {max && (
        <span className="absolute right-2 top-1.5 text-[13px] leading-4 text-x-dim">
          {focused ? `${value.length} / ${max}` : ""}
        </span>
      )}
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
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [interests, setInterests] = useState<Subject[]>(["tech"]);
  const [reactiveOnly, setReactiveOnly] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [picks, setPicks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

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
  }, [step, mode]);

  if (!open) return null;

  const validSignup =
    name.trim().length >= 1 &&
    name.trim().length <= 50 &&
    /^\w{1,15}$/.test(handle) &&
    password.length >= 6 &&
    interests.length > 0;

  const validLogin = loginIdentifier.trim().length >= 1 && loginPassword.length >= 1;

  const toggle = (s: Subject) => setInterests((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));
  const togglePick = (k: string) => setPicks((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]));
  const chosen = SUBJECTS.filter((k) => interests.includes(k));

  async function submitSignup(withPicks: boolean) {
    if (!validSignup || busy) return;
    setBusy(true);
    setError(null);
    try {
      const kept = withPicks ? chosen.flatMap((k) => NARROWER[k].filter((i) => picks.includes(i.key)).map((i) => i.key)) : [];
      await postJson("/api/auth/signup", {
        name: name.trim(),
        handle: handle.trim(),
        password,
        interests,
        picks: kept,
        reactiveOnly,
      });
      await refreshMe();
      bus.emit("sim");
    } catch (e) {
      setError(serverMessage(e));
      setStep(1);
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin() {
    if (!validLogin || busy) return;
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/login", {
        identifier: loginIdentifier.trim(),
        password: loginPassword,
      });
      await refreshMe();
      bus.emit("sim");
    } catch (e) {
      setError(serverMessage(e));
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
        aria-label={mode === "login" ? "Log in to Tangents" : "Create your account"}
        className="max-h-full w-[600px] max-w-full overflow-y-auto overscroll-contain rounded-2xl bg-x-bg px-8 pb-12 pt-3 sm:px-20 border border-x-border shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "login") {
            void submitLogin();
          } else if (step === 1) {
            if (validSignup) setStep(2);
          } else {
            void submitSignup(true);
          }
        }}
      >
        <div className="relative flex h-[53px] items-center justify-center">
          {mode === "signup" && step === 2 && (
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

        {/* Tab switch between Sign up and Log in */}
        <div className="mt-4 flex border-b border-x-border">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 pb-3 text-center text-[15px] font-bold transition-colors ${
              mode === "signup" ? "border-b-2 border-x-blue text-white" : "text-x-dim hover:text-white"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 pb-3 text-center text-[15px] font-bold transition-colors ${
              mode === "login" ? "border-b-2 border-x-blue text-white" : "text-x-dim hover:text-white"
            }`}
          >
            Log In
          </button>
        </div>

        {mode === "login" ? (
          <div className="mt-6 space-y-6">
            <h1 className="text-[26px] font-extrabold leading-8 text-white">Log in to your sandbox</h1>
            <p className="text-[14px] text-x-dim">Enter your credentials to resume your personal simulated world.</p>

            <Field
              label="Handle or Email"
              value={loginIdentifier}
              onChange={setLoginIdentifier}
              prefix="@"
            />
            <Field
              label="Password"
              type="password"
              value={loginPassword}
              onChange={setLoginPassword}
            />

            {error && (
              <p role="alert" className="text-[13px] text-x-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!validLogin || busy}
              className="mt-6 h-[52px] w-full rounded-full bg-white text-[17px] font-bold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Logging in..." : "Log In"}
            </button>

            <div className="text-center text-[14px] text-x-dim pt-2">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="text-x-blue hover:underline font-bold"
              >
                Sign up
              </button>
            </div>
          </div>
        ) : step === 1 ? (
          <>
            <h1 className="mt-5 text-[26px] font-extrabold leading-8 text-white">Create your sandbox account</h1>
            <p className="mt-1 text-[14px] text-x-dim">
              Your universe is completely isolated from all other users.
            </p>

            <div className="mt-6 space-y-5">
              <Field label="Display Name" value={name} onChange={setName} max={50} />
              <Field
                label="Handle"
                value={handle}
                onChange={(v) => setHandle(v.replace(/[^A-Za-z0-9_]/g, ""))}
                max={15}
                prefix="@"
              />
              <Field
                label="Password (min 6 characters)"
                type="password"
                value={password}
                onChange={setPassword}
              />
            </div>

            <h2 className="mt-7 text-[17px] font-bold leading-6 text-white">What do you want to see on your timeline?</h2>
            <p className="mt-1 text-[14px] leading-5 text-x-dim">Pick your starting domain.</p>
            <div role="group" aria-label="Interests" className="mt-3 grid grid-cols-2 gap-3">
              {INTERESTS.map((o) => {
                const on = interests.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(o.value)}
                    className={`relative flex h-16 items-end rounded-lg border p-3 text-left text-[15px] font-bold leading-5 transition-colors ${
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

            <div className="mt-6 rounded-xl border border-x-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[15px] font-bold leading-5 text-white">Reactive Sandbox Mode</div>
                  <p className="mt-1 text-[13px] leading-4 text-x-dim">
                    Turn off all external news feeds. The world will only react to your posts and What-if prompts.
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
              disabled={!validSignup}
              className="mt-6 h-[52px] w-full rounded-full bg-white text-[17px] font-bold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-[26px] font-extrabold leading-8 text-white">Narrow your focus</h1>
            <p className="mt-2 text-[14px] leading-5 text-x-dim">
              Pick what you follow most closely to tune your AI cast. Skip this to follow everything.
            </p>
            {chosen.map((k) => (
              <section key={k} className="mt-6">
                <h2 className="text-[18px] font-extrabold leading-6 text-white">{SUBJECT_INFO[k].label}</h2>
                <div role="group" aria-label={SUBJECT_INFO[k].label} className="mt-3 flex flex-wrap gap-2">
                  {NARROWER[k].map((i) => {
                    const on = picks.includes(i.key);
                    return (
                      <button
                        key={i.key}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => togglePick(i.key)}
                        className={`flex h-9 items-center gap-1.5 rounded-full border px-4 text-[14px] font-bold transition-colors ${
                          on ? "border-x-blue bg-x-blue text-white" : "border-x-border hover:bg-x-hover-soft"
                        }`}
                      >
                        <span>{i.label}</span>
                        <Icon name={on ? "check" : "plus"} size={14} />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            {error && (
              <p role="alert" className="mt-4 text-[13px] text-x-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-8 h-[52px] w-full rounded-full bg-white text-[17px] font-bold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Launching Universe..." : "Enter Universe"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitSignup(false)}
              className="mt-3 h-[52px] w-full rounded-full border border-x-border text-[17px] font-bold hover:bg-x-hover disabled:opacity-50 text-white"
            >
              Skip for now
            </button>
          </>
        )}
      </form>
    </div>
  );
}
