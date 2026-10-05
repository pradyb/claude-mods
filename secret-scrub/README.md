# secret-scrub

Catches API keys, tokens and private keys in the prompt you are about to send, and masks or blocks them **before they reach the model**.

It is the other half of [safety-guard](../safety-guard): safety-guard stops Claude from reading your secret files, and secret-scrub stops *you* from pasting a secret into the conversation.

Requires Claude Code 2.1.287 or later.

## Install

```
/plugin marketplace add pradyb/claude-mods
/plugin install secret-scrub@claude-mods
```

Or in one step, from a session: `/plugin install secret-scrub --marketplace pradyb/claude-mods` (Claude Code 2.1.275 or later).

## What it catches

Well-known credential formats, each with a fixed prefix so a match is almost never a false alarm:

| Kind | Looks like |
|---|---|
| AWS access key | `AKIA...` or `ASIA...` plus 16 characters |
| GitHub token | `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, and `github_pat_...` |
| GitLab token | `glpat-` (personal, project and group access tokens), `gldt-`, `glrt-`, `glptt-`, `glft-`, `glcbt-`, `glimt-`, `glagent-`, `glwt-`, `glsoat-`, `glffct-`, `gloas-`, with a body of 20+ characters |
| Anthropic API key | `sk-ant-...` |
| OpenAI-style API key | `sk-...` or `sk-proj-...`, 32+ characters |
| Slack token | `xoxb-`, `xoxp-`, `xoxa-`, `xoxr-`, `xoxs-` |
| Stripe live key | `sk_live_...`, `rk_live_...` |
| Google API key | `AIza...` plus 35 characters |
| npm token | `npm_...` plus 36 characters |
| Private key | a `BEGIN ... PRIVATE KEY` block (the whole block, to its `END` line) |

## What happens

Set `mode` with `/plugin configure secret-scrub`, then run `/reload-plugins`.

- **`mask`** (default): the secret is replaced with `[REDACTED: GitHub token]` and the prompt is sent. A toast tells you what was masked. The model never sees the secret, and your own screen still shows what you typed.
- **`block`**: the prompt is refused, with the reason (the kind, never the secret), so you can remove it and send again.

Every prompt is checked, whatever its source (typed, sent from a phone, a notification, a schedule or another session). In `block` mode only your own prompts are refused: anything else is masked instead, because a refused notification would vanish unseen.

## Limits

- **Known formats only.** It will not catch a password, a database URL with credentials, a generic `secret=` value or a token from a provider not in the table. There is no entropy guessing, on purpose: it would flag ordinary text. If a format you use is missing, open an issue or a pull request with the pattern and a test.
- **Prompts only.** It does not look at file contents Claude reads or at command output. For secret files, use safety-guard.
- **It is a safety net, not data-loss prevention.** If you must keep a secret out of the conversation, do not paste it in the first place.
- A key that was already sent in an earlier session, or that you typed before installing, has already left your machine: rotate it.
