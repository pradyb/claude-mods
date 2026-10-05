# Changelog

Each mod is versioned on its own (semver, in `<mod>/.claude-plugin/plugin.json`) and tagged `<mod>--vX.Y.Z`. The first releases of `safety-guard` and `notify-router` carry the older `<mod>-vX.Y.Z` tags.

## notify-router

### 0.4.0
- Webhook sink: post alerts to a Slack or Discord incoming webhook, or any URL that takes a JSON POST. New `webhookUrl` (sensitive) and `webhookFormat` (`auto`, `slack`, `discord`, `json`) settings; `auto` picks the format from the URL's host. Slack text is escaped and Discord mentions are disabled, so a folder name or message can't ping anyone. The same event filter, quiet hours and dedupe apply.

### 0.3.0
- New `sessionLabel` setting (default off): adds the first 4 characters of the session id to the alert title (`Claude Code: my-project #a1b2`), to tell two sessions in the same folder apart.
- A different sound per event: `done` keeps its chime, `blocked` and `usage` get three quick beeps, `error` a falling low tone.
- New `chimeOn` setting (default all four events): leave an event out to keep its notification but not its sound.

### 0.2.0
- Usage alerts: an alert when the context window, or a rate-limit window (5-hour, 7-day), crosses a threshold, with the time the window resets. New `usageThresholds` setting (default `80,95`, empty = off); `usage` is now part of the default `notifyOn`. Each threshold alerts once per metric and re-arms after the metric drops.

### 0.1.0
- Initial release: alerts for `done`, `blocked` (only if still waiting after N seconds) and `error`; quiet hours; dedupe; chime, macOS desktop and ntfy sinks; the alert title names the session's folder (`includeFolder`).

## secret-scrub

### 0.1.2
- Added: AWS secret access keys (the 40-character half of an AWS key pair), masked only right after their name (`AWS_SECRET_ACCESS_KEY=`, `aws_secret_key:`, `"SecretAccessKey":`, ...). The name stays, only the value is replaced. A bare 40-character string is left alone.

### 0.1.1
- Added: GitLab tokens (personal, project and group access tokens and the other `gl...-` prefixes).
- Fix: prompts typed at the terminal were never scanned. The mod skipped every prompt that carried an origin, but Claude Code stamps the user's own Enter as `composer` (and a phone message as `bridge`). Every prompt is now scanned. In `block` mode only the user's own prompts are refused; a notification, schedule or message from another session is masked instead, since a refused one would vanish unseen.

### 0.1.0
- Initial release: masks or blocks API keys, tokens and private keys (AWS, GitHub, Anthropic, OpenAI, Slack, Stripe, Google, npm, PEM private keys) in the prompt before it reaches the model. `mode` setting: `mask` (default) or `block`.

## safety-guard

### 0.1.0
- Initial release: blocks destructive Bash commands and Read/Edit/Write/Bash access to secret files.
