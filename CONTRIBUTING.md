# Contributing

## Setup

```sh
git clone https://github.com/pradyb/claude-mods
cd claude-mods
claude --plugin-dir ./notify-router   # load a mod from your checkout (use ./safety-guard for the other)
```

Each mod is a folder with `.claude-plugin/plugin.json`, `hooks/hooks.json` and a hooks module (`hooks/register.ts`). The mod API is early access, so check the types your Claude Code build ships when something does not compile.

## Before opening a PR

```sh
claude plugin validate --strict .   # the marketplace manifest
claude plugin validate --strict <mod>   # each mod you touched
claude plugin test <mod>
```

CI runs the same checks for every mod on each push and PR.

## Guidelines

- Keep each mod dependency-free: no `package.json`, no bundler.
- Add a test (`hooks/register.test.ts`) for any new rule, sink or block pattern, including a case that must **not** trigger.
- Update the mod's README if you change user-facing behaviour.
- Bump `version` in `<mod>/.claude-plugin/plugin.json`, in the mods table of the root `README.md`, and add an entry to the root `CHANGELOG.md` for any change users would notice. Releases are tagged `<mod>--vX.Y.Z` with `claude plugin tag <mod>` (run it from a clean working tree; add `--push`).
- Never commit real ntfy topics, tokens, webhook URLs or credentials, including in tests and fixtures.

## Questions

For usage questions or half-formed ideas, use
[Discussions](https://github.com/pradyb/claude-mods/discussions) rather than
the issue tracker. Issues are for reproducible bugs and concrete feature requests.
