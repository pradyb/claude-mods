import type { Register } from 'claude-code'

type Seg = { label?: string; text: string; color: string; bar?: [filled: string, empty: string] }
export type Facts = {
  cwd: string
  branch?: string
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

export function bar(pct: number, width = 5): [string, string] {
  const n = Math.min(width, Math.max(0, Math.round((pct / 100) * width)))
  return ['█'.repeat(n), '░'.repeat(width - n)]
}

const LIMIT = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' } as Record<string, string>

// Everything the CLI status line has except the model.
export function segments(f: Facts): Seg[] {
  const out: Seg[] = [{ text: f.cwd.split('/').filter(Boolean).pop() ?? '/', color: 'claude' }]
  if (f.branch) out.push({ label: '⎇', text: f.branch, color: 'suggestion' })
  for (const r of f.rateLimits) {
    const left = r.resetsAt ? duration(Date.parse(r.resetsAt) - f.now) : ''
    out.push({ label: LIMIT[r.kind] ?? r.kind, bar: bar(r.percentUsed), text: `${Math.round(r.percentUsed)}%${left ? ` · ${left}` : ''}`, color: level(r.percentUsed) })
  }
  if (f.contextPercent !== undefined) out.push({ label: 'ctx', text: `${f.contextPercent}%`, color: level(f.contextPercent) })
  if (f.costUsd !== undefined) out.push({ label: '$', text: f.costUsd.toFixed(2), color: 'text' })
  out.push({ label: '⏱', text: duration(f.elapsedMs), color: 'text' })
  if (f.turns > 0) out.push({ label: 'turns', text: String(f.turns), color: 'text' })
  return out
}

export const register: Register = on => {
  let branch: { cwd: string; at: number; name?: string } | undefined

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
    // ponytail: terminal keeps the CLI's own status line; this band is for desktop and vscode.
    if (e.surface === 'terminal' || e.props.hasSurvey) return next(e)

    const [cwd, usage, turns, now] = await Promise.all([$.session.cwd(), $.session.usage(), $.session.turns(), $.clock.now()])
    if (!branch || branch.cwd !== cwd || now - branch.at > 10_000) {
      const r = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd }).catch(() => undefined)
      branch = { cwd, at: now, name: r?.exitCode === 0 ? r.stdout.trim() : undefined }
    }

    const { Box, Text } = $.ui.resolve(e)
    const segs = segments({
      cwd,
      branch: branch.name,
      contextPercent: usage.context.percent,
      costUsd: usage.cost?.usd,
      elapsedMs: now - usage.startedAt,
      turns,
      rateLimits: usage.rateLimits,
      now,
    })

    // One line, full-size text, left-aligned with the prompt; on a narrow window the last items are clipped.
    return (
      <Box flexDirection="row" height={1} overflow="hidden" columnGap={2}>
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
          </Box>
        ))}
      </Box>
    )
  })
}
