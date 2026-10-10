# status-bar

A one-line status bar above the prompt, with the figures the CLI status line shows (except the model).

```
claude-mods  ⎇ main  5h █████ 40% · 2h13m  7d ████░ 85% · 98h02m  ctx 42%  $ 1.50  ⏱ 1h05m  turns 3
```

Requires Claude Code 2.1.287 or later.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install status-bar@claude-mods
```

Or in one step, from a session: `/plugin install status-bar --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## What it shows

| Item | Meaning |
|---|---|
| folder | The session's working folder. |
| `⎇` branch | The current git branch; left out outside a repository. |
| `5h`, `7d` | Rate-limit usage as a 5-cell bar, the percentage used and the time until the window resets. Subscription accounts only, and only once a response has reported them. |
| `ctx` | How full the context window is. |
| `$` | What the session has cost so far. |
| `⏱` | How long the session has run. |
| `turns` | Turns taken so far. |

An item whose figure is not available is left out.

## Colors

The bars and `ctx` change color with how much is used. They are theme colors, so they follow your Claude Code theme.

| Used | Color |
|---|---|
| under 70% | green (`success`) |
| 70% to 89% | amber (`warning`) |
| 90% or more | red (`error`) |

## Where it shows

The desktop app and VS Code. On the terminal (CLI) the mod draws nothing, so your own status line is untouched. The bar sits in the band above the prompt: it stays on one line, and on a narrow window the last items are clipped. It steps aside while a survey uses that slot, and the engine's own `[-]` collapses it.

## Limits

- The bar redraws when you send a prompt and when a turn ends, so the session time moves only then.
- The CLI status line also has effort, output style, vim mode, agent, worktree and lines changed. Mods can't read those, so they are not shown.
- No settings: the order, the 5-cell bars and the 70/90 cutoffs are fixed in `hooks/register.tsx`.
