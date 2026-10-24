# snippets

Text replacement for your prompts, like the macOS feature: type `;name` and it is expanded to the saved text when you press Enter, before the model sees it. Requires Claude Code 2.1.287 or later.

```
> ;cr src/auth.ts
  becomes: Please review this carefully for bugs, security issues and missing tests. src/auth.ts
```

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install snippets@pradyb-mods
```

Or in one step, from a session: `/plugin install snippets --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## Managing snippets

`/snip` opens an editor pane: every snippet with **Edit** and **Delete** buttons, and a form (name, text, **Save**) to add a new one or change the one you picked. Saving a name that exists replaces it. In the text field Enter saves and a newline is typed as in the prompt box. The pane needs a terminal or desktop window; on the phone use the commands below.

The same from the prompt:

| Command | What it does |
|---|---|
| `/snip` | Opens the editor pane. |
| `/snip add <name> <text>` | Adds a snippet, or replaces the one with that name. `\n` in the text is a line break. |
| `/snip rm <name>` | Removes it. |
| `/snip list` | Lists them as text. |
| `/snip path` | Shows where they are stored. |

Names are letters, digits, `-` and `_`. Snippets are stored in `~/.claude/snippets.json`, a plain `{"name": "text"}` file you can edit by hand (use `\n` inside the JSON string for a multi-line snippet); the mod reads it on every prompt, so edits apply at once.

## How it expands

- `;name` is expanded when it stands alone: at the start of the prompt or after whitespace, and followed by whitespace, punctuation or the end. `a;b` and `foo; bar` are left alone.
- A name with no snippet stays as typed.
- One pass only: a `;other` inside a snippet is not expanded again.
- The prompt you see in the transcript may show the expanded text; the model always gets it.

## Limits

- Expansion happens on Enter, not as you type.
- A slash-command line (`/snip ...`, `/review ;cr`) is never expanded: Claude Code allows no rewrite of those.
- Only your own typed prompts are expanded, not notifications or messages from other sessions.
- A missing or unreadable `snippets.json` counts as no snippets; the prompt always goes through.
