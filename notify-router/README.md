# notify-router

Rules for Claude Code alerts: decide **when** an alert is worth sending and **where** it goes.

- Alert when a turn is **done** (only if it took a while), when Claude is **blocked** on you (only if it **stays** blocked for N seconds), or when a turn ends in an **error**
- Alert when your **context window** or a **rate-limit window** (5-hour, 7-day) crosses a threshold, with the time it resets
- Quiet hours, and no repeats of the same alert
- Send to a chime, macOS Notification Center and/or [ntfy](https://ntfy.sh) (phone)

Inspired by [herdr-notify-router](https://github.com/pradyb/herdr-notify-router). Requires Claude Code 2.1.287 or later.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install notify-router@claude-mods
```

Or in one step, from a session: `/plugin install notify-router --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## Settings

Set these with `/plugin configure notify-router`, then run `/reload-plugins`. Sensitive settings (`ntfyTopic`, `ntfyToken`) are kept in secure storage and are not rows in `/config`. `claude plugin configure notify-router@claude-mods` lists every setting and whether it is set, without showing values; "not set" means the default applies.

| Setting | Default | |
|---|---|---|
| `notifyOn` | `done,blocked,error,usage` | Which events alert |
| `doneAfterSeconds` | `20` | `done` only alerts if the turn took at least this long |
| `blockedAfterSeconds` | `60` | `blocked` alerts only if you haven't acted by then; 0 = at once |
| `usageThresholds` | `80,95` | Alert when the context window or a rate-limit window crosses each of these percentages; empty = off |
| `quietHours` | empty | `HH:MM-HH:MM`, local time, may wrap past midnight (`22:00-07:00`) |
| `dedupeSeconds` | `60` | Don't repeat the same event type within this time; 0 = off |
| `includeFolder` | `true` | Put the session's folder name in the alert title (`Claude Code: my-project`) so you can tell which session needs you |
| `chime` | `true` | Play a short sound with each alert (macOS only). Quiet hours, dedupe and the event filter apply to it |
| `desktop` | `true` | macOS Notification Center (macOS only) |
| `ntfyTopic` | empty | Send to this ntfy topic; empty = off. Stored as a sensitive value |
| `ntfyServer` | `https://ntfy.sh` | Base URL of your ntfy server |
| `ntfyToken` | empty | Access token for a protected topic. Stored as a sensitive value |

A pending `blocked` alert is cancelled as soon as you act (submit a prompt, or a tool runs after you approve it), or the turn ends.

## Usage alerts

Claude Code reports how full the context window is and, on a subscription, how much of each rate-limit window you have used. notify-router alerts when one of them crosses a threshold from `usageThresholds` (80% and 95% by default):

- `Context window 81% full`
- `5-hour limit at 82%, resets in 1h 20m`
- `7-day limit at 95%, resets in 2d 3h`

Each metric is tracked separately and each threshold alerts **once**: you are told at 80%, then again at 95%, not on every request in between. If a metric drops back (the context is compacted, or a window resets), crossing the threshold alerts again. Quiet hours, the chime and every sink apply as for any other alert.

Rate limits are only reported on a subscription (Pro or Max), and only after the first response, so on an API key you will only get the context alerts. To turn usage alerts off, empty `usageThresholds` or remove `usage` from `notifyOn`.

## Phone alerts with ntfy

With no `ntfyTopic` set, nothing is sent to ntfy: only the macOS notification and chime fire.

1. Install the **ntfy** app (iOS or Android).
2. Pick a topic name. On the public ntfy.sh the topic name is the only secret, so make it long and random, for example `echo "claude-$(openssl rand -hex 12)"`.
3. In the app, tap **+** and subscribe to that topic on the default server.
4. Optional: check ntfy on its own before involving the mod. If your phone buzzes, ntfy works.

   ```
   curl -d "hello from curl" ntfy.sh/<your-topic>
   ```

5. In Claude Code, run `/plugin configure notify-router` and enter the topic in `ntfyTopic`. Leave `ntfyServer` at its default unless you self-host. For a protected topic, also set `ntfyToken`.
6. Run `/reload-plugins`, then check that `ntfyTopic` no longer shows "not set" in `claude plugin configure notify-router@claude-mods`.

**Test it.** By default a `done` alert needs a turn of 20 seconds or more, so set `doneAfterSeconds` to `0` for the test (then `/reload-plugins`), send any short prompt, and your phone should show `Claude Code: <folder>` with "Done in Ns". Set it back to `20` afterwards. To test `blocked`, trigger a permission prompt and leave it unanswered: it fires after `blockedAfterSeconds` (60 by default). A second alert of the same type within `dedupeSeconds` is dropped on purpose.

**Nothing arrives?** Start Claude Code with `claude --debug` and look for `notify-router: ntfy failed (...)`. It logs the HTTP status, never the topic. A 401 or 403 on a protected topic means `ntfyToken` is missing or wrong. If the `curl` test in step 4 also fails, the problem is the topic or the app, not the mod.

## Privacy

Alerts carry only the session's folder name (turn off with `includeFolder`) and a short status line ("Done in 42s", or Claude's own "needs your permission to use Bash"), never the conversation. The folder name goes to every sink, so on a public ntfy server it reveals your project names. On the public ntfy.sh the **topic name is the only secret**: use a long random one, or a protected topic with a token. Failures are logged at debug level (`claude --debug`) with the sink name and HTTP status only, never the topic.

## Limits

- The chime and notifications are macOS-only. Notifications show the **Script Editor** icon, and may need allowing in System Settings → Notifications.
- No terminal-focus detection, so there is no `skip_if_focused`.
- The title is the folder's name, not a session id: two sessions in the same folder look alike.
- Dedupe state and a pending `blocked` timer live in memory and are lost on reload or restart.
- Not yet: webhook sinks and a team policy file; see the [Roadmap](#roadmap).

## Roadmap

Nothing here is committed to a release date. Open an issue if one of these matters to you.

**Next release**
- [x] ~~Usage alerts~~ (shipped in 0.2.0)
- [ ] **Webhook sink**: Slack, Discord and plain JSON, with the URL kept as a sensitive setting. Slack text is escaped and Discord mentions are disabled, so a folder or branch name can't ping anyone.
- [ ] **Team policy file**: a committed `.claude/notify.toml` that shares **rules** only (events, delays, which sinks), never destinations or URLs, so every teammate keeps their own channels. Same model as herdr-notify-router's `.herdr/notify.toml`.

**Backlog**
- [ ] Tell two sessions in the same folder apart (a short session label in the title).
- [ ] A different sound per event (`done`, `blocked`, `error`), and a way to turn the chime off per event.
- [ ] Desktop notifications and the chime on Linux and Windows (today macOS only).
- [ ] Rules per event instead of one global set, for example `blocked` to your phone only and `done` to your desktop only. Needs a config file read through the plugin's file access, because plugin settings are flat.
- [ ] Remember a pending `blocked` alert and dedupe state across a reload or restart (today they live in memory).
- [ ] An optional custom icon for macOS notifications, via terminal-notifier (as in herdr-notify-router).
- [ ] Microsoft Teams webhooks (needs an Adaptive Card payload).

**Blocked by the plugin API** (revisit if it changes)
- [ ] `skip_if_focused`: don't alert for the session you're looking at. The API exposes no terminal-focus signal.
- [ ] A native notification with its own icon, without going through `osascript`: the API has no notification call.
