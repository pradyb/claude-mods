// Fireteam scoring: pure logic and data, no engine calls, so the tests can check it directly.
// Ported from herdr-fireteam (kit.js, glory.js and its activity hook), cut to one operator: this session.
// Every name here is generic or our own: no game's perks, camos, modes or characters.

import type { Day, Hud, Loadout, Pending, Pop, View } from '../types'

// ------------------------------------------------------------------ colour packs
/** Background, panels, text, dim text, accent, and the good, bad and warning roles. */
export type Pack = {
  name: string
  bg: `#${string}`
  panel: `#${string}`
  panel2: `#${string}`
  text: `#${string}`
  dim: `#${string}`
  accent: `#${string}`
  good: `#${string}`
  bad: `#${string}`
  warn: `#${string}`
}
export const PACKS: Pack[] = [
  { name: 'MODERN', bg: '#090b0a', panel: '#101311', panel2: '#161a17', text: '#ece9de', dim: '#8c9087', accent: '#f2a516', good: '#63d06a', bad: '#ff4a3d', warn: '#f2c230' },
  { name: 'NVG', bg: '#020a04', panel: '#04110a', panel2: '#061a0e', text: '#b9ffc4', dim: '#5aa86e', accent: '#39ff6a', good: '#39ff6a', bad: '#ff6a5a', warn: '#d8ff5a' },
  { name: 'ARCTIC', bg: '#080d12', panel: '#0d151c', panel2: '#121d27', text: '#e6f3fb', dim: '#8aa2b2', accent: '#5cc8ff', good: '#5fe0b0', bad: '#ff5d6c', warn: '#ffd166' },
  { name: 'TOXIC', bg: '#0a0610', panel: '#120b1a', panel2: '#1a1125', text: '#ece3f7', dim: '#9a86b2', accent: '#a8ff3c', good: '#a8ff3c', bad: '#ff4a6e', warn: '#ffb23c' },
  { name: 'HAZARD', bg: '#0b0b0b', panel: '#131313', panel2: '#1b1b1b', text: '#f2f2f2', dim: '#959595', accent: '#ffd400', good: '#7ee26b', bad: '#ff4040', warn: '#ffd400' },
]
export const packOf = (i: number): Pack => PACKS[((i % PACKS.length) + PACKS.length) % PACKS.length]!

/** Blend two hex colours: t = 0 is a, 1 is b. */
export const mix = (a: string, b: string, t: number): `#${string}` => {
  const ch = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16)
  const out = [0, 1, 2].map(i => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, '0'))

  return `#${out.join('')}`
}

// ------------------------------------------------------------------ operator identity
const CALLSIGNS = ['Ember', 'Specter', 'Halo', 'Nomad', 'Sable', 'Wraith', 'Cipher', 'Havoc', 'Gravel', 'Ironside', 'Vandal',
  'Bulwark', 'Maverick', 'Colt', 'Dutch', 'Mercer', 'Tango', 'Hawkeye', 'Shade', 'Revenant', 'Omen', 'Bear', 'Anvil', 'Sarge']
const UNITS = ['AL', 'BR', 'CH', 'DL', 'EC'] // Alpha .. Echo squads

export const hash = (s: string): number => {
  let h = 2166136261

  for (const ch of s) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  }

  return h >>> 0
}

/** Callsign and squad tag, stable per project folder. */
export const operatorOf = (cwd: string) => {
  const h = hash(cwd)

  return { call: CALLSIGNS[h % CALLSIGNS.length]!.toUpperCase(), unit: UNITS[(h >>> 7) % UNITS.length]! }
}

// ------------------------------------------------------------------ loadout: weapons, camos, perks
export const WEAPONS = [
  { n: 'M4A1', i: 'ar', c: 'ASSAULT' }, { n: 'AK-47', i: 'ak', c: 'ASSAULT' }, { n: 'AUG', i: 'bullpup', c: 'ASSAULT' },
  { n: 'MP7', i: 'smg', c: 'SMG' }, { n: 'M249', i: 'lmg', c: 'LMG' }, { n: 'SVD', i: 'sniper', c: 'SNIPER' },
  { n: 'M870', i: 'shotgun', c: 'SHOTGUN' }, { n: 'M1911', i: 'pistol', c: 'PISTOL' }, { n: 'RPG-7', i: 'launcher', c: 'LAUNCHER' },
] as const
export const CAMOS = [
  { n: 'STANDARD', c: null, lv: 1 }, { n: 'WOODLAND', c: '#7aa843', lv: 1 }, { n: 'DESERT', c: '#d9b36a', lv: 2 },
  { n: 'ARCTIC', c: '#bfe6ff', lv: 3 }, { n: 'DIGITAL', c: '#7f95c8', lv: 4 }, { n: 'TIGER', c: '#f08a24', lv: 5 },
  { n: 'GOLD', c: '#ffd34d', lv: 7 }, { n: 'NEBULA', c: '#b26bff', lv: 10 },
] as const
/** Three slots of three. Each perk really changes the HUD. */
export const PERKS = [
  [
    { k: 'lowprofile', n: 'LOW PROFILE', d: 'Your blip leaves the radar' },
    { k: 'ironnerves', n: 'IRON NERVES', d: 'Failed tools do no damage: no red flash, no hit on accuracy' },
    { k: 'extraplate', n: 'EXTRA PLATE', d: '+1 armour plate on the operator card' },
  ],
  [
    { k: 'supplyrun', n: 'SUPPLY RUN', d: 'Each cleared contract charges scorestreaks +1 extra' },
    { k: 'highyield', n: 'HIGH YIELD', d: 'Banner XP counts double' },
    { k: 'speedloader', n: 'SPEED LOADER', d: 'A RELOADED banner when a compaction ends' },
  ],
  [
    { k: 'spotter', n: 'SPOTTER', d: 'Every hostile shows on the radar while engaged' },
    { k: 'radiosilence', n: 'RADIO SILENCE', d: 'No banners and no sound cues' },
    { k: 'logistics', n: 'LOGISTICS', d: 'Scorestreaks cost 1 contract less' },
  ],
] as const
export const freshLoadout = (): Loadout => ({ gun: 'M4A1', camo: 'STANDARD', perks: [null, null, null] })
export const hasPerk = (l: Loadout, k: string) => l.perks.includes(k)
export const weaponOf = (n: string) => WEAPONS.find(w => w.n === n) ?? WEAPONS[0]

// ------------------------------------------------------------------ weapon mastery
/** Hits needed for level 1..10. */
export const LEVELS = [0, 10, 30, 60, 100, 150, 220, 300, 400, 520]
export const levelOf = (xp: number) => {
  let lv = 1

  while (lv < LEVELS.length && xp >= LEVELS[lv]!) {
    lv++
  }

  return lv
}
/** Camos that unlock going from level a to level b. */
export const unlocked = (a: number, b: number) => CAMOS.filter(c => c.lv > a && c.lv <= b).map(c => c.n)
/** A camo is usable at its level, or when already worn. */
export const camoOpen = (l: Loadout, mastery: Record<string, number>, camo: string) =>
  (CAMOS.find(c => c.n === camo)?.lv ?? 99) <= levelOf(mastery[l.gun] ?? 0) || (camo === l.camo)

// ------------------------------------------------------------------ rank and streaks
export const RANKS = ['PVT', 'PFC', 'CPL', 'SGT', 'SSG', 'LT', 'CPT', 'MAJ', 'COL', 'GEN']

/** One rank per 4 credits (a cleared contract is 1, a challenge 2); each credit is 25 XP of the next. */
export const rankOf = (credits: number) => {
  const lv = Math.min(RANKS.length - 1, Math.floor(credits / 4))

  return { name: RANKS[lv]!, xp: (credits % 4) * 25, max: lv === RANKS.length - 1 }
}

export const STREAKS = [
  { key: 'uav', name: 'UAV', need: 3, tip: 'Pings the radar and shows every hostile' },
  { key: 'airstrike', name: 'AIRSTRIKE', need: 5, tip: 'A missile strike across the window' },
  { key: 'gunship', name: 'GUNSHIP', need: 7, tip: 'A thermal reticle sweeps the right flank' },
  { key: 'armor', name: 'ARMOR', need: 9, tip: 'Armour deployed: a banner and a full set of plates' },
] as const
export type StreakKey = (typeof STREAKS)[number]['key']
export const needOf = (s: (typeof STREAKS)[number], l: Loadout) => Math.max(1, s.need - (hasPerk(l, 'logistics') ? 1 : 0))

// ------------------------------------------------------------------ tool calls
const READ = new Set(['Read', 'Grep', 'Glob', 'LS', 'NotebookRead', 'LSP', 'ToolSearch'])
const EDIT = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const WEB = new Set(['WebSearch', 'WebFetch'])
// Only real commands: at the start of the line or after ; & | ( (quoted text is stripped first).
const AT = String.raw`(?:^|[;&|(]\s*)(?:\w+=\S+\s+)*`
const TEST = new RegExp(AT + String.raw`((bun|npm|pnpm|yarn|npx|bunx)\s+(run\s+)?test|vitest|jest|pytest|playwright\s+test|cargo\s+test|go\s+test|rspec|phpunit|mix\s+test|deno\s+test|claude\s+plugin\s+test)\b`, 'm')
const COMMIT = new RegExp(AT + String.raw`git\s+(-C\s+\S+\s+)?commit\b`, 'm')
const PUSH = new RegExp(AT + String.raw`git\s+(-C\s+\S+\s+)?push\b`, 'm')

const bare = (cmd: string) => cmd.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''")

export type Shot = 'edit' | 'read' | 'web' | 'test' | 'commit' | 'push' | 'command' | 'drone' | 'other'

export const shotOf = (tool: string, command = ''): Shot => {
  if (EDIT.has(tool)) {
    return 'edit'
  }
  if (READ.has(tool)) {
    return 'read'
  }
  if (tool === 'Agent' || tool === 'Task') {
    return 'drone'
  }
  if (tool === 'Bash') {
    const c = bare(command)

    return TEST.test(c) ? 'test' : PUSH.test(c) ? 'push' : COMMIT.test(c) ? 'commit' : 'command'
  }
  if (WEB.has(tool) || (tool.startsWith('mcp__') && /search|fetch|docs|context7/.test(tool))) {
    return 'web'
  }

  return 'other'
}

/** What the operator is doing while a tool of this kind runs. */
export const ACT: Record<Shot, string> = {
  edit: 'FIRING', read: 'RECON', web: 'COMMS UPLINK', test: 'RANGE TEST', commit: 'SECURING INTEL',
  push: 'EXFIL', command: 'EXECUTING', drone: 'DRONE OUT', other: 'ENGAGED',
}

/** A kill-feed line for a finished tool call, or null. Hits and damage only flash on the backdrop. */
export const feedFor = (shot: Shot, isError: boolean): string | null => {
  if (isError) {
    return shot === 'test' ? 'TARGETS MISSED' : null
  }

  return { test: 'RANGE CLEAR', commit: 'INTEL SECURED', push: 'EXFIL CONFIRMED', drone: 'DRONE DEPLOYED' }[shot as string] ?? null
}

/** Edits and commands are shots: they count for accuracy, damage and weapon mastery. */
export const isShot = (shot: Shot) => shot === 'edit' || shot === 'command' || shot === 'test' || shot === 'commit' || shot === 'push'

// ------------------------------------------------------------------ medals, days and challenges
const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const freshDay = (d: string): Day => ({ d, clears: 0, tests: 0, pushes: 0, commits: 0, flawless: 0, medals: 0, drones: 0, done: [] })
/** Today's record from what the store holds (an older or other day starts fresh; old fields keep defaults). */
export const dayFrom = (saved: unknown, key = dayKey()): Day => {
  const s = saved as Partial<Day> | undefined

  return s?.d === key ? { ...freshDay(key), ...s, done: Array.isArray(s.done) ? s.done : [] } : freshDay(key)
}

export const DAILY_REWARD = 2
export const POOL = [
  { k: 'clears', n: 'CLEAR 5 CONTRACTS', need: 5 },
  { k: 'tests', n: '3 GREEN TEST RUNS', need: 3 },
  { k: 'pushes', n: 'EXFIL: PUSH TWICE', need: 2 },
  { k: 'commits', n: 'LOCK IN 3 COMMITS', need: 3 },
  { k: 'flawless', n: '2 FLAWLESS CLEARS', need: 2 },
  { k: 'medals', n: 'EARN 3 MEDALS', need: 3 },
  { k: 'drones', n: 'DEPLOY 2 DRONES', need: 2 },
] as const
/** The day's three challenges: CLEAR first, then two of the others, the same all day. */
export const todays = (key: string) => {
  let seed = Number(key.replaceAll('-', '')) || 1
  const rest: (typeof POOL)[number][] = POOL.slice(1)
  const out: (typeof POOL)[number][] = [POOL[0]]

  while (out.length < 3) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    out.push(rest.splice(seed % rest.length, 1)[0]!)
  }

  return out
}
/** Challenges reached but not yet paid out. */
export const newlyDone = (day: Day) => todays(day.d).filter(ch => day[ch.k] >= ch.need && !day.done.includes(ch.k))

/** Medals for one finished contract. */
export const medalsFor = (o: { prior: readonly number[]; now: number; errs: number; hits: number; firstOfDay: boolean }) => {
  const medals: string[] = []
  // ponytail: a fixed 60 s window, as in the original; make it a setting if people ask.
  const n = o.prior.filter(t => o.now - t <= 60_000).length + 1

  if (n >= 3) {
    medals.push('TRIPLE CLEAR')
  } else if (n === 2) {
    medals.push('DOUBLE CLEAR')
  }
  if (o.errs >= 3) {
    medals.push('BOSS DOWN')
  } else if (o.errs === 0 && o.hits > 0) {
    medals.push('FLAWLESS')
  }
  if (o.firstOfDay) {
    medals.push('FIRST BLOOD')
  }

  return medals
}

// ------------------------------------------------------------------ the HUD
export const freshPending = (): Pending => ({ tests: 0, pushes: 0, commits: 0, drones: 0, mastery: {} })
export const freshHud = (): Hud => ({
  call: 'OPERATOR', unit: 'AL', working: false, armed: false, contract: null, act: 'STANDING BY', target: 'CONTRACT',
  hits: 0, errs: 0, reads: 0, drones: 0, cErrs: 0, cHits: 0, cleared: 0,
  kills: 0, bonus: 0, mastery: {}, day: freshDay(dayKey()), loadout: freshLoadout(), pack: 0,
  streak: 0, feed: [], pop: null, clears: [], pending: freshPending(),
})

/** A feed line, keeping the last 30. */
export const feed = (lines: Hud['feed'], t: number, k: 'kill' | 'warn' | 'info', text: string): Hud['feed'] =>
  [...lines, { t, k, text }].slice(-30)

/** A banner, or none under Radio Silence. High Yield doubles the XP it shows. */
export const banner = (st: Hud, t: number, kind: Pop['kind'], text: string, xp: number): Pop | null =>
  hasPerk(st.loadout, 'radiosilence')
    ? null
    : { t, kind, text, sub: xp ? `+${hasPerk(st.loadout, 'highyield') ? xp * 2 : xp} XP` : '' }

/** The contract's name: the first words of the prompt, in caps. */
export const targetOf = (prompt: string) => {
  const words = prompt.replace(/\s+/g, ' ').trim().toUpperCase()

  return words.length > 22 ? `${words.slice(0, 21)}…` : words || 'CONTRACT'
}

const PLATES: Record<string, number> = { working: 4, idle: 3 }

/** What the backdrop draws, from the HUD. */
export const viewOf = (st: Hud): View => {
  const rank = rankOf(st.kills + st.bonus)
  const w = weaponOf(st.loadout.gun)
  const extra = hasPerk(st.loadout, 'extraplate') ? 1 : 0

  return {
    working: st.working, act: st.act, call: st.call, unit: st.unit,
    rank: rank.name, xp: rank.xp, kills: st.kills, streak: st.streak,
    needs: STREAKS.map(s => needOf(s, st.loadout)),
    hits: st.hits, errs: st.errs, reads: st.reads, drones: st.drones,
    plates: Math.min(5, (st.working ? PLATES.working! : PLATES.idle!) + extra),
    gun: w.n, gunIcon: w.i, camo: CAMOS.find(c => c.n === st.loadout.camo)?.c ?? null,
    level: levelOf(st.mastery[w.n] ?? 0),
    challenges: todays(st.day.d).map(ch => ({
      n: ch.n,
      have: Math.min(ch.need, st.day[ch.k] + (ch.k in st.pending ? Number(st.pending[ch.k as keyof Pending]) || 0 : 0)),
      need: ch.need,
      done: st.day.done.includes(ch.k),
    })),
    feed: st.feed.slice(-5), pop: st.pop,
    lowProfile: hasPerk(st.loadout, 'lowprofile'), spotter: hasPerk(st.loadout, 'spotter'),
    pack: st.pack,
  }
}
