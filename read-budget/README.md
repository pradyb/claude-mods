# read-budget

Stops Claude from reading the same large, unchanged file in full again and again in one session. Past a limit, the full read is refused and Claude is pointed to Grep or a ranged Read. Requires Claude Code 2.1.287 or later.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install read-budget@pradyb-mods
```

Or in one step, from a session: `/plugin install read-budget --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## What it does

- Counts full Reads (no `offset`/`limit`) of files of at least `minKb` in the main session.
- After `maxFullReads` of one file, the next full Read of it is refused with a note to use what was read, Grep, or `offset`/`limit`.
- A ranged Read always goes through, so Claude can still read the whole file with `offset: 1` when it really needs to.
- The count starts over when the file changes, after a compaction and after `/clear`. Subagents are not counted.

## Settings

| Setting | Default | |
|---|---|---|
| `minKb` | 20 | Smaller files are never counted. |
| `maxFullReads` | 2 | Full reads of one unchanged file allowed per session. |

## Limits

- Only the Read tool is counted, not `cat` in Bash.
- Counts are kept in memory and start over when the mod reloads.
