# worktree-hints

In a session running in a git worktree, adds a short section to the system prompt naming the commands the worktree guard refuses (heredoc and inline-script file edits, multi-line scripts, `cd` to a computed path) and what to use instead (Edit/Write, one plain command per call, `git -C`). Claude gets it right the first time instead of being refused and retrying. No setup needed. Requires Claude Code 2.1.287 or later.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install worktree-hints@pradyb-mods
```

Or in one step, from a session: `/plugin install worktree-hints --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## When it applies

When the session's root is under `<repo>/.claude/worktrees/`, or is a worktree outside the repository's main working tree. Other sessions get nothing added.

## Limits

- It is advice to the model, not a block: the guard itself still decides.
- In a Claude Code an organization manages, `prompt.compose` hooks run only for plugins the organization lists, so it does nothing there.
