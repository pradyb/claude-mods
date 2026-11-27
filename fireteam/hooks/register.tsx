import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Day, Hud, Loadout } from '../types'
import { makeColors } from './make-colors.js'
import { type Fx, LENGTH, scene } from './scene'
import {
  ACT, CAMOS, DAILY_REWARD, PACKS, PERKS, type Pack, RANKS, STREAKS, type Shot, WEAPONS, banner, camoOpen, dayFrom,
  feed, feedFor, freshHud, freshLoadout, freshPending, hasPerk, isShot, levelOf, medalsFor, mix, needOf, newlyDone,
  operatorOf, rankOf, shotOf, targetOf, todays, unlocked, viewOf,
} from './score'

type Dollar = EngineInterface

// ------------------------------------------------------------------ the look, one per colour pack
const SCENE = 'fireteam'
const PANE = 'fireteam'

const colorsOf = (P: Pack) =>
  makeColors({
    label: `Fireteam ${P.name}`,
    roles: { accent: P.accent, danger: P.bad, success: P.good, warning: P.warn, pro: '#a97ad8' },
    dark: {
      gray: {
        anchors: {
          'surface-0': mix(P.bg, P.panel, 0.4),
          'surface-1': P.panel,
          'surface-2': P.panel2,
          'surface-3': mix(P.panel2, P.text, 0.04),
          'text-primary': P.text,
          'text-secondary': mix(P.text, P.dim, 0.45),
          'text-muted': P.dim,
        },
      },
    },
    only: 'dark',
  })
export const THEMES = PACKS.map(colorsOf)

// Stencil feel without a custom font (only generic families are allowed): bold, wide-spaced headings and
// orders. Frames are borders in the pack's accent: a border isn't held to the 3:1 contrast rule the way a
// fill's colours are, so it can be bright.
const styleOf = (P: Pack): NonNullable<ThemeSetArgs['style']> => ({
  Heading: { fontWeight: 'bold', letterSpacing: 3, color: P.accent },
  UserMessage: {
    color: P.text,
    backgroundColor: mix(P.panel2, P.accent, 0.08),
    borderColor: P.accent,
    borderWidth: 2,
    radius: 0,
    shadow: { x: 3, y: 3, blur: 0, color: '#000000' },
    fontWeight: 'semibold',
    letterSpacing: 0.8,
    paddingX: 14,
    paddingY: 10,
  },
  AssistantMessage: {
    color: P.text,
    backgroundColor: P.panel,
    borderColor: mix(P.panel, P.accent, 0.6),
    borderWidth: 1,
    radius: 0,
    padding: 14,
  },
  ToolUse: {
    color: mix(P.text, P.dim, 0.5),
    backgroundColor: mix(P.panel, P.bg, 0.3),
    borderColor: mix(P.panel, P.accent, 0.25),
    borderWidth: 1,
    radius: 0,
    paddingX: 8,
    paddingY: 2,
    fontFamily: ['mono'],
  },
})

// A low field hum with the odd far radio blip; short, dry cues. Radio Silence drops the cues.
const AMBIENCE: NonNullable<ThemeSetArgs['sound']>['ambience'] = {
  reverb: 0.2,
  layers: [
    { wave: 'brown', drone: true, gain: 0.07, filter: { type: 'lowpass', hz: 260 }, tremolo: { hz: 0.07, depth: 0.5 } },
    { wave: 'square', notes: ['E6', 'B5'], scatter: 0.03, gain: 0.02, release: 0.08, filter: { type: 'bandpass', hz: 1800 } },
  ],
}
const CUES: NonNullable<ThemeSetArgs['sound']>['cues'] = {
  send: {
    layers: [
      { wave: 'white', gain: 0.12, release: 0.05, filter: { type: 'highpass', hz: 2500 } },
      { wave: 'square', notes: ['A5'], gain: 0.06, release: 0.08, filter: { type: 'bandpass', hz: 1600 } },
    ],
  },
  tool: { layers: [{ wave: 'triangle', notes: ['E6'], gain: 0.08, release: 0.04 }] },
  done: {
    layers: [
      { wave: 'sine', notes: ['C2'], gain: 0.35, release: 0.35 },
      { wave: 'bell', notes: ['G5', 'D6'], step: 0.08, gain: 0.22, release: 0.5 },
    ],
  },
  ask: { layers: [{ wave: 'square', notes: ['A5', 'A5'], step: 0.14, gain: 0.07, release: 0.07, filter: { type: 'bandpass', hz: 1600 } }] },
  error: { layers: [{ wave: 'saw', notes: ['D2', 'C#2'], step: 0.12, gain: 0.16, release: 0.3, filter: { type: 'lowpass', hz: 700 } }] },
  compact: { layers: [{ wave: 'pink', gain: 0.18, attack: 0.3, release: 0.9, filter: { type: 'bandpass', hz: 400, to: 2400 } }] },
  click: { layers: [{ wave: 'triangle', notes: ['B5'], gain: 0.07, release: 0.03 }] },
}

/** Set the look for a pack, richest first: a build that refuses sound or style still gets the rest. */
const applyLook = async ($: Dollar, pack: number, silent: boolean) => {
  const i = ((pack % PACKS.length) + PACKS.length) % PACKS.length
  const { theme, problems } = THEMES[i]!
  const base: ThemeSetArgs = { colors: theme, backdrop: { scene: SCENE } }
  const sound = { ambience: AMBIENCE, ...(silent ? {} : { cues: CUES }) }
  const style = styleOf(PACKS[i]!)
  const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    $.ui.toast(unpainted)
  }
  let said = false

  for (const look of [{ ...base, sound, style }, { ...base, style }, { ...base, sound }, base]) {
    try {
      await $.theme.set(look)

      return
    } catch (error) {
      $.ui.log(String(error))
      if (!said) {
        said = true
        $.ui.toast(`Fireteam theme: ${String(error).split('\n')[0]}`)
      }
    }
  }
}

// ------------------------------------------------------------------ state
// The tags decline what an older version of the mod left in this session.
const hud = atom({ plugin: 'fireteam', key: 'hud' } as const, freshHud(), { shape: 'hud-3' })
const look = atom({ plugin: 'fireteam', key: 'look' } as const, null, { shape: 'look-2' })

// Backdrop effects: module variables, reset on reload, which is fine for a toy. Up to four at once.
const MOST = 4
let fxs: Fx[] = []
let count = 0
let lastPublish = 0
let lastDmg = 0

const play = (kind: Fx['kind'], x = 0, y = 0) => {
  const now = Date.now()

  count += 1
  fxs = [...fxs.filter(fx => now - fx.t0 < LENGTH[fx.kind] * 1000), { kind, x, y, n: count, t0: now }].slice(-MOST)
}

/**
 * Copy the HUD to the backdrop's snapshot. Tool calls come in bursts, so a routine update redraws the
 * backdrop at most every 1.5 s; a big event (`force`) redraws it at once. Returns whether it redrew.
 */
const publish = async ($: Dollar, force = false, fx?: Fx['kind']) => {
  const now = Date.now()

  if (!force && now - lastPublish < 1500) {
    return false
  }
  lastPublish = now
  // The effect goes in before the snapshot is written, so the redraw that write sets off includes it.
  if (fx !== undefined) {
    play(fx)
  }
  const st = await read($, hud)

  await update($, look, () => viewOf(st))

  return true
}

/** A stored loadout, kept only where it still names real things. */
const loadoutFrom = (saved: unknown): Loadout => {
  const s = saved as Partial<Loadout> | undefined
  const fresh = freshLoadout()

  return {
    gun: WEAPONS.some(w => w.n === s?.gun) ? s!.gun! : fresh.gun,
    camo: CAMOS.some(c => c.n === s?.camo) ? s!.camo! : fresh.camo,
    perks: PERKS.map((slot, i) => (slot.some(p => p.k === s?.perks?.[i]) ? s!.perks![i]! : null)),
  }
}

/**
 * Add what a turn gathered to the store, re-reading it first so another session's progress is kept.
 * Returns the career values as they now stand and the challenges this flush completed.
 */
const flush = async ($: Dollar, st: Hud, add: { clears: number; medals: number; flawless: number }) => {
  const p = st.pending
  const day0 = dayFrom(await $.store.get('day'))
  const day: Day = {
    ...day0,
    clears: day0.clears + add.clears,
    medals: day0.medals + add.medals,
    flawless: day0.flawless + add.flawless,
    tests: day0.tests + p.tests,
    pushes: day0.pushes + p.pushes,
    commits: day0.commits + p.commits,
    drones: day0.drones + p.drones,
  }
  const done = newlyDone(day)

  day.done = [...day.done, ...done.map(ch => ch.k)]
  const kills = Number((await $.store.get('kills')) ?? 0) + add.clears
  const bonus = Number((await $.store.get('bonus')) ?? 0) + done.length * DAILY_REWARD
  const mastery = { ...((await $.store.get('mastery')) as Record<string, number> | undefined) }

  for (const [gun, n] of Object.entries(p.mastery)) {
    mastery[gun] = (mastery[gun] ?? 0) + n
  }
  await $.store.set('day', day)
  await $.store.set('kills', kills)
  await $.store.set('bonus', bonus)
  await $.store.set('mastery', mastery)

  return { day, kills, bonus, mastery, done }
}

const debrief = (st: Hud) => {
  const rank = rankOf(st.kills + st.bonus)
  const shots = st.hits + st.errs
  const w = st.loadout

  return [
    `DEBRIEF · [${st.unit}] ${st.call} · ${rank.name} (XP ${rank.xp}/100)`,
    `Contracts: ${st.cleared} this session, ${st.day.clears} today, ${st.kills} career · medals today ${st.day.medals}`,
    `Loadout: ${w.gun} L${levelOf(st.mastery[w.gun] ?? 0)} · ${w.camo} · ${w.perks.filter(Boolean).join(', ') || 'no perks'}`,
    `Damage ${st.hits} · Taken ${st.errs} · Accuracy ${shots ? Math.round((100 * st.hits) / shots) : 0}% · Recon ${st.reads} · Drones ${st.drones} · Streak ${st.streak}`,
    ...todays(st.day.d).map(ch => `  ${st.day.done.includes(ch.k) ? '✔' : '·'} ${ch.n} ${Math.min(ch.need, st.day[ch.k])}/${ch.need}`),
  ].join('\n')
}

// ------------------------------------------------------------------ pane actions
const callStreak = async ($: Dollar, key: string) => {
  const s = STREAKS.find(x => x.key === key)

  if (s === undefined) {
    return
  }
  const t = Date.now()
  let called = false

  await update($, hud, st => {
    const need = needOf(s, st.loadout)

    if (st.streak < need) {
      return st
    }
    called = true

    return {
      ...st,
      streak: st.streak - need,
      feed: feed(st.feed, t, 'warn', `${s.name} ONLINE`),
      pop: banner(st, t, 'info', `${s.name} ONLINE`, 0),
    }
  })
  if (called) {
    play(s.key)
    await publish($, true)
  }
}

const setLoadout = async ($: Dollar, patch: Partial<Loadout>) => {
  const st = await update($, hud, s => {
    const next = { ...s.loadout, ...patch }

    // A new weapon keeps its camo only if that weapon has unlocked it.
    if (patch.gun !== undefined && !camoOpen({ ...next, camo: 'STANDARD' }, s.mastery, next.camo)) {
      next.camo = 'STANDARD'
    }

    return { ...s, loadout: next }
  })
  const silent = hasPerk(st.loadout, 'radiosilence')

  await $.store.set('loadout', st.loadout)
  if (patch.perks !== undefined) {
    await applyLook($, st.pack, silent)
  }
  await publish($, true)
}

const setPack = async ($: Dollar, pack: number) => {
  const st = await update($, hud, s => ({ ...s, pack }))

  await $.store.set('pack', pack)
  await applyLook($, pack, hasPerk(st.loadout, 'radiosilence'))
  await publish($, true)
}

// ------------------------------------------------------------------ hooks
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Callsign from the project folder; career values and the loadout from the store. A reload keeps the
    // session's own counts.
    const [kills, bonus, mastery, loadout, pack, day] = await Promise.all(
      ['kills', 'bonus', 'mastery', 'loadout', 'pack', 'day'].map(k => $.store.get(k)),
    )
    const st = await update($, hud, s => ({
      ...s,
      ...operatorOf(e.cwd),
      kills: Number(kills ?? 0),
      bonus: Number(bonus ?? 0),
      mastery: { ...(mastery as Record<string, number> | undefined) },
      loadout: loadoutFrom(loadout),
      pack: Number(pack ?? 0) % PACKS.length,
      day: dayFrom(day),
    }))

    await applyLook($, st.pack, hasPerk(st.loadout, 'radiosilence'))
    try {
      await $.command.register({ name: 'fireteam', description: 'Open the Fireteam panel (loadout, scorestreaks, challenges); /fireteam debrief for stats' })
    } catch (error) {
      $.ui.log(String(error))
    }
    await publish($, true)

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const v = (await read($, look)) ?? viewOf(await read($, hud))

    return (
      <Svg
        source={scene(fxs, v, Date.now())}
        alt="A tactical HUD: a minimap radar and operator card on the left, scorestreaks, a kill feed and daily challenges on the right, a compass across the top"
      />
    )
  })

  on('ui.pointer', ($, e, next) => {
    if (e.scene === SCENE) {
      play('click', e.x * 100, e.y * 100)
      $.ui.invalidate('ui.render')
    }

    return next(e)
  })

  // Only a person's prompt makes a contract: task notifications, scheduled runs and other plugins' prompts
  // run turns that score nothing.
  on('prompt.submit', async ($, e, next) => {
    try {
      const person = e.origin.kind === 'composer' || e.origin.kind === 'bridge' || e.origin.kind === 'sdk'

      // A slash command (this mod's own /fireteam among them) may start no turn, so it never arms.
      if (person && e.isMeta !== true && e.command === undefined && e.text.trim() !== '') {
        await update($, hud, st => ({ ...st, armed: true, target: targetOf(e.text) }))
      }
    } catch (error) {
      $.ui.log(String(error))
    }
    const result = await next(e)

    if (result.drop !== undefined) {
      await update($, hud, st => ({ ...st, armed: false })).catch(error => $.ui.log(String(error)))
    }

    return result
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      try {
        const st = await read($, hud)

        // The armed prompt's turn becomes the contract; any other turn leaves none.
        await update($, hud, s => ({
          ...s,
          armed: false,
          contract: st.armed ? e.turnId : null,
          ...(st.armed ? { working: true, act: 'ANALYSING', cErrs: 0, cHits: 0 } : {}),
        }))
        if (st.armed) {
          await publish($, true)
        }
      } catch (error) {
        $.ui.log(String(error))
      }
    }

    return next(e)
  })

  // Every tool call of the main loop: the live action before, the hit or damage after. This hook sits in
  // front of every call, so nothing here may stop one, and the result goes back untouched.
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    let shot: Shot = 'other'

    try {
      const command = typeof (e as { command?: unknown }).command === 'string' ? (e as { command: string }).command : ''
      const t = Date.now()

      shot = shotOf(e.tool, command)
      await update($, hud, st => ({
        ...st,
        act: `${ACT[shot]} · ${e.tool.replace(/^mcp__[^_]+__/, '')}`,
        ...(shot === 'drone'
          ? { drones: st.drones + 1, feed: feed(st.feed, t, 'info', 'DRONE DEPLOYED'), pending: { ...st.pending, drones: st.pending.drones + 1 } }
          : {}),
        ...(shot === 'read' ? { reads: st.reads + 1 } : {}),
      }))
      if (shot === 'drone') {
        play('drone')
      }
      await publish($, shot === 'drone')
    } catch (error) {
      $.ui.log(String(error))
    }

    const result = await next(e)

    try {
      const isError = result.isError === true
      const t = Date.now()
      const st0 = await read($, hud)
      const shrug = isError && hasPerk(st0.loadout, 'ironnerves')
      const line = feedFor(shot, isError)
      let levelUp: string | null = null

      if (!shrug && (isError || isShot(shot) || line !== null)) {
        await update($, hud, st => {
          const gun = st.loadout.gun
          const was = levelOf(st.mastery[gun] ?? 0)
          const hit = !isError && isShot(shot)
          const mastery = hit ? { ...st.mastery, [gun]: (st.mastery[gun] ?? 0) + 1 } : st.mastery
          const now = levelOf(mastery[gun] ?? 0)
          const p = st.pending
          let lines = line ? feed(st.feed, t, isError ? 'warn' : 'info', line) : st.feed
          let pop = st.pop

          if (now > was) {
            const camos = unlocked(was, now)

            levelUp = `${gun} LEVEL ${now}`
            lines = feed(lines, t, 'warn', levelUp)
            pop = banner(st, t, 'kill', levelUp, 0) ?? pop
            if (pop?.text === levelUp && camos.length) {
              pop = { ...pop, sub: `${camos.join(', ')} CAMO UNLOCKED` }
            }
          }

          return {
            ...st,
            feed: lines,
            pop,
            mastery,
            ...(isError ? { errs: st.errs + 1, cErrs: st.cErrs + 1 } : {}),
            ...(hit ? { hits: st.hits + 1, cHits: st.cHits + 1 } : {}),
            pending: {
              ...p,
              mastery: hit ? { ...p.mastery, [gun]: (p.mastery[gun] ?? 0) + 1 } : p.mastery,
              tests: p.tests + (shot === 'test' && !isError ? 1 : 0),
              commits: p.commits + (shot === 'commit' && !isError ? 1 : 0),
              pushes: p.pushes + (shot === 'push' && !isError ? 1 : 0),
            },
          }
        })
        // Hits only mark the backdrop when it redraws anyway, so a burst of edits never flashes.
        const hurt = isError && t - lastDmg > 3000

        if (hurt) {
          lastDmg = t
        }
        await publish($, hurt || levelUp !== null || line !== null, isError ? (hurt ? 'dmg' : undefined) : 'hit')
      }
    } catch (error) {
      $.ui.log(String(error))
    }

    return result
  })

  on('session.compact', async ($, e, next) => {
    try {
      await update($, hud, st => ({ ...st, act: 'RELOADING' }))
    } catch (error) {
      $.ui.log(String(error))
    }
    const result = await next(e)

    try {
      const t = Date.now()

      await update($, hud, st => ({
        ...st,
        act: st.working ? 'ENGAGED' : 'STANDING BY',
        pop: hasPerk(st.loadout, 'speedloader') ? (banner(st, t, 'kill', 'RELOADED', 25) ?? st.pop) : st.pop,
      }))
      await publish($, true)
    } catch (error) {
      $.ui.log(String(error))
    }

    return result
  })

  // The end of a turn. Only a person's contract scores: a kill on an answer, a lost streak on an error,
  // nothing on an interrupt. Every end adds the turn's counts to the store.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    try {
      const t = Date.now()
      const st = await read($, hud)

      if (st.contract !== e.turnId) {
        await update($, hud, s => ({ ...s, working: false, act: 'STANDING BY' }))
      } else if (e.reason === 'answer') {
        const firstOfDay = dayFrom(await $.store.get('day')).clears === 0
        const medals = medalsFor({ prior: st.clears, now: t, errs: st.cErrs, hits: st.cHits, firstOfDay })
        const career = await flush($, st, { clears: 1, medals: medals.length, flawless: medals.includes('FLAWLESS') ? 1 : 0 })
        const streak = Math.min(20, st.streak + (hasPerk(st.loadout, 'supplyrun') ? 2 : 1))
        const ready = STREAKS.filter(s => st.streak < needOf(s, st.loadout) && streak >= needOf(s, st.loadout))
        const was = rankOf(st.kills + st.bonus).name
        const rank = rankOf(career.kills + career.bonus).name
        let lines = feed(st.feed, t, 'kill', st.target)

        for (const text of [...medals, ...ready.map(s => `${s.name} READY`), ...career.done.map(ch => `CHALLENGE: ${ch.n}`)]) {
          lines = feed(lines, t, 'warn', text)
        }
        if (rank !== was) {
          lines = feed(lines, t, 'warn', `PROMOTED: ${rank}`)
        }
        const [text, xp] = career.done.length
          ? ['CHALLENGE COMPLETE', DAILY_REWARD * 25 * career.done.length]
          : rank !== was
            ? [`PROMOTED: ${rank}`, 100]
            : medals.length
              ? [medals.slice(0, 2).join(' · '), 100]
              : ['CONTRACT CLEAR', 100]

        await update($, hud, s => ({
          ...s,
          contract: null,
          working: false,
          act: 'STANDING BY',
          kills: career.kills,
          bonus: career.bonus,
          mastery: career.mastery,
          day: career.day,
          pending: freshPending(),
          streak,
          cleared: s.cleared + 1,
          clears: [...s.clears.filter(c => t - c <= 60_000), t],
          feed: lines,
          pop: banner(s, t, 'kill', text, xp),
        }))
        play('kill')
        if (rank !== was) {
          $.ui.toast(`Promoted to ${rank}`)
        }
      } else {
        const failed = e.reason !== 'aborted'
        const career = await flush($, st, { clears: 0, medals: 0, flawless: 0 })

        await update($, hud, s => ({
          ...s,
          contract: null,
          working: false,
          act: 'STANDING BY',
          kills: career.kills,
          bonus: career.bonus,
          mastery: career.mastery,
          day: career.day,
          pending: freshPending(),
          ...(failed
            ? { streak: 0, feed: feed(s.feed, t, 'warn', 'MISSION FAILED'), pop: banner(s, t, 'dmg', 'MISSION FAILED', 0) }
            : {}),
        }))
        if (failed) {
          play('dmg')
        }
      }
      await publish($, true)
    } catch (error) {
      $.ui.log(String(error))
    }

    return next(e)
  })

  // ---------------------------------------------------------------- the side pane: loadout and scorestreaks
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Select } = $.ui.resolve(e)
    const st = await read($, hud)
    const rank = rankOf(st.kills + st.bonus)
    const l = st.loadout
    const level = levelOf(st.mastery[l.gun] ?? 0)

    if (e.props.placement === 'widget') {
      const ready = STREAKS.filter(s => st.streak >= needOf(s, l)).map(s => s.name)

      return (
        <Text>
          [{st.unit}] {st.call} · {rank.name} · streak {st.streak}{ready.length ? ` · ${ready.join(', ')} READY` : ''}
        </Text>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text color="warning" weight="bold">[{st.unit}] {st.call} · {rank.name}</Text>
          <Text dimColor>XP {rank.xp}/100 · {st.kills} kills · streak {st.streak}{rank.max ? ' · max rank' : ` · next ${RANKS[RANKS.indexOf(rank.name) + 1]}`}</Text>
          <Text dimColor>DMG {st.hits} · TAKEN {st.errs} · RECON {st.reads} · DRONES {st.drones}</Text>
        </Box>
        <Box flexDirection="column">
          <Text weight="bold">SCORESTREAKS</Text>
          {STREAKS.map(s => {
            const need = needOf(s, l)
            const ready = st.streak >= need

            return ready ? (
              <Button key={`call-${s.key}`} variant="primary" onPress={() => callStreak($, s.key)}>
                CALL {s.name} ({need}) · {s.tip}
              </Button>
            ) : (
              <Text key={`wait-${s.key}`} dimColor>{s.name} {Math.min(st.streak, need)}/{need} · {s.tip}</Text>
            )
          })}
        </Box>
        <Box flexDirection="column">
          <Text weight="bold">DAILY CHALLENGES (+{DAILY_REWARD * 25} XP each)</Text>
          {todays(st.day.d).map(ch => (
            <Text key={`ch-${ch.k}`} color={st.day.done.includes(ch.k) ? 'success' : 'text'}>
              {st.day.done.includes(ch.k) ? '✔' : '·'} {ch.n} {Math.min(ch.need, st.day[ch.k] + (ch.k in st.pending ? Number(st.pending[ch.k as keyof typeof st.pending]) || 0 : 0))}/{ch.need}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text weight="bold">LOADOUT</Text>
          <Select
            key="gun"
            label="Weapon"
            value={l.gun}
            options={WEAPONS.map(w => ({ value: w.n, label: `${w.n} · ${w.c} · L${levelOf(st.mastery[w.n] ?? 0)}` }))}
            onSelect={value => setLoadout($, { gun: value })}
          />
          <Select
            key="camo"
            label={`Camo (${l.gun} level ${level})`}
            value={l.camo}
            options={CAMOS.filter(c => camoOpen(l, st.mastery, c.n)).map(c => ({ value: c.n, label: c.n }))}
            onSelect={value => setLoadout($, { camo: value })}
          />
          <Text dimColor>
            Locked: {CAMOS.filter(c => !camoOpen(l, st.mastery, c.n)).map(c => `${c.n} L${c.lv}`).join(', ') || 'none'}
          </Text>
          {PERKS.map((slot, i) => (
            <Select
              key={`perk-${i}`}
              label={`Perk ${i + 1}`}
              value={l.perks[i] ?? 'none'}
              options={[{ value: 'none', label: 'NONE' }, ...slot.map(p => ({ value: p.k, label: `${p.n} · ${p.d}` }))]}
              onSelect={value => setLoadout($, { perks: l.perks.map((p, j) => (j === i ? (value === 'none' ? null : value) : p)) })}
            />
          ))}
        </Box>
        <Select
          key="pack"
          label="Colour pack"
          value={PACKS[st.pack]!.name}
          options={PACKS.map(p => ({ value: p.name, label: p.name }))}
          onSelect={value => setPack($, Math.max(0, PACKS.findIndex(p => p.name === value)))}
        />
      </Box>
    )
  })

  // /fireteam opens the pane; /fireteam debrief prints the stats.
  on('command.run', { command: 'fireteam' }, async ($, e) => {
    if (e.args.trim() === 'debrief') {
      return { text: debrief(await read($, hud)), isTextDisplayOnly: true }
    }
    const opened = await $.ui.open({ id: PANE, title: 'FIRETEAM' })

    return {
      text: opened.isPlaced ? 'Fireteam panel opened.' : `The Fireteam panel can't show here. ${debrief(await read($, hud))}`,
      isTextDisplayOnly: true,
    }
  })
}
