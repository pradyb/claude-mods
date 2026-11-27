import { expect, test } from 'claude-code/testing'

import { THEMES } from './register'
import { type Fx, LENGTH, plain, scene } from './scene'
import {
  PACKS, STREAKS, camoOpen, crewLines, feedFor, freshDay, freshHud, freshLoadout, levelOf, mateName, medalsFor, needOf,
  newlyDone, rankOf, runningMates, scoreOf, shotOf, todays, unlocked, viewOf,
} from './score'

const NOW = 1_700_000_000_000
const KINDS = Object.keys(LENGTH) as Fx['kind'][]
const VIEW = {
  ...viewOf({ ...freshHud(), working: true, streak: 5, hits: 9, errs: 1 }),
  feed: [{ t: NOW, k: 'kill' as const, text: 'fix <the> "login" & href bug' }, { t: NOW, k: 'warn' as const, text: 'FLAWLESS' }],
  pop: { t: NOW - 500, kind: 'kill' as const, text: 'CONTRACT CLEAR', sub: '+100 XP' },
}
const PANE_PROPS = { title: 'FIRETEAM', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } as const

// ---------------------------------------------------------------- pure logic

test('every effect, in every pack, draws a scene the engine can take', async () => {
  for (const [pack] of PACKS.entries()) {
    for (const kind of KINDS) {
      const svg = scene([{ kind, x: 40, y: 30, n: 3, t0: NOW - 200 }], { ...VIEW, pack }, NOW)

      expect(svg.length < 131072).toBe(true)
      expect(/<image|href|NaN|undefined|<!--/i.test(svg)).toBe(false)
      expect(svg.includes('-0.20s')).toBe(true)
    }
  }
})

test('feed text from a prompt is reduced to plain caps', async () => {
  expect(plain('fix <the> "login" & href bug')).toBe('FIX THE LOGIN BUG')
  expect(scene([], VIEW, NOW).includes('<the>')).toBe(false)
})

test('a finished effect and an old banner are dropped', async () => {
  const old: Fx = { kind: 'hit', x: 0, y: 0, n: 1, t0: NOW - (LENGTH.hit + 0.1) * 1000 }

  expect(scene([old], VIEW, NOW)).toBe(scene([], VIEW, NOW))
  expect(scene([], VIEW, NOW).includes('CONTRACT CLEAR')).toBe(true)
  expect(scene([], VIEW, NOW + 10_000).includes('CONTRACT CLEAR')).toBe(false)
})

test('every colour pack paints on Desktop', async () => {
  for (const { problems } of THEMES) {
    expect(problems.some(line => line.startsWith("Desktop won't paint"))).toBe(false)
  }
})

test('tool calls are classified like the original hook', async () => {
  expect(shotOf('Edit')).toBe('edit')
  expect(shotOf('Grep')).toBe('read')
  expect(shotOf('Agent')).toBe('drone')
  expect(shotOf('Bash', 'npm test')).toBe('test')
  expect(shotOf('Bash', 'git add . && git commit -m "x"')).toBe('commit')
  expect(shotOf('Bash', 'git push origin main')).toBe('push')
  expect(shotOf('Bash', 'echo "git push"')).toBe('command')
  expect(feedFor('test', true)).toBe('TARGETS MISSED')
  expect(feedFor('edit', true)).toBe(null)
  expect(feedFor('push', false)).toBe('EXFIL CONFIRMED')
})

test('ranks, streak costs, medals, challenges and mastery', async () => {
  expect(rankOf(0).name).toBe('PVT')
  expect(rankOf(5)).toEqual({ name: 'PFC', xp: 25, max: false })
  expect(rankOf(999).max).toBe(true)
  expect(needOf(STREAKS[0], freshLoadout())).toBe(3)
  expect(needOf(STREAKS[0], { ...freshLoadout(), perks: [null, null, 'logistics'] })).toBe(2)
  expect(medalsFor({ prior: [NOW - 10_000], now: NOW, errs: 0, hits: 2, firstOfDay: false })).toEqual(['DOUBLE CLEAR', 'FLAWLESS'])
  expect(medalsFor({ prior: [], now: NOW, errs: 4, hits: 0, firstOfDay: true })).toEqual(['BOSS DOWN', 'FIRST BLOOD'])
  // The same three all day, clears always first.
  expect(todays('2026-11-27')).toEqual(todays('2026-11-27'))
  expect(todays('2026-11-27')[0]!.k).toBe('clears')
  expect(newlyDone({ ...freshDay('2026-11-27'), clears: 5 }).map(ch => ch.k)).toEqual(['clears'])
  expect(newlyDone({ ...freshDay('2026-11-27'), clears: 5, done: ['clears'] })).toEqual([])
  expect(levelOf(0)).toBe(1)
  expect(levelOf(30)).toBe(3)
  expect(unlocked(1, 3)).toEqual(['DESERT', 'ARCTIC'])
  expect(camoOpen(freshLoadout(), { M4A1: 30 }, 'ARCTIC')).toBe(true)
  expect(camoOpen(freshLoadout(), { M4A1: 30 }, 'GOLD')).toBe(false)
})

test('the card shows ammo, fuel, branch, cost, time on task and the squad', async () => {
  const live = { ctx: 92, fuel: 40, cost: 1.5, branch: 'feat/x', since: NOW - 125_000, squad: 2 }
  const svg = scene([], { ...VIEW, live }, NOW)

  expect(svg.includes('>8%<')).toBe(true) // 8% of the context left
  expect(svg.includes('>60%<')).toBe(true) // 60% of the 5-hour limit left
  expect(svg.includes('BR FEAT/X · 2M')).toBe(true)
  expect(svg.includes('USD 1.50')).toBe(true)
  expect(svg.includes('SQUAD 2')).toBe(true)
  expect(svg.includes('class="sq"')).toBe(true)
  // Nothing known yet: dashes, and no cost or branch.
  const bare = scene([], { ...VIEW, live: { squad: 0 } }, NOW)

  expect(bare.includes('>--<')).toBe(true)
  expect(/USD|SQUAD|BR /.test(bare)).toBe(false)
})

test('every weapon fires bullets from the left edge to the right gutter', async () => {
  for (const g of ['ar', 'ak', 'bullpup', 'smg', 'lmg', 'pistol', 'shotgun', 'sniper', 'launcher', 'unknown']) {
    const svg = scene([{ kind: 'fire', x: 0, y: 0, n: 7, g, t0: NOW - 100 }], VIEW, NOW)

    expect(svg.includes('animation:bl7 ')).toBe(true)
    expect(/NaN|undefined/.test(svg)).toBe(false)
  }
  expect(scene([{ kind: 'fire', x: 0, y: 0, n: 7, g: 'shotgun', t0: NOW }], VIEW, NOW).split('animation:bl7 ').length - 1).toBe(5)
})

test('the squad: callsigns, who is running, the score and the MVP', async () => {
  expect(mateName(0)).toBe('ALPHA')
  expect(mateName(6)).toBe('ALPHA2')
  const crew = [
    { name: 'ALPHA', seen: NOW, live: true, hits: 5, errs: 1 },
    { name: 'BRAVO', seen: NOW - 400_000, live: true, hits: 9, errs: 0 },
    { name: 'CHARLIE', seen: NOW, live: false, hits: 0, errs: 0 },
  ]

  expect(runningMates(crew, NOW)).toBe(1) // BRAVO went quiet, CHARLIE is done
  expect(crewLines(crew)).toEqual([
    '  ALPHA: damage 5 · taken 1 · accuracy 83%',
    '  BRAVO: damage 9 · taken 0 · accuracy 100%',
    '  CHARLIE: damage 0 · taken 0 · accuracy 0%',
    '  MVP: BRAVO',
  ])
  expect(crewLines([])).toEqual([])
  expect(crewLines([crew[2]!]).some(l => l.includes('MVP'))).toBe(false)
  expect(scoreOf({ cleared: 2, hits: 10, errs: 1, reads: 5, drones: 1 })).toBe(200 + 100 + 10 + 25 - 20)
  expect(scoreOf({ cleared: 0, hits: 0, errs: 9, reads: 0, drones: 0 })).toBe(0)
})

// ---------------------------------------------------------------- hooks

type Store = Map<string, unknown>
type Body = Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>

/** Stand in for the engine: a store, a theme, and every event the mod passes on. */
const engine = (on: Parameters<Body>[1], stored: Store, failTools = false) => {
  on('store.get', (_, e) => ({ value: stored.get(e.key) }))
  on('store.set', (_, e) => {
    stored.set(e.key, e.value)

    return { value: undefined }
  })
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('command.register', () => ({ value: { command: 'fireteam' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => (e.text === 'blocked' ? { drop: 'blocked' } : e))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', () => (failTools ? { isError: true as const, result: 'boom', text: 'boom' } : { result: {} }))
  on('turn.complete', () => ({ text: '' }))
}

type Dollar = Parameters<Body>[0]

const contract = async ($: Dollar, n: number, origin: 'composer' | 'task-notification' = 'composer') => {
  await $.prompt.submit({ text: `contract ${n}`, wait: true, origin: { kind: origin } })
  await $.turn.start({ text: `contract ${n}`, turnId: `t${n}` })
  await $.tool.call({ tool: 'Edit', file_path: '/work/app/a.ts', old_string: 'a', new_string: 'b' })
  await $.turn.complete({ reason: 'answer', answer: 'done', durationMs: 10, isAborted: false, turnId: `t${n}` })
}

const paneText = async ($: Dollar) => {
  const pane = await $.ui.mount({ plugin: 'fireteam', surface: 'desktop', component: 'Pane', requestId: 'fireteam', props: PANE_PROPS })
  const texts = await pane.findAll({ type: 'Text' })

  return { pane, text: texts.map(t => t.text).join('\n') }
}

test('the look is set once, with sound and style', async ($, on) => {
  const sets: { sound?: unknown; style?: unknown }[] = []

  on('theme.set', (_, e) => {
    sets.push(e)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('store.get', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })

  expect(sets.length).toBe(1)
  expect(sets[0]?.sound !== undefined && sets[0]?.style !== undefined).toBe(true)
})

test('the backdrop draws an Svg, even over what an older version left in the session', async ($, on) => {
  on('state.get', () => ({ value: { value: { call: 'OLD', feed: [], pop: { t: 1, kind: 'hit', text: 'X', pts: 10 } }, version: 1 } }))

  const mine = await $.ui.mount({
    plugin: 'fireteam',
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: 'fireteam', plugin: 'fireteam', glass: false },
  })

  expect(await mine.find({ type: 'Svg' })).toBeDefined()
  await mine.unmount()
})

test('a person\'s contract scores and builds on the store; an automated turn does not', async ($, on) => {
  const stored: Store = new Map([['kills', 7]])

  engine(on, stored)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  // Another session cleared some meanwhile: the count builds on the store, not the start value.
  stored.set('kills', 10)
  await contract($, 1)
  expect(stored.get('kills')).toBe(11)
  expect((stored.get('day') as { clears: number }).clears).toBe(1)
  expect((stored.get('mastery') as Record<string, number>).M4A1).toBe(1)

  await contract($, 2, 'task-notification')
  expect(stored.get('kills')).toBe(11)
})

test('a ready scorestreak is called from the pane and spends its charge', async ($, on) => {
  engine(on, new Map())
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  for (const n of [1, 2, 3]) {
    await contract($, n)
  }

  const { pane } = await paneText($)

  await pane.press({ key: 'call-uav' })
  await pane.unmount()

  const after = await paneText($)

  expect(after.text.includes('UAV 0/3')).toBe(true)
  await after.pane.unmount()
})

test('Iron Nerves: a failed tool does no damage', async ($, on) => {
  const stored: Store = new Map<string, unknown>([['loadout', { gun: 'M4A1', camo: 'STANDARD', perks: [null, null, null] }]])

  engine(on, stored, true)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await contract($, 1)
  let seen = await paneText($)

  expect(seen.text.includes('TAKEN 1')).toBe(true)
  await seen.pane.unmount()

  stored.set('loadout', { gun: 'M4A1', camo: 'STANDARD', perks: ['ironnerves', null, null] })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await contract($, 2)
  seen = await paneText($)
  expect(seen.text.includes('TAKEN 1')).toBe(true)
  await seen.pane.unmount()
})

test('a command prompt arms nothing: a later automated turn does not score', async ($, on) => {
  const stored: Store = new Map()

  engine(on, stored)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: '/fireteam', wait: true, origin: { kind: 'composer' }, command: { name: 'fireteam', args: '' } })
  await $.turn.start({ text: 'a task finished', turnId: 'n1' })
  await $.turn.complete({ reason: 'answer', answer: 'ok', durationMs: 5, isAborted: false, turnId: 'n1' })

  expect(stored.get('kills') ?? 0).toBe(0)
})

test('a commit marks the backdrop with a hitmarker in the redraw it sets off', async ($, on) => {
  engine(on, new Map())
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: 'edit it', wait: true, origin: { kind: 'composer' } })
  await $.turn.start({ text: 'edit it', turnId: 'h1' })
  await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"' })

  const mine = await $.ui.mount({
    plugin: 'fireteam',
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: 'fireteam', plugin: 'fireteam', glass: false },
  })
  const svg = await mine.find({ type: 'Svg' })


  expect(String((svg?.props as { source?: string } | undefined)?.source ?? '').includes('animation:pp')).toBe(true)
  await mine.unmount()
})

test('an accepted prompt fires the weapon', async ($, on) => {
  engine(on, new Map())
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: 'fix the bug', wait: true, origin: { kind: 'composer' } })

  const mine = await $.ui.mount({ plugin: 'fireteam', surface: 'desktop', component: 'Backdrop', props: { scene: 'fireteam', plugin: 'fireteam', glass: false } })
  const svg = await mine.find({ type: 'Svg' })

  expect(String((svg?.props as { source?: string } | undefined)?.source ?? '').includes('animation:bl')).toBe(true)
  await mine.unmount()
})

test('a slash command or a dropped prompt fires nothing', async ($, on) => {
  engine(on, new Map())
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: '/fireteam', wait: true, origin: { kind: 'composer' }, command: { name: 'fireteam', args: '' } })
  await $.prompt.submit({ text: 'blocked', wait: true, origin: { kind: 'composer' } })

  const mine = await $.ui.mount({ plugin: 'fireteam', surface: 'desktop', component: 'Backdrop', props: { scene: 'fireteam', plugin: 'fireteam', glass: false } })
  const svg = await mine.find({ type: 'Svg' })

  expect(String((svg?.props as { source?: string } | undefined)?.source ?? '').includes('animation:bl')).toBe(false)
  await mine.unmount()
})

test('a subagent joins the squad and the debrief names it and the score', async ($, on) => {
  engine(on, new Map())
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: 'use a helper', wait: true, origin: { kind: 'composer' } })
  await $.turn.start({ text: 'use a helper', turnId: 's1' })
  await $.turn.start({ text: 'helper', turnId: 's1a', agentId: 'a1' })
  await $.tool.call({ tool: 'Edit', file_path: '/work/app/a.ts', old_string: 'a', new_string: 'b', agentId: 'a1' })

  const out = await $.command.run({ command: 'fireteam', args: 'debrief', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })

  expect(String((out as { text?: string }).text)).toMatch(/SCORE \d+/)
  expect(String((out as { text?: string }).text)).toContain('ALPHA: damage 1')
  expect(String((out as { text?: string }).text)).toContain('MVP: ALPHA')
})
