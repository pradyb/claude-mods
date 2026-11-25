// The backdrop, as one SVG string. Each side is drawn in 1600 x 900 units and pinned to its bottom corner at
// half the window's width, so the sides shrink in a narrow window and never collide or crop; what follows
// a click is placed in percentages of the window, which is exact at any shape. Original art: a city on the left with a caped
// flier, a cowled watcher and a warrior on its rooftops, an orbital station, a ring-bearer, a half-machine hero and a sea king in the surf on the right. No publisher emblems; the heroes are evoked by colour and shape.

/** One triggered effect. Several can show at once; each plays from its own start time. */
export type Fx = {
  kind: 'fly' | 'ring' | 'dash' | 'star' | 'fail' | 'dart' | 'wave' | 'blast'
  /** Where it aims, in percent of the window from its top left (clicks only). */
  x: number
  y: number
  /** Counts up per effect, so each gets its own keyframe names. */
  n: number
  /** When it began, in epoch milliseconds. */
  t0: number
}

/** How long each effect runs, in seconds; past that it is dropped from the drawing. */
export const LENGTH: Record<Fx['kind'], number> = {
  fly: 2.4, ring: 0.9, dash: 0.8, star: 1, fail: 1, dart: 1.4, wave: 1.3, blast: 0.7,
}

const RED = '#d8343a'
const BLUE = '#2f6fe0'
const GREEN = '#3ddc6b'
const GOLD = '#f2c94c'
const STEEL = '#8fa3c8'

// City, left edge: a hazy far layer and near art-deco towers. The flier hovers over the far spire, far enough in to survive a narrow window's crop.
const FAR =
  'M0 900V520h50v-70h40v70h40v-150h30v-50h20v50h30v150h60v-90h50v90h50v-190h24v-60h12v60h24v190h60v120h40v80h40V900Z'
const NEAR =
  'M0 900V640h70v-120h20v-70h20v-60h16v-50l14-110l14 110v50h16v60h20v70h20v120h80v-150h30v-40h40v40h30v150h70v-70h60v70h40V900Z'
const PX = 400
const PY = 205
// Where the watcher and the warrior stand: two rooftops of the near towers.
const BX = 340
const BY = 450
const WX = 490
const WY = 570
// The ring-bearer floats under the station; his ring fist is where the beam starts.
const LX = 1360
const LY = 540
const RX = LX - 22 * 2.2
const RY = LY - 43 * 2.2
// The machine hovers left of the station; its cannon muzzle is where the bolt starts. The sea king stands in the surf.
const CX = 1130
const CY = 440
const MX = Math.round(CX - 23.5 * 2.2)
const MY = Math.round(CY - 28.5 * 2.2)
const AX = 1250
const AY = 850
const WINDOWS: [number, number, string][] = [
  [100, 545, 'w1'], [128, 545, 'w2'], [160, 560, 'w3'], [100, 585, 'w3'], [172, 600, 'w1'], [132, 615, 'w2'],
  [305, 510, 'w2'], [340, 510, 'w1'], [372, 530, 'w3'], [315, 560, 'w1'], [350, 590, 'w2'], [480, 600, 'w3'],
]

// A front row of low rooftops along the left foot, as [width, top] blocks, with a water tank and an aerial,
// so the corner below the towers is not a bare slab. Its lit windows come from a fixed seed.
const BLOCKS: [number, number][] = [
  [60, 760], [50, 730], [30, 760], [14, 710], [36, 684], [14, 710], [40, 760], [70, 800],
  [20, 740], [8, 720], [20, 740], [50, 800], [60, 830], [46, 786], [40, 830], [42, 870],
]
const FRONT = `M0 900${BLOCKS.map(([w, top]) => `V${top}h${w}`).join('')}V900Z`
const LOW = (() => {
  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  let out = ''
  let left = 0

  for (const [w, top] of BLOCKS) {
    for (let x = left + 8; w >= 30 && x <= left + w - 12; x += 16) {
      for (let y = top + 14; y <= 880; y += 22) {
        if (rnd() < 0.38) {
          out += `<rect class="w${1 + Math.floor(rnd() * 3)}" x="${x}" y="${y}" width="6" height="10"${rnd() < 0.2 ? ' fill="#8fd0ff"' : ''}/>`
        }
      }
    }
    left += w
  }

  return out
})()

// Station, top right.
const SX = 1270
const SY = 190
const ORBIT = 'M-120 0a120 36 0 1 0 240 0a120 36 0 1 0 -240 0'
const STAR = 'M0 -40L9 -12L38 -12L15 5L24 33L0 16L-24 33L-15 5L-38 -12L-9 -12Z'

// The flier in flight, heading +x, origin at the chest: one fist forward, cape billowing, legs trailing.
const SKIN = '#e8c9a0'
const HAIR = '#1a1420'
const CAPE = '#b8262d'
const FLIER = `<path fill="${CAPE}" d="M-2 -5Q-22 -17 -48 -7Q-37 -2 -42 7Q-24 2 -4 4Z"/><path fill="${BLUE}" d="M-8 -2L-34 1L-34 6L-8 5Z"/><path fill="${RED}" d="M-34 1L-47 2.5L-47 6L-34 6Z"/><path fill="${BLUE}" d="M-10 -4L8 -5L10 4L-10 5Z"/><path fill="${RED}" d="M-13 -3.5h5v8.5h-5z"/><rect x="-8" y="-4" width="1.6" height="9" fill="${GOLD}"/><path fill="${BLUE}" d="M6 -4L30 -3L30 1L6 3Z"/><circle cx="32" cy="-1" r="2.8" fill="${SKIN}"/><circle cx="13" cy="-8.5" r="4.5" fill="${SKIN}"/><path fill="${HAIR}" d="M8.6 -9.5a4.5 4.5 0 0 1 8.6 -1.5q-4.5 -1.5 -8.6 1.5z"/>`
// The flier at rest, upright in the air, feet at the origin: hands on hips, cape flowing.
const HOVERER = `<path fill="${CAPE}" d="M-7 -35Q-17 -15 -14 0L-5 -6L3 -1L11 -8Q14 -22 7 -35Z"/><path fill="${BLUE}" d="M-5 -19h4.4l-.4 13h-4zM.6 -19H5v13H1z"/><path fill="${RED}" d="M-5 -7h4v7h-4.6zM1 -7h4l.6 7H1z"/><path fill="${BLUE}" d="M-8 -35h16l-3 15h-10z"/><path fill="${BLUE}" d="M-8 -35l-6 8l6 7l1.2 -3l-3 -4l3.6 -5zM8 -35l6 8l-6 7l-1.2 -3l3 -4l-3.6 -5z"/><path fill="${RED}" d="M-5 -20h10l-2 4.5h-6z"/><rect x="-5" y="-21.5" width="10" height="1.8" fill="${GOLD}"/><circle cy="-40" r="4.5" fill="${SKIN}"/><path fill="${HAIR}" d="M-4.6 -40.5a4.6 4.6 0 0 1 9.2 0q-3 -3 -5.2 -1.6q-1.8 1.2 -4 1.6z"/>`

// Standing figures, feet at the origin, about 50 units tall. Own drawings, no emblems.
// A cowled watcher in a scalloped cape.
const WATCHER = `<g fill="#1c2438" stroke="#6a7aa0" stroke-width=".8" stroke-linejoin="round"><path class="sw" d="M-6 -35L6 -35L16 0L10 -4L5 0L0 -4L-5 0L-10 -4L-16 0Z"/><path d="M-5 -41l1 -11l3 6h2l3 -6l1 11a5 5 0 0 1 -10 0z"/></g><rect x="-4" y="-21" width="8" height="2" fill="${GOLD}"/>`
// A warrior with a tiara and a coiled gold lasso.
const WARRIOR = `<path fill="#1a1420" d="M-6 -42q6 -9 12 0l2 15h-16z"/><circle cy="-40" r="4.5" fill="#e8c9a0"/><rect x="-4" y="-44.5" width="8" height="1.6" fill="${GOLD}"/><path fill="${RED}" d="M-5 -34h10l-2 12h-6z"/><path fill="${BLUE}" d="M-6 -22h12l3 10h-18z"/><path fill="${RED}" d="M-4 -12h3v12h-3zM1 -12h3v12h-3z"/><circle class="ls" cx="9" cy="-18" r="5" fill="none" stroke="${GOLD}" stroke-width="1.5"/>`
// A scarlet runner, leaning into the sprint.
const RUNNER = `<g fill="none" stroke="${RED}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 -26L-4 -12L6 -2M-4 -12L-14 -4L-20 -8M2 -22L10 -16M2 -22L-8 -24"/></g><circle cx="7" cy="-31" r="4" fill="${RED}"/><path fill="${GOLD}" d="M9 -33l4 -4l-1 4z"/>`

// A ring-bearer floating on the right, feet at the origin: green and dark suit, one fist raised with a glowing ring.
const DARK = '#2a3446'
const SUIT = '#2aa152'
const BEARER = `<circle class="w3" cy="-24" r="36" fill="${GREEN}" opacity=".1"/><path fill="${DARK}" d="M-5 -19h4.4l-.4 13h-4zM.6 -19H5v13H1z"/><path fill="${SUIT}" d="M-5 -7h4v7h-4.6zM1 -7h4l.6 7H1z"/><path fill="${DARK}" d="M-8 -35l-13 -9l-2 3.6l11 9.4zM8 -35l5 13l-3 1l-5 -10z"/><path fill="${SUIT}" d="M-8 -35h16l-3 15h-10z"/><circle cy="-40" r="4.5" fill="${SKIN}"/><path fill="#3a2a1c" d="M-4.6 -40.5a4.6 4.6 0 0 1 9.2 0q-4.6 -2.4 -9.2 0z"/><rect x="-4.3" y="-41" width="8.6" height="1.8" fill="${SUIT}"/><circle class="bc" cx="-22" cy="-43" r="6" fill="${GREEN}" opacity=".55"/><circle cx="-22" cy="-43" r="2.6" fill="#eef5ee"/>`

// A sea king standing in the surf, feet at the origin: orange top, green legs, blond hair, a gold trident.
const SEAKING = `<path fill="#1f8a4c" d="M-5 -19h4.4l-.4 19h-4zM.6 -19H5v19H1z"/><path fill="#e8872a" d="M-8 -35l-5 13l3 1l5 -10zM8 -35l5 9l-2 2l-6 -7z"/><path fill="#e8872a" d="M-8 -35h16l-3 15h-10z"/><rect x="-5" y="-21.5" width="10" height="1.8" fill="${GOLD}"/><path fill="#e8c75a" d="M-5.6 -39a5.6 5.6 0 0 1 11.2 0l.4 6h-2.4l-.4 -5h-6.4l-.4 5h-2.4z"/><circle cy="-40" r="4.5" fill="${SKIN}"/><path fill="#e8c75a" d="M-4.6 -40.5a4.6 4.6 0 0 1 9.2 0q-4.6 -2.4 -9.2 0zM-2.6 -37.2h5.2l-2.6 2.6z"/><circle cx="12.5" cy="-26" r="2" fill="${SKIN}"/><path fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round" d="M12.5 -4V-58M7 -64v8h11v-8M12.5 -56v-11"/>`
// A half-machine hero hovering on boot jets: steel body, a red eye and chest core, one arm a cannon.
const STEELB = '#9aa7bd'
const MACHINE = `<path class="w1" fill="#ffb347" d="M-5 0l2 8l2 -8zM1.5 0l2 8l2 -8z"/><path fill="#7f8ca6" d="M-5 -19h4.4l-.4 19h-4zM.6 -19H5v19H1z"/><path fill="#55617a" d="M-5 -6h4v6h-4.6zM1 -6h4l.6 6H1z"/><path fill="#55617a" d="M-8 -35l-15 4v5l15 -3z"/><path fill="${STEELB}" d="M8 -35l5 13l-3 1l-5 -10z"/><path fill="${STEELB}" d="M-8 -35h16l-3 15h-10z"/><circle class="w2" cy="-29" r="2.4" fill="#ff5a4a"/><circle cy="-40" r="4.5" fill="#8a5a3c"/><path fill="#c3ccdc" d="M0 -44.5a4.5 4.5 0 0 0 0 9z"/><circle cx="-2" cy="-40.5" r="1.1" fill="#ff3b30"/><circle class="bc" cx="-23.5" cy="-28.5" r="2.6" fill="#8fd0ff"/>`
// The surf along the right foot; the crests repeat every 100 units, so a 100-unit drift loops.
const SEA = `M860 900V815q25 -12 50 0${'t50 0'.repeat(18)}V900Z`

// Stars from a fixed seed, kept off the middle band where the words sit.
const STARS = (() => {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  let out = ''

  for (let i = 0; i < 120; i++) {
    const x = Math.round(rnd() * 1600)
    const y = Math.round(rnd() * 620)

    if (x > 520 && x < 1080) {
      continue
    }
    const r = (0.6 + rnd() * 1.1).toFixed(1)
    out += `<circle class="t${i % 3}" cx="${x}" cy="${y}" r="${r}"/>`
  }

  return out
})()

type Drawn = { css: string; left: string; right: string; top: string }

// Each redraw reloads the drawing and restarts its animations, so every animation is given a negative
// delay: an effect resumes at its own age, and an idle loop at the phase the clock puts it in.
// `left` and `right` are drawn in a side's units; `top` in percentages of the window.
const effect = (fx: Fx, age: number): Drawn => {
  const { kind, n } = fx
  const x = fx.x.toFixed(1)
  const y = fx.y.toFixed(1)
  const at = `-${age.toFixed(2)}s`
  const none = { left: '', right: '', top: '' }
  // Every effect rests at opacity 0, so reduced motion shows none of them.
  const fade = `@keyframes fd${n}{0%{opacity:0}25%{opacity:.7}100%{opacity:0}}`
  const grow = `@keyframes gr${n}{0%{transform:scale(.05);opacity:.9}100%{transform:scale(1);opacity:0}}`
  const burst = `@keyframes st${n}{0%{transform:scale(.2);opacity:0}25%{opacity:.9}100%{transform:scale(1.9);opacity:0}}`

  // A point of a side, in window lengths: each side is scaled by SIDE and pinned to its bottom corner.
  // Viewport units read the drawing's own box, so this holds at any window shape.
  const SIDE = 'min(50vw / 640, 100vh / 900)'
  const leftX = (px: number) => `calc(${px} * ${SIDE})`
  const rightX = (px: number) => `calc(100vw - ${1600 - px} * ${SIDE})`
  const sideY = (py: number) => `calc(100vh - ${900 - py} * ${SIDE})`
  // A straight bar from a side's point to the click: turned by the angle between them and as long as the gap.
  const bar = (x1: string, y1: string, colour: string, thick: number, style: string) => {
    const dx = `calc(${x}vw - ${x1})`
    const dy = `calc(${y}vh - ${y1})`

    return `<g style="transform:translate(${x1},${y1}) rotate(atan2(${dy},${dx}))"><rect y="${-thick / 2}" height="${thick}" rx="${thick / 2}" fill="${colour}" opacity="0" style="width:hypot(${dx},${dy});${style}"/></g>`
  }

  switch (kind) {
    // The flier leaves his spire and streaks straight to the click, hovers, lifts away.
    case 'fly': {
      const x1 = leftX(PX)
      const y1 = sideY(PY - 10)
      const there = `translate(${x}vw,${y}vh)`
      // Heading left he is flipped, so he never flies upside down. His spire sits about a quarter of the way in.
      const flip = fx.x < 25 ? ' transform="scale(1 -1)"' : ''

      return {
        ...none,
        css: `${fade}@keyframes fl${n}{0%{transform:translate(${x1},${y1});opacity:0}6%{opacity:1}30%{transform:${there};opacity:1}80%{transform:${there};opacity:1}100%{transform:translate(${x}vw,${(fx.y - 8).toFixed(1)}vh);opacity:0}}`,
        top: `${bar(x1, y1, BLUE, 3, `animation:fd${n} .9s ${at} ease-out forwards`)}<g opacity="0" style="animation:fl${n} 2.4s ${at} ease-out forwards"><g style="transform:rotate(atan2(calc(${y}vh - ${y1}),calc(${x}vw - ${x1})))"><svg x="-6%" y="-6%" width="12%" height="12%" viewBox="-32 -32 64 64" overflow="visible"><g${flip}>${FLIER}</g></svg></g></g>`,
      }
    }
    // One green ring of light where you clicked, on a beam from the ring-bearer's fist.
    case 'ring':
      return {
        ...none,
        css: fade + grow,
        top: `${bar(rightX(Math.round(RX)), sideY(Math.round(RY)), GREEN, 2.5, `animation:fd${n} .7s ${at} ease-out forwards`)}<circle class="fx" cx="${x}%" cy="${y}%" r="6.5%" fill="none" stroke="${GREEN}" stroke-width="5" vector-effect="non-scaling-stroke" opacity="0" style="animation:gr${n} .9s ${at} ease-out forwards"/>`,
      }
    // The scarlet runner, a streak and a gold bolt behind, races across the whole window, above the message box.
    case 'dash':
      return {
        ...none,
        css: `@keyframes ds${n}{0%{transform:translate(-6%,0);opacity:1}97%{opacity:1}100%{transform:translate(118%,0);opacity:0}}`,
        top: `<g opacity="0" style="animation:ds${n} .8s ${at} linear forwards"><svg x="0" y="65.6%" width="11.1%" height="11.1%" viewBox="0 -100 100 100" preserveAspectRatio="xMinYMax meet" overflow="visible"><g transform="translate(-10 -36)"><path fill="url(#streak)" d="M0 0L-300 -7V7Z"/><path fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-linejoin="round" d="M-14 0l-40 -10l10 10l-52 -8l12 9l-62 -6"/></g><g transform="scale(2.4)">${RUNNER}</g></svg></g>`,
      }
    // The warrior's lasso opens in a gold ring, and a gold star opens over the station.
    case 'star':
      return {
        ...none,
        css: grow + burst,
        left: `<circle class="fx" cx="${WX + 20}" cy="${WY - 40}" r="80" fill="none" stroke="${GOLD}" stroke-width="4" vector-effect="non-scaling-stroke" opacity="0" style="animation:gr${n} 1s ${at} ease-out forwards"/>`,
        right: `<g transform="translate(${SX} ${SY})"><path class="fx" fill="${GOLD}" d="${STAR}" opacity="0" style="animation:st${n} 1s ${at} ease-out forwards"/></g>`,
      }
    // The watcher throws a spinning steel crescent out over the city, and it comes back to his hand.
    case 'dart': {
      const from = `translate(${BX + 30}px,${BY - 75}px)`
      const to = `translate(${BX + 400}px,${BY - 230}px)`

      return {
        ...none,
        css: `@keyframes th${n}{0%{transform:${from};opacity:0}10%{opacity:1}50%{transform:${to}}90%{opacity:1}100%{transform:${from};opacity:0}}@keyframes sp${n}{to{transform:rotate(1080deg)}}`,
        left: `<g opacity="0" style="animation:th${n} 1.4s ${at} ease-in-out forwards"><path class="fx" fill="#aab6d0" stroke="${GOLD}" stroke-width="1" d="M-16 0Q0 -14 16 0Q0 -5 -16 0Z" style="animation:sp${n} 1.4s ${at} linear forwards"/></g>`,
      }
    }
    // The sea king calls up a swell around himself.
    case 'wave':
      return {
        ...none,
        css: `@keyframes wa${n}{0%{transform:scaleY(.05);opacity:.75}40%{transform:scaleY(1);opacity:.7}100%{transform:scaleY(.05);opacity:0}}`,
        right: `<path class="fxb" fill="#1c8fa8" d="M${AX - 170} 900Q${AX - 80} 690 ${AX} 715Q${AX + 80} 690 ${AX + 170} 900Z" opacity="0" style="animation:wa${n} 1.3s ${at} ease-in-out forwards"/>`,
      }
    // The machine fires one bolt from its cannon.
    case 'blast':
      return {
        ...none,
        css: `${grow}@keyframes bl${n}{0%{transform:translate(${MX}px,${MY}px);opacity:1}100%{transform:translate(${MX - 330}px,${MY - 50}px);opacity:0}}`,
        right: `<circle class="fx" cx="${MX}" cy="${MY}" r="26" fill="none" stroke="#8fd0ff" stroke-width="3" vector-effect="non-scaling-stroke" opacity="0" style="animation:gr${n} .6s ${at} ease-out forwards"/><g opacity="0" style="animation:bl${n} .7s ${at} ease-out forwards"><path fill="none" stroke="#8fd0ff" stroke-width="6" stroke-linecap="round" d="M0 0l-46 -7"/></g>`,
      }
    // A red bolt strikes at the warrior, and she turns it aside on her bracers in a gold spark.
    case 'fail': {
      const hx = WX + 8
      const hy = WY - 75

      return {
        ...none,
        css: fade + burst,
        left: `<path fill="none" stroke="${RED}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" d="M${hx + 252} ${hy - 255}l-90 80l30 10l-110 90l26 8l-108 67" opacity="0" style="animation:fd${n} .6s ${at} ease-out forwards"/><g transform="translate(${hx} ${hy}) scale(.7)"><path class="fx" fill="${GOLD}" d="${STAR}" opacity="0" style="animation:st${n} 1s ${at} ease-out forwards"/></g>`,
      }
    }
  }
}

/**
 * The whole scene at the moment `now` (epoch milliseconds). `working` is true while Claude is mid-turn:
 * the station's beacon turns green and quickens. Effects that have run their length are left out.
 */
export const scene = (fxs: readonly Fx[], working: boolean, now: number): string => {
  const live = fxs.filter(fx => now - fx.t0 < LENGTH[fx.kind] * 1000)
  const drawn = live.map(fx => effect(fx, Math.max(0, (now - fx.t0) / 1000)))
  const layer = (key: 'css' | 'left' | 'right' | 'top') => drawn.map(d => d[key]).join('')
  const t = now / 1000
  // An idle loop, resumed at the phase the clock gives it.
  const loop = (name: string, dur: number, off = 0, ease = 'ease-in-out') =>
    `animation:${name} ${dur}s -${((t + off) % dur).toFixed(2)}s ${ease} infinite`
  const orbit = (off: number) =>
    `<circle r="3"><animateMotion dur="24s" begin="-${((t + off) % 24).toFixed(2)}s" repeatCount="indefinite" path="${ORBIT}"/></circle>`
  // The hovering flier steps aside while the other one flies.
  const fly = live.findLast(fx => fx.kind === 'fly')
  const hover = fly ? ` style="animation:hd${fly.n} 2.4s -${((now - fly.t0) / 1000).toFixed(2)}s linear forwards"` : ''
  const hide = fly ? `@keyframes hd${fly.n}{0%{opacity:0}92%{opacity:0}100%{opacity:1}}` : ''
  // A side: its half of the window, its 640 x 900 slice of the scene pinned to a bottom corner.
  const side = (x: string, viewBox: string, pin: string, body: string) =>
    `<svg x="${x}" width="50%" height="100%" viewBox="${viewBox}" preserveAspectRatio="${pin}" overflow="visible">${body}</svg>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<style>
.fx{transform-box:fill-box;transform-origin:center}.fxb{transform-box:fill-box;transform-origin:50% 100%}
.wv{${loop('wv', 9, 0, 'linear')}}
.t0{${loop('tw', 7)}}.t1{${loop('tw', 9, 2)}}.t2{${loop('tw', 11, 4)}}
.w1{${loop('fk', 5)}}.w2{${loop('fk', 7, 1)}}.w3{${loop('fk', 6, 2)}}
.bob{${loop('bob', 4)}}.bob2{${loop('bob2', 5, 1)}}
.sw{transform-box:fill-box;transform-origin:50% 0;${loop('sw', 6)}}
.ls{transform-box:fill-box;transform-origin:0 0;${loop('ls', 3.5)}}
.bc{${loop('bc', working ? 1.6 : 8)}}
@keyframes wv{to{transform:translateX(-100px)}}
@keyframes tw{50%{opacity:.25}}
@keyframes fk{50%{opacity:.15}}
@keyframes bob{50%{transform:translateY(-8px)}}
@keyframes bob2{50%{transform:translateY(-5px)}}
@keyframes sw{50%{transform:skewX(6deg)}}
@keyframes ls{50%{transform:rotate(-28deg)}}
@keyframes bc{50%{opacity:.2}}
${hide}${layer('css')}
</style>
<defs>
<linearGradient id="farf" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="620" y2="0"><stop offset=".5" stop-color="#18223c"/><stop offset="1" stop-color="#18223c" stop-opacity="0"/></linearGradient>
<linearGradient id="frontf" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="600" y2="0"><stop offset=".7" stop-color="#151d36"/><stop offset="1" stop-color="#151d36" stop-opacity="0"/></linearGradient>
<linearGradient id="nearf" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="560" y2="0"><stop offset=".7" stop-color="#0c1120"/><stop offset="1" stop-color="#0c1120" stop-opacity="0"/></linearGradient>
<radialGradient id="haze" gradientUnits="userSpaceOnUse" cx="120" cy="900" r="640"><stop offset="0" stop-color="${BLUE}" stop-opacity=".22"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></radialGradient>
<radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="${SX}" cy="${SY}" r="300"><stop offset="0" stop-color="#6f7fe0" stop-opacity=".16"/><stop offset="1" stop-color="#6f7fe0" stop-opacity="0"/></radialGradient>
<linearGradient id="streak" gradientUnits="userSpaceOnUse" x1="-300" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${RED}" stop-opacity="0"/><stop offset="1" stop-color="${RED}"/></linearGradient>
<linearGradient id="seaf" gradientUnits="userSpaceOnUse" x1="900" y1="0" x2="1120" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>
<mask id="seam" maskUnits="userSpaceOnUse" x="860" y="760" width="760" height="140"><rect x="860" y="760" width="760" height="140" fill="url(#seaf)"/></mask>
</defs>
<svg width="100%" height="100%" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><g fill="#cfd8ff" opacity=".7">${STARS}</g></svg>
${side(
  '0',
  '0 0 640 900',
  'xMinYMax meet',
  `<path fill="url(#farf)" d="${FAR}"/>
<rect x="0" y="240" width="780" height="660" fill="url(#haze)"/>
<path fill="url(#nearf)" d="${NEAR}"/>
<g fill="${GOLD}" opacity=".55">${WINDOWS.map(([x, y, c]) => `<rect class="${c}" x="${x}" y="${y}" width="7" height="11"/>`).join('')}</g>
<path fill="url(#frontf)" d="${FRONT}"/>
<g fill="${GOLD}" opacity=".5">${LOW}</g>
<g transform="translate(${BX} ${BY}) scale(2.2)">${WATCHER}</g><g transform="translate(${WX} ${WY}) scale(2.2)">${WARRIOR}</g>
<g${hover}><g class="bob"><g transform="translate(${PX} ${PY + 45}) scale(2.2)">${HOVERER}</g></g></g>
${layer('left')}`,
)}
${side(
  '50%',
  '960 0 640 900',
  'xMaxYMax meet',
  `<rect x="${SX - 300}" y="0" width="600" height="${SY + 300}" fill="url(#glow)"/>
<g transform="translate(${SX} ${SY}) rotate(-16)">
<ellipse rx="120" ry="36" fill="none" stroke="${STEEL}" stroke-opacity=".55" stroke-width="4"/>
<rect x="-178" y="-9" width="50" height="18" fill="${BLUE}" opacity=".45"/><rect x="128" y="-9" width="50" height="18" fill="${BLUE}" opacity=".45"/>
<path fill="${STEEL}" fill-opacity=".6" d="M-5 -78h10l5 60h-20zM-10 18h20l-5 52h-10z"/>
<circle r="24" fill="#18223c" stroke="${STEEL}" stroke-opacity=".7" stroke-width="2"/>
<circle r="8" fill="#6fb6ff" opacity=".6"/>
<g fill="#e8ecf5" opacity=".8">${orbit(0)}${orbit(8)}${orbit(16)}</g>
<circle class="bc" cy="-84" r="5" fill="${working ? GREEN : GOLD}"/>
</g>
<g class="bob"><g transform="translate(${LX} ${LY}) scale(2.2)">${BEARER}</g></g>
<g class="bob"><g transform="translate(${CX} ${CY}) scale(2.2)">${MACHINE}</g></g>
<g class="bob2"><g transform="translate(${AX} ${AY}) scale(2.2)">${SEAKING}</g></g>
<g mask="url(#seam)"><path class="wv" fill="#12586e" fill-opacity=".6" d="${SEA}"/></g>
${layer('right')}`,
)}
${layer('top')}
</svg>`
}
