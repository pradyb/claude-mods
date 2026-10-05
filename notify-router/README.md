# notify-router

Rules for Claude Code alerts: decide **when** an alert is worth sending and **where** it goes.

- Alert when a turn is **done** (only if it took a while), when Claude is **blocked** on you (only if it **stays** blocked for N seconds), or when a turn ends in an **error**
- Quiet hours, and no repeats of the same alert
- Send to a chime, macOS Notification Center and/or [ntfy](https://ntfy.sh) (phone)

Inspired by [herdr-notify-router](https://github.com/pradyb/herdr-notify-router).

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install notify-router@claude-mods
```

## Settings

Set these in the plugin's config menu (`/plugin`).

| Setting | Default | |
|---|---|---|
| `notifyOn` | `done,blocked,error` | Which events alert |
| `doneAfterSeconds` | `20` | `done` only alerts if the turn took at least this long |
| `blockedAfterSeconds` | `60` | `blocked` alerts only if you haven't acted by then; 0 = at once |
| `quietHours` | empty | `HH:MM-HH:MM`, local time, may wrap past midnight (`22:00-07:00`) |
| `dedupeSeconds` | `60` | Don't repeat the same event type within this time; 0 = off |
| `includeFolder` | `true` | Put the session's folder name in the alert title (`Claude Code: my-project`) so you can tell which session needs you |
| `chime` | `true` | Play a short sound with each alert (macOS only). Quiet hours, dedupe and the event filter apply to it |
| `desktop` | `true` | macOS Notification Center (macOS only) |
| `ntfyTopic` | empty | Send to this ntfy topic; empty = off. Stored as a sensitive value |
| `ntfyServer` | `https://ntfy.sh` | Base URL of your ntfy server |
| `ntfyToken` | empty | Access token for a protected topic. Stored as a sensitive value |

A pending `blocked` alert is cancelled as soon as you act (submit a prompt, or a tool runs after you approve it), or the turn ends.

## Privacy

Alerts carry only the session's folder name (turn off with `includeFolder`) and a short status line ("Done in 42s", or Claude's own "needs your permission to use Bash"), never the conversation. The folder name goes to every sink, so on a public ntfy server it reveals your project names. On the public ntfy.sh the **topic name is the only secret**: use a long random one, or a protected topic with a token. Failures are logged at debug level (`claude --debug`) with the sink name and HTTP status only, never the topic.

## Limits

- The chime and notifications are macOS-only. Notifications show the **Script Editor** icon, and may need allowing in System Settings → Notifications.
- No terminal-focus detection, so there is no `skip_if_focused`.
- The title is the folder's name, not a session id: two sessions in the same folder look alike.
- Dedupe state and a pending `blocked` timer live in memory and are lost on reload or restart.
- Not yet: webhook sinks (Slack, Discord) and a team policy file. Planned.
