// The reader's own profile, as "Edit profile" changes it. Name, bio, location
// and the paths of the two pictures are columns on the account. The website,
// the birth date and the uploaded pictures themselves belong to the reader
// alone and live in kv, so they travel inside a saved world. Server-only.
import { randomBytes } from "node:crypto";
import { db, kvGet, kvSet, now, tx, userHandle } from "./db";
import { PROFILE_LIMITS, validWebsite } from "./rules";
import type { BirthAudience, BirthDate, EditProfileRequest } from "./types";

const WEBSITE = "profile_website";
const BIRTH = "profile_birth";
const PHOTO = "photo:";
/** Where an uploaded picture is served from; the id changes with every upload. */
const PHOTO_PATH = "/api/me/photo/";
const NO_BANNER = "#333639";

const AUDIENCES: BirthAudience[] = ["public", "followers", "following", "mutuals", "self"];
/** A cropped picture is a few hundred KB; this is a guard, not a target. */
const MAX_PHOTO_CHARS = 3_000_000;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/;

type Failure = { ok: false; status: number; error: string };
const bad = (error: string): Failure => ({ ok: false, status: 400, error });

function parseBirth(raw: unknown): BirthDate | null {
  const b = raw as Partial<BirthDate> | null;
  if (!b || typeof b !== "object") return null;
  const { month, day, year } = b;
  if (!Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(year)) return null;
  // The date has to exist, and to be in the past.
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) return null;
  if (year! < 1900 || date.getTime() > now()) return null;
  const audience = (a: unknown): BirthAudience => (AUDIENCES.includes(a as BirthAudience) ? (a as BirthAudience) : "self");
  return { month: month!, day: day!, year: year!, dayAudience: audience(b.dayAudience), yearAudience: audience(b.yearAudience) };
}

/** The parts of the reader's profile that are not columns on the account. */
export function profileExtras(): { website: string | null; birth: BirthDate | null } {
  let birth: BirthDate | null = null;
  try {
    birth = parseBirth(JSON.parse(kvGet(BIRTH) ?? "null"));
  } catch {
    // An unreadable value is treated as no birth date.
  }
  return { website: kvGet(WEBSITE) || null, birth };
}

function dropPhoto(path: string | null): void {
  if (path?.startsWith(PHOTO_PATH)) {
    db().prepare("DELETE FROM kv WHERE key = ?").run(PHOTO + path.slice(PHOTO_PATH.length));
  }
}

function storePhoto(dataUrl: string): string {
  const id = randomBytes(8).toString("hex");
  kvSet(PHOTO + id, dataUrl);
  return PHOTO_PATH + id;
}

/** An uploaded picture's bytes, for the route that serves it. */
export function photo(id: string): { type: string; bytes: Buffer } | null {
  const m = /^[0-9a-f]{16}$/.test(id) ? DATA_URL.exec(kvGet(PHOTO + id) ?? "") : null;
  return m ? { type: m[1], bytes: Buffer.from(m[2], "base64") } : null;
}

export function updateProfile(req: Partial<EditProfileRequest>): { ok: true } | Failure {
  const handle = userHandle();
  if (!handle) return { ok: false, status: 409, error: "There is no account yet." };
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = text(req.name);
  const bio = text(req.bio);
  const location = text(req.location);
  const website = text(req.website);
  if (!name) return bad("Name can’t be blank.");
  if (name.length > PROFILE_LIMITS.name) return bad("Name is too long.");
  if (bio.length > PROFILE_LIMITS.bio) return bad("Bio is too long.");
  if (location.length > PROFILE_LIMITS.location) return bad("Location is too long.");
  if (website.length > PROFILE_LIMITS.website || (website && !validWebsite(website))) return bad("Url is not valid.");
  const birth = req.birth == null ? null : parseBirth(req.birth);
  if (req.birth != null && !birth) return bad("That date of birth is not valid.");
  for (const picture of [req.avatar, req.banner]) {
    if (picture == null) continue;
    if (typeof picture !== "string" || picture.length > MAX_PHOTO_CHARS || !DATA_URL.test(picture)) {
      return bad("That picture could not be used.");
    }
  }

  tx(() => {
    const row = db().prepare("SELECT avatar, banner FROM accounts WHERE handle = ?").get(handle) as
      | { avatar: string | null; banner: string }
      | undefined;
    let avatar = row?.avatar ?? null;
    let banner = row?.banner ?? NO_BANNER;
    if (req.avatar !== undefined) {
      dropPhoto(avatar);
      avatar = req.avatar === null ? null : storePhoto(req.avatar);
    }
    if (req.banner !== undefined) {
      dropPhoto(banner);
      banner = req.banner === null ? NO_BANNER : storePhoto(req.banner);
    }
    db()
      .prepare("UPDATE accounts SET name = ?, bio = ?, location = ?, avatar = ?, banner = ? WHERE handle = ?")
      .run(name, bio, location || null, avatar, banner, handle);
    kvSet(WEBSITE, website);
    kvSet(BIRTH, JSON.stringify(birth));
  });
  return { ok: true };
}
