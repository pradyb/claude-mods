# justice-league

A dark hero-team theme for the Claude Code desktop app: a night-city backdrop with original, comic-style heroes, a quiet ambient soundtrack, and comic-panel message styling. Clicks, turn starts, tool calls and turn ends each set off a small animation. Requires Claude Code 2.1.287 or later.

The heroes are evoked by colour and shape only: no publisher emblems, logos or artwork.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install justice-league@pradyb-mods
```

Or in one step, from a session: `/plugin install justice-league --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## What you get

- **Colours:** a navy night-sky palette (dark only) with a hero-blue accent, cape red for errors, ring green for success and lasso gold for warnings.
- **Backdrop:** a night city on the left (a caped flier, a cowled watcher and a lasso warrior on the rooftops) and an orbital station on the right (a green ring-bearer, a half-machine hero, a sea king in the surf). Each side shrinks with the window, so they never collide or crop; on the desktop app each side also fits the gutter beside the chat column, so no figure hides behind it on a laptop screen.
- **Messages:** your prompts in a gold caption box, Claude's replies in an inked navy panel, both on solid grounds so they stay readable over the figures.
- **Sound:** a low hum with the odd far bell, and one short cue each for send, tool call, done, ask, error, compaction and click.

## What sets off what

| Event | Animation |
|---|---|
| Click, left half of the window | The caped flier leaves his spire and streaks to the click. |
| Click, right half | A green ring of light opens at the click, on a beam from the ring-bearer's fist. |
| Turn starts | The scarlet runner races across; the station's beacon turns green and quickens. |
| Tool call: `Bash`, `Agent`, MCP tools | The machine fires a bolt from its cannon. |
| Tool call: `Edit`, `Write`, `NotebookEdit` | The sea king calls up a swell. |
| Tool call: anything else | The watcher throws a spinning crescent that returns. |
| Compaction | The sea king's swell. |
| Turn ends | The warrior's lasso opens in a gold ring and a gold star opens over the station. |
| Turn fails | A red bolt strikes and the warrior turns it aside on her bracers. |

Up to three effects show at once, and a tool call sets one off at most every 3 seconds. A subagent's turns stay quiet; only the main loop animates.

## Limits

- The backdrop and click effects draw on the desktop and mobile apps. In the terminal the mod does nothing visible; the theme stands and draws when a desktop client attaches.
- Dark theme only.
- If your Claude Code build refuses the sound or style settings, the mod falls back to a plainer look (without them) and shows a toast saying why.
- The animation state is kept in memory and starts over when the mod reloads.
