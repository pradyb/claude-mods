import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { type Fx, LENGTH, scene } from './scene'

// Night sky navy, hero blue accent, cape red, ring green, lasso gold. Dark only.
const { theme, problems } = makeColors({
  label: 'Justice League',
  roles: { accent: '#3b7de0', danger: '#d8343a', success: '#35c46a', warning: '#e0a82e', pro: '#8a6fd0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#090d1a',
        'surface-1': '#0f1424',
        'surface-2': '#151b2e',
        'surface-3': '#1a2136',
        'text-primary': '#e8ecf5',
        'text-secondary': '#b7bfd0',
        'text-muted': '#8f98ad',
      },
    },
  },
  only: 'dark',
})

const SCENE = 'justice-league'
const LOOK: ThemeSetArgs = { colors: theme, backdrop: { scene: SCENE } }

// Quiet and sparse: a low hum with the odd far bell, and one short cue per moment.
const SOUND: NonNullable<ThemeSetArgs['sound']> = {
  ambience: {
    reverb: 0.3,
    layers: [
      {
        wave: 'sine',
        notes: ['C2', 'G2'],
        drone: true,
        gain: 0.12,
        filter: { type: 'lowpass', hz: 400 },
        tremolo: { hz: 0.1, depth: 0.4 },
      },
      { wave: 'bell', notes: ['G5', 'C6', 'E6'], scatter: 0.05, gain: 0.05, release: 1.5 },
    ],
  },
  cues: {
    send: { layers: [{ wave: 'triangle', notes: ['E5', 'B5'], step: 0.07, gain: 0.25, release: 0.15 }] },
    tool: { layers: [{ wave: 'sine', notes: ['A4'], gain: 0.1, release: 0.06 }] },
    done: { layers: [{ wave: 'bell', notes: ['C5', 'E5', 'G5', 'C6'], step: 0.09, gain: 0.3, release: 0.6 }] },
    ask: { layers: [{ wave: 'bell', notes: ['G5', 'D6'], step: 0.12, gain: 0.25, release: 0.4 }] },
    error: {
      layers: [
        {
          wave: 'saw',
          notes: ['Eb3', 'C3'],
          step: 0.14,
          gain: 0.18,
          release: 0.3,
          filter: { type: 'lowpass', hz: 900 },
        },
      ],
    },
    compact: {
      layers: [{ wave: 'pink', gain: 0.2, attack: 0.4, release: 1.2, filter: { type: 'lowpass', hz: 300, to: 1800 } }],
    },
    click: { layers: [{ wave: 'bell', notes: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'], gain: 0.2, release: 0.3 }] },
  },
}

// Comic panels: your words in a gold caption box, Claude's in an inked navy panel, each on a solid ground
// so they stay readable over the figures.
const INK = '#10131c'
const CAPTION = {
  color: INK,
  backgroundColor: '#f2c94c',
  fontWeight: 'semibold',
  radius: 2,
  borderColor: INK,
  borderWidth: 2,
  shadow: { x: 4, y: 4, blur: 0, color: '#000000' },
  paddingX: 14,
  paddingY: 10,
} as const
const STYLE: NonNullable<ThemeSetArgs['style']> = {
  Heading: { fontWeight: 'bold', letterSpacing: 1, color: '#f2c94c' },
  UserMessage: [
    { ...CAPTION, rotate: -1 },
    { ...CAPTION, rotate: 0.8 },
  ],
  AssistantMessage: {
    color: '#e8ecf5',
    backgroundColor: '#0f1424',
    radius: 4,
    borderColor: '#3b7de0',
    borderWidth: 1,
    shadow: { x: 3, y: 3, blur: 0, color: '#000000' },
    padding: 14,
  },
  ToolUse: {
    color: '#b7bfd0',
    backgroundColor: '#151b2e',
    radius: 2,
    borderColor: '#2a3350',
    paddingX: 8,
    paddingY: 2,
    fontFamily: ['mono'],
  },
}

// Richest first: a build that refuses sound or style still gets the rest.
const LOOKS: ThemeSetArgs[] = [
  { ...LOOK, sound: SOUND, style: STYLE },
  { ...LOOK, style: STYLE },
  { ...LOOK, sound: SOUND },
  LOOK,
]

// What each event does to the backdrop:
//   click, left half   the caped flier leaves his spire and streaks straight to the click
//   click, right half  a green ring of light opens at the click, on a beam from the ring-bearer's fist
//   turn starts        the scarlet runner races across; the station's beacon turns green and quickens
//   tool call          one hero answers, by tool (at most one every 3 seconds):
//                        Bash, Agent, MCP tools   the machine fires a bolt from its cannon
//                        Edit, Write              the sea king calls up a swell
//                        anything else            the watcher throws a spinning crescent that returns
//   compaction         the sea king's swell
//   turn ends          the warrior's lasso opens in a gold ring and a gold star opens over the station
//   turn fails         a red bolt strikes and the warrior turns it aside on her bracers
// Effects overlap: up to three show at once, each from its own start. Module variables reset on reload,
// which is fine for a toy.
const MOST = 3
let fxs: Fx[] = []
let count = 0
let working = false
let lastTool = 0

const answering = (tool: string): Fx['kind'] => {
  if (tool === 'Bash' || tool === 'Agent' || tool.startsWith('mcp__')) {
    return 'blast'
  }

  return tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit' ? 'wave' : 'dart'
}

const play = (kind: Fx['kind'], x = 0, y = 0) => {
  const now = Date.now()

  count += 1
  fxs = [...fxs.filter(fx => now - fx.t0 < LENGTH[fx.kind] * 1000), { kind, x, y, n: count, t0: now }].slice(-MOST)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    // Quiet in the CLI: the theme stands and draws when a desktop client attaches.
    let said = false

    for (const look of LOOKS) {
      try {
        await $.theme.set(look)
        break
      } catch (error) {
        // A refused set throws and sets nothing: say why once, then try the next plainer look.
        $.ui.log(String(error))
        if (!said) {
          said = true
          $.ui.toast(`Justice League theme: ${String(error).split('\n')[0]}`)
        }
      }
    }

    return next(e)
  })

  // Only this mod's scene: another theme mod's backdrop is left to it.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={scene(fxs, working, Date.now(), e.surface === 'desktop')}
        alt="A night city with a caped flier, a cowled watcher and a warrior with a gold lasso on the left, and an orbiting station with a green ring-bearer, a hovering half-machine hero and a sea king in the surf on the right"
      />
    )
  })

  on('ui.pointer', ($, e, next) => {
    if (e.scene === SCENE) {
      // In percent of the window, which the scene places exactly at any shape.
      play(e.x < 0.5 ? 'fly' : 'ring', e.x * 100, e.y * 100)
      $.ui.invalidate('ui.render')
    }

    return next(e)
  })

  // Main loop only: a subagent's turns stay quiet.
  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) {
      working = true
      play('dash')
      $.ui.invalidate('ui.render')
    }

    return next(e)
  })

  // Tool calls come in bursts: one answer every 3 seconds at most.
  on('tool.call', ($, e, next) => {
    const now = Date.now()

    // This hook sits in front of every tool call: nothing here may stop one.
    try {
      if (now - lastTool > 3000) {
        lastTool = now
        play(answering(e.tool))
        $.ui.invalidate('ui.render')
      }
    } catch (error) {
      $.ui.log(String(error))
    }

    return next(e)
  })

  on('session.compact', ($, e, next) => {
    try {
      play('wave')
      $.ui.invalidate('ui.render')
    } catch (error) {
      $.ui.log(String(error))
    }

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      working = false
      play(e.reason === 'answer' ? 'star' : 'fail')
      $.ui.invalidate('ui.render')
    }

    return next(e)
  })
}
