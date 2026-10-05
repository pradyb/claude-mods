# claude-mods

Mods (plugins) for Claude Code.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install safety-guard@claude-mods
```

## Mods

| Mod | What it does |
|---|---|
| [safety-guard](safety-guard) | Blocks destructive shell commands (`rm -rf /`, force push, `reset --hard`, `curl \| sh`, ...) and access to secret files (`.env`, SSH keys, cloud credentials). |
| [notify-router](notify-router) | Rules for alerts: done, blocked (only if still waiting) and error, sent to a chime, macOS notifications and ntfy, with quiet hours and dedupe. |

## Versioning

Each mod has its own semver in `<mod>/.claude-plugin/plugin.json`, a `CHANGELOG.md`, and git tags named `<mod>-vX.Y.Z`. Bump the version on every change users should receive.

## Development

```
claude plugin validate <mod>
claude plugin test <mod>
```

The mod API is early access and may change between Claude Code releases.
