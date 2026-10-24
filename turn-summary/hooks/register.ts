import type { EngineInterface, Register } from 'claude-code'

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

// The terminal shows the summary on the hint line under the prompt; the desktop draws no such line, so there it goes to the status line.
async function show($: EngineInterface, turn: Turn | undefined, isOn: boolean) {
  if ((await $.session.surface()) === 'terminal') return $.ui.invalidate('ui.render')
  $.ui.status(turn && isOn ? summary(turn, await $.clock.now()) : undefined)
}

export const register: Register = on => {
  let turn: Turn | undefined
  let isOn = true // /summary off is kept across sessions in the store

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'summary', description: 'Turn the after-each-turn summary (time, tools, agents) on or off', argumentHint: '[on|off]', immediate: true })
    isOn = (await $.store.get('isOn')) !== false
    return next(e)
  })

  on('command.run', { command: 'summary' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    isOn = arg === 'on' ? true : arg === 'off' ? false : !isOn
    await $.store.set('isOn', isOn)
    await show($, turn, isOn)
    return { text: isOn ? 'Turn summaries on.' : 'Turn summaries off. /summary turns them back on.' }
  })

  // A typed prompt starts a new trip. A slash command or a machine-made prompt does not.
  on('prompt.submit', async ($, e, next) => {
    if (!e.command && !e.isMeta) {
      turn = { startedAt: await $.clock.now(), tools: 0, agents: 0, background: 0 }
      await show($, turn, isOn)
    }
    return next(e)
  }).catch(($, e, next) => next(e)) // never block a prompt

  // Tool calls and spawns count from the main loop and from subagents alike: they are all work this prompt caused.
  on('tool.call', async ($, e, next) => {
    if (turn) {
      turn.tools++
      await show($, turn, isOn)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    if (turn) {
      turn.agents++
      if (e.background) turn.background++
      await show($, turn, isOn)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (turn && !e.agentId) {
      turn.ms = e.durationMs
      await show($, turn, isOn)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (!turn || !isOn || e.props.isDraft || e.surface !== 'terminal') return next(e) // the line is for the person's typing while they type
    return next({ ...e, props: { ...e.props, tail: `  ${summary(turn, await $.clock.now())}` } })
  })
}
