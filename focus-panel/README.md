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
/plugin install focus-panel@claude-mods
```

Or in one step, from a session: `/plugin install focus-panel --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## What it shows

Only the sections that have something; with nothing to show there is no panel. Each section has its own color and text style.

| Section | Style | Where it comes from |
|---|---|---|
| **NEEDS YOU** | bold | Questions and lines such as "please confirm" or "let me know" near the end of the response |
| **ERROR** | red text | Tool calls that failed this turn, and a turn that ended on an API error or a refusal |
| **NEXT** | bold, with a task id | A "Next:" or "Next step:" line; else the in-progress (or first unblocked) task from Claude's task list, with its id (`#3`) |
| **TO-DO** | `○` marker | Unchecked `- [ ]` items, "TODO:" lines, and the other open tasks with their ids |
| **HEADS-UP** | italic | "Note:", "Warning:", "Important:", "Risk:" and similar lines |

Code blocks in the response are ignored. Each section shows up to 3 items (2 in the terminal), with `+n` for the rest; on a short window whole sections are dropped from the bottom up.

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
- The five hues are fixed (muted ochre, brick, sage, slate and clay), tuned for dark themes and a little pale on light ones. The frame and normal text follow your theme.
- Task ids come from the task tools the model called in this session; tasks created before the mod loaded are picked up once Claude lists them.
- Haiku costs a few hundred tokens per long response; turn `useModel` off to avoid it.
