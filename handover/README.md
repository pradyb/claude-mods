# handover

Moves long work to a fresh session without losing the thread. `/handover` asks the model for a handover note over the conversation so far (one forked request, served from the prompt cache), saves it in your Claude Code project folder (`~/.claude/projects/<project>/handovers/<session-title>.md`), runs `/clear`, and sends the note as the first prompt of the new session. Requires Claude Code 2.1.287 or later.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install handover@pradyb-mods
```

Or in one step, from a session: `/plugin install handover --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## Use

- `/handover`: write the note, clear, continue from it.
- `/handover save`: write the note only; nothing is cleared.
- `/handover <focus>` or `/handover save <focus>`: tell the next session what to focus on, for example `/handover next story is US-014-15`.

When the context window passes the threshold (40% by default, then every 20 points), a toast says so and `/handover` is suggested in the prompt box after the turn ends: Tab takes it.

A new session in a project with a note less than 12 hours old suggests continuing from the newest one.

The note has the goal, where things are (branch, worktree, PR, CI), what is done, decisions and their reasons, gotchas, the next steps and the files that matter.

## Where notes go

- Folder: `~/.claude/projects/<project>/handovers/`, next to the project's transcripts and memory, so nothing lands in your repository. A session in a worktree (or a subfolder) uses its repository's main folder, so the session for the next story finds the note.
- File: the session's title as Claude Code shows it (set by `/rename` or generated), e.g. `fix-period-filter-us-014-12.md`; `session-<id>.md` before the session has a title. A second handover from the same session overwrites its note.

## Settings

| Setting | Default | |
|---|---|---|
| `threshold` | 40 | Context % at which `/handover` is suggested. 0 turns suggestions off; the command still works. |

## Limits

- Nothing to hand over before the first turn has ended, or right after a `/clear`: the command says so and clears nothing.
- The note is a summary. Anything not in it, the code, the PR or the repo docs is gone after the clear; `/handover save` first if you want to check it.
