# claude-mods

Mods (plugins) for Claude Code. Requires Claude Code 2.1.287 or later (`claude --version`).

## Install

```
/plugin marketplace add pradyb/claude-mods
```

Then install the mods you want, for example `/plugin install safety-guard@claude-mods`, or add the marketplace and install in one step with `/plugin install <mod> --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later). Each mod's README has its own install command and settings.

A mod runs with your permissions, so read what it does first. `claude plugin validate <mod>` lists the events a mod handles and the calls it makes without running it.

## Mods

| Mod | Version | What it does |
|---|---|---|
| [safety-guard](safety-guard) | 0.1.0 | Blocks destructive shell commands (`rm -rf /`, force push, `reset --hard`, `curl \| sh`, ...) and access to secret files (`.env`, SSH keys, cloud credentials). |
| [secret-scrub](secret-scrub) | 0.1.2 | Catches API keys, tokens and private keys in the prompt you are about to send, and masks or blocks them before they reach the model. |
| [notify-router](notify-router) | 0.4.1 | Rules for alerts: done, blocked (only if still waiting), error, and context or rate-limit usage, sent to a chime, macOS notifications, ntfy and Slack, Discord or JSON webhooks, with quiet hours and dedupe. |
| [status-bar](status-bar) | 0.1.0 | A one-line status bar above the prompt: folder, git branch, 5-hour and 7-day usage bars, context, cost, session time and turns. Desktop and VS Code only; the CLI keeps its own status line. |

## Versioning

Each mod has its own semver in `<mod>/.claude-plugin/plugin.json`. Releases are tagged `<mod>--vX.Y.Z` with `claude plugin tag` (the first releases of `safety-guard` and `notify-router` use the older `<mod>-vX.Y.Z` form). Changes are listed per mod in [CHANGELOG.md](CHANGELOG.md). Bump the version on every change users should receive: Claude Code does not offer an update for a changed plugin whose version stayed the same.

## Development

```
claude plugin validate --strict <mod>
claude plugin test <mod>
```

The mod API is early access and may change between Claude Code releases.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately, as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
