import type { Register } from 'claude-code'

type Seg = { label?: string; text: string; color: string; bar?: [filled: string, empty: string]; flags?: { text: string; color: string }[] }
export type Git = { branch: string; staged: number; modified: number; untracked: number; ahead: number; behind: number }
export type Facts = {
  cwd: string
  git?: Git
  contextPercent?: number
  costUsd?: number
  elapsedMs: number
  turns: number
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
  now: number
}

// Theme keys, so the bar follows the person's theme.
const level = (pct: number) => (pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'success')

export function duration(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000))
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

export function bar(pct: number, width = 4): [string, string] {
  const n = Math.min(width, Math.max(0, Math.round((pct / 100) * width)))
  return ['█'.repeat(n), '░'.repeat(width - n)]
}

// A day or more away: whole days only, to save room.
export function resetIn(ms: number): string {
  return ms >= 86_400_000 ? `${Math.floor(ms / 86_400_000)}d` : duration(ms)
}

const LIMIT = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' } as Record<string, string>

// `git status --porcelain=v1 -b`: the branch line, then one line per changed file.
export function parseStatus(out: string): Git | undefined {
  const [head, ...files] = out.split('\n').filter(Boolean)
  if (!head?.startsWith('## ')) return undefined
  const h = head.slice(3)
  const branch = h.startsWith('HEAD (no branch)') ? 'detached' : /^(?:No commits yet on|Initial commit on) (.+)$/.exec(h)?.[1] ?? h.split(/\.\.\.| /)[0]
  const g: Git = { branch, staged: 0, modified: 0, untracked: 0, ahead: Number(/ahead (\d+)/.exec(h)?.[1] ?? 0), behind: Number(/behind (\d+)/.exec(h)?.[1] ?? 0), }
  for (const l of files) {
    if (l.startsWith('??')) g.untracked++
    else {
      if (l[0] !== ' ') g.staged++
      if (l[1] !== ' ') g.modified++
    }
  }
  return g
}

export function gitFlags(g: Git): { text: string; color: string }[] {
  const f = [
    [g.staged, '+', 'success'],
    [g.modified, '~', 'warning'],
    [g.untracked, '?', 'subtle'],
    [g.ahead, '↑', 'suggestion'],
    [g.behind, '↓', 'warning'],
  ] as const
  const out = f.filter(([n]) => n > 0).map(([n, mark, color]) => ({ text: `${mark}${n}`, color }))
  return out.length ? out : [{ text: '✓', color: 'success' }]
}

// Everything the CLI status line has except the model.
export function segments(f: Facts): Seg[] {
  const out: Seg[] = [{ text: f.cwd.split('/').filter(Boolean).pop() ?? '/', color: 'claude' }]
  if (f.git) out.push({ label: '⎇', text: f.git.branch, color: 'suggestion', flags: gitFlags(f.git) })
  for (const r of f.rateLimits) {
    const left = r.resetsAt ? resetIn(Date.parse(r.resetsAt) - f.now) : ''
    out.push({ label: LIMIT[r.kind] ?? r.kind, bar: bar(r.percentUsed), text: `${Math.round(r.percentUsed)}%${left ? ` · ${left}` : ''}`, color: level(r.percentUsed) })
  }
  if (f.contextPercent !== undefined) out.push({ label: 'ctx', text: `${f.contextPercent}%`, color: level(f.contextPercent) })
  if (f.costUsd !== undefined) out.push({ label: '$', text: f.costUsd.toFixed(2), color: 'text' })
  out.push({ label: '⏱', text: duration(f.elapsedMs), color: 'text' })
  if (f.turns > 0) out.push({ label: 'turns', text: String(f.turns), color: 'text' })
  return out
}

export const register: Register = on => {
  let git: { cwd: string; at: number; value?: Git } | undefined

  // Redraw when the figures change; the band is cached otherwise.
  on('prompt.submit', ($, e, next) => {
    $.ui.invalidate('ui.render')
    return next(e)
  }).catch(($, e, next) => next(e)) // never block a prompt
  on('turn.complete', ($, e, next) => {
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // ponytail: terminal keeps the CLI's own status line; this band is for the desktop app.
    if (e.surface === 'terminal' || e.props.hasSurvey) return next(e)

    const [cwd, usage, turns, now] = await Promise.all([$.session.cwd(), $.session.usage(), $.session.turns(), $.clock.now()])
    if (!git || git.cwd !== cwd || now - git.at > 5_000) {
      const r = await $.process.run(['git', 'status', '--porcelain=v1', '-b'], { cwd }).catch(() => undefined)
      git = { cwd, at: now, value: r?.exitCode === 0 ? parseStatus(r.stdout) : undefined }
    }

    // Anything another mod draws in the band (focus-panel) goes above the bar.
    const below = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const segs = segments({
      cwd,
      git: git.value,
      contextPercent: usage.context.percent,
      costUsd: usage.cost?.usd,
      elapsedMs: now - usage.startedAt,
      turns,
      rateLimits: usage.rateLimits,
      now,
    })

    // One line, full-size text, spread over the full width (first item at the prompt's left edge, last at its right); on a narrow window the last items are clipped.
    const line = (
      <Box flexDirection="row" height={1} overflow="hidden" columnGap={1} justifyContent="space-between">
        {segs.map((s, i) => (
          <Box key={String(i)} flexDirection="row" flexShrink={0} columnGap={1}>
            {s.label ? <Text color="subtle">{s.label}</Text> : null}
            {s.bar ? (
              <Box flexDirection="row">
                <Text color={s.color}>{s.bar[0]}</Text>
                <Text color="subtle">{s.bar[1]}</Text>
              </Box>
            ) : null}
            <Text color={s.color} bold={i === 0}>{s.text}</Text>
            {s.flags ? s.flags.map(fl => <Text key={fl.text} color={fl.color}>{fl.text}</Text>) : null}
          </Box>
        ))}
      </Box>
    )

    return below ? <Box flexDirection="column">{below}{line}</Box> : line
  })
}
