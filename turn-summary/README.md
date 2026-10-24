# turn-summary

A summary of the last turn (under the prompt in the terminal, in the footer next to the mode and model on the desktop): how long it took, how many tools were called and how many subagents were started. It stays until your next prompt. Terminal and desktop app. Requires Claude Code 2.1.287 or later.

```
? for shortcuts   ✓ ⏱ 42s · 11 tools · 2 agents (1 background)
```

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install turn-summary@pradyb-mods
```

Or in one step, from a session: `/plugin install turn-summary --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## Turning it off

`/summary off` hides it, `/summary on` brings it back, and plain `/summary` flips it. The choice is kept across sessions.

## What it shows

| Part | Meaning |
|---|---|
| `✓` / `…` | The turn is done / still running (the time is then the time so far). |
| `⏱ 42s`, `⏱ 1m 04s` | How long the turn took. |
| `11 tools` | Tool calls, from Claude and from its subagents. |
| `2 agents (1 background)` | Subagents started, and how many of them run in the background. |

A count of zero is left out. A new turn starts when you send a prompt; a slash command or a machine-made prompt (a background task's notification) does not reset it.

## Limits

- In the terminal the summary is added to the hint line under the prompt (`? for shortcuts`), so a narrow window cuts it at the end, and it is hidden while you type. On the desktop it is the status-line entry in the footer, labelled with the mod's name.
- Background Bash commands are not counted, only background agents.
- Counts are kept in memory and start over when the mod reloads.
