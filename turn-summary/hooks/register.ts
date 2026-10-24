import type { Register } from 'claude-code'

export type Turn = { startedAt: number; ms?: number; tools: number; agents: number; background: number }

export function took(ms: number): string {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// `✓ ⏱ 42s · 11 tools · 2 agents (1 background)`; a turn still running shows `…` and the time so far. Zero counts are left out.
export function summary(t: Turn, now: number): string {
  const out = [`${t.ms === undefined ? '…' : '✓'} ⏱ ${took(t.ms ?? now - t.startedAt)}`]
  if (t.tools) out.push(plural(t.tools, 'tool', 'tools'))
  if (t.agents) out.push(plural(t.agents, 'agent', 'agents') + (t.background ? ` (${t.background} background)` : ''))
  return out.join(' · ')
}

export const register: Register = on => {
  let turn: Turn | undefined

  // A typed prompt starts a new trip. A slash command or a machine-made prompt does not.
  on('prompt.submit', async ($, e, next) => {
    if (!e.command && !e.isMeta) {
      turn = { startedAt: await $.clock.now(), tools: 0, agents: 0, background: 0 }
      $.ui.invalidate('ui.render')
    }
    return next(e)
  }).catch(($, e, next) => next(e)) // never block a prompt

  // Tool calls and spawns count from the main loop and from subagents alike: they are all work this prompt caused.
  on('tool.call', ($, e, next) => {
    if (turn) {
      turn.tools++
      $.ui.invalidate('ui.render')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('agent.spawn', ($, e, next) => {
    if (turn) {
      turn.agents++
      if (e.background) turn.background++
      $.ui.invalidate('ui.render')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', ($, e, next) => {
    if (turn && !e.agentId) {
      turn.ms = e.durationMs
      $.ui.invalidate('ui.render')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (!turn || e.props.isDraft) return next(e) // the line is for the person's typing while they type
    return next({ ...e, props: { ...e.props, tail: `  ${summary(turn, await $.clock.now())}` } })
  })
}
