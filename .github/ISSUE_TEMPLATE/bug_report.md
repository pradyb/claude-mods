---
name: Bug Report
about: Report a bug in one of the claude-mods
title: "[BUG] "
labels: bug
assignees: ""
---

## Describe the Bug

A clear and concise description of what the bug is.

## Mod

safety-guard / secret-scrub / notify-router

## Steps to Reproduce

1. Settings used (redact any ntfy topic or token)
2. What you asked Claude to do, or the command that was or was not blocked
3. See the problem

## Expected Behaviour

What you expected to happen.

## Actual Behaviour

What actually happened. For a missing alert, run `claude --debug` and include any
`notify-router: ... failed (...)` line (it never contains the topic).

## Environment

- **Claude Code version** (`claude --version`):
- **Mod version** (`version` in `<mod>/.claude-plugin/plugin.json`):
- **OS and architecture**:
- **Sink involved** (macOS notification, chime, ntfy):

## Additional Context

Any other context about the problem. Never paste a real ntfy topic, token or credential.
