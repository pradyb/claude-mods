# Changelog

Each mod is versioned on its own (semver, in `<mod>/.claude-plugin/plugin.json`) and tagged `<mod>-vX.Y.Z`.

## notify-router

### 0.2.0
- Usage alerts: an alert when the context window, or a rate-limit window (5-hour, 7-day), crosses a threshold, with the time the window resets. New `usageThresholds` setting (default `80,95`, empty = off); `usage` is now part of the default `notifyOn`. Each threshold alerts once per metric and re-arms after the metric drops.

### 0.1.0
- Initial release: alerts for `done`, `blocked` (only if still waiting after N seconds) and `error`; quiet hours; dedupe; chime, macOS desktop and ntfy sinks; the alert title names the session's folder (`includeFolder`).

## safety-guard

### 0.1.0
- Initial release: blocks destructive Bash commands and Read/Edit/Write/Bash access to secret files.
