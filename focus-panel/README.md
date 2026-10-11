# focus-panel

After each response, a panel above the prompt with what needs your attention: questions waiting on you, errors, the next action, open to-dos and warnings.

```
┌────────────────────────────────────────────────────────────────────────┐
│ FOCUS                                                         [Dismiss] │
│ ▌ NEEDS YOU   Should I also bump the version?                           │
│ ▌ ERROR       Bash: npm test exited 1                                   │
│ ▌ NEXT   #3   Wire the panel into marketplace.json           [Run it]   │
│ ▌ TO-DO       ○ Write the README                                        │
│ ▌ HEADS-UP    This changes the cache key; old caches are dropped.       │
└────────────────────────────────────────────────────────────────────────┘
```

Requires Claude Code 2.1.287 or later.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install focus-panel@pradyb-mods
```

Or in one step, from a session: `/plugin install focus-panel --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## What it shows

Only the sections that have something; with nothing to show there is no panel. Each section has its own color and text style, and the frame turns red when an error is shown, or amber when a question is waiting on you.

| Section | Style | Where it comes from |
|---|---|---|
| **NEEDS YOU** | bold | Questions and lines such as "please confirm" or "let me know" near the end of the response; bullets under a "Needs you" or "Decisions" heading |
| **ERROR** | red text | Tool calls that failed this turn, and a turn that ended on an API error or a refusal; "Failed:" / "Error:" lines, ❌ lines, and bullets under a "Failures" or "Issues" heading |
| **NEXT** | bold, with a task id | A "Next:" or "Next step:" line, or the first bullet under a "Next steps" heading; else the in-progress (or first unblocked) task from Claude's task list, with its id (`#3`) |
| **TO-DO** | `○` marker | Unchecked `- [ ]` items, "TODO:" lines, the other bullets under a "Next steps" or "To-do" heading, and the other open tasks with their ids |
| **HEADS-UP** | italic | "Note:", "Warning:", "Important:", "Risk:" and similar lines, ⚠ lines, and bullets under a "Warnings" or "Risks" heading |

Code blocks in the response are ignored, and so are ticked `- [x]` items. A heading is a `#` line, a bold line or a line ending in a colon; a line of plain text ends its list. Each section shows up to 3 items (2 in the terminal), with `+n` for the rest; on a short window whole sections are dropped from the bottom up.

## Buttons

- **Run it** sends the NEXT item as your next prompt, as if you had typed it (with a task id: "Continue with task #3: ...").
- **Dismiss** clears the panel.
- Sending any prompt clears it too, and the panel stays hidden while a turn is running or a survey is up.

## How it finds items

1. **Rules, always:** the patterns above, free and instant. They run the moment a response ends.
2. **Haiku, for long responses:** a response of at least `modelMinChars` characters is also read by one short Haiku call, which returns the five lists as JSON and fills in what the rules missed (an implied question, a risk not labelled as one). It arrives a moment after the rules-only panel, and only if no newer turn has started. The response is sent to Haiku as data, never as instructions.

## Settings

Set with `/plugin configure focus-panel`, then `/reload-plugins`.

| Setting | Default | |
|---|---|---|
| `useModel` | on | Off = rules only, no model calls. |
| `modelMinChars` | 800 | Only responses at least this long go to Haiku. |

## Where it shows

The desktop app and the terminal. It draws in the band above the prompt, with a blank line between it and anything below, and stacks above the [status-bar](../status-bar) mod's line when both are installed.

## Limits

- The rules read common wording, not meaning: a question phrased without a `?`, or a "next step" in a sentence, is missed unless Haiku catches it.
- The colors are theme colors (`warning`, `error`, `success`, `subtle`, `suggestion`), so they follow your Claude Code theme and are not configurable here.
- Task ids come from the task tools the model called in this session; tasks created before the mod loaded are picked up once Claude lists them.
- Haiku costs a few hundred tokens per long response; turn `useModel` off to avoid it.
