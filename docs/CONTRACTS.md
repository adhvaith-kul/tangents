# Tangents: working brief for coding agents

Tangents is a single-player copy of X. The user is the only real person; famous
figures, outlets, official accounts and ordinary people are simulated by model
calls. The world is seeded by real headlines, heightened for entertainment,
reacts to what the user does, learns what they engage with, and remembers
everything. `README.md` covers setup and use; this file is how the code is laid
out. It describes the code as it stands and names files rather than restating
constants, which drift: read the file before relying on a number.

## Ground rules for agents

1. **No product decisions.** Anything user-visible that is not decided (wording,
   a feature, the cast, content rules, how something looks or behaves) is not
   yours to choose. Finish the rest and list the open point in your report.
   Implementation details are yours.
2. **Edit only the files your brief names.** If you need a change somewhere
   else, describe it in your report instead of making it.
3. **Do not run** `npm run dev`, `npm run build`, a browser, or anything that
   writes `.next/`, unless your brief says to (see Testing rules). Verify with
   `npx tsc --noEmit` and `npx eslint <your files>`; both must be clean for the
   files you touched. Errors in files you did not touch are not yours to fix.
4. **No new dependencies** and no history-changing git (no commit, stash,
   checkout, reset, rebase) unless your brief asks for it.
5. Next.js 16 (App Router), React 19, TypeScript, Tailwind 4. This Next version
   differs from older ones (see `AGENTS.md`): docs are in
   `node_modules/next/dist/docs/`, and route handler and page `params` are a
   `Promise` (`const { id } = await params`). `cacheComponents` is off
   (`next.config.ts`): every screen fetches live data on the client.
6. Match the existing style: small modules, a short header comment per file,
   comments only where the reason is not obvious.
7. Finish with a short report: what you built, what you could not verify
   without running the app, and any open product points.

## Testing rules

These are the project owner's rules.

- Test on the isolated instance, never on the owner's world on port 3210:
  `TANGENTS_DATA_DIR=data-test NEXT_DIST_DIR=.next-test npx next dev --port 3213`.
  `TANGENTS_DATA_DIR` picks the database folder, `NEXT_DIST_DIR` the build
  folder (both read in `src/lib/db.ts` and `next.config.ts`).
- Hot reload updates code but not the open database. Any schema change
  (`SCHEMA` or `migrate()` in `src/lib/db.ts`) needs both dev servers restarted
  together.
- To stop a server, kill only the listening process:
  `lsof -ti tcp:PORT -sTCP:LISTEN`.
- Delete the build folder (`.next-test`) before restarting the test server. A
  server started on a build folder left by an earlier run can reload every
  page in a loop.

## Layout

| Path | Contents |
| --- | --- |
| `src/lib/` | Server logic, shared types, the simulation (`sim/`), persona briefs (`briefs/`). |
| `src/app/` | Pages and the JSON API (`api/`). |
| `src/components/` | UI, grouped by folder (below). |
| `public/` | Pictures: `avatars/` and `banners/` (downloaded by `npm run avatars`, `scripts/fetch-avatars.mjs`), `crowd/`, `headers/`, `logos/`, `memes/`. |
| `references/` | Optional real posts per account, git-ignored (`references/README.md`). |
| `data/` | The owner's world (`tangents.db`, `snapshot.db`). `data-test/` is the test instance's. |

Server-only modules (anything importing `db.ts`) must never be imported from a
client component. `types.ts`, `format.ts`, `sites.ts`, `client.ts` are the
shared or browser-safe ones.

## Module map: `src/lib`

### Data and plumbing

| Module | What it is for |
| --- | --- |
| `subjects.ts` | The registry of subjects (`tech`, `markets`, `pop`, `gaming`, `politics`, `sports`): key, labels, Settings description and search words, Explore tab, news category, headline feeds. Derives `Subject`, `Domain`, `SUBJECTS`, `DOMAINS`, `ExploreTab`. Browser-safe; every other list of subjects reads from it. |
| `interests.ts` | The narrower interests offered in the second sign-up step, per subject: label, topic tags and the accounts followed (`INTERESTS`). Browser-safe. |
| `types.ts` | Every DTO and API payload, `Settings` and `DEFAULT_SETTINGS`, `SimStatus`, `WorldDigest` (the director's input), story map types. The UI, routes and simulation agree through it. |
| `db.ts` | The SQLite connection (`db()`, `node:sqlite`), the whole `SCHEMA`, `migrate()` for older databases, seeding from the cast, row types, `tx()`, `kvGet/kvSet`, the clock (`now()`, `advanceClock()`), `userHandle()`, `pairKey()`, snapshots (`saveSnapshot`, `restoreSnapshot`, `hasSnapshot`) and `resetWorld()`. |
| `write.ts` | `insertPost()` and `insertNotification()`: the only functions that insert posts and notifications, used by the simulation and the user's own posting. |
| `engagement.ts` | `targetsFor()` gives a new post its target counts; `shownCounts()` makes the displayed numbers climb towards them as the post ages. |
| `views.ts` | Row-to-DTO mapping: `postViews()` (batched), `postView`, `accountView(s)`, `articleCards`, `articleView`. |
| `feed-http.ts` | Route helpers: `ok`, `fail`, `readJson`, `intParam`. |
| `feed.ts` | For you ranking and Following, trends, sidebar, Explore. |
| `feed-world.ts` | Reads for threads, profiles, articles, notifications, today's news card and the Behind the scenes data. |
| `feed-actions.ts` | Writes behind the routes: `onboard`, `createPost`, `deletePost`, `applyInteractions`, `interact`. |
| `polls.ts` | Poll views and `votePoll()`; displayed votes climb towards stored targets until `closes_at`. |
| `settings.ts` | `getSettings()` and `saveSettings()` over one JSON value in `kv`; unknown keys and out-of-range values are ignored. |
| `format.ts` | Display formatting (counts, times, prices); safe on the client. |
| `client.ts` | Browser only: `useApi`, `getJson`, `postJson`, the simulation clock (`simNow`, `useSimNow`), `useMe`, `refreshMe`, `track`, `useDwell`, `bus`. Use `simNow()`, never `Date.now()`, for post ages. |

### The cast and its voices

| Module | What it is for |
| --- | --- |
| `cast.ts` | Pure data: `FIGURES`, `OUTLETS` (real plus `FICTIONAL_OUTLETS`), `ORGS`, `CROWD`, `CAST`, `STOCKS`, avatar and banner paths. |
| `crowd.ts`, `crowd-avatars.ts`, `crowd-headers.ts` | The ordinary accounts as compact rows (`EXTRA_CROWD`, `SPAM_HANDLES`), and the picture and header file for each. |
| `personas.ts` | Persona sheets (`FIGURE_PERSONAS`), outlet and organisation house styles, `CROWD_VOICES`, the starting relationships. |
| `briefs.ts`, `briefs/` | Per-account briefs. `castIndex()` is one line per account (always in the prompt); `fullBrief()` adds `briefs/background/<handle>.md`, `briefs/style/<handle>.md` and `references/<handle>.txt`; `selectCast()` chooses whom to brief in full for a call. |
| `rates.ts` | How often each famous account really posts (`rateOf`); the digest uses it as a share so nobody runs far ahead of their own habit. |
| `sites.ts` | The simulated web: a site (template, palette, fonts, URL style) per publisher, `siteFor`, `pageUrl`, section and time-zone helpers. Browser-safe. |
| `media.ts` | Meme templates (`MEME_TEMPLATES`), the famous accounts that may post one (`MEME_POSTERS`) and `resolveGif()` (GIPHY, optional key). |
| `games.ts`, `sports.ts` | Live sport. `games.ts` is pure: the competitions, parsing ESPN's schedule, the per-sport game function (a game's state from its seed, the time since it went live and the director's events) and the bounds on those events. `sports.ts` is the ledger: fetching the day's fixtures, `syncGames()`, finishing games (result, team records, a fact), the views for the card and the writers, and `addGameEvent()`. |
| `slate.ts` | The slate: invented films, series, albums, tours and games. `applyProject()` stores the director's `project` field (a new project or a change to one), attaches its drawn card to the post named by `card_on` and writes a fact; `digestSlate()` and `newProjectDue()` for the director; `comingSoon()` for Explore's Entertainment tab. |
| `stocks.ts` | The price engine: live opening quotes, history, `scheduleMoves()` for story-driven moves, `noiseTick()`, `startNewDay()`, `stockViews()`, `recentMoves()`. |
| `news.ts` | Real headlines in: RSS fetch, domain classification, `refreshHeadlines()`, `pickHeadlines()`, `markHeadlineUsed()`. Falls back to `premises.ts` when no feed can be fetched. |
| `storymap.ts` | `getStoryMap()`: beats, provenance and background for the story map; rebuilds storylines that predate the `beats` table. |
| `ripple.ts` | `getRipple(storylineId)`: one storyline's origin and everything it caused (beats, pages, famous accounts' posts, price moves, trends, notes, polls, memes and tier lists, a count and the biggest few of the ordinary replies per beat, spin-offs), each tied to its cause, capped at about 60 items with what was left out counted. Read-only; builds on `getStoryMap()`. |
| `storymap.ts` | `getStoryMap()`: beats, provenance and background for the story map; rebuilds storylines that predate the `beats` table. Marks a major event's storyline and says whether one is building (nothing more). |
| `arc.ts` | The Arc, the world's daily paper: the `Edition`, `FrontPage` (the post's picture) and `EditionResponse` shapes, its fonts and date formatting. Browser-safe. |
| `paper.ts` | The Arc's back issues: `storeEdition()` (the edition page, the post carrying the front page, the `editions` row), `getEdition()` for the edition page, `arcMemory()` for the director. |

### Model calls and personalisation

| Module | What it is for |
| --- | --- |
| `llm.ts` | `generate({ role, system, user, schema })`: one schema-checked JSON object from `claude -p` (`LLM_BACKEND=cli`, default) or the Anthropic API. Roles are `director`, `crowd` and `desk`; every call is logged to `llm_calls`. Returns `null` for a refusal or unusable output; throws on transport errors. |
| `schemas.ts` | Zod output schemas: `DirectorSchema`, `AmbientSchema`, `CrowdSchema`, `ThreadSchema`, `BrokSchema`, `DeskSchema`, `ArcPlanSchema`. |
| `prompts/` | All prompt text, one module per writer, imported through `prompts/index.ts`: `director.ts` (`directorSystem/User`), `crowd.ts` (`crowdSystem/User`), `ambient.ts` (`ambientSystem/User`), `thread.ts` (`threadSystem/User`), `arc.ts` (`arcSystem/User` for planning a major event, `arcSection` for the director's private ARC section). Shared pieces: `rules.ts` (`CONTENT_RULES`, post craft, threads, everyday posts), `dials.ts` (the settings turned into instructions), `format.ts` (how posts, taste and cast briefs are laid out). |
| `schemas.ts` | Zod output schemas: `DirectorSchema`, `AmbientSchema`, `CrowdSchema`, `ThreadSchema`, `BrokSchema`, `DeskSchema`, `EditionSchema`. |
| `prompts/` | All prompt text, one module per writer, imported through `prompts/index.ts`: `director.ts` (`directorSystem/User`), `crowd.ts` (`crowdSystem/User`), `ambient.ts` (`ambientSystem/User`), `thread.ts` (`threadSystem/User`), `paper.ts` (`paperSystem/User`, The Arc's edition). Shared pieces: `rules.ts` (`CONTENT_RULES`, post craft, threads, everyday posts), `dials.ts` (the settings turned into instructions), `format.ts` (how posts, taste and cast briefs are laid out). |
| `usage.ts` | `volumes()`: how much each call writes for the Usage setting; `usageSummary()`; `holdReason()`: why the world should not start anything on its own. |
| `prefs.ts` | The learned taste profile (see Settings and personalisation). |
| `brok.ts` | Brok, the in-world assistant: `tagsBrok()`, `onBrokTag()` (answers a tagged post in its thread), `askBrok()` (the private page). Answers from the world's record and never changes it. |

### `src/lib/sim`

| Module | What it is for |
| --- | --- |
| `index.ts` | Public surface: `heartbeat`, `simStatus`, `simAction`, `simPace`, `simWhatIf`, `simWrap`, `simBreaking`, `onUserPost`, `onOpenPost`. Owns the loop and its state on `globalThis`. |
| `tick.ts` | `runTick` (a story beat), `runAmbient` (everyday posts), `runThread` (more replies under a post). |
| `digest.ts` | `buildDigest()`: everything the director sees on one tick. |
| `recall.ts` | The longer memory: `recall()` (older facts and dormant storylines matching what the beat is likely to be about), `comingDue()` and `noteDue()` (promises and deadlines whose time has come, and their settling). |
| `apply.ts` | `applyBeat`, `applyAmbient`, `applyCrowd`: repair and store model output. |
| `major.ts` | Major events: `claimBreaking` and `startArc` (the reader's request and the planning call), `arcIfDue` (the world starting one itself), `checkPlan`, `digestArc` (the ARC section's content), `noteArcBeat` (counting a beat, moving phases), `arcMapInfo` (what the story map may know). |
| `desk.ts` | The news desk: `runDesk`, `deskIfLow`. |
| `pace.ts` | `getPace`, `setPace`, `tickMs`, `nextScheduledKind`, `newEventDue`. |
| `threads.ts` | `completeThreads()`: writes the rest of a thread a post opens ("1/", "Here's how…"), and the page behind a link in an outlet's or official account's post. |
| `mediaPlan.ts` | How many GIFs and memes a crowd batch carries and whether one account posts a tier list; decided before the crowd call and stated in its message. |
| `edition.ts` | The Arc goes to press: `editionDue()`, `gather()` (the day's material and the boxes copied from the ledgers), `tidy()`, `writeEdition()`. |

## Data model

One SQLite file (`data/tangents.db`, WAL). `SCHEMA` in `src/lib/db.ts` is
authoritative; `migrate()` adds columns to databases made by earlier builds and
adds cast accounts that did not exist yet.

**Clock.** `now()` is real time plus an offset that "Skip a day" advances
(`kv.clock_offset`). Always use it, never `Date.now()`, for anything stored or
compared with stored times. A post, article, notification, repost, Community Note
or price tick with a timestamp in the future is **scheduled and invisible**:
every read filters on `<= now()`. This is how a beat's replies trickle in over
the following seconds. Model-call logs (`llm_calls`) use the real clock.

| Table | Holds |
| --- | --- |
| `accounts` | Every account: figure, outlet, org, crowd, and the one user. `brok` is created in every world. |
| `follows` | Handles the user follows. |
| `posts` | Posts, replies, quotes. Carries storyline, domain, tone, topics, heat, engagement targets (`t_*`), `media` JSON, reply `style`, `deleted` (author-deleted: a tombstone in threads). |
| `notes` | Community Notes, one per post. |
| `beats` | One row per story beat in order; the story map is drawn from it. |
| `polls` | A poll on a post: options, target votes, close time, the user's choice, `resolved`. |
| `reposts` | Plain reposts by an account (possibly the user). |
| `storylines` | Open or dormant stories: summary, domain, tone, participants, origin, parent, heat. |
| `articles` | Pages published by outlets and official accounts (`kind`: article, press_release, blog, statement, or edition for The Arc's daily front page). |
| `editions` | The Arc's editions, one per simulated date: the date, the edition as JSON (`Edition` in `arc.ts`), its page (`article_id`), the post that carried it, when it was written. |
| `relationships` | Score (-10 to 10) and note per unordered pair (`pairKey`). |
| `facts` | The ledger of durable facts, optionally tied to a storyline. A promise, bet or deadline has `due_at`; `due_shown` counts how often it was listed as coming due (3 = settled). |
| `stocks`, `stock_ticks` | Tickers and price history; a tick with future `t` is a scheduled move. |
| `headlines` | Real headlines, `used` flag, and the news desk's `relation`, `storyline_id`, `adapted`. |
| `trends` | Trend labels written by the director. |
| `interactions` | Raw engagement log. |
| `viewer_state` | The user's liked, reposted, bookmarked, hidden flags per post. |
| `prefs` | Learned taste weights, keyed by kind and key. |
| `notifications` | Replies, quotes, mentions, likes, reposts, follows for the user. |
| `kv` | Small values: `settings`, `pace`, `sim_paused`, `sim_ticks`, `bootstrapped`, `clock_offset`, `schedule_step`, `beats_since_wildcard`, `ticks_since_new_event`, `arc_day` (the simulated date The Arc last saw). |
| `llm_calls` | One row per model call: role, backend, model, tokens, duration, ok. |
| `projects` | The slate: kind, title, maker (and its cast handle), people attached, logline, tagline, status, release (free text), figures stated (fixed once stated), tour stops, game platforms, history of changes, storyline, card format and look, the post that last carried its card. |
| `arcs` | Major events: scale, kind, who started it, the plan (JSON: event, roots, phases with what happens, what is unsaid and beats, consequences), the current phase and beats spent in it, consequences played, the event's storyline (from the break), and when it was planned, broke and resolved. At most one is not `resolved`. |
| `fixtures`, `team_records` | The day's real fixtures with this world's scores (status, clock, seed, the director's events, the storyline covering a live game), and each team's record: seeded from the real one, then changed only by results here. |

Save and Restore copy the whole file to `data/snapshot.db` and back; Reset
deletes the world and reseeds.

## API routes

All under `src/app/api/`, JSON in and out. Errors are `{ "error": string }` with
a 4xx or 5xx status. `[id]` and `[handle]` are dynamic segments (`params` is a
Promise). Routes marked "polls" call `heartbeat()`, which keeps the simulation
loop alive.

| Route | Request | Response | Purpose |
| --- | --- | --- | --- |
| `GET /api/me` | | `MeResponse` | The user, or `null` before onboarding. |
| `POST /api/me` | `OnboardRequest` | `MeResponse` | Create the account (polls). |
| `GET /api/feed?tab=foryou\|following&cursor=&after=` | | `FeedResponse` | Timeline page; `after` returns posts newer than a given time (polls). |
| `POST /api/post` | `CreatePostRequest` | `CreatePostResponse` | Publish a post, reply or quote; starts a reaction tick, or Brok's answer if it tags `@brok`. |
| `GET /api/post/[id]` | | `ThreadResponse` | Ancestors, post, replies; asks the engine to thicken a thin thread. |
| `DELETE /api/post/[id]` | | `{ ok: true }` | Delete the user's own post. |
| `POST /api/interact` | `{ events: InteractionEvent[] }` | `{ ok: true }` | Likes, reposts, bookmarks, follows, dwell and other taste signals. |
| `POST /api/poll` | `{ postId, option }` | `{ poll: PollView }` | Vote in a poll. |
| `GET /api/profile/[handle]?tab=posts\|replies` | | `ProfileResponse` | A profile. |
| `GET /api/sidebar` | | `SidebarResponse` | Trends, prices, who to follow, today's news, unread count, sim status (polls). |
| `GET /api/explore?q=&tab=for_you\|trending\|news\|<subject tab>` | | `ExploreResponse` | Explore and search. |
| `GET /api/article/[id]` | | `ArticleResponse` | A published page with its posts and more from the publisher. |
| `GET /api/edition/[id]` | | `EditionResponse` | The Arc's edition behind a published page (`id` is the article id): the edition, its storylines' current titles, the back issues. |
| `GET /api/notifications` | | `NotificationsResponse` shape | The 50 newest visible; marks them read. |
| `GET /api/markets` | | `MarketsResponse` | Every ticker and recent story-driven moves. |
| `GET /api/world` | | `WorldResponse` | Behind the scenes: storylines, relationships, facts, taste weights, usage by role. |
| `GET /api/storymap` | | `StoryMap` | Every beat with its provenance. |
| `GET /api/ripple?storyline=ID` | | `RippleResponse` | One storyline's origin and what it caused, oldest first; 404 for an unknown storyline. |
| `GET /api/storymap` | | `StoryMap` | Every beat with its provenance; `arc.building` and the scales Breaking news may offer. |
| `GET /api/sim` | | `SimStatus` | Simulation status (polls). |
| `POST /api/sim` | `{ action }` or `{ pace }` or `{ whatIf, storylineId? }` or `{ wrap: storylineId }` or `{ breaking: "surprise" \| "scandal" \| "national" \| "global" }` | `SimStatus` | Pause, resume, tick now, skip a day, save, restore, reset; change pace; propose a premise; close a storyline; start a major event. |
| `GET /api/settings` | | `Settings` | Content settings. |
| `POST /api/settings` | partial `Settings`, `{ reset: true }` or `{ resetTaste: true }` | `Settings` | Save; restore defaults; clear learned taste (`prefs`, `interactions`). |
| `GET /api/usage` | | `UsageSummary` | Calls and tokens so far today. |
| `POST /api/brok` | `{ ask, postId? }` | `{ answer: string }` | The reader asks Brok on its page; nothing is posted. |

## Pages and components

Routes under `src/app/`, all client pages wrapped in `Shell`:

| Route | Screen |
| --- | --- |
| `/` | Home: For you / Following, composer, timeline. |
| `/post/[id]` | A post and its conversation. |
| `/[handle]` | A profile. |
| `/explore`, `/news/[id]` | Explore; `/news/[id]` is Explore with the in-app browser open on a published page. |
| `/notifications`, `/markets`, `/messages`, `/calls` | Notifications, markets, and X's empty Chat and Calls screens. |
| `/world` | Behind the scenes: story map tab and simulation details tab. |
| `/world/ripple?storyline=ID` | A storyline's ripple: its origin at the centre, what it caused on rings by causal distance, replayed in order (opened from "Ripple" on a story map row). |
| `/i/brok` | Brok's own page (`?post=ID` asks about a post). |
| `/settings`, `/settings/[category]` | Settings landing page with search, and one category (`?focus=<control>`). |

Theme tokens (`bg-x-bg`, `text-x-text`, `text-x-dim`, `border-x-border`,
`x-blue`, `x-pink`, `x-green`, `x-red`, `x-gold`, `x-card`, `x-search`,
`x-hover`, `x-button` and others) are defined in `src/app/globals.css`.

`src/components/`:

| Folder or file | Contents |
| --- | --- |
| `Shell.tsx`, `PostCard.tsx`, `Onboarding.tsx` | The three-column frame (also hosts the compose dialog and onboarding), one post in its feed, detail and thread forms, and the first-visit dialog. |
| `Avatar`, `Logo`, `VerifiedBadge`, `Sparkline`, `icons` | Small shared pieces; `icons.tsx` is the X icon set. |
| `core/` | X's interface pieces: left nav, right column, composer and dialogs, home timeline and tabs, post actions, menu and embeds, follow button, sim controls, shared client state (`state.ts`), `useResource`, `useSidebar`, toasts. |
| `media/` | Post attachments: GIF, meme (`memeLayouts.ts`), chart, tier list, and a project's drawn card (`ProjectMedia.tsx`; layouts, palettes and title fitting in `projectLooks.ts`). |
| `media/` | Post attachments: GIF, meme (`memeLayouts.ts`), chart, tier list, The Arc's front page (`FrontPageMedia.tsx`, drawn in HTML; opens the edition). |
| `extras/` | Poll box and Community Note. |
| `secondary/` | Explore screen, story map (layout, rows, background, steering) and storyline tree, the ripple (`Ripple.tsx` screen, `RippleCanvas.tsx` pan, zoom and replay, `RippleChip.tsx`, and the pure `RippleLayout.ts` and `RippleTimeline.ts`), small shared bars, pills and spinners. |
| `secondary/` | Explore screen, story map (layout, rows, background, steering, Breaking news) and storyline tree, small shared bars, pills and spinners. |
| `settings/` | Settings screens: `model.ts` (categories, every setting with search words, presets), controls, `useSettings`, reset-taste dialog. |
| `brok/` | Brok's page and its conversation store. |
| `browser/` | The in-app browser for published pages: window, store, and one template per publisher style in `templates/` (chosen by `sites.ts`). `Arc.tsx` lays out The Arc's edition as its site's front page; each story's kicker links to its storyline's posts (an Explore search for the storyline's title). |

## How a cycle runs today

Server state lives on `globalThis` (`__tangentsSim`) so it survives hot reload.

**The loop (`sim/index.ts`).** Polling routes call `heartbeat()`, which starts a
5-second check; it stops itself after 60 seconds without a heartbeat, so the
world only moves while a tab is open. When due, the check queues a `step` on a
single promise chain, so scheduled work never overlaps. A step does the first
of: bootstrap (first run); a queued reaction to a user post; nothing if paused
or held; otherwise one scheduled tick.

**Bootstrap.** Refresh headlines, run the news desk, fetch opening quotes and
price history, then three back-dated story ticks (`mode: "bootstrap"`) so the
first screen has three hours of history behind it.

**Modes (`WorldDigest["mode"]`).** `normal` (a scheduled or manual beat),
`user_post` (a reaction to the user), `next_morning` (after "Skip a day"),
`bootstrap`. A What if / Wrap up request is a `normal` tick with a `seed` or
`steer`, queued ahead of the schedule (`simWhatIf`, `simWrap`).

**A story tick (`runTick`).**
1. `buildDigest()` assembles the `WorldDigest`: open storylines, relationships,
   the facts ledger, recent timeline, real headlines (as the news desk fitted
   them), prices, the taste summary, whether a new event is due, which famous
   accounts and outlets are ahead of or behind their usual rate, a few ordinary
   accounts for the stand-out reply, and any steering. Each open storyline
   shows its beats, when it began and when it last moved. The ledger holds the
   newest facts and those about open storylines and accounts on the timeline,
   plus a few older ones recalled by `recall.ts`; with them come `EARLIER
   STORIES` (a few dormant storylines) and `COMING DUE`.
   - **Recall** matches older facts and dormant storylines against cues: the
     unused headlines, the reader's focus post and the post it answers, a
     What if premise, a steered storyline (these weigh double) and the open
     storylines. A memory matches on an account it shares with a cue (cast
     names found in the text; outlets, Brok and the reader do not count), on a
     shared topic tag together with a shared word, or on two shared
     distinctive words (words few memories use). Capped at five facts and
     three stories, best match first. No model call.
   - **Coming due.** A fact may carry `due_in_days` (`DirectorSchema`), stored
     as `due_at`. Facts whose due time passed in the last three days and are
     not settled are listed, at most three. After a beat, `noteDue()` counts
     a listing for each one shown and settles any shown fact on the beat's
     storyline; a fact listed three times is settled too.
2. **Director call** (`role: director`, `DirectorSchema`): the beat (kind,
   storyline, title, summary, domain, tone, heat), an optional article or
   announcement page, the famous accounts' posts, one stand-out reply from an
   ordinary account, reposts, a Community Note, relationship changes, facts,
   stock moves, trends, a brief for the crowd, and the user's follower gain.
   In a combined cycle it also returns `everyday` posts.
3. `applyBeat()` stores it in one `tx()`. Each item is repaired or dropped on
   its own (unknown handles, dangling refs, empty text); a bad item never sinks
   the rest. Post times are spread across a window of simulation time and are
   future-dated, which is what makes them arrive gradually. Stock moves are
   scheduled by `stocks.ts`; the headline used is marked used.
4. **Crowd call** (`role: crowd`, `CrowdSchema`) in parallel with
   `completeThreads()`: the ordinary accounts' replies and quotes, each with a
   humour or remark `style` and optionally a GIF phrase, a meme or a tier list.
   The message states the story's age and number of beats, and each online
   account comes with its last two posts, what it last said in this
   storyline (`storylineId` in `CrowdInput`) and, when the reader's post is
   being answered or the reader has replied to an ordinary account before,
   its last exchange with the reader. Famous accounts get no such memory.
   `applyCrowd()` stores them in the last part of the window, drops an account
   answering the same post twice or repeating a line, and caps media by the
   reader's setting and the beat's heat. A crowd post tagging `@brok` triggers
   Brok.
5. Housekeeping: decay taste weights, record the result of closed polls as
   facts, mark idle storylines dormant, update the wildcard and new-event
   counters, and add a little noise to prices.

A user reaction (`onUserPost`) is a `user_post` tick on its own chain, so a
reply never waits for a scheduled tick; posts that tag `@brok` get Brok's
answer instead. If the world is paused or still starting, the post is queued.

**Live sport (`sports.ts`, `games.ts`).** The day's real fixtures are fetched at
bootstrap, after "Skip a day" and lazily when the day changes. A game goes live
at its real start time on the simulation clock and plays for 30 minutes of real
time; `syncGames()` runs on the loop's 5-second check and before each tick. A
live game gets a storyline (created dormant; the first beat on it opens it).
The director sees a `SCOREBOARD` section and, when a live game is due a beat, a
`GAME NIGHT` line; it may nudge a live game through the optional `game_event`
field, bounded per sport. Scores are never stated by a writer: they come from
the scoreboard. A finished game's result is stored once, updates both records
and is written to the facts ledger.

**The slate (`slate.ts`).** Invented films, series, albums, tours and games.
The director sees a `SLATE` section (the dozen most recently active projects)
and, roughly once a simulated day while pop culture or gaming is on, a `NEW
PROJECT` line saying one may be announced. It acts through the optional
`project` field of `DirectorSchema`: a new project, or a change to one by its
number (cast, status, release date, a figure, tour stops). `runTick` applies it
after the beat and the everyday posts are stored, so `card_on` may name an
"a", "n" or "e" ref: that post gets a `project` media snapshot of the card as it
stands. Each announcement and change is one fact. Figures are only ever added.
A new project is refused when the previous beat already announced one.
Explore's Entertainment tab lists the newest as "Coming soon".

**Major events (`sim/major.ts`, `prompts/major.ts`).** "Breaking news" on the story
map (`simBreaking`) or, now and then, the world itself (`arcIfDue`, before a
scheduled story beat) starts one. One planning call (`role: director`,
`ArcPlanSchema`) is given the digest a beat would get and returns the event,
its kind, what on the record it grows out of (storylines, earlier stories,
relationships and facts by number), four phases (murmurs, break, fallout,
resolution) each with what happens, what may not yet be said and a number of
beats, and the consequences: at least two per subject the reader has on, each
naming what it hits and whether it follows from the event or from an earlier
consequence. `checkPlan` refuses a plan that breaks the fixed lines, has the
wrong kind, grows from nothing or is short of consequences (one retry, told
why), and clamps the beat counts by scale. While one is active, every
ordinary beat (mode `normal`, no seed or steer) carries a private `ARC`
section (`WorldDigest.arc`); after the beat `noteArcBeat` counts it, records
the break's storyline and the consequences played, and moves to the next
phase once a phase has had its beats. The engine assigns one or two
consequences to each fallout beat, in order, each only after what it follows
from. Before the break nothing about it reaches the browser except "Something
is building"; afterwards its storyline carries a "Major event" mark.
Cooldowns, scale weights and the self-start chance are constants at the top
of `sim/major.ts`.

**Combined or alternating (`pace.ts`, `usage.ts`).** The Usage setting decides
(`volumes().combined`). Combined (saver, balanced): every tick is a story beat
whose director call also writes the everyday posts for the gap after it, and
whose crowd call answers both. Otherwise (full): ticks alternate story beats
and **ambient ticks** (`runAmbient`: an `AmbientSchema` director call for
routine posts from the cast, then a crowd call for chatter) following the
pace's pattern. Ambient ticks touch no storyline, fact, relationship or price.

**Paces (`pace.ts`).** `live`, `steady`, `slow` set the seconds between ticks,
the story/ambient pattern, and how many beats pass before a new event may open
from a real headline (`newEventDue`, shifted by the Reality setting; a thin
world may open one sooner). `TICK_SECONDS` overrides the interval.

**Holds (`usage.ts`).** Before a scheduled tick, `holdReason()` returns
`budget` (the daily token limit is spent) or `unread` (enough unread top-level
posts are waiting; the count only starts once the reader has looked at
something). The status line shows it in `SimStatus.hold`. Manual ticks and the
reader's own posts ignore holds; on-demand thread replies stop on `budget`.

**On-demand thread replies.** `GET /api/post/[id]` calls `onOpenPost()`. If the
post is not the user's and has few replies, a background `runThread()` writes
more as a crowd call, at most twice per post. Separately, `completeThreads()`
writes the continuation of any recent post that announces a thread, or trims
the opener if that call fails.

**News desk (`desk.ts`).** After each headline refresh (every 30 minutes) and
whenever few assessed headlines remain, one call on the crowd model marks each
fresh headline as `new`, `continues` an open storyline, `conflicts` with the
ledger (and rewrites it to fit; the world's history wins) or `skip`. The
director is offered the adapted text.

**Skip a day.** The clock advances 24 hours, tickers reset their daily
baseline, open storylines are kept from going dormant, and The Arc's edition
(below) and then a `next_morning` tick follow in the background.

**The Arc (`sim/edition.ts`, `paper.ts`, `prompts/paper.ts`).** The world's
daily paper (@TheArc). When the loop's step finds the simulated date changed
since `kv.arc_day` (and before that day's first tick), or after Skip a day, one
director call (`EditionSchema`) writes the edition dated today about the day
just ended (local midnight to midnight): a lead, four or five stories tagged with
their storylines, In brief, corrections (only of what later facts contradict),
and a comment piece by a columnist named in the first edition and kept. It is
given the storylines with beats that day (summary, the day's beats, their most
liked posts), the day's facts and Community Notes, the day's results
(`recentResults()`), the closes and story-driven moves, the subjects the reader
has on, and the previous edition and column; every list is capped. The scores,
markets (with a chart of the day's biggest mover) and coming-soon (the `projects`
slate, when that table exists) boxes are copied from the ledgers by code. The
edition is stored as an `articles` row of kind `edition` (its page), a post by
@TheArc carrying a `frontpage` media value (the drawn front page), and the
`editions` row. No edition when the day had no beats, never during bootstrap,
never two for one date; skipped when the daily token limit is spent; a failed
call writes nothing and is tried at the next step. The director's message
carries `FROM THE ARC`: the lead and secondary headlines of the last three
editions (`WorldDigest.arc`).

**Brok.** `onBrokTag()` answers a tagged post in its thread (queued one at a
time, one tag per crowd batch); `askBrok()` serves the page. Both give the model
the storylines, facts, prices and thread, and use the Brok tone setting. The
reader's own questions use the director model; tags from the crowd use the
crowd model.

**Model calls (`llm.ts`).** Models and director effort come from
`DIRECTOR_MODEL`, `CROWD_MODEL`, `DIRECTOR_EFFORT`. The CLI backend runs
`claude -p` with a JSON schema and a timeout; the API backend uses the SDK
with prompt caching. Prompts put what never changes in the system prompt and
everything that varies in the user message.

## Settings and personalisation

- **Settings** are one JSON value in `kv` (`settings`), read with `getSettings()`
  and written through `POST /api/settings`. The shape and defaults are
  `Settings` and `DEFAULT_SETTINGS` in `types.ts`; validation is in
  `settings.ts`. The UI lives in `src/components/settings/` (`model.ts` lists
  categories and each setting). Major events read `majorSelfStart`, `majorKinds` and
  `majorCasualties` in `sim/major.ts` and `prompts/major.ts`. Prompts read the settings in `prompts/dials.ts`; `pace.ts`, `usage.ts` and `sim/tick.ts` (media cap) read them for
  timing, volume and GIF/meme limits. Pace is stored separately in `kv.pace`.
- **Taste** is learned in `prefs.ts`. `POST /api/interact` and the user's own
  replies and quotes are logged in `interactions` and credited to weights in
  `prefs`, keyed by author, topic, domain, tone, storyline, reply style and post
  format. Weights are capped, decay a little each story tick, and are cleared by
  `resetTaste`. They are used in three places: `feed.ts` ranks For you by
  affinity and explains each post ("Why am I seeing this?"); `tasteSummary()`
  tells the director and crowd writers what the reader likes and avoids; and
  `/world` shows them (`tasteProfile()`). Onboarding seeds domain weights.

## Adding a subject

Subjects are listed once, in `src/lib/subjects.ts`. To add one:

1. Add an entry to `DEFS` there: `key` (the stored domain string and Settings key; never rename), `label`, `name`, `short`, `description`, `words`, `newsCategory`, optional `explore` tab, and `feeds`. Settings, sign-up, the story map filter, Explore, the prompts' subject line, muted and lean domains, onboarding, the digest and `news.ts` follow from it.
2. Add the `Record<Subject, …>` entries the compiler will ask for: `EVERYDAY_WORDS` in `news.ts` and the subject's sign-up interests in `interests.ts`.
3. Supply the data: cast members with the new `domain` in `cast.ts`, ordinary accounts in `crowd.ts`, briefs in `briefs/`, and the personas.
4. Existing worlds keep working: a missing settings key falls back to `DEFAULT_SETTINGS`, which gives every subject level 2.
5. Add headline aliases in `news.ts` (`ALIASES`) for any figure whose display name is not what a headline calls them.
6. Prompt prose that names subjects (the director prompt's example trend categories) is wording, not data: it is a product decision.

## Content rules that live in code

The tone and content rules are written once, in code, and should be edited
there rather than described elsewhere:

- `src/lib/prompts/`: `CONTENT_RULES` and the other shared rules in `rules.ts`,
  the major-event planning prompt, its fixed lines and the ARC section in `major.ts`,
  the settings dials in `dials.ts`, and the director, crowd, ambient and thread
  prompts in their own files.
- `src/lib/personas.ts`: persona sheets, house styles, crowd voices, starting
  relationships.
- `src/lib/briefs/`: researched background and style analysis per account
  (`background/<handle>.md`, `style/<handle>.md`), loaded by `briefs.ts`.
- `src/lib/news.ts`: which real headlines are allowed in (`isAllowed`).
- `src/lib/brok.ts`: Brok's own system prompt.

Changing any of these changes what the product says, so it is a product
decision: report it, do not make it.
