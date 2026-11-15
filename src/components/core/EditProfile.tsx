"use client";
// X's "Edit profile" dialog: banner and profile pictures, name, bio, location,
// website and birth date. Pictures are cropped to X's shapes in the browser
// (3:1 banner, square avatar) and sent as data URLs.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { bus, postJson, refreshMe, simNow } from "@/lib/client";
import { MONTH_NAMES, birthDateText } from "@/lib/format";
import { PROFILE_LIMITS, validWebsite } from "@/lib/rules";
import type { Account, BirthAudience, BirthDate, EditProfileRequest, MeResponse } from "@/lib/types";
import { Glyph } from "./glyphs";
import { toast } from "./toast";

const LIMITS = PROFILE_LIMITS;
const AVATAR = { width: 400, height: 400 };
const BANNER = { width: 1500, height: 500 };

const AUDIENCES: { value: BirthAudience; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Your followers" },
  { value: "following", label: "People you follow" },
  { value: "mutuals", label: "You follow each other" },
  { value: "self", label: "Only you" },
];

/** The picture scaled and centre-cropped to fill width x height, as a JPEG data URL. */
async function crop(file: File, { width, height }: { width: number; height: number }): Promise<string> {
  const image = await createImageBitmap(file);
  const scale = Math.max(width / image.width, height / image.height);
  const w = width / scale;
  const h = height / scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(image, (image.width - w) / 2, (image.height - h) / 2, w, h, 0, 0, width, height);
  image.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}

/** X's outlined field: the label sits inside and shrinks to the top once there is text or focus. */
function Field({
  label, value, onChange, max, multiline = false, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  multiline?: boolean;
  error?: string | null;
}) {
  const [focused, setFocused] = useState(false);
  const raised = focused || value.length > 0;
  const tone = error ? "text-x-red" : focused ? "text-x-blue" : "text-x-dim";
  const ring = error
    ? "border-x-red shadow-[0_0_0_1px_var(--color-x-red)]"
    : focused
      ? "border-x-blue shadow-[0_0_0_1px_var(--color-x-blue)]"
      : "border-[#333639]";
  const input =
    "block w-full resize-none bg-transparent px-2 pb-2 pt-1 text-[17px] leading-6 text-x-text outline-none";
  const common = {
    value,
    maxLength: max,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
  return (
    <div className="px-4 py-3">
      <label className={`relative block cursor-text rounded border ${ring}`}>
        <span className="pointer-events-none absolute inset-x-2 top-0 flex justify-between">
          <span
            className={`transition-all duration-150 ${raised ? "pt-2 text-[13px] leading-4" : "pt-4 text-[17px] leading-6"} ${tone}`}
          >
            {label}
          </span>
          {focused ? (
            <span className="pt-2 text-[13px] leading-4 text-x-dim">
              {value.length} / {max}
            </span>
          ) : null}
        </span>
        <span className="block h-6" />
        {multiline ? (
          <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} className={input} />
        ) : (
          <input {...common} type="text" onChange={(e) => onChange(e.target.value)} className={input} />
        )}
      </label>
      {error ? <div className="px-2 pt-1 text-[13px] leading-4 text-x-red">{error}</div> : null}
    </div>
  );
}

/** X's outlined select, with its label inside the box. */
function Select({
  label, value, onChange, className = "", children,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`relative block rounded border border-[#333639] focus-within:border-x-blue focus-within:shadow-[0_0_0_1px_var(--color-x-blue)] ${className}`}
    >
      <span className="pointer-events-none absolute left-2 top-2 text-[13px] leading-4 text-x-dim">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block h-[56px] w-full cursor-pointer appearance-none bg-transparent pl-2 pr-9 pt-5 text-[17px] leading-6 text-x-text outline-none [&>option]:bg-black"
      >
        {children}
      </select>
      <Glyph name="chevronDown" size={22.5} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-x-dim" />
    </label>
  );
}

/** The round camera and remove buttons X lays over a picture. */
function PictureButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[rgba(15,20,25,0.75)] text-white backdrop-blur-sm transition-colors hover:bg-[rgba(39,44,48,0.75)]"
    >
      {children}
    </button>
  );
}

interface BirthDraft {
  month: number | null;
  day: number | null;
  year: number | null;
  dayAudience: BirthAudience;
  yearAudience: BirthAudience;
}

/** X's starting choices: the day among mutuals, the year private. */
const NO_BIRTH: BirthDraft = { month: null, day: null, year: null, dayAudience: "mutuals", yearAudience: "self" };

const complete = (b: BirthDraft): BirthDate | null =>
  b.month && b.day && b.year ? { ...b, month: b.month, day: b.day, year: b.year } : null;

function BirthSection({
  birth, setBirth, saved,
}: {
  birth: BirthDraft;
  setBirth: (b: BirthDraft) => void;
  saved: BirthDate | null;
}) {
  const [editing, setEditing] = useState(false);
  const full = complete(birth);
  const link = "text-x-blue hover:underline";

  if (!editing) {
    return (
      <div className="px-4 py-3">
        <div className="text-[15px] leading-5 text-x-dim">
          Birth date <span aria-hidden="true">·</span>{" "}
          <button type="button" className={link} onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
        <div className="pt-0.5 text-xl leading-6 text-x-text">
          {full ? birthDateText(full) : "Add your date of birth"}
        </div>
      </div>
    );
  }

  const thisYear = new Date(simNow()).getFullYear();
  const days = birth.month ? new Date(birth.year ?? 2000, birth.month, 0).getDate() : 31;
  const set = (patch: Partial<BirthDraft>) => {
    const next = { ...birth, ...patch };
    // February 30 cannot be picked: a day past the month's end is cleared.
    const limit = next.month ? new Date(next.year ?? 2000, next.month, 0).getDate() : 31;
    if (next.day && next.day > limit) next.day = null;
    setBirth(next);
  };
  const number = (v: string) => (v ? Number(v) : null);

  return (
    <div className="px-4 py-3">
      <div className="text-[15px] leading-5 text-x-dim">
        Birth date <span aria-hidden="true">·</span>{" "}
        <button
          type="button"
          className={link}
          onClick={() => {
            setBirth(saved ?? NO_BIRTH);
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
      <div className="pb-4 pt-1 text-[14px] leading-4 text-x-dim">
        This should be the date of birth of the person using the account. Even if you’re making an account for your
        business, event, or cat.
      </div>
      <div className="flex gap-3">
        <Select label="Month" value={birth.month ?? ""} onChange={(v) => set({ month: number(v) })} className="flex-[2]">
          <option value="" disabled />
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
        <Select label="Day" value={birth.day ?? ""} onChange={(v) => set({ day: number(v) })} className="flex-1">
          <option value="" disabled />
          {Array.from({ length: days }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </Select>
        <Select label="Year" value={birth.year ?? ""} onChange={(v) => set({ year: number(v) })} className="flex-1">
          <option value="" disabled />
          {Array.from({ length: 120 }, (_, i) => (
            <option key={i} value={thisYear - i}>
              {thisYear - i}
            </option>
          ))}
        </Select>
      </div>
      <div className="pb-3 pt-6 text-[15px] font-bold leading-5 text-x-text">Who sees this?</div>
      <div className="pb-3 text-[14px] leading-4 text-x-dim">
        You can control who sees your birthday on X.
      </div>
      <Select label="Month and day" value={birth.dayAudience} onChange={(v) => set({ dayAudience: v as BirthAudience })}>
        {AUDIENCES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </Select>
      <Select
        label="Year"
        value={birth.yearAudience}
        onChange={(v) => set({ yearAudience: v as BirthAudience })}
        className="mt-3"
      >
        {AUDIENCES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => {
          setBirth(NO_BIRTH);
          setEditing(false);
        }}
        className="-mx-4 mt-3 block w-[calc(100%+32px)] py-4 text-center text-[15px] leading-5 text-x-red transition-colors hover:bg-[rgba(244,33,46,0.1)]"
      >
        Remove birth date
      </button>
    </div>
  );
}

export function EditProfile({ account, onClose }: { account: Account; onClose: () => void }) {
  const [name, setName] = useState(account.name);
  const [bio, setBio] = useState(account.bio);
  const [location, setLocation] = useState(account.location ?? "");
  const [website, setWebsite] = useState(account.website ?? "");
  const [birth, setBirth] = useState<BirthDraft>(account.birth ?? NO_BIRTH);
  // undefined: keep the picture as it is; null: remove it; a string: the new one.
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);
  const [banner, setBanner] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const nameError = name.trim() ? null : "Name can’t be blank";
  const websiteError = website.trim() && !validWebsite(website.trim()) ? "Url is not valid." : null;
  const canSave = !saving && !nameError && !websiteError;

  const pick = async (file: File | undefined, shape: typeof AVATAR, set: (v: string) => void) => {
    if (!file) return;
    try {
      set(await crop(file, shape));
    } catch {
      toast("That picture could not be used.");
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const body: EditProfileRequest = {
      name, bio, location, website,
      birth: complete(birth),
      ...(avatar !== undefined ? { avatar } : {}),
      ...(banner !== undefined ? { banner } : {}),
    };
    try {
      await postJson<MeResponse>("/api/me", body, "PATCH");
      await refreshMe();
      // Every list on screen carries the old name and picture.
      bus.emit("sim");
      onClose();
    } catch {
      toast("Something went wrong. Your profile was not saved.");
      setSaving(false);
    }
  };

  const shownBanner = banner === undefined ? account.banner : (banner ?? "");
  const hasBanner = shownBanner.startsWith("/") || shownBanner.startsWith("data:");
  const shownAvatar = avatar === undefined ? account.avatar : avatar;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        className="mb-auto mt-[5vh] flex h-[650px] max-h-[90vh] w-[600px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl bg-[#141414]"
      >
        <div className="flex h-[53px] shrink-0 items-center px-4">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-x-text transition-colors hover:bg-x-hover"
          >
            <Icon name="close" size={20} />
          </button>
          <div className="ml-6 flex-1 text-xl font-bold leading-6 text-x-text">Edit profile</div>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void save()}
            className="h-8 rounded-full bg-x-button px-4 text-[14px] font-bold leading-4 text-[#0f1419] transition-colors hover:bg-x-button-hover disabled:opacity-50 disabled:hover:bg-x-button"
          >
            Save
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-16">
          <div className="relative mx-0.5 aspect-[3/1] bg-[#333639]">
            {hasBanner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownBanner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center gap-5">
              <PictureButton label="Add banner photo" onClick={() => bannerInput.current?.click()}>
                <Glyph name="cameraPlus" size={22} />
              </PictureButton>
              {hasBanner ? (
                <PictureButton label="Remove photo" onClick={() => setBanner(null)}>
                  <Icon name="close" size={22} />
                </PictureButton>
              ) : null}
            </div>
          </div>
          <div className="relative -mt-12 ml-4 h-[120px] w-[120px] rounded-full bg-[#141414] p-1">
            <div className="opacity-75">
              <Avatar account={{ ...account, name: name || account.name, avatar: shownAvatar }} size={112} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <PictureButton label="Add avatar photo" onClick={() => avatarInput.current?.click()}>
                <Glyph name="cameraPlus" size={22} />
              </PictureButton>
            </div>
          </div>
          <input
            ref={bannerInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              void pick(e.target.files?.[0], BANNER, setBanner);
              e.target.value = "";
            }}
          />
          <input
            ref={avatarInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              void pick(e.target.files?.[0], AVATAR, setAvatar);
              e.target.value = "";
            }}
          />

          <div className="pt-2">
            <Field label="Name" value={name} onChange={setName} max={LIMITS.name} error={nameError} />
            <Field label="Bio" value={bio} onChange={setBio} max={LIMITS.bio} multiline />
            <Field label="Location" value={location} onChange={setLocation} max={LIMITS.location} />
            <Field label="Website" value={website} onChange={setWebsite} max={LIMITS.website} error={websiteError} />
            <BirthSection birth={birth} setBirth={setBirth} saved={account.birth} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
