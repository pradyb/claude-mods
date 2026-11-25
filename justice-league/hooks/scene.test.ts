import { expect, test } from 'claude-code/testing'

import { type Fx, LENGTH, scene } from './scene'

const KINDS = Object.keys(LENGTH) as Fx['kind'][]
const NOW = 1_700_000_000_000
const fx = (kind: Fx['kind'], n: number, age = 0.2): Fx => ({ kind, x: 40, y: 30, n, t0: NOW - age * 1000 })

test('every effect draws a scene the engine can take', async () => {
  for (const kind of KINDS) {
    const svg = scene([fx(kind, 3)], true, NOW)

    expect(svg.length < 131072).toBe(true)
    expect(/<image|href|NaN|undefined/.test(svg)).toBe(false)
    // Its keyframes carry the effect's count, and it resumes at its age, not from the start.
    expect(/@keyframes [a-z]+3\{/.test(svg)).toBe(true)
    expect(svg.includes('-0.20s')).toBe(true)
  }
})

test('effects overlap, and a finished one is dropped', async () => {
  const three = scene([fx('fly', 1), fx('dart', 2), fx('wave', 3)], true, NOW)

  expect(['fl1', 'th2', 'wa3'].every(name => three.includes(`@keyframes ${name}{`))).toBe(true)
  expect(three.length < 131072).toBe(true)

  const idle = scene([fx('ring', 4, LENGTH.ring + 0.1)], false, NOW)

  expect(idle.includes('forwards')).toBe(false)
  // The same moment draws the same scene, so idle loops keep their phase across redraws.
  expect(idle).toBe(scene([], false, NOW))
})

test('the look is set once, with sound and style', async ($, on) => {
  const sets: { sound?: unknown; style?: unknown }[] = []

  on('theme.set', (_, e) => {
    sets.push(e)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(sets.length).toBe(1)
  expect(sets[0]?.sound !== undefined && sets[0]?.style !== undefined).toBe(true)
})

test('the backdrop draws an Svg for this scene alone', async $ => {
  const mine = await $.ui.mount({
    plugin: 'justice-league',
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: 'justice-league', plugin: 'justice-league', glass: false },
  })

  expect(await mine.find({ type: 'Svg' })).toBeDefined()
  await mine.unmount()
})
