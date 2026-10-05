import type { Register } from 'claude-code'

// ponytail: regex/token heuristics, not a shell parser; `bash -c "..."` and variable tricks slip through. Upgrade: real shell parsing.
const SECRET = [
  /(^|\/)\.env(\.(?!example$|sample$|template$)[\w.-]+)?$/,
  /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/,
  /(^|\/)\.ssh\/(?!.*\.pub$)/,
  /(^|\/)\.aws\/credentials$/,
  /(^|\/)\.(netrc|npmrc|pgpass)$/,
  /\.(pem|p12|pfx)$/,
]

export const isSecretPath = (p: string) => SECRET.some(r => r.test(p))

const DANGEROUS_RM_TARGETS = new Set(['/', '/*', '~', '~/', '~/*', '$HOME', '$HOME/', '$HOME/*', '*', '.', './', './*', '..', '../'])

const clean = (t: string) => t.replace(/^['"]|['"]$/g, '')

export function checkCommand(command: string): string | undefined {
  if (/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z|da)?sh\b/.test(command)) return 'piping a download into a shell'
  if (/:\(\)\s*\{.*\|.*&.*\}\s*;\s*:/.test(command)) return 'fork bomb'

  for (const seg of command.split(/&&|\|\||[;|\n]/)) {
    const t = seg.trim().split(/\s+/).map(clean)
    const [a, b] = t.filter(x => x !== 'sudo')

    if (a === 'rm') {
      const recursive = t.some(x => /^-[a-zA-Z]*[rR]/.test(x) || x === '--recursive')
      if (recursive && t.some(x => DANGEROUS_RM_TARGETS.has(x))) return 'recursive rm of a root, home or wildcard target'
    }
    if (a === 'git') {
      if (b === 'push' && t.some(x => x === '--force' || x === '-f' || /^\+\S/.test(x))) return 'git force push (use --force-with-lease)'
      if (b === 'reset' && t.includes('--hard')) return 'git reset --hard'
      if (b === 'clean' && t.some(x => /^-[a-zA-Z]*f/.test(x))) return 'git clean -f'
    }
    if (a === 'dd' && t.some(x => x.startsWith('of=/dev/'))) return 'dd to a device'
    if (a?.startsWith('mkfs')) return 'formatting a filesystem'
    if (a === 'chmod' && t.includes('-R') && t.includes('777')) return 'recursive chmod 777'
    if (t.some(x => isSecretPath(x.replace(/^[<>]+/, '')))) return `touching a secret file (${t.find(isSecretPath)})`
  }
}

const msg = (why: string) => `safety-guard: blocked ${why}`

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    const why = checkCommand(e.command)
    if (!why) return next(e)
    $.ui.toast(msg(why))
    return { deny: `${msg(why)}. If this is intended, ask the user to run it themselves.` }
  })

  for (const tool of ['Read', 'Edit', 'Write'] as const) {
    on('tool.call', { tool }, ($, e, next) => {
      if (!isSecretPath(e.file_path)) return next(e)
      const why = `${tool} of secret file ${e.file_path}`
      $.ui.toast(msg(why))
      return { deny: `${msg(why)}. If this is intended, ask the user to run it themselves.` }
    })
  }
}
