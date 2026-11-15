// The ripple: one storyline's origin and everything it caused, each item tied to
// the item that caused it, for /world/ripple. Read by GET /api/ripple. Read-only
// and server-only.
//
// Causes come from the record: a reply or quote hangs from the post it answers
// (or that post's nearest shown ancestor); a page, price move, trend, spin-off
// or top-level post from the beat it fell in; a beat from the one before it; the
// first beat from the origin. The total is capped so one screen stays readable,
// and what was left out is counted.
import { db, now } from "./db";
import type { AccountRow, ArticleRow, PostRow, StorylineRow } from "./db";
import { MEME_TEMPLATES } from "./media";
import { getStoryMap } from "./storymap";
import type { AccountLite, PostMedia, RippleNode, RippleResponse, StoryMapBeat } from "./types";
import { articleCards, qs, toLite } from "./views";

const MAX_NODES = 60;
const MOVE_SLACK = 5 * 60_000; // a price move or trend lands a little after its beat
const TEXT_MAX = 140;
/** Accounts whose posts are shown one by one; everyone else is counted. */
const NOTABLE = new Set(["figure", "org", "outlet", "user"]);

/** How many of each class one beat may show, before the global cap. */
const PER_BEAT: Partial<Record<Cls, number>> = { post: 6, reply: 4, meme: 2, crowd: 3, trend: 2, move: 3 };

/** Removal order under the cap: the last class goes first. */
const CLASSES = ["origin", "beat", "page", "fact", "move", "post", "trend", "reply", "replies", "meme", "crowd"] as const;
type Cls = (typeof CLASSES)[number];
type Left = RippleResponse["left"][number]["kind"];

interface Candidate {
  node: RippleNode;
  cls: Cls;
  score: number;
  /** The beat node it fell in. */
  beat: string;
  seq: number;
}

type Row = PostRow & { akind: string };

const clip = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > TEXT_MAX ? `${t.slice(0, TEXT_MAX - 1).trimEnd()}…` : t;
};

function parseMedia(raw: string | null): PostMedia | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as PostMedia;
    return m && typeof m === "object" && "kind" in m ? m : null;
  } catch {
    return null;
  }
}

export function getRipple(storylineId: number): RippleResponse {
  const conn = db();
  const t = now();
  const s = conn.prepare("SELECT * FROM storylines WHERE id = ? AND created_at <= ?").get(storylineId, t) as
    | StorylineRow
    | undefined;
  if (!s) return { now: t, storyline: null, nodes: [], left: [] };
  const head = { id: s.id, title: s.title, dormant: s.status !== "open" };

  // Beats, provenance and spin-offs as the story map has them (it rebuilds old storylines).
  const map = getStoryMap();
  const beatsOf = (sid: number) =>
    map.beats.filter((b) => b.storylineId === sid).sort((a, b) => a.createdAt - b.createdAt);
  const beats = beatsOf(s.id);
  if (!beats.length) return { now: t, storyline: head, nodes: [], left: [] };
  const meta = map.storylines.find((x) => x.id === s.id);
  const first = beats[0];

  const cands: Candidate[] = [];
  let seq = 0;
  const add = (node: RippleNode, cls: Cls, beat: string, score = 0) => {
    cands.push({ node, cls, score, beat, seq: seq++ });
    return node.id;
  };
  const beatId = (b: StoryMapBeat) => `b:${b.id}`;
  /** The beat node an item at time `at` belongs to. */
  const beatAt = (at: number, slack = 0) => {
    let hit = beats[0];
    for (const b of beats) if (b.createdAt <= at + slack) hit = b;
    return beatId(hit);
  };

  // ---- the posts: the storyline's own, and replies or quotes from outside it
  const rows = conn
    .prepare(
      `SELECT p.*, a.kind AS akind FROM posts p JOIN accounts a ON a.handle = p.author
       WHERE p.deleted = 0 AND p.created_at <= ?
         AND (p.storyline_id = ?
              OR p.reply_to IN (SELECT id FROM posts WHERE storyline_id = ?)
              OR p.quote_of IN (SELECT id FROM posts WHERE storyline_id = ?))
       ORDER BY p.created_at, p.id`,
    )
    .all(t, s.id, s.id, s.id) as unknown as Row[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  // ---- the origin
  const started = meta?.background.started;
  const parent = meta?.background.parent ?? null;
  let originPost: Row | undefined;
  let origin: RippleNode;
  const base = { id: "o", kind: "origin" as const, cause: null, ring: 0, at: first.createdAt, account: null, href: null };
  if (s.origin === "spinoff" && parent) {
    const pb = beatsOf(parent.id);
    const from = [...pb].reverse().find((b) => b.createdAt <= first.createdAt) ?? pb[0];
    origin = {
      ...base, origin: "spinoff", text: clip(from?.summary || parent.title), label: parent.title,
      href: `/world/ripple?storyline=${parent.id}`,
    };
  } else if (started?.kind === "headline") {
    const h = started.headline;
    origin = {
      ...base, origin: meta?.origin.kind ?? "headline", text: clip(h?.title ?? meta?.origin.text ?? s.title),
      label: h?.source ?? meta?.origin.source ?? null, href: h?.link ?? null, external: h?.link != null,
    };
  } else if (started?.kind === "post") {
    originPost =
      byId.get(started.postId) ??
      (conn
        .prepare(
          "SELECT p.*, a.kind AS akind FROM posts p JOIN accounts a ON a.handle = p.author WHERE p.id = ? AND p.deleted = 0 AND p.created_at <= ?",
        )
        .get(started.postId, t) as Row | undefined);
    origin = {
      ...base, origin: "post", text: clip(originPost?.text ?? s.title), label: null,
      href: `/post/${started.postId}`, at: Math.min(first.createdAt, originPost?.created_at ?? Infinity),
    };
  } else if (started?.kind === "whatif") {
    origin = { ...base, origin: "whatif", text: clip(started.text || first.summary || s.title), label: null };
  } else {
    origin = { ...base, origin: "invented", text: clip(s.title), label: null };
  }
  add(origin, "origin", beatId(first));

  // ---- the beats, each caused by the one before
  beats.forEach((b, i) => {
    add(
      {
        id: beatId(b), kind: "beat", cause: i === 0 ? "o" : beatId(beats[i - 1]), ring: 1, at: b.createdAt,
        text: clip(b.summary || b.page?.headline || s.title), label: null, account: null,
        href: b.postId != null ? `/post/${b.postId}` : null, beatKind: b.kind,
      },
      i === 0 ? "origin" : "beat",
      beatId(b),
      b.heat,
    );
  });

  /** Post id -> the node standing for it. */
  const nodeOfPost = new Map<number, string>();
  if (originPost) nodeOfPost.set(originPost.id, "o");
  /** A post's cause: the nearest shown post it answers, else its beat. */
  const causeOf = (p: Row) => {
    const seen = new Set<number>();
    let cur = p.reply_to ?? p.quote_of;
    while (cur != null && !seen.has(cur)) {
      seen.add(cur);
      const n = nodeOfPost.get(cur);
      if (n) return n;
      const r = byId.get(cur);
      if (!r) break;
      cur = r.reply_to ?? r.quote_of;
    }
    return beatAt(p.created_at);
  };

  // ---- accounts for every author and tier-list member
  const handles = new Set<string>();
  const media = new Map<number, PostMedia>();
  for (const r of rows) {
    handles.add(r.author.toLowerCase());
    const m = parseMedia(r.media);
    if (!m) continue;
    media.set(r.id, m);
    if (m.kind === "tiers") for (const row of m.tiers) for (const x of row.members) handles.add(x.handle.toLowerCase());
  }
  const articles = conn
    .prepare("SELECT * FROM articles WHERE storyline_id = ? AND created_at <= ? ORDER BY created_at")
    .all(s.id, t) as unknown as ArticleRow[];
  for (const a of articles) handles.add(a.outlet.toLowerCase());
  const lite = new Map<string, AccountLite>(
    handles.size
      ? (
          conn
            .prepare(`SELECT * FROM accounts WHERE LOWER(handle) IN (${qs(handles.size)})`)
            .all(...handles) as unknown as AccountRow[]
        ).map((r) => [r.handle.toLowerCase(), toLite(r)])
      : [],
  );
  const who = (h: string) => lite.get(h.toLowerCase()) ?? null;

  // ---- pages: a beat's own page, or one behind a post's link
  const beatOfPage = new Map(beats.flatMap((b) => (b.page ? [[b.page.id, beatId(b)] as const] : [])));
  const carrier = new Map<number, Row>(); // page id -> the first post that links it
  for (const r of rows) if (r.article_id != null && !carrier.has(r.article_id)) carrier.set(r.article_id, r);
  for (const card of articleCards(articles)) {
    const post = carrier.get(card.id);
    const cause = beatOfPage.get(card.id) ?? (post ? causeOf(post) : beatAt(card.createdAt));
    const id = add(
      {
        id: `a${card.id}`, kind: "page", cause, ring: 0, at: card.createdAt, text: clip(card.headline), label: null,
        account: card.outlet, href: `/news/${card.id}`, page: card,
      },
      "page",
      beatAt(card.createdAt),
    );
    if (post) nodeOfPost.set(post.id, id);
  }

  // ---- posts, in the order they were written so a cause is always placed first
  const crowd = new Map<string, Row[]>(); // beat node -> ordinary replies, before choosing
  let chatter = 0;
  for (const r of rows) {
    if (nodeOfPost.has(r.id)) continue;
    const beat = beatAt(r.created_at);
    const m = media.get(r.id);
    const account = who(r.author);
    if (m?.kind === "meme" || m?.kind === "tiers") {
      const faces =
        m.kind === "tiers" ? m.tiers.flatMap((row) => row.members.flatMap((x) => who(x.handle) ?? [])).slice(0, 4) : undefined;
      const caption = m.kind === "meme" ? [m.top, m.bottom].filter(Boolean).join(" / ") : "";
      nodeOfPost.set(
        r.id,
        add(
          {
            id: `p${r.id}`, kind: m.kind === "meme" ? "meme" : "tiers", cause: causeOf(r), ring: 0, at: r.created_at,
            text: clip(caption || r.text), label: null, account, href: `/post/${r.id}`,
            thumb: m.kind === "meme" ? MEME_TEMPLATES.find((x) => x.id === m.template)?.image : undefined, faces,
          },
          "meme",
          beat,
          r.t_likes,
        ),
      );
    } else if (NOTABLE.has(r.akind)) {
      const answers = r.reply_to != null || r.quote_of != null;
      nodeOfPost.set(
        r.id,
        add(
          {
            id: `p${r.id}`, kind: "post", cause: causeOf(r), ring: 0, at: r.created_at, text: clip(r.text), label: null,
            account, href: `/post/${r.id}`,
          },
          answers ? "reply" : "post",
          beat,
          r.t_likes,
        ),
      );
    } else if (r.reply_to != null || r.quote_of != null) {
      crowd.set(beat, [...(crowd.get(beat) ?? []), r]);
    } else {
      chatter++;
    }
  }

  // ---- ordinary replies: the biggest few by name, the rest as one count per beat
  for (const [beat, list] of crowd) {
    const ranked = [...list].sort((a, b) => b.t_likes - a.t_likes);
    for (const r of ranked.slice(0, PER_BEAT.crowd)) {
      nodeOfPost.set(
        r.id,
        add(
          {
            id: `p${r.id}`, kind: "post", cause: causeOf(r), ring: 0, at: r.created_at, text: clip(r.text), label: null,
            account: who(r.author), href: `/post/${r.id}`,
          },
          "crowd",
          beat,
          r.t_likes,
        ),
      );
    }
    const rest = ranked.slice(PER_BEAT.crowd);
    if (!rest.length) continue;
    // Hang the count from what most of those replies answer.
    const tally = new Map<string, number>();
    for (const r of rest) tally.set(causeOf(r), (tally.get(causeOf(r)) ?? 0) + 1);
    const cause = [...tally].sort((a, b) => b[1] - a[1])[0][0];
    const arrivals = rest.map((r) => r.created_at).sort((a, b) => a - b);
    const target = cands.find((c) => c.node.id === cause)?.node;
    add(
      {
        id: `r:${beat}`, kind: "replies", cause, ring: 0, at: arrivals[0], text: "", label: null, account: null,
        href: target?.href && !target.external && target.kind !== "page" ? target.href : null,
        faces: rest.flatMap((r) => who(r.author) ?? []).filter((a, i, all) => all.findIndex((x) => x.handle === a.handle) === i).slice(0, 3),
        arrivals,
      },
      "replies",
      beat,
      rest.length,
    );
  }

  // ---- what the story moved: prices, trends, notes, polls, new storylines
  const moves = conn
    .prepare(
      `SELECT id, ticker, t, pct, reason FROM stock_ticks
       WHERE storyline_id = ? AND reason IS NOT NULL AND pct IS NOT NULL AND t <= ? ORDER BY t`,
    )
    .all(s.id, t) as unknown as { id: number; ticker: string; t: number; pct: number; reason: string }[];
  for (const m of moves) {
    const beat = beatAt(m.t, MOVE_SLACK);
    add(
      {
        id: `m${m.id}`, kind: "move", cause: beat, ring: 0, at: m.t, text: clip(m.reason), label: null, account: null,
        href: "/markets", ticker: m.ticker, pct: m.pct,
      },
      "move",
      beat,
      Math.abs(m.pct),
    );
  }
  const trends = conn
    .prepare("SELECT id, label, created_at FROM trends WHERE storyline_id = ? AND created_at <= ? ORDER BY created_at, id")
    .all(s.id, t) as unknown as { id: number; label: string; created_at: number }[];
  for (const tr of trends) {
    const beat = beatAt(tr.created_at, MOVE_SLACK);
    add(
      {
        id: `t${tr.id}`, kind: "trend", cause: beat, ring: 0, at: tr.created_at, text: clip(tr.label), label: null,
        account: null, href: `/explore?q=${encodeURIComponent(tr.label)}`,
      },
      "trend",
      beat,
    );
  }
  const ids = rows.map((r) => r.id);
  /** A note or poll hangs from its post's node, or from wherever that post would have hung. */
  const onPost = (r: Row) => nodeOfPost.get(r.id) ?? causeOf(r);
  if (ids.length) {
    const notes = conn
      .prepare(`SELECT post_id, text, created_at FROM notes WHERE post_id IN (${qs(ids.length)}) AND created_at <= ?`)
      .all(...ids, t) as unknown as { post_id: number; text: string; created_at: number }[];
    for (const n of notes) {
      const r = byId.get(n.post_id)!;
      add(
        {
          id: `n${n.post_id}`, kind: "note", cause: onPost(r), ring: 0, at: n.created_at, text: clip(n.text), label: null,
          account: null, href: `/post/${n.post_id}`,
        },
        "fact",
        beatAt(r.created_at),
      );
    }
    const polls = conn
      .prepare(`SELECT post_id, options FROM polls WHERE post_id IN (${qs(ids.length)})`)
      .all(...ids) as unknown as { post_id: number; options: string }[];
    for (const p of polls) {
      const r = byId.get(p.post_id)!;
      let options: string[] = [];
      try {
        options = (JSON.parse(p.options) as unknown[]).map(String);
      } catch {
        // an unreadable poll still shows its post's words
      }
      add(
        {
          id: `q${p.post_id}`, kind: "poll", cause: onPost(r), ring: 0, at: r.created_at,
          text: clip(options.join(" · ") || r.text), label: clip(r.text), account: who(r.author), href: `/post/${p.post_id}`,
        },
        "fact",
        beatAt(r.created_at),
      );
    }
  }
  for (const child of map.storylines.filter((x) => x.parentId === s.id)) {
    const opening = beatsOf(child.id)[0];
    if (!opening) continue;
    const beat = beatAt(opening.createdAt);
    add(
      {
        id: `s${child.id}`, kind: "spinoff", cause: beat, ring: 0, at: opening.createdAt, text: clip(child.title),
        label: null, account: null, href: `/world/ripple?storyline=${child.id}`, storylineId: child.id,
      },
      "page",
      beat,
    );
  }

  return finish(t, head, cands, chatter);
}

// ------------------------------------------------------------ the cap

const leftOf = (c: Candidate): Left =>
  c.cls === "beat" ? "beats" : c.cls === "post" || c.cls === "reply" ? "posts" : c.cls === "meme" ? "memes"
    : c.cls === "crowd" || c.cls === "replies" ? "replies" : "other";

/** Apply the caps, re-hang what lost its cause, and set rings and times. */
function finish(t: number, head: RippleResponse["storyline"], cands: Candidate[], chatter: number): RippleResponse {
  const removed = new Set<string>();
  const left = new Map<Left, number>();
  const count = (k: Left, n: number) => n > 0 && left.set(k, (left.get(k) ?? 0) + n);
  if (chatter) count("posts", chatter);
  const byId = new Map(cands.map((c) => [c.node.id, c]));
  const rank = (c: Candidate) => CLASSES.indexOf(c.cls);

  const drop = (c: Candidate) => {
    removed.add(c.node.id);
    if (c.cls === "crowd") {
      // A dropped reply joins its beat's count, when the beat has one.
      const tally = byId.get(`r:${c.beat}`);
      if (tally && !removed.has(tally.node.id)) {
        tally.node.arrivals = [...(tally.node.arrivals ?? []), c.node.at].sort((a, b) => a - b);
        tally.node.at = tally.node.arrivals[0];
        return;
      }
      count("replies", 1);
    } else if (c.cls === "replies") {
      count("replies", c.node.arrivals?.length ?? 0);
    } else {
      count(leftOf(c), 1);
    }
  };

  // Per beat: the strongest of each class.
  const groups = new Map<string, Candidate[]>();
  for (const c of cands) {
    const limit = PER_BEAT[c.cls];
    if (limit == null || c.cls === "crowd") continue;
    const key = `${c.beat}|${c.cls}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  for (const [key, list] of groups) {
    const limit = PER_BEAT[key.split("|")[1] as Cls]!;
    [...list].sort((a, b) => b.score - a.score || a.seq - b.seq).slice(limit).forEach(drop);
  }
  // Each beat gets an equal share of the room the beats leave, so a long story
  // keeps some depth around every beat rather than all of it around the first.
  const beats = cands.filter((c) => c.cls === "beat" || c.node.kind === "beat").length;
  const share = Math.max(3, Math.floor((MAX_NODES - 1 - beats) / Math.max(1, beats)));
  const perBeat = new Map<string, Candidate[]>();
  for (const c of cands) {
    if (removed.has(c.node.id) || c.cls === "origin" || c.cls === "beat") continue;
    perBeat.set(c.beat, [...(perBeat.get(c.beat) ?? []), c]);
  }
  for (const list of perBeat.values()) {
    if (list.length <= share) continue;
    [...list].sort((a, b) => rank(a) - rank(b) || b.score - a.score || a.seq - b.seq).slice(share).forEach(drop);
  }
  // Overall: the last classes, weakest first. The origin and first beat always stay.
  const order = cands
    .filter((c) => c.cls !== "origin")
    .sort((a, b) => rank(b) - rank(a) || a.score - b.score || b.seq - a.seq);
  for (const c of order) {
    if (cands.length - removed.size <= MAX_NODES) break;
    if (!removed.has(c.node.id)) drop(c);
  }

  const kept = cands.filter((c) => !removed.has(c.node.id)).map((c) => c.node);
  const nodes = new Map(kept.map((n) => [n.id, n]));
  /** The nearest kept cause. */
  const causeOf = (n: RippleNode): string | null => {
    let cur = n.cause;
    while (cur != null && !nodes.has(cur)) cur = byId.get(cur)?.node.cause ?? null;
    return cur ?? (n.id === "o" ? null : "o");
  };
  for (const n of kept) n.cause = causeOf(n);
  const done = new Set<string>();
  const settle = (n: RippleNode) => {
    if (done.has(n.id)) return;
    done.add(n.id);
    const c = n.cause != null ? nodes.get(n.cause) : undefined;
    if (!c) return;
    settle(c);
    if (n.at < c.at) n.at = c.at;
    if (n.kind !== "beat") n.ring = c.ring + 1;
  };
  kept.forEach(settle);
  const seqOf = new Map(cands.map((c) => [c.node.id, c.seq]));
  kept.sort((a, b) => a.at - b.at || a.ring - b.ring || seqOf.get(a.id)! - seqOf.get(b.id)!);

  return {
    now: t,
    storyline: head,
    nodes: kept,
    left: (["replies", "posts", "memes", "beats", "other"] as const).flatMap((kind) =>
      left.get(kind) ? [{ kind, count: left.get(kind)! }] : [],
    ),
  };
}
