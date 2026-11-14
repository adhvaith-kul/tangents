# Tangents

A single-player copy of X. You are the only real person; famous figures, news
outlets, official accounts and ordinary people are simulated. The world is
seeded by real headlines, heightened for entertainment, reacts to what you
post, learns what you engage with, and remembers everything.

Everything runs on your own machine. Each person who runs the app has their own
world; nothing is shared between copies.

## Set up

You need:

- **Node 24 or newer** (developed on Node 26; the app uses Node's built-in SQLite module). Check with `node -v`.
- **A way to call Claude**, one of:
  - a Claude subscription with [Claude Code](https://claude.com/claude-code) installed and signed in (no key needed), or
  - an Anthropic API key.

Then:

```bash
git clone https://github.com/namaymodi/tangents.git
cd tangents
npm install
cp .env.example .env.local
npm run avatars   # one-off: downloads the famous accounts' profile pictures
npm run dev       # http://localhost:3000
```

Open http://localhost:3000, pick a name and handle, and choose what you are
interested in. The first screen takes a minute or two to fill while the world
writes its opening day.

### Choose a model backend

Edit `.env.local`.

**Claude subscription (default).** Leave `LLM_BACKEND=cli`. Install Claude Code
and sign in once:

```bash
npm install -g @anthropic-ai/claude-code
claude          # follow the sign-in prompt, then quit
```

The app calls the `claude` command for every model call, so it must be on your
`PATH` in the terminal that runs `npm run dev`. Usage counts against your
subscription's limits.

**Anthropic API.** Create a key at https://console.anthropic.com (API keys →
Create key; the account needs credits) and set:

```
LLM_BACKEND=api
ANTHROPIC_API_KEY=sk-ant-...
```

Set a spend limit in the Console first: the world makes two model calls per
tick for as long as a tab is open.

`.env.local` is git-ignored. Keep keys out of commits, issues and chat.

### Optional: GIFs

Ordinary accounts reply with GIFs when a GIPHY key is present. Create one at
https://developers.giphy.com (Create an App → API) and add
`GIPHY_API_KEY=...` to `.env.local`. Without it the app works and skips GIFs.

### Optional: reference posts

`references/<handle>.txt` can hold real posts by a cast account, one per
paragraph. They are shown to the writer as style reference only. The folder is
git-ignored apart from its README.

### All settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `LLM_BACKEND` | `cli` | `cli` calls the Claude Code command line on your Claude subscription. `api` calls the Anthropic API. |
| `ANTHROPIC_API_KEY` | | Needed only for `LLM_BACKEND=api`. |
| `GIPHY_API_KEY` | | Enables GIF replies. |
| `DIRECTOR_MODEL` | `claude-opus-5-5` | Decides each beat and writes the famous accounts. |
| `CROWD_MODEL` | `claude-haiku-5-5` | Writes the crowd's replies and runs the news desk. |
| `DIRECTOR_EFFORT` | `low` | `low`, `medium` or `high`. |
| `TICK_SECONDS` | unset | Overrides the time between ticks. Normally the Pace control sets it. |
| `TANGENTS_DATA_DIR` | `data` | Where the world's database lives. Point a second copy at another folder to keep a separate world. |
| `NEXT_DIST_DIR` | `.next` | Build folder, for running two dev servers side by side. |

Restart `npm run dev` after changing `.env.local`.

## Using it

The simulation only runs while a browser tab is open, and pauses itself after a
minute without one. The controls under the Post button pause the world, skip a
day, save or restore a snapshot, start a "What if…" storyline, and set the
pace: Live (a story beat every 40 seconds, for demos), Steady (about every two
minutes, with everyday posts in between) or Slow. Settings has dials for
satire, conflict, shitposting, the mix of topics, trolls, profanity, GIFs and
memes, and how often famous accounts engage with you.

The world is one SQLite file at `data/tangents.db`. To start again, stop the
server and delete the `data` folder.

## If something goes wrong

- **Nothing new appears, and the controls show an error.** With the `cli`
  backend, run `claude -p "hello"` in a terminal: if that fails or asks you to
  sign in, fix that first. Calls also stall when the subscription limit is
  reached or the computer sleeps.
- **`no such column` or `no such table` errors after pulling.** Restart
  `npm run dev`; the database is upgraded when the server starts.
- **A page reloads forever in development.** Stop the server, delete the
  `.next` folder and start again.
- **Famous accounts show initials instead of pictures.** Run `npm run avatars`
  (add `-- --force` to refresh them).

## How it works

Each tick makes two model calls. A director reads the world state (open
storylines, relationship scores, a ledger of facts, the recent timeline, unused
real headlines, prices, and your taste profile), picks the next beat and writes
the famous accounts' posts, an optional news article or announcement page, and
what changed. A second model writes the crowd's reactions. Results are
scheduled over the following seconds so the timeline trickles in. A news desk
fits fresh real headlines to the world's own history before the director sees
them.

`docs/CONTRACTS.md` describes the modules and API routes. `/world` in the app
shows the storylines, relationships, facts and learned taste weights live.
`AGENTS.md` matters if you work on the code with an AI assistant: this Next.js
version differs from older ones.

## Credits

Illustrated profile pictures are generated with [DiceBear](https://www.dicebear.com):
Notionists by Zoish, Lorelei by Lisa Wischofsky, Open Peeps by Pablo Stanley,
Pixel Art and Identicon by DiceBear (all CC0 1.0), Bottts by Pablo Stanley
(free for personal and commercial use), and Micah by Micah Lanier and Toon Head
by Johan Melin (CC BY 4.0). Photo credits are in `public/crowd/CREDITS.md`.
