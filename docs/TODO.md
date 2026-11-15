# What is left

Written late on 14 November 2026, at the end of the hackathon build. Everything
here is known and unfinished; nothing here blocks the demo. `docs/CONTRACTS.md`
is the map of the code, and the README covers running it.

## Decisions waiting on the owner

- **The collaborator's sandbox mode.** The lowest level of "Follow the real
  news" now stops real headlines and also stops the world moving unless the
  reader acts (`reality === 0` in `sim/index.ts`, `sim/tick.ts`, `sim/digest.ts`,
  `sim/pace.ts`). The owner had set the sandbox aside, and had described a
  different design: start from real headlines once, then take no more, with the
  world still free to invent its own stories and real sport fixtures kept.
- **The "Reactive Sandbox Mode" toggle on the sign-up dialog** and **the
  "What if…" button under Post in the left column** (`core/WhatIfDialog.tsx`).
  Neither is part of X's interface, which the owner asked to have copied
  exactly.
- **The Gemini backend** (`viaGemini` in `lib/llm.ts`). Never run by anyone but
  the collaborator. Every prompt was tuned on Claude. Remove it or test it.
- **A visible statement that the world is fictional.** Left out on purpose for
  now. If it comes back: one line at sign-up and one in the right column.
- **Letting replying accounts see the reader's bio.** Proposed as a Settings
  toggle, changeable at any time, on by default, shown only to the reply writer
  and never to the story writer. Not built.

## Known problems

- **Reply batches are slow on the subscription.** The reply writer (Haiku 5.5
  through the command line) decides call by call whether to reason before
  answering, and no flag, setting or environment variable turns that off
  (`MAX_THINKING_TOKENS=0`, `CLAUDE_CODE_DISABLE_THINKING`, effort and the rest
  were all tried). A batch that reasons takes 45 to 70 seconds; one that does
  not takes about 11. `viaCli` stops a call that opens with reasoning and asks
  again, twice at most, which helps ordinary messages (about half of which
  reason) and does nothing for Rage bait messages (nearly all of which do). On
  the API the reply writer runs with reasoning off and takes 5 to 10 seconds.
  Ways forward: accept it; raise the number of redraws; or have the engine top
  up missing GIFs and memes so that a direct answer is always good enough (the
  reasoning is mostly spent counting the media plan: batches that reasoned kept
  the plan 106 times in 111, direct ones 13 in 118).
- **The reader's own posts can draw very few replies.** A test poll got one. The
  reaction beat may advance a story instead of answering the reader. Look at
  the "When the user has posted" part of `prompts/crowd.ts` and the
  `user_reaction` mode in `prompts/director.ts`.
- **Ordinary accounts never visibly remember the reader.** The history is in
  the prompt (`readerHistory` in `prompts/crowd.ts`); in about 25 batches no
  reply used it. In-jokes ("LINES THAT CAUGHT ON") are almost never riffed on.
- **Major events are compressed.** At Live pace a "national" event ran from
  first hint to resolution in 14 simulated minutes, with posts saying "this
  morning" and "last week". The plan is now told the clock, but an event meant
  to last days cannot at one beat a minute. Also `PER_SUBJECT` in
  `sim/major.ts` forces at least twelve consequences with six subjects on, and
  the Breaking news button is still offered during the cool-down.
- **Rage bait is uneven.** Famous accounts and outlets polarise well. Ordinary
  accounts reached about half provoking posts on the subscription and 55% in
  API replays, after the block was moved to the top of the reply writer's
  message with a reminder at the end. Calm personas still resist. Not yet
  watched across a long world.
- **Everyday posts.** About half now carry the quiet satirical turn they are
  asked for; the rest are still plain product notices.
- **Real-article links.** About two thirds go through Google News (they
  forward to the article). Direct links would need Google's undocumented decode
  endpoint.
- **Smaller ones.** Deleting a post leaves its poll row. The emoji picker
  covers the top of the composer in a short window. The account menu lists at
  most six other worlds. Turbopack watches `.claude/worktrees`, so a dev server
  slows down while a sub-agent's worktree is being filled. The director's
  message is about 50,000 tokens a beat; it was measured and left alone,
  because the wait is the writing (about 2,700 tokens at 100 a second), not the
  reading, and most of the per-beat message is the cast briefs that make each
  account sound like itself.

## Never seen working

- The API path's correction step (an answer the parse rejects is sent back
  once, in `viaApi`). It has not fired in any run.
- A major event the world starts by itself under the real odds (about 1% a beat
  at Live pace). Forced once: the trigger and the plan work.
- The fix that stops an outlet posting one page twice, and the three reply
  fixes from the read-through (no post as the reader, no repeat of the
  account's own last line, no self-replies), beyond the mechanical checks
  passing on 260 posts.
- "Copy link" in the Share menu, deleting the world on screen, and switching
  worlds from the account menu, by hand.
- The story map's `checkPlan` refusal of a plan that reuses a recent event's
  storyline (the planner complied first time).

## There are no automated tests

Everything was checked by running a world and reading it. The checks that
proved useful are easy to keep as a script: every post labelled; no outlet
posting the same page twice; no ordinary account replying to itself; no
wordless GIF or meme that is not a reply; a figure in a post matching the
ledger (`stock_ticks`, `fixtures`, `facts`). A world's database and the
`llm_calls` table are enough to run them.

For work on prompts: create an empty file named `dump-llm` in the data folder
and every model call's messages are written to `llm-dumps` beside it, so a real
message can be replayed with a changed prompt.

## For the submission

- The Devpost description, a three-minute demo script and a short list of
  future plans. The case to make: a feed where the back comes off. "Why am I
  seeing this?", X-ray, Rage bait, Behind the scenes (what really happened
  beside what this world made of it), Community Notes and The Arc's corrections
  show how outrage and misinformation are made, safely, because none of it is
  real.

## Parked or deferred by the owner

The group chat, linking a real X account, living articles, the portfolio, and
letting the reader attach pictures or GIFs to a post.
