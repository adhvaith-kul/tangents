# Side-by-side UI review: method

Tangents (http://localhost:3210) is meant to be indistinguishable from X's
desktop dark theme. A review compares one area of the two sites and reports
every visible discrepancy. It changes nothing.

## Setup

- Load the Chrome tools in one `ToolSearch` call:
  `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch,mcp__claude-in-chrome__find,mcp__claude-in-chrome__read_page`
- Call `tabs_context_mcp` with `createIfEmpty: true`, then create two tabs of
  your own: one for `https://x.com`, one for `http://localhost:3210`. Close both
  when you finish. Do not resize the window. Batch actions with `browser_batch`.
- The user is signed in to X in this browser, in the dark ("Lights out") theme.
  The dev server for Tangents is already running with a populated world and the
  simulation paused.

## Hard limits

On x.com you are a reader in someone's real account:

- Never like, repost, bookmark, follow, post, reply, vote, report, block, mute,
  or change any setting. Never type into any field on x.com. Never log out.
- Do not open Messages, Settings, Premium, or anything about the account itself.
- You may navigate, scroll, hover, open a menu or dialog to measure it, and close
  it with Escape.
- What the user's timeline and notifications say is private. Report layout and
  style only, never content, names or counts from their account.
- If X shows a login wall, an error, a rate limit or anything unexpected, stop
  and report it. Do not try to work around it.

On Tangents: do not submit a post or reply, and do not press Resume, Skip a day,
Save, Restore or anything that calls `/api/sim`. Opening menus and dialogs,
hovering, scrolling and navigating are fine. Do not edit any file, and do not
start or stop the dev server.

## How to compare

Measure; do not judge by eye alone. For each pair of corresponding elements,
read `getComputedStyle` and `getBoundingClientRect` on both sites with
`javascript_tool` at the same window size, and compare: position and size,
padding, margin and gaps, font size, weight, line height and colour, background,
border and radius, icon size, and the hover state (hover with the `computer`
tool, then read the style again). X marks elements with `data-testid`
(`primaryColumn`, `sidebarColumn`, `tweet`, `tweetText`, `User-Name`, `reply`,
`retweet`, `like`, `bookmark`, `caret`, `SideNav_NewTweet_Button`,
`AppTabBar_Home_Link`, `SideNav_AccountSwitcher_Button`, `trend`, `UserCell`,
`SearchBox_Search_Input`, `tweetTextarea_0`, and so on), which makes its elements
easy to find. Then take one screenshot of each site per screen, and `zoom` into
icons and small details, to catch what numbers miss: icon shapes, alignment,
truncation, stacking, scroll behaviour.

Also compare behaviour that a user would notice: what is sticky while scrolling,
what a click on each part of a row does, what appears on hover, how menus and
dialogs are positioned, how they close.

## Known, intended differences (do not report)

- The logo (a modified X mark) and the browser tab title and icon.
- Left navigation entries: Tangents has Home, Explore, Notifications, Markets,
  Behind the scenes, Profile, and a small simulation control block under the
  Post button. X has more entries. Compare the entries both have.
- The Markets card in the right column, and the `/markets`, `/world` and
  `/news/[id]` screens, which X does not have.
- Posts have no images or video; article links are text cards.
- No footer links, no "Show more" under Who to follow, no premium upsell cards,
  no Grok or Communities surfaces, no ads.
- Share, the view count, Edit profile and the account pill do nothing when
  clicked. Own posts have a shorter menu.
- Some profile pictures differ in crop or resolution.

## Report

Your final message goes to the coordinating agent. Plain facts, no preamble:

1. A table of discrepancies, most visible first: element, property, X's value,
   Tangents' value, and the file and line in this repo that sets it
   (`src/components/Shell.tsx`, `src/components/PostCard.tsx`,
   `src/components/core/*`, `src/components/secondary/*`, `src/app/**/page.tsx`,
   `src/app/globals.css`). Give the exact change you would make.
2. Behavioural differences, with what X does and what Tangents does.
3. What matched (one line per area), so matching areas are not re-checked.
4. What you could not compare, and why.

Only report what you measured or saw on both sites. If you are inferring, say so.
