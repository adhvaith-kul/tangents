// Downloads the profile picture each figure and outlet currently uses on X into
// public/avatars/<handle>.jpg. Plain Node, no dependencies. Run: npm run avatars
// Sources, in order: api.fxtwitter.com (gives the real image URL, so default
// placeholders can be rejected), then unavatar.io. Jensen Huang has no X account
// (avatarSource: null) and gets a freely licensed Wikimedia Commons portrait.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "avatars");
const UA = "TangentsAvatarFetch/1.0 (personal single-player project)";
const MIN_SIDE = 200;
const MAX_BYTES = 1_500_000;

// ---- the roster: figures and outlets, read from cast.ts as text
function readRoster() {
  const src = fs.readFileSync(path.join(root, "src/lib/cast.ts"), "utf8");
  const start = src.indexOf("export const FIGURES");
  const end = src.indexOf("export const CROWD");
  const out = [];
  for (const line of src.slice(start, end).split("\n")) {
    const h = line.match(/handle:\s*"([^"]+)"/);
    if (!h) continue;
    const s = line.match(/avatarSource:\s*(null|"([^"]+)")/);
    out.push({ handle: h[1], source: s ? (s[2] ?? null) : h[1] });
  }
  return out;
}

// ---- image inspection
function inspect(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
        return { type: "jpeg", h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }
  if (buf.length > 24 && buf.subarray(1, 4).toString() === "PNG") {
    return { type: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 30 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") {
    return { type: "webp", w: 0, h: 0 };
  }
  return null;
}

async function get(url, tries = 3) {
  let last = "no response";
  for (let n = 0; n < tries; n++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { "user-agent": UA }, redirect: "follow" });
      if (res.status === 429 || res.status >= 500) {
        last = `HTTP ${res.status}`;
        await new Promise((r) => setTimeout(r, 1500 * (n + 1)));
        continue;
      }
      if (!res.ok) return { error: `HTTP ${res.status}` };
      return { buf: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "" };
    } catch (e) {
      last = String(e?.message ?? e);
    }
  }
  return { error: last };
}

/** Download a url and check it is a real image of a sensible size. */
async function image(url) {
  const r = await get(url);
  if (r.error) return { error: r.error };
  const info = inspect(r.buf);
  if (!info) return { error: `not an image (${r.type || "unknown type"}, ${r.buf.length} bytes)` };
  if (info.w && Math.min(info.w, info.h) < MIN_SIDE) return { error: `too small (${info.w}x${info.h})` };
  if (r.buf.length < 3_000) return { error: `suspiciously small (${r.buf.length} bytes)` };
  return { buf: r.buf, info, url };
}

// ---- sources
async function fromFxTwitter(handle) {
  const r = await get(`https://api.fxtwitter.com/${handle}`);
  if (r.error) return { error: `fxtwitter ${r.error}` };
  let url;
  try { url = JSON.parse(r.buf.toString()).user?.avatar_url; } catch { /* handled below */ }
  if (!url) return { error: "fxtwitter: no avatar_url (account missing or suspended)" };
  if (/default_profile/.test(url)) return { error: "account only has the default placeholder picture" };
  // Strip the size suffix for the original upload; fall back to the 400x400 rendition.
  const original = url.replace(/_(normal|bigger|400x400|200x200)(\.\w+)$/, "$2");
  const big = url.replace(/_(normal|bigger|200x200)(\.\w+)$/, "_400x400$2");
  const a = await image(original);
  if (a.buf && a.buf.length <= MAX_BYTES && a.info.w <= 2048) return { ...a, via: "fxtwitter (original)" };
  const b = await image(big);
  if (b.buf) return { ...b, via: "fxtwitter (400x400)" };
  return { error: `fxtwitter image: ${b.error}` };
}

async function fromUnavatar(handle) {
  const r = await image(`https://unavatar.io/x/${handle}?fallback=false`);
  return r.buf ? { ...r, via: "unavatar" } : { error: `unavatar ${r.error}` };
}

async function fromCommons(title) {
  const api = "https://commons.wikimedia.org/w/api.php";
  const sum = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (sum.error) return { error: `wikipedia ${sum.error}` };
  const orig = JSON.parse(sum.buf.toString()).originalimage?.source;
  const file = orig && decodeURIComponent(orig.split("/").pop().split("?")[0]);
  if (!file) return { error: "wikipedia: page has no image" };
  const meta = await get(`${api}?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent("File:" + file)}`);
  if (meta.error) return { error: `commons ${meta.error}` };
  const page = Object.values(JSON.parse(meta.buf.toString()).query.pages)[0];
  const md = page.imageinfo?.[0]?.extmetadata ?? {};
  const license = md.LicenseShortName?.value ?? "";
  if (!/^(CC|Public domain|PD)/i.test(license)) return { error: `commons: licence not free (${license || "unknown"})` };
  const img = await image(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`);
  return img.buf ? { ...img, via: `Wikimedia Commons ${file} (${license}, ${md.Artist?.value?.replace(/<[^>]+>/g, "") ?? "unknown author"})` } : { error: `commons image: ${img.error}` };
}

// ---- main
fs.mkdirSync(outDir, { recursive: true });
const results = [];
for (const { handle, source } of readRoster()) {
  const errors = [];
  let got = null;
  if (source === null) {
    const r = await fromCommons("Jensen Huang");
    if (r.buf) got = r; else errors.push(r.error);
  } else {
    for (const fn of [fromFxTwitter, fromUnavatar]) {
      const r = await fn(source);
      if (r.buf) { got = r; break; }
      errors.push(r.error);
    }
  }
  if (got) {
    fs.writeFileSync(path.join(outDir, `${handle}.jpg`), got.buf);
    const note = got.info.type === "jpeg" ? "" : ` [${got.info.type} data in a .jpg file]`;
    console.log(`saved   ${handle.padEnd(18)} ${got.info.w}x${got.info.h} ${got.buf.length}B via ${got.via}${note}`);
    results.push(true);
  } else {
    console.log(`FAILED  ${handle.padEnd(18)} ${errors.join(" | ")}`);
    results.push(false);
  }
  await new Promise((r) => setTimeout(r, 400));
}
console.log(`\n${results.filter(Boolean).length}/${results.length} saved to ${path.relative(root, outDir)}`);
process.exitCode = results.every(Boolean) ? 0 : 1;
