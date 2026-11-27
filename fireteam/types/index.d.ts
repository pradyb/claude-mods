/** A banner for a big event: a cleared contract, a medal, a streak, a promotion, a level-up, a failure. */
export type Pop = { t: number; kind: 'kill' | 'dmg' | 'info'; text: string; sub: string }

/** One kill-feed line. */
export type FeedLine = { t: number; k: 'kill' | 'warn' | 'info'; text: string }

/** Today's record, kept across sessions; each count feeds a daily challenge. */
export type Day = {
  d: string
  clears: number
  tests: number
  pushes: number
  commits: number
  flawless: number
  medals: number
  drones: number
  /** Challenges already paid out today. */
  done: string[]
}

/** Weapon, weapon camo and three perk slots (a perk key or null each). */
export type Loadout = { gun: string; camo: string; perks: (string | null)[] }

/** Counts gathered during a turn, added to the store at its end (re-read first, so sessions don't clobber). */
export type Pending = { tests: number; pushes: number; commits: number; drones: number; mastery: Record<string, number> }

/** The session's HUD: live state, stats, career values loaded from the store, and the loadout. */
export type Hud = {
  call: string
  unit: string
  working: boolean
  /** A person's prompt is waiting for its turn: only such turns are contracts. */
  armed: boolean
  /** The turn running the current contract, taken from the armed prompt at its turn's start. */
  contract: string | null
  act: string
  target: string
  hits: number
  errs: number
  reads: number
  drones: number
  /** The current contract's failures and hits, for medals. */
  cErrs: number
  cHits: number
  cleared: number
  /** Career, from the store. */
  kills: number
  bonus: number
  mastery: Record<string, number>
  day: Day
  loadout: Loadout
  /** Index into the colour packs. */
  pack: number
  /** Scorestreak charge, spent by calling a streak in the pane. */
  streak: number
  feed: FeedLine[]
  pop: Pop | null
  clears: number[]
  pending: Pending
}

/** Live readings from the session, gathered when the HUD is redrawn; any of them can be missing. */
export type Live = {
  /** Context window used, in percent, and its tokens. */
  ctx?: number
  tokens?: number
  /** The 5-hour rate limit used, in percent. */
  fuel?: number
  /** Session cost in US dollars. */
  cost?: number
  branch?: string
  /** When the running contract began (epoch milliseconds). */
  since?: number
  /** Subagents running now. */
  squad: number
}

/** What the backdrop draws: a snapshot of the HUD, written at most every 1.5 s or on a big event. */
export type View = {
  working: boolean
  act: string
  call: string
  unit: string
  rank: string
  xp: number
  kills: number
  streak: number
  /** Each scorestreak's cost now (Logistics makes them cheaper). */
  needs: number[]
  hits: number
  errs: number
  reads: number
  drones: number
  plates: number
  gun: string
  gunIcon: string
  camo: string | null
  level: number
  challenges: { n: string; have: number; need: number; done: boolean }[]
  feed: FeedLine[]
  pop: Pop | null
  lowProfile: boolean
  spotter: boolean
  pack: number
  live?: Live
}

declare module 'claude-code' {
  interface PluginState {
    fireteam: { hud: Shaped<Hud>; look: Shaped<View | null> }
  }
}
