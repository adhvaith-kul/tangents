"use client";
// First-visit dialog in X's sign-up style: name, handle and a starting interest.
// Rendered by Shell on every screen; renders nothing once there is a user.
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { postJson, refreshMe, useMe } from "@/lib/client";
import type { MeResponse, OnboardRequest } from "@/lib/types";

const INTERESTS: { value: OnboardRequest["interest"]; label: string }[] = [
  { value: "tech", label: "Tech and business" },
  { value: "pop", label: "Fashion, celebrities and pop culture" },
  { value: "sports", label: "Sports" },
  { value: "both", label: "Tech and pop culture" },
  { value: "all", label: "Everything" },
];

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
  const [interest, setInterest] = useState<OnboardRequest["interest"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (me !== null) return null;

  const valid = name.trim().length >= 1 && name.trim().length <= 50 && /^\w{1,15}$/.test(handle) && interest !== null;

  async function submit() {
    if (!valid || busy || !interest) return;
    setBusy(true);
    setError(null);
    try {
      await postJson<MeResponse>("/api/me", { name: name.trim(), handle, interest } satisfies OnboardRequest);
      await refreshMe();
    } catch (e) {
      setError(serverMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Create your account"
        className="max-h-full w-[600px] max-w-full overflow-y-auto rounded-2xl bg-x-bg px-8 pb-12 pt-3 sm:px-20"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex h-[53px] items-center justify-center">
          <Logo size={30} />
        </div>
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
        <div role="radiogroup" aria-label="Interests" className="mt-3 space-y-3">
          {INTERESTS.map((o) => {
            const on = interest === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setInterest(o.value)}
                className={`flex w-full items-center justify-between rounded border px-3 py-3 text-left text-[15px] ${
                  on ? "border-x-blue bg-x-blue/10" : "border-x-border hover:bg-x-hover-soft"
                }`}
              >
                <span>{o.label}</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    on ? "border-x-blue" : "border-x-dim"
                  }`}
                >
                  {on && <span className="h-2.5 w-2.5 rounded-full bg-x-blue" />}
                </span>
              </button>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-4 text-[13px] text-x-red">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!valid || busy}
          className="mt-8 h-[52px] w-full rounded-full bg-x-button text-[17px] font-bold text-black hover:bg-x-button-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign up
        </button>
      </form>
    </div>
  );
}
