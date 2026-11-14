# Tangents: build contracts

Tangents is a single-player copy of X. The user is the only real person; famous
figures, news outlets and ordinary people are simulated by two model calls per
"tick". The world is seeded by real headlines, exaggerated for entertainment, and
it remembers everything. This file is the working brief for every workstream.

## Ground rules

1. **No product decisions.** Build what is written here. If something
   user-visible is not covered (wording, a feature, the cast, content rules, how
   something should look or behave), pick nothing: finish the rest and list the
   open point in your report. Implementation details are yours to decide.
2. **One owner per file.** Create and edit only the files listed for your
   workstream. Everything marked FROZEN (most of `src/lib`, shared components,
   `globals.css`) is read-only. If you need a change in a frozen or foreign
   file, describe it in your report instead of making it.
3. **Do not run** `npm run dev`, `npm run build`, a browser, or anything that
   writes `.next/`. Other agents share this working tree. Verify with
   `npx tsc --noEmit` and `npx eslint <your files>` only. Both must be clean for
   your files when you finish. Errors in files you do not own are not yours to fix.
4. **No new dependencies** and no git commands that change history (no commit,
   stash, checkout, reset).
5. Next.js 16 (App Router), React 19, TypeScript, Tailwind 4. This Next version
   differs from older ones: route handler and page `params` are a `Promise`
   (`const { id } = await params`), and docs live in
   `node_modules/next/dist/docs/` if you need them. `cacheComponents` is off.
6. Match the existing code style: small modules, a short header comment per
   file, comments only where the reason is not obvious.
7. Finish with a short report: what you built, what you could not verify without
   running the app, and any open product points or contract changes you wanted.

## Shared, frozen modules

| File | What it gives you |
| --- | --- |
| `src/lib/types.ts` | Every DTO and API payload. The UI and the routes agree through these. |
| `src/lib/db.ts` | `db()` (node:sqlite `DatabaseSync`), full schema, row types, `now()` (simulation clock, always use it instead of `Date.now()` for anything stored or compared with stored times), `tx()`, `kvGet/kvSet`, `userHandle()`, `pairKey()`, `advanceClock()`, snapshots, `resetWorld()` |
| `src/lib/write.ts` | `insertPost()`, `insertNotification()`: the only way to add posts and notifications |
| `src/lib/engagement.ts` | `targetsFor()`, `shownCounts()` |
| `src/lib/cast.ts` | `FIGURES`, `OUTLETS`, `CROWD`, `CAST`, `STOCKS`, `avatarPath()` |
| `src/lib/schemas.ts` | `DirectorSchema`, `CrowdSchema` and their inferred types |
| `src/lib/llm.ts` | `generate({ role, system, user, schema })`, `backend()` |
| `src/lib/format.ts` | `formatCount`, `timeAgo`, `fullTime`, `formatPrice`, `formatPct` |
| `src/lib/client.ts` | Browser only: `useApi`, `getJson`, `postJson`, `simNow`, `useSimNow`, `useMe`, `refreshMe`, `track`, `useDwell`, `bus` |
| `src/components/icons.tsx` | `<Icon name size />` with X's glyphs |
| `src/components/Logo.tsx`, `VerifiedBadge.tsx`, `Avatar.tsx`, `Sparkline.tsx` | Finished shared components |
| `src/app/globals.css` | X dark theme tokens: `bg-x-bg`, `text-x-text`, `text-x-dim`, `border-x-border`, `x-blue`, `x-pink`, `x-green`, `x-red`, `x-gold`, `x-card`, `x-search`, `x-hover`, `x-hover-soft`, `x-button` |

Modules with frozen signatures and a named owner (stubs exist; the owner replaces
the body, everyone else may call them): `src/lib/sim/index.ts`, `src/lib/news.ts`,
`src/lib/stocks.ts`, `src/lib/prefs.ts`, `src/lib/prompts.ts`,
`src/lib/personas.ts`, `src/components/Shell.tsx`, `src/components/PostCard.tsx`,
`src/components/Onboarding.tsx`.

Time: a post, article, notification or price tick with a timestamp in the future
is scheduled, not visible. Every read filters on `<= now()`.

## API routes

All routes return JSON typed in `types.ts`. Errors: `{ "error": string }` with a
4xx status. `[id]` and `[handle]` are dynamic segments.

| Route | Owner | Request | Response |
| --- | --- | --- | --- |
| `GET /api/me` | Feed | | `MeResponse` |
| `POST /api/me` | Feed | `OnboardRequest` | `MeResponse` |
| `GET /api/feed?tab=foryou\|following&cursor=&after=` | Feed | | `FeedResponse` |
| `POST /api/post` | Feed | `CreatePostRequest` | `CreatePostResponse` |
| `GET /api/post/[id]` | Feed | | `ThreadResponse` |
| `POST /api/interact` | Feed | `{ events: InteractionEvent[] }` | `{ ok: true }` |
| `GET /api/profile/[handle]?tab=posts\|replies` | Feed | | `ProfileResponse` |
| `GET /api/sidebar` | Feed | | `SidebarResponse` |
| `GET /api/explore?q=` | Feed | | `ExploreResponse` |
| `GET /api/article/[id]` | Feed | | `ArticleResponse` |
| `GET /api/notifications` | Feed | | `NotificationsResponse` |
| `GET /api/world` | Feed | | `WorldResponse` |
| `GET /api/markets` | News | | `MarketsResponse` |
| `GET /api/sim` | Sim | | `SimStatus` |
| `POST /api/sim` | Sim | `{ action: SimAction }` | `SimStatus` |

---

## Workstream: X interface, core

**Owns:** `src/components/Shell.tsx`, `src/components/PostCard.tsx`, any new files
under `src/components/core/`, `src/app/page.tsx`, `src/app/post/[id]/page.tsx`,
`src/app/[handle]/page.tsx`.

The goal is a desktop copy of X's dark theme that a regular X user would take
for the real thing: same layout, sizes, colours, type, hover states and
interactions. All data comes from the API routes above. Wording matches X.

**Shell** (props in the stub are frozen). Three columns centred on the page:

- Left navigation, 275px, sticky full height, content right-aligned to the
  timeline. Top to bottom: `<Logo>` in a 50px round hover target linking home;
  nav items Home `/`, Explore `/explore`, Notifications `/notifications` (blue
  count bubble from `SidebarResponse.unread`), Markets `/markets` (icon `chart`),
  Behind the scenes `/world` (icon `globe`), Profile `/<my handle>`. Items are
  26px icon plus 20px label, 12px padding, fully rounded, `bg-x-hover` on hover,
  bold when active. Then the Post button: 52px tall, 90% wide, fully rounded,
  `bg-x-button` with black bold 17px text; it opens the composer dialog. Then the
  simulation controls (not on X, keep them quiet and small): a status line
  (running / paused / "generating" while `sim.busy`, plus `sim.error` if set) and
  buttons Pause or Resume, Skip a day, Save, Restore (disabled without
  `sim.hasSnapshot`). They `POST /api/sim` then `bus.emit("sim")`. Pinned at the
  bottom: the account pill (avatar, name, @handle, `more` icon).
- Centre column, 600px, `border-x border-x-border`, min full height. Sticky
  header 53px tall, `backdrop-blur` over black at 65% opacity. Default header:
  optional back arrow (round 36px hover target, `router.back()`), title 20px
  bold, optional subtitle 13px dim. `header` prop replaces it.
- Right column, 350px, sticky. Search field (44px, fully rounded, `bg-x-search`,
  search icon, placeholder "Search"; focus gives a blue border and black
  background; Enter goes to `/explore?q=`). Then cards with a 1px `x-border`
  border and 16px radius: **Markets** (not on X: four rows of ticker, name,
  `<Sparkline>`, price, coloured percent; "Show more" to `/markets`), **What’s
  happening** (trend rows: category 13px dim, label 15px bold, "12.4K posts"
  13px dim; row click goes to `/explore?q=<label>`; "Show more" to `/explore`),
  **Who to follow** (avatar, name with badge, @handle, Follow button: 32px,
  `bg-x-button`, black bold 14px). Card titles are 20px extra-bold.
- Shell polls `GET /api/sidebar` every 5 seconds and feeds both side columns. It
  also renders `<Onboarding />` (from `src/components/Onboarding.tsx`).
- Hide the right column below 1000px wide and collapse the left navigation to
  icons below 1280px, as X does. No phone layout.

**PostCard** (props frozen), three variants:

- `feed`: 16px horizontal and 12px vertical padding, bottom border,
  `hover:bg-x-hover-soft`, pointer cursor, whole row opens `/post/<id>` and
  tracks `open`. 40px avatar on the left. Header line: name (bold, truncates),
  badge, `@handle`, "·", `timeAgo` (all dim), and a `more` button at the far
  right that opens a small menu with "Not interested in this post" (tracks
  `not_interested` and removes the row) and "Follow/Unfollow @handle". A reply
  shows "Replying to @handle" (dim, handle blue). Text is 15px/20px,
  `whitespace-pre-wrap`, with @mentions (to `/<handle>`), #hashtags (to
  `/explore?q=%23tag`), $CASHTAGS (to `/markets`) and URLs in blue. Text longer
  than 280 characters is cut with a blue "Show more" that opens the post. A
  quoted post renders as a bordered 16px-radius card (20px avatar, name, badge,
  handle, time, text) that opens the quoted post. An `article` renders as a
  bordered card (outlet name dim, headline bold, standfirst dim clamped to two
  lines) that opens `/news/<id>`. Action row, 13px dim, max 425px wide: reply
  (blue on hover), repost (green; shows a two-item menu "Repost" / "Quote"),
  like (pink, filled when liked), views (blue), then bookmark and share at the
  right. Icons are 18.75px inside a 34px round hover halo tinted with the
  action colour; counts use `formatCount` and are hidden at zero.
- `detail`: the focused post. Avatar with name and handle stacked beside it,
  text 17px/24px, then `fullTime · <views> Views` (dim) with a border below,
  then a larger action row (22px icons, spread evenly) with a border below.
- `thread`: as `feed` without the bottom border and with a 2px vertical
  connector from under the avatar to the next row.
- Like, repost and bookmark are optimistic: update local state, call `track()`
  with `like`/`unlike`, `repost`/`unrepost`, `bookmark`/`unbookmark`. Clicking an
  avatar or name opens the profile and tracks `profile`. The reply icon opens
  the composer dialog replying to that post; "Quote" opens it quoting the post.
  Feed rows report dwell time through `useDwell(post.id)`.

**Composer**: inline on Home ("What’s happening?", 20px placeholder) and on the
post page ("Post your reply", button "Reply"), and as a dialog (600px, 16px
radius, black, over a `rgba(91,112,131,0.4)` backdrop; shows the parent post
when replying or the quoted card when quoting). Avatar, auto-growing textarea,
blue `media` and `emoji` icons (decorative), a character ring that appears near
280, and the Post button (36px, fully rounded, `bg-x-button`, black bold text,
half opacity when disabled). 280-character limit. `POST /api/post`, then
`bus.emit("posted")` and show the returned post immediately.

**Home** (`/`): header is two tabs, "For you" and "Following", each half width;
active tab is bold with a 4px tall, 56px wide, fully rounded blue bar under it;
inactive is dim medium weight. Below: composer, then the timeline. Initial load
is `GET /api/feed?tab=`; infinite scroll with `cursor`; every 4 seconds poll
`?after=<newest createdAt seen>` and collect arrivals behind a "Show N posts"
bar (full width, blue text, centred, bottom border) that reveals them on click.
The user's own new posts appear at once. While the world has no posts yet show
X's blue ring spinner. Reload on `bus` "sim" events.

**Post** (`/post/[id]`): Shell `title="Post"` with back. Ancestors as `thread`
rows, the post as `detail`, the reply composer, then replies as `feed` rows.
Poll every 5 seconds so new replies appear.

**Profile** (`/[handle]`): Shell with back, title = name with badge, subtitle
"N posts". 200px banner in `account.banner`, 134px avatar with a 4px black
border overlapping it, Follow / Following button at the right (Following is
outlined and turns red "Unfollow" on hover; own profile shows an inert outlined
"Edit profile"), name 20px extra-bold with badge, @handle, bio, location and
"Joined <joined>" in dim text, "N Following · N Followers", tabs Posts /
Replies, then the posts. Follow tracks `follow`/`unfollow`, then
`bus.emit("follow")`.

---

## Workstream: secondary screens

**Owns:** `src/app/explore/page.tsx`, `src/app/news/[id]/page.tsx`,
`src/app/markets/page.tsx`, `src/app/notifications/page.tsx`,
`src/app/world/page.tsx`, `src/components/Onboarding.tsx`, any new files under
`src/components/secondary/`.

Every screen is a client component wrapped in `<Shell>` and lists posts with
`<PostCard post={...} />`. Both are stubs today and will be replaced by the core
workstream; code against their frozen props. Follow the X look described in the
core section above (tokens, 15px/20px text, dim secondary text, 16px card radius,
bottom borders between rows, `hover:bg-x-hover-soft` on clickable rows).

- **Explore** (`/explore`, `?q=`): header holds a search field like the right
  column's (prefilled with `q`, Enter updates the URL). With `q`: matching posts.
  Without: a "Today’s News" section (each row: headline 15px bold, then outlet
  avatar 16px, outlet name, "·", `timeAgo`, all 13px dim; opens `/news/<id>`),
  then "Trending" (rank and category 13px dim, label bold, "N posts" dim; opens
  `/explore?q=<label>`). Poll every 10 seconds.
- **News story** (`/news/[id]`): Shell with back, title "Today’s News". Headline
  (26px extra-bold, tight leading), outlet row (avatar, name, badge, @handle,
  `fullTime`), standfirst (17px dim), body paragraphs split on blank lines
  (17px/26px), then a "Posts" heading and the related posts. Track `open` once.
- **Markets** (`/markets`): Shell title "Markets". One row per ticker: ticker
  bold with the name dim beneath, a wider `<Sparkline>`, price, and the day's
  percent in a small rounded pill (green up, red down). Under it "What moved the
  market": each move with `timeAgo`, ticker, signed percent and the reason. Poll
  every 5 seconds.
- **Notifications** (`/notifications`): Shell title "Notifications". X's row
  styles: like (pink filled heart at the left, 32px actor avatars, "**Name** and
  N others liked your post", the target post's text dim beneath), repost (green
  icon, "reposted your post"), follow (blue person icon, "followed you" or "and
  N others followed you"); reply, quote and mention render the post itself with
  `<PostCard>`. Unread rows get a faint blue tint. Poll every 5 seconds.
- **Behind the scenes** (`/world`): Shell title "Behind the scenes". Not on X,
  so design it in the same visual language. Sections: **Storylines** as a tree
  (children indented under their parent): title, an origin chip (for
  `headline` origin show the real headline text), domain and tone, heat, beat
  count, participant avatars, open or dormant, running summary. **Relationships**:
  the two accounts, a bar from -10 to +10 (red to green) and the note. **Facts**:
  dated one-line list. **Your algorithm**: taste weights grouped by kind with
  signed bars and the number of signals recorded. **Model usage**: calls and
  tokens by role. Poll every 5 seconds.
- **Onboarding**: a modal in X's sign-up dialog style (600px, 16px radius, black
  panel, `<Logo>` centred at the top) shown when `useMe()` returns `null`
  (render nothing while `undefined` or once there is a user). Title "Create your
  account"; fields Name and Handle (floating-label inputs as on X, the handle
  shown with an @ prefix, letters, digits and underscore, max 15); an interest
  choice with three options, "Tech and business", "Fashion, celebrities and pop
  culture", "Both"; a full-width "Sign up" button (`bg-x-button`, black bold
  text, disabled until valid). `POST /api/me`, show the server's error message
  if the handle is rejected, then `refreshMe()`.

---

## Workstream: feed and personalisation

**Owns:** `src/lib/prefs.ts`, new files `src/lib/views.ts`, `src/lib/feed.ts` (and
other new `src/lib/feed-*.ts` if needed), and every route marked Feed in the
table, under `src/app/api/`.

`src/lib/views.ts` turns rows into DTOs: `postViews(ids)`, account helpers.
Counts shown on a post: `shownCounts(targets, now() - created_at)`, with replies
at least the real number of visible replies, plus 1 on likes / reposts when the
user has liked / reposted. `avatar` comes straight from `accounts.avatar`.

Routes:

- `GET /api/me`: the user account or `null`. `POST /api/me`: validate (name 1 to
  50 characters; handle 1 to 15 of letters, digits, underscore; not already an
  account, case-insensitive), create the `user` account (no badge, 0 followers,
  joined = current month and year, banner `#333639`), follow the figures and
  outlets whose domain matches the interest (`both` = tech and pop; politics
  accounts are never auto-followed), seed domain weights (+3 for each chosen
  domain), call `heartbeat()`.
- `GET /api/feed`: calls `heartbeat()`. Candidates are visible top-level posts
  (`reply_to IS NULL`, quotes included), not hidden by the user.
  - `tab=following`: authors the user follows plus the user, newest first.
  - `tab=foryou`: order by `created_at + boost`, where `boost` is the post's
    affinity mapped to between -30 and +30 minutes. Affinity sums the user's
    weights for the post's author, topics, domain, tone and storyline and
    squashes the sum (for example `tanh(sum / 10)`). One slot in eight is given
    to the newest not-yet-shown post with zero or negative affinity, so the feed
    keeps exploring.
  - Page size 30. `cursor` is opaque to the client: return `nextCursor` and
    accept it back. `after=<ms>` returns only posts with `created_at > after`,
    newest first, unranked, at most 50, `nextCursor: null`.
- `POST /api/post`: needs a user; text 1 to 280 characters after trimming.
  `insertPost` at `now()`, inheriting storyline, domain, tone and topics from the
  parent or quoted post. Credit the taste profile as a `reply` (or a repost for a
  quote) on the parent. Call `onUserPost(id)`. Return the `PostView`.
- `GET /api/post/[id]`: ancestors oldest first, the post, visible direct replies
  ordered: the post author's own replies, then the user's, then by like target.
- `POST /api/interact`: `recordInteractions(events)`. Also apply state: like,
  repost and bookmark flags in `viewer_state`; `not_interested` sets `hidden`;
  `follow`/`unfollow` update `follows`, the account's `followers` (plus or minus
  1) and the user's `following`.
- `GET /api/profile/[handle]`: `tab=posts` is top-level posts, `tab=replies` is
  everything by the account; newest first, 50. 404 for an unknown handle.
- `GET /api/sidebar`: calls `heartbeat()`. Five trends (recent first, weighted
  by heat and the user's domain affinity, one per label), the four tickers with
  the largest absolute change today from `stockViews()`, three accounts to
  follow (figures and outlets not yet followed, best affinity first),
  `simStatus()`, unread notification count.
- `GET /api/explore`: ten trends, the ten newest visible articles as cards, and
  with `q` up to 30 newest visible posts whose text, author name or handle
  contains it (case-insensitive).
- `GET /api/article/[id]`: the article and up to 30 top-level posts from its
  storyline, most liked first. 404 if missing or not yet visible.
- `GET /api/notifications`: 50 newest visible, then mark them read. Likes carry
  `count`; `actors` is the stored actor.
- `GET /api/world`: all storylines (open first, then newest), relationships with
  a non-zero score (strongest first), the 100 newest facts, `tasteProfile()`,
  and usage totals from `llm_calls`.

Personalisation (`src/lib/prefs.ts`):

| Signal | Weight |
| --- | --- |
| `follow` (author only) | +6, `unfollow` -6 |
| a reply by the user | +5 |
| `repost` or a quote | +4, `unrepost` -4 |
| `like` | +3, `unlike` -3 |
| `bookmark` | +3, `unbookmark` -3 |
| `open` | +1.5 |
| `profile` (author only) | +1 |
| `dwell` | +0.5 per 3 seconds, capped at +2 per event |
| `skip` | -0.2 |
| `not_interested` | -5 |

Each signal on a post is credited to five keys in `prefs`: `author`, each
`topic`, `domain`, `tone`, `storyline` (the id as a string). Log every event in
`interactions`. `decayPrefs()` multiplies every weight by 0.98 and deletes
weights under 0.05 in absolute value. `tasteSummary()` returns the top three or
four positive and negative keys per kind (authors as handles, topics, tones,
domains) and the total signal count; `tasteProfile()` returns the strongest 40
weights with display labels (account name, storyline title).

---

## Workstream: simulation engine

**Owns:** `src/lib/sim/` (keep `index.ts` as the public surface), `src/app/api/sim/route.ts`.

Calls into other workstreams through frozen signatures only: `generate` (llm),
`directorSystem/directorUser/crowdSystem/crowdUser` (prompts; stubs return
placeholders today), `pickHeadlines/markHeadlineUsed/refreshHeadlines` (news),
`primeQuotes/ensureStockHistory/scheduleMoves/noiseTick/startNewDay/digestStocks`
(stocks), `tasteSummary/decayPrefs` (prefs), `insertPost/insertNotification`.

**State** lives on `globalThis` so it survives hot reload: paused flag (persisted
in `kv`), busy, last heartbeat, tick counter (persisted), last tick time, last
error, the pending user-post queue.

**Loop.** `heartbeat()` stamps the time and makes sure one 5-second interval is
running. The interval starts a tick when: not paused, not busy, a user account
exists, a heartbeat arrived within 60 seconds, and `TICK_SECONDS` (env, default
40) have passed since the last tick started. Ticks never overlap: one at a time,
behind a promise chain. `onUserPost(id)` queues a reaction tick that runs as
soon as the current tick ends, ahead of the schedule. A paused world stays
quiet: queued reactions wait until it is resumed or a manual `tick` is run.

**First run.** When the user exists and `kv` has no `bootstrapped` flag:
`await refreshHeadlines()`, `await primeQuotes()`, `ensureStockHistory()`, then
three ticks in `bootstrap` mode whose posts are back-dated across the last three
hours (one hour window each, the last ending at `now()`), then set the flag.

**One tick** (`mode`: `normal`, `user_post`, `next_morning`, `bootstrap`):

1. Build a `WorldDigest`: the six hottest open storylines (by recency then heat)
   each with its last four posts; every relationship with a non-zero score (30
   most recently changed); the 50 newest facts with age in days; the 15 newest
   visible top-level posts by figures, outlets or the user; `pickHeadlines(8)`;
   `digestStocks()`; `tasteSummary()`; the user and their last five posts;
   `ticksSinceNewEvent` from `kv`; a formatted `simTime`. In `user_post` mode set
   `focus` to the post and its ancestors.
2. `generate({ role: "director", system: directorSystem(), user: directorUser(digest), schema: DirectorSchema })`.
   `null` means the model declined: record the error and end the tick.
3. Apply the beat inside `tx()`:
   - Posts may only be authored by figures and outlets, the article only by an
     outlet; drop anything else. Cap text at 1,200 characters.
   - Storyline: update the one named by `storyline_id` (summary, heat, tone,
     topics, `updated_at`, `beats + 1`, participants union, status open) or
     create one. Origin: `user` in `user_post` mode, else `headline` when
     `headline_id` is a real unused headline (then `markHeadlineUsed`), else
     `spinoff` when `parent_storyline_id` exists, else `original`.
   - Timing. The window is the tick length (40 seconds by default); in
     `user_post` mode the first reaction lands 3 to 8 seconds after `now()`; in
     `bootstrap` mode the window is that tick's back-dated hour. The article's
     post goes first, then the director's posts in order across the first 60% of
     the window with some jitter. A reply or quote is always at least 4 seconds
     after its target.
   - Refs: `p123` is post 123, `n1`... are this response's posts, `a1` is the
     article's post. An unknown ref becomes `null`.
   - Relationships: clamp `delta` to plus or minus 3 and the score to plus or
     minus 10; upsert with `pairKey`; both handles must be existing accounts.
   - Facts: store up to five. Trends: store up to three (refresh an existing
     label from the last two hours instead of duplicating it), with a synthetic
     `posts` count that grows with heat.
   - Stocks: known tickers only, clamp to plus or minus 12% (20% for crypto),
     `scheduleMoves(moves, <time of the first post + 20s>, storylineId)`. Call
     `noiseTick(now())` every tick.
   - The user: `user_follower_delta` clamped to 0 to 5,000 and applied only in
     `user_post` mode or when a new post replies to, quotes or mentions the
     user; add a `follow` notification with that count. Any new post that
     replies to a user post gives a `reply` notification, a quote gives `quote`,
     an @mention gives `mention`, each timed with the post. In `user_post` mode
     raise the user's post targets in line with the beat's heat and add a `like`
     notification from a crowd account with a matching count.
4. Crowd call: `generate({ role: "crowd", ... schema: CrowdSchema })` with a
   `CrowdInput` listing the new posts under their real `p` refs (plus the user's
   post in `user_post` mode, with `userPostRef` set), `count` 8 (6 in
   bootstrap). Keep only posts authored by crowd accounts, resolve refs, schedule
   each at least 5 seconds after its target across the rest of the window,
   inherit storyline, domain, tone and topics, and raise notifications as above.
   A failed crowd call does not fail the tick.
5. Housekeeping: `decayPrefs()`; storylines without a beat for 24 simulated
   hours become `dormant`; bump counters; reset or increment
   `ticksSinceNewEvent`; kick `refreshHeadlines()` in the background if 30 real
   minutes have passed.

**Actions.** `pause`, `resume`. `tick`: run one tick now and resolve when it is
done (waits for a running one first; works while paused). `skip_day`:
`advanceClock(24h)`, `startNewDay()`, then a `next_morning` tick. `save`:
`saveSnapshot()`. `restore` / `reset`: wait for any running tick, call
`restoreSnapshot()` / `resetWorld()`, clear in-memory state.

Errors never escape the loop: catch, log with `console.error`, keep the message
in `SimStatus.error`, clear it on the next good tick.

---

## Workstream: news, markets and avatars

**Owns:** `src/lib/news.ts`, `src/lib/stocks.ts`, new `src/lib/premises.ts`,
`src/app/api/markets/route.ts`, `scripts/fetch-avatars.mjs`, files written to
`public/avatars/`, and the `avatars` script entry in `package.json`.

- **Headlines** (`news.ts`). Sources, fetched with plain `fetch` and a 6-second
  timeout each, parsed without dependencies: Google News RSS search
  (`https://news.google.com/rss/search?q=<query>+when:2d&hl=en-US&gl=US&ceid=US:en`)
  with one query per domain built from the cast's names, plus the public feeds
  of TechCrunch, CNBC, Politico and TMZ. Strip the " - Source" suffix Google
  adds and keep the source name. Tag each headline `tech`, `pop` or `politics`
  (or `crossover` when it names people from two domains). Skip anything about
  deaths, violence, crimes, health crises or children: this is an entertainment
  product. Store new titles (the table is unique on title), keep at most a few
  hundred rows. If nothing could be fetched and the table has no unused rows,
  insert the bundled premises. `pickHeadlines(n)`: unused, freshest first, mixed
  across domains.
- **Premises** (`premises.ts`): about 20 evergreen, plausible headline-style
  premises spread across the domains, involving the cast (launches, feuds,
  brand deals, red carpets, hearings, earnings). They are a network-failure
  fallback and will be reviewed before use.
- **Prices** (`stocks.ts`). Current price = latest tick with `t <= now()`.
  `primeQuotes()`: best-effort live quotes (any free no-key source, 4-second
  timeout) written to `day_open` and a fresh tick, only while no tick has a
  reason. `ensureStockHistory()`: if a ticker has fewer than 40 ticks, back-fill
  a gentle random walk at 30-minute spacing ending at its current price.
  `scheduleMoves`: for each move, three or four steps over about 60 seconds
  after `at` that land on the target; the last step carries `reason`, `pct` and
  `storyline_id`. `noiseTick`: about 0.15% random movement for stocks and 0.4%
  for crypto. `startNewDay()`: `day_open` = current price. `stockViews()`:
  price, `dayOpen`, `changePct`, the last 40 visible prices as `history`, and the
  most recent reason from the last simulated 24 hours. `recentMoves()`: visible
  ticks that have a reason. `GET /api/markets` returns both.
- **Avatars** (`scripts/fetch-avatars.mjs`, run with `npm run avatars`). For
  every figure and outlet in `src/lib/cast.ts`, download the profile picture
  that account currently uses on X (use `avatarSource` when set; it is `null`
  for Jensen Huang, who has no X account: use a freely licensed public portrait
  for him) at the largest size available and save it as
  `public/avatars/<handle>.jpg`. Try more than one public source and report any
  account you could not fetch; never substitute a different person's image. Run
  the script and list the results.
