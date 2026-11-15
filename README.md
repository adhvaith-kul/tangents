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

Open http://localhost:3000, pick a name and handle, and choose the subjects you
want (any of technology and business, markets and crypto, pop culture, gaming
and creators, politics, sports). A second, optional step narrows each subject
to what you follow most closely. The first screen takes a minute or two to
fill while the world writes its opening day.

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

**Both: subscription while developing, API for a demo.** Leave
`LLM_BACKEND=cli` and add only the key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

`npm run dev` keeps using the subscription. The production build uses the key:

```bash
npm run demo:build
npm run demo        # http://localhost:3300
```

The production build shares the `data` folder with `npm run dev`, so run one
at a time. To make the production build use the subscription as well, set
`LLM_BACKEND_PRODUCTION=cli`.

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
| `ANTHROPIC_API_KEY` | | Needed for `LLM_BACKEND=api`. When set, the production build (`npm run demo`) uses the API whatever `LLM_BACKEND` says. |
| `LLM_BACKEND_PRODUCTION` | unset | `cli` makes the production build use the subscription even when a key is set. |
| `GIPHY_API_KEY` | | Enables GIF replies. |
| `DIRECTOR_MODEL` | `claude-opus-5-5` | Decides each beat and writes the famous accounts. |
| `CROWD_MODEL` | `claude-haiku-5-5` | Writes the crowd's replies and runs the news desk. |
| `DIRECTOR_EFFORT` | `low` | `low`, `medium` or `high`. |
| `TICK_SECONDS` | unset | Overrides the time between ticks. Normally the Pace control sets it. |
| `TANGENTS_DATA_DIR` | `data` | Where the world's database lives. Point a second copy at another folder to keep a separate world. |
| `NEXT_DIST_DIR` | `.next` | Build folder, for running two dev servers side by side. |

Restart `npm run dev` after changing `.env.local`.

## Update to the latest version

The app changes several times a day at the moment. To move an existing copy to
the newest version:

```bash
git pull
npm install        # only does anything when dependencies changed
npm run avatars    # downloads pictures and headers for accounts added since last time
```

Then stop `npm run dev` if it is running and start it again. A restart is
required after every pull: the database is upgraded when the server starts,
and a server left running across a pull can fail with `no such column` errors.

A world made by an older version keeps working, but it will not have
everything the new version records (the story map, for one, is exact only for
beats written after the update). For a clean test, start a fresh world: stop the
server, delete the `data` folder and start again. If the header download prints
`no header` for many accounts, run `npm run avatars` again; the source fails in
bursts and each run picks up more.

## Using it

The simulation only runs while a browser tab is open, and pauses itself after a
minute without one.

- **The timeline.** For you is ranked by what you engage with; Following is
  chronological. Likes, reposts, bookmarks, time spent, "Not interested" and
  "Show less from this account" (the menu on any post) all teach it. "Why am I
  seeing this?" in the same menu explains a post.
- **Live sport.** With Sports on, the "Live" card in the right column shows
  today's real fixtures (NBA, NFL, Premier League, LaLiga, Champions League,
  Formula 1). Who plays whom and when is real; the scores are this world's
  own. A game goes live at its real start time, plays out over about half an
  hour, and the timeline covers it while it does. Results and team records are
  kept and never change afterwards.
- **Other languages.** Accounts that really post in another language sometimes
  do here; "Translate post" under the post shows the English.
- **Your profile.** "Edit profile" on your own profile changes your pictures,
  name, bio, location, website and birth date, as on X.
- **Saved worlds.** Settings → Worlds saves the world as it is now under a
  name, and loads or deletes one saved earlier. A loaded world picks up at the
  moment it was saved. Each save is one file in the `worlds` folder, so a world
  can be prepared on one machine and shown on another: save it, commit and push
  `worlds/<name>.db`, then pull and load it on the other machine. The account
  in a saved world is the one that created it.
- **Your posts.** Post, reply and quote as on X. The world reacts to you, but
  you stay a bystander: famous accounts rarely answer.
- **Brok.** Tag `@brok` in a post or reply and it answers in the thread. The
  Brok item in the navigation opens its page for private questions about what
  is going on, and the Brok icon on any post asks it to explain that post. It
  answers from this world's record and never changes the world.
- **Story map.** More → Behind the scenes. Every story the world has written,
  in order, with what each grew from. "What if…" there starts a new story or
  adds a twist to an existing one; "Wrap up" brings a story to a close.
- **Breaking news.** Beside "What if…" on the story map. Pick "Surprise me",
  a scandal, a national story or a global event, and the world plans a major
  event in secret, growing out of what has already happened. You are not told
  what it is: the map says only "Something is building" while murmurs and
  hints appear on the timeline, until it breaks and its consequences spread
  across every subject you follow. The world also starts one on its own now
  and then. One at a time, with a pause after each. Settings → Major events
  chooses which kinds are allowed and whether casualties are ever reported.
- **World controls.** The status line under the Post button pauses the world,
  sets the pace (Live for demos, Steady, Slow), skips a day, and saves or
  restores a snapshot.
- **Settings.** More → Settings. Subjects (technology and business, markets
  and crypto, pop culture, gaming and creators, politics, sports), how closely
  the world follows the real news,
  satire, conflict, humour and its kinds, trolls, profanity, GIFs and memes,
  personalisation, major events (which kinds, whether the world starts them
  itself, casualties), Brok's tone, and usage (how much is written and a
  daily token limit).
- **Usage.** The world stops writing ahead when plenty is unread and resumes
  as you scroll. Settings → Usage shows today's tokens.

The world is one SQLite file at `data/tangents.db`. To start again, stop the
server and delete the `data` folder.

### What is worth testing

Reports of anything that breaks the illusion are the most useful: a post that
does not sound like its author, a story that makes no sense, the same accounts
or the same story too many times in a row, replies that are not funny, a
screen that differs from x.com, anything slow.

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
  (add `-- --force` to refresh them). Its sources refuse requests in bursts;
  running it again a few minutes later picks up the ones that failed.

## How it works

Each tick makes two model calls. A director reads the world state (open
storylines, relationship scores, a ledger of facts, the recent timeline, unused
real headlines, prices, the scoreboard, and your taste profile), picks the next beat and writes
the famous accounts' posts, an optional news article or announcement page, and
what changed. A second model writes the crowd's reactions. Results are
scheduled over the following seconds so the timeline trickles in. A news desk
fits fresh real headlines to the world's own history before the director sees
them. Short follow-up calls finish any thread a post opens and write the page
behind any link an outlet or official account posts.

`docs/CONTRACTS.md` describes the modules and API routes. `/world` in the app
shows the storylines, relationships, facts and learned taste weights live.
`AGENTS.md` matters if you work on the code with an AI assistant: this Next.js
version differs from older ones.

## Credits

Two figures have no X account to copy a picture from, so `npm run avatars`
takes their portraits from Wikimedia Commons and prints the author and licence
of each as it saves them. Meme templates are the familiar blank images.

Illustrated profile pictures are generated with [DiceBear](https://www.dicebear.com):
Notionists by Zoish, Lorelei by Lisa Wischofsky, Open Peeps by Pablo Stanley,
Pixel Art and Identicon by DiceBear (all CC0 1.0), Bottts by Pablo Stanley
(free for personal and commercial use), and Micah by Micah Lanier and Toon Head
by Johan Melin (CC BY 4.0). Photo credits are in `public/crowd/CREDITS.md`.
