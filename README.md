# Tangents

A single-player copy of X. You are the only real person; famous figures, news
outlets and ordinary people are simulated. The world is seeded by real
headlines, exaggerated for entertainment, reacts to what you post, learns what
you engage with, and remembers everything.

## Run it

```bash
npm install
npm run avatars   # one-off: downloads the cast's profile pictures
npm run dev       # http://localhost:3000
```

Settings live in `.env.local`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `LLM_BACKEND` | `cli` | `cli` calls the Claude Code command line (`claude -p`) on your Claude subscription. `api` calls the Anthropic API. |
| `ANTHROPIC_API_KEY` | | Needed only for `LLM_BACKEND=api`. |
| `TICK_SECONDS` | `40` | Time between simulation ticks. |
| `DIRECTOR_MODEL` | `claude-opus-5-5` | Decides each beat and writes the famous figures. |
| `CROWD_MODEL` | `claude-haiku-5-5` | Writes the crowd's replies. |
| `DIRECTOR_EFFORT` | `low` | `low`, `medium` or `high`. |

The simulation only runs while a browser tab is open, and pauses itself after a
minute without one. The world is one SQLite file at `data/tangents.db`; delete
it to start again. The controls under the Post button pause the world, skip a
day, and save or restore a snapshot.

## How it works

Each tick makes two model calls. A director reads the world state (open
storylines, relationship scores, a ledger of facts, the recent timeline, unused
real headlines, prices, and your taste profile), picks the next beat and writes
the famous accounts' posts, an optional news article, and what changed. A second
model writes the crowd's reactions. Results are scheduled over the following
seconds so the timeline trickles in.

`docs/CONTRACTS.md` describes every module and API route. `/world` in the app
shows the storylines, relationships, facts and learned taste weights live.
