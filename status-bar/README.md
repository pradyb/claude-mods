# status-bar

A one-line status bar above the prompt, with the figures the CLI status line shows (except the model).

```
claude-mods  ⎇ main +2 ~1 ?1  5h ███░ 64% · 3h31m  7d ██░░ 60% · 2d  ctx 17% · 172k  cache 52m  $ 2.15  ⏱ 41m  turns 12  14:05
```

Requires Claude Code 2.1.287 or later.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install status-bar@pradyb-mods
```

Or in one step, from a session: `/plugin install status-bar --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## What it shows

| Item | Meaning |
|---|---|
| folder | The session's working folder. |
| `⎇` branch | The current git branch and its state (below); left out outside a repository. |
| `5h`, `7d` | Rate-limit usage as a 4-cell bar, the percentage used and the time until the window resets: hours and minutes under a day, whole days after. Subscription accounts only, and only once a response has reported them. |
| `ctx` | How full the context window is, and its size in tokens (`17% · 172k`). |
| `cache` | Time left on the prompt cache after the last turn (`52m`), or `cold` once it has expired. Shown after the first turn; subagent turns don't reset it. The lifetime is the `cacheTtlMinutes` setting (default 60; use 5 for the API default). |
| `$` | What the session has cost so far. |
| `⏱` | How long the session has run. |
| `turns` | Turns taken so far. |
| clock | The time of day, at the right edge. |

An item whose figure is not available is left out.

### Git state

Marks after the branch name, from `git status`:

| Mark | Meaning | Color |
|---|---|---|
| `+2` | files staged | green |
| `~3` | files changed, not staged | amber |
| `?1` | untracked files | dim |
| `↑2` | commits ahead of upstream | blue |
| `↓1` | commits behind upstream | amber |
| `✓` | nothing to commit, in sync | green |

It is read at most every 5 seconds. A detached HEAD shows as `detached`.

## Colors

The bars and `ctx` change color with how much is used. They are theme colors, so they follow your Claude Code theme.

| Used | Color |
|---|---|
| under 50% | green (`success`) |
| 50% to 79% | amber (`warning`) |
| 80% or more | red (`error`) |

`cache` uses the same colors by how much of its lifetime has gone, and `cold` is red.

## Where it shows

The desktop app. On the terminal (CLI) the mod draws nothing, so your own status line is untouched. The bar sits in the band above the prompt: it stays on one line, spread over the full width, and on a narrow window the last items are clipped. It steps aside while a survey uses that slot, and the engine's own `[-]` collapses it.

It shares the band with other mods: what another mod draws there (such as [focus-panel](../focus-panel)) is stacked above the bar.

## Limits

- The bar redraws when you send a prompt, when a turn ends, when usage is re-measured and every 30 seconds, so the clock, session time and cache countdown can be up to 30 seconds behind.
- The CLI status line also has effort, output style, vim mode, agent, worktree and lines changed. Mods can't read those, so they are not shown.
- One setting, `cacheTtlMinutes`; the order, the 4-cell bars and the 50/80 cutoffs are fixed in `hooks/register.tsx`.
