# Changelog

Each mod is versioned on its own (semver, in `<mod>/.claude-plugin/plugin.json`) and tagged `<mod>-vX.Y.Z`.

## notify-router

### 0.1.0
- Initial release: alerts for `done`, `blocked` (only if still waiting after N seconds) and `error`; quiet hours; dedupe; chime, macOS desktop and ntfy sinks; the alert title names the session's folder (`includeFolder`).

## safety-guard

### 0.1.0
- Initial release: blocks destructive Bash commands and Read/Edit/Write/Bash access to secret files.
