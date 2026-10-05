# Security Policy

## Supported Versions

Only the latest release of each mod (and the latest commit on `main`) is actively supported with security fixes.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately using
[GitHub's private vulnerability reporting](https://github.com/pradyb/claude-mods/security/advisories/new)
or by emailing **pradeep.devlabs@gmail.com**.

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept if possible)
- Your suggested fix or mitigation (optional)

You can expect an acknowledgement within **72 hours**.

## Scope

**notify-router** sends alerts to destinations you configure. Its sensitive data is the ntfy topic and
token, which Claude Code keeps in secure storage, and the alert text, which is only the session's folder
name and a short status line, never the conversation.

In scope: any way a value from a prompt, a tool result or Claude's own output can inject commands or
arguments (for example into the macOS notification call or the HTTP request), leak the topic or token
(including into logs), or send data to a destination that was not configured in your settings.

**safety-guard** is a best-effort filter, not a sandbox. It matches commands with regexes and word
splitting, so a command it fails to recognise, such as one wrapped in `bash -c` or built from variables, is a
**known limit, not a vulnerability**. It is documented in the mod's README, and a pull request that
extends the patterns is welcome.

In scope: a way to make safety-guard crash, hang, or block unrelated work, or to make a mod do something
other than what its README says.

Out of scope: what a sink you chose (ntfy.sh, your own server) does with a message, and vulnerabilities in
Claude Code itself (report those to Anthropic).
