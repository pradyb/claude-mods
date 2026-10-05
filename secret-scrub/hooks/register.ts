import type { Register } from 'claude-code'

// Well-known credential formats only: each has a fixed prefix, so a match is almost never a false alarm.
// Order matters: a more specific pattern must come before a more general one that would also match it.
// ponytail: provider formats only. No entropy or "password=" guessing (too many false positives); add a pattern when a format is missing.
const PATTERNS: [kind: string, re: RegExp][] = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g],
  ['AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/g],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ['OpenAI API key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/g],
  ['Stripe live key', /\b[sr]k_live_[A-Za-z0-9]{20,}/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/g],
]

// Returns the text with every secret replaced, and the kinds found (each once, in order). Never returns the secret itself.
export function scrub(text: string): { text: string; kinds: string[] } {
  const kinds: string[] = []
  let out = text
  for (const [kind, re] of PATTERNS) {
    out = out.replace(re, () => {
      if (!kinds.includes(kind)) kinds.push(kind)
      return `[REDACTED: ${kind}]`
    })
  }
  return { text: out, kinds }
}

// The user's own message: typed at the terminal (`composer`) or sent from a phone (`bridge`). No origin is treated the same way.
// Anything else (a notification, a schedule, another session) is never dropped: it would vanish unseen, so it is masked instead.
const isUsersOwn = (origin?: { kind: string }) => origin === undefined || origin.kind === 'composer' || origin.kind === 'bridge'

export const register: Register = (on, options) => {
  on('prompt.submit', ($, e, next) => {
    const { text, kinds } = scrub(e.text)
    if (!kinds.length) return next(e)

    const found = kinds.join(', ')
    if (options.mode === 'block' && isUsersOwn(e.origin)) {
      $.ui.toast(`secret-scrub: blocked a prompt containing ${found}`)
      return { drop: `secret-scrub: your prompt contains ${found}. Remove it and send again, or set mode to "mask".` }
    }
    $.ui.toast(`secret-scrub: masked ${found}`)
    return next({ ...e, text })
  })
}
