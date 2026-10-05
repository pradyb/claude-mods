# safety-guard

Blocks destructive shell commands and access to secret files before Claude Code runs them. No setup needed. Requires Claude Code 2.1.287 or later.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install safety-guard@claude-mods
```

Or in one step, from a session: `/plugin install safety-guard --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## What it blocks

**Shell commands (Bash)**
- `rm -r` of `/`, `~`, `$HOME`, `*`, `.` or `..` (and their `/*` forms)
- `git push --force` or `-f` (use `--force-with-lease`), and `git push +ref`
- `git reset --hard`, `git clean -f`
- `curl` or `wget` piped into a shell
- `dd` to a device, `mkfs`, `chmod -R 777`, fork bombs

**Secret files** (Read, Edit, Write, and any Bash command that names one)
- `.env` and `.env.*` (but not `.env.example`, `.env.sample`, `.env.template`)
- SSH private keys (`id_rsa`, `id_ed25519`, ...) and anything under the `.ssh` folder except `*.pub`
- `.aws/credentials`, `.netrc`, `.npmrc`, `.pgpass`
- `*.pem`, `*.p12`, `*.pfx`

When something is blocked you get a toast, and Claude is told why and to ask you to run it yourself if it is intended.

## Limits

- It matches commands with regexes and word splitting, not a real shell parser. `bash -c "..."`, variable tricks and similar indirection get through.
- A secret filename anywhere in a shell command is blocked, even when it is harmless, for example appending `.env` to a `.gitignore` with `echo`. Writing the same text with the Write or Edit tool is fine, since only the file path is checked there.
- It has no settings: the lists above are fixed. To run something it blocks, run it yourself in a terminal.
