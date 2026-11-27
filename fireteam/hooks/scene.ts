// The backdrop, as one SVG string: a tactical HUD in the gutters beside the conversation.
//   left column   minimap radar, operator card (weapon, live action, armour plates, stats), event banner
//   right column  rank and XP, scorestreak charge, kill feed, daily challenges
//   top centre    compass strip
// Each column is drawn in 300 x 900 units pinned to its top corner, so it is about 300 px wide on a laptop
// screen and fits the gutter beside the chat column. Narrower windows drop parts rather than shrink them:
// below 1400 px the card and challenges go, below 1260 px both columns go and the compass stays.
// Original art: no game's logos, fonts, characters or HUD artwork.

import type { View } from '../types'
import { type Pack, packOf } from './score'

/** One triggered effect. Several can show at once; each plays from its own start time. */
export type Fx = {
  kind: 'hit' | 'kill' | 'dmg' | 'click' | 'drone' | 'uav' | 'airstrike' | 'gunship' | 'armor'
  /** Where it lands, in percent of the window from its top left (clicks only). */
  x: number
  y: number
  /** Counts up per effect, so each gets its own keyframe names. */
  n: number
  /** When it began, in epoch milliseconds. */
  t0: number
}

/** How long each effect runs, in seconds; past that it is dropped from the drawing. */
export const LENGTH: Record<Fx['kind'], number> = {
  hit: 0.6, kill: 1.4, dmg: 1.4, click: 0.8, drone: 4, uav: 5, airstrike: 2.2, gunship: 4, armor: 2.6,
}
/** How long an event banner shows, in seconds. */
export const BANNER = 4.5

const FONT = `font-family="Bahnschrift, 'DIN Condensed', 'Arial Narrow', sans-serif" font-weight="700"`
const W = 300

// Weapon silhouettes, 64 x 24 (herdr-fireteam's own art, MIT).
const GUNS: Record<string, string> = {
  ar: '<rect x="1" y="9" width="12" height="5"/><rect x="13" y="8" width="20" height="6"/><rect x="33" y="9" width="17" height="4"/><rect x="50" y="10" width="13" height="2"/><rect x="28" y="5" width="7" height="3"/><path d="M24 14h5l1 9h-5z"/><path d="M15 14h4l-1 7h-4z"/>',
  ak: '<path d="M1 8h10l2 2v4H1z"/><rect x="11" y="8" width="22" height="6"/><rect x="33" y="8" width="11" height="5"/><rect x="34" y="5.5" width="9" height="2"/><rect x="44" y="9" width="19" height="2"/><rect x="57" y="6" width="2" height="3"/><path d="M22 14h5l6 7-3 2.5z"/><path d="M13 14h4l-1 7h-4z"/>',
  bullpup: '<path d="M2 8h34l3 2v4H2z"/><rect x="12" y="4.5" width="17" height="3.5"/><rect x="39" y="9" width="24" height="2"/><rect x="58" y="6.5" width="2" height="2.5"/><path d="M27 14h4l-1 7h-4z"/><rect x="14" y="14" width="6" height="8"/>',
  launcher: '<rect x="4" y="8" width="52" height="6"/><rect x="52" y="6" width="10" height="10"/><rect x="1" y="7" width="6" height="8"/><path d="M26 14h5l-1 8h-4z"/><rect x="20" y="4" width="8" height="3"/>',
  lmg: '<rect x="1" y="8" width="12" height="6"/><rect x="13" y="7" width="22" height="7"/><rect x="35" y="9" width="22" height="3"/><rect x="57" y="8" width="5" height="5"/><rect x="22" y="14" width="10" height="8"/><path d="M15 14h4l-1 7h-4z"/><path d="M44 12h1l-5 10h-1z"/>',
  pistol: '<rect x="14" y="5" width="34" height="7"/><path d="M16 12h10l-3 12h-7z"/><rect x="28" y="12" width="8" height="2"/><rect x="45" y="4" width="3" height="2"/>',
  shotgun: '<rect x="1" y="9" width="13" height="5"/><rect x="14" y="9" width="14" height="5"/><rect x="28" y="9" width="35" height="3"/><rect x="30" y="12" width="16" height="3"/><path d="M16 14h4l-1 7h-4z"/>',
  smg: '<rect x="6" y="9" width="8" height="4"/><rect x="14" y="8" width="22" height="6"/><rect x="36" y="9" width="14" height="4"/><rect x="50" y="10" width="10" height="2"/><path d="M26 14h5l0 10h-5z"/><path d="M17 14h4l-1 7h-4z"/><rect x="24" y="6" width="8" height="2"/>',
  sniper: '<rect x="1" y="8" width="14" height="6"/><rect x="15" y="9" width="22" height="5"/><rect x="37" y="10" width="26" height="2"/><rect x="22" y="3" width="16" height="4"/><rect x="21" y="6" width="3" height="3"/><rect x="35" y="6" width="3" height="3"/><path d="M18 14h4l-1 7h-4z"/><path d="M46 12h1l-4 9h-1z"/>',
}
const DRONE = (bad: string) => `<g fill="#cfd3c4"><rect x="-14" y="-2" width="28" height="4" rx="2"/><rect x="-4" y="-4" width="8" height="8" rx="2"/><ellipse cx="-14" cy="-4" rx="8" ry="1.4"/><ellipse cx="14" cy="-4" rx="8" ry="1.4"/></g><circle cy="3" r="1.4" fill="${bad}"/>`

/** Feed text comes from the person's prompt: keep it to plain caps, so no markup or engine keyword reaches the SVG. */
export const plain = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9 .,:#/!?_+·-]/g, '').replace(/HREF|XLINK|JAVASCRIPT|IMPORT|SCRIPT/g, '').replace(/\s+/g, ' ').trim().slice(0, 40)

// Seeded randomness, so every redraw draws the same contours.
const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

const CONTOURS = (() => {
  const rnd = rng(5)
  let out = ''

  for (const [cx, cy] of [[260, 620], [1360, 560], [820, 980]] as const) {
    for (let r = 60; r <= 300; r += 48) {
      const pts: string[] = []

      for (let a = 0; a < 360; a += 30) {
        const rr = r * (0.85 + rnd() * 0.3)
        const th = (a * Math.PI) / 180
        pts.push(`${(cx + rr * Math.cos(th) * 1.4).toFixed(0)} ${(cy + rr * Math.sin(th)).toFixed(0)}`)
      }
      out += `<path d="M${pts.join('L')}Z"/>`
    }
  }

  return out
})()

// Radar, in the left column's units.
const RX = 150
const RY = 135
const RR = 100
const FRIENDS: [number, number][] = [[-30, -48], [42, 22], [-58, 36]]
const ENEMIES: [number, number][] = [[64, -52], [-72, -30], [18, 72], [78, 36]]

// Compass: 4 units a degree, drawn from 300 to 800 degrees and drifting 360 degrees every 120 s.
const DEG = 4
const LABEL: Record<number, string> = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }
const compass = (P: Pack) => {
  let out = ''

  for (let d = 300; d <= 800; d += 5) {
    const x = d * DEG
    const deg = d % 360
    const big = deg % 15 === 0

    out += `<rect x="${x - 0.75}" y="${big ? 0 : 4}" width="1.5" height="${big ? 12 : 6}"/>`
    if (deg % 45 === 0) {
      out += `<text x="${x}" y="30" text-anchor="middle" font-size="16" fill="${deg === 0 ? P.accent : P.text}">${LABEL[deg]}</text>`
    } else if (big) {
      out += `<text x="${x}" y="28" text-anchor="middle" font-size="11" fill="${P.dim}">${deg}</text>`
    }
  }
  for (const d of [400, 760]) {
    out += `<path d="M${d * DEG} -16l6 6-6 6-6-6z" fill="${P.accent}"/>`
  }

  return out
}

const brackets = (x: number, y: number, w: number, h: number, l = 14) =>
  `M${x} ${y + l}V${y}H${x + l}M${x + w - l} ${y}H${x + w}V${y + l}M${x + w} ${y + h - l}V${y + h}H${x + w - l}M${x + l} ${y + h}H${x}V${y + h - l}`

const hhmm = (t: number) => {
  const d = new Date(t)

  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const marker = (size: number, colour: string, width: number) =>
  `<path stroke="${colour}" stroke-width="${width}" stroke-linecap="square" d="M${-size} ${-size}l${size * 0.55} ${size * 0.55}M${size} ${-size}l${-size * 0.55} ${size * 0.55}M${-size} ${size}l${size * 0.55} ${-size * 0.55}M${size} ${size}l${-size * 0.55} ${-size * 0.55}"/>`

/** A labelled bar: label, fill from 0 to 1, value. */
const bar = (P: Pack, y: number, label: string, frac: number, value: string) =>
  `<text x="20" y="${y}" ${FONT} font-size="12" letter-spacing="1.5" fill="${P.dim}">${label}</text><rect x="104" y="${y - 7}" width="134" height="4" fill="${P.text}" fill-opacity=".12"/><rect x="104" y="${y - 7}" width="${(134 * Math.max(0, Math.min(1, frac))).toFixed(1)}" height="4" fill="${P.accent}"/><text x="282" y="${y}" text-anchor="end" ${FONT} font-size="13" fill="${P.text}">${value}</text>`

type Drawn = { css: string; radar: string; right: string; win: string }

// Each redraw restarts the drawing's animations, so every one gets a negative delay: an effect resumes at
// its own age. `radar` is drawn in the radar's units, `right` in the right column's, `win` in percent.
const effect = (P: Pack, fx: Fx, age: number): Drawn => {
  const { kind, n } = fx
  const at = `-${age.toFixed(2)}s`
  const none = { css: '', radar: '', right: '', win: '' }
  const rnd = rng(n * 97 + 13)
  // Hits land in the right gutter, away from the words.
  const gx = (84 + rnd() * 10).toFixed(1)
  const gy = (50 + rnd() * 25).toFixed(1)
  // Every effect rests at opacity 0, so reduced motion shows none of them.
  const pop = `@keyframes pp${n}{0%{opacity:0;transform:scale(1.6)}15%{opacity:1;transform:scale(1)}70%{opacity:1}100%{opacity:0}}`
  const fade = `@keyframes fd${n}{0%{opacity:0}20%{opacity:1}75%{opacity:1}100%{opacity:0}}`
  const ping = `@keyframes pg${n}{0%{transform:scale(.05);opacity:.9}100%{transform:scale(1);opacity:0}}`

  switch (kind) {
    case 'hit':
    case 'click': {
      const x = kind === 'click' ? fx.x.toFixed(1) : gx
      const y = kind === 'click' ? fx.y.toFixed(1) : gy

      return {
        ...none,
        css: pop + (kind === 'click' ? ping : ''),
        win: `<svg x="${x}%" y="${y}%" overflow="visible"><g class="fx" opacity="0" style="animation:pp${n} ${LENGTH[kind]}s ${at} ease-out forwards">${marker(12, P.text, 3)}</g></svg>`,
        radar: kind === 'click' ? `<circle class="fx" r="${RR}" fill="none" stroke="${P.good}" stroke-width="2" opacity="0" style="animation:pg${n} .8s ${at} ease-out forwards"/>` : '',
      }
    }
    case 'kill':
      return {
        ...none,
        css: `${pop}@keyframes up${n}{0%{opacity:0;transform:translateY(0)}20%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translateY(-30px)}}`,
        win: `<svg x="${gx}%" y="${gy}%" overflow="visible"><g class="fx" opacity="0" style="animation:pp${n} 1.4s ${at} ease-out forwards">${marker(18, P.bad, 4)}<circle r="3" fill="${P.bad}"/></g><text x="28" y="6" ${FONT} font-size="22" fill="${P.accent}" opacity="0" style="animation:up${n} 1.4s ${at} ease-out forwards">+100</text></svg>`,
      }
    case 'dmg':
      return {
        ...none,
        css: `@keyframes dg${n}{0%{opacity:0}25%{opacity:.55}100%{opacity:0}}`,
        win: `<rect width="100%" height="100%" fill="url(#hurt)" opacity="0" style="animation:dg${n} 1.4s ${at} ease-out forwards"/>`,
      }
    case 'drone':
      return {
        ...none,
        css: `@keyframes dr${n}{0%{transform:translate(-40px,130px);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translate(340px,120px);opacity:0}}`,
        right: `<g opacity="0" style="animation:dr${n} 4s ${at} ease-in-out forwards"><g transform="scale(1.3)">${DRONE(P.bad)}</g></g>`,
      }
    case 'uav':
      return {
        ...none,
        css: `${ping}@keyframes rv${n}{0%{opacity:0}10%{opacity:1}85%{opacity:1}100%{opacity:0}}`,
        radar: `<circle class="fx" r="${RR}" fill="none" stroke="${P.good}" stroke-width="2" opacity="0" style="animation:pg${n} 1.6s ${at} ease-out 2 forwards"/><g opacity="0" style="animation:rv${n} 5s ${at} linear forwards">${ENEMIES.map(([x, y]) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="${P.bad}" transform="rotate(45 ${x} ${y})"/>`).join('')}</g>`,
      }
    case 'airstrike':
      return {
        ...none,
        css: `@keyframes cm${n}{0%{transform:translate(98vw,-2vh);opacity:1}60%{transform:translate(10vw,60vh);opacity:1}62%{opacity:0}100%{opacity:0}}@keyframes bm${n}{0%,58%{opacity:0;transform:scale(.2)}70%{opacity:.8}100%{opacity:0;transform:scale(1)}}`,
        win: `<g opacity="0" style="animation:cm${n} 2.2s ${at} ease-in forwards"><g transform="rotate(148)"><path d="M0 0L-160 -3V3Z" fill="url(#trail)"/><rect x="-2" y="-3" width="18" height="6" rx="3" fill="${P.text}"/></g></g><svg x="10%" y="60%" overflow="visible"><circle class="fx" r="90" fill="url(#blast)" opacity="0" style="animation:bm${n} 2.2s ${at} ease-out forwards"/></svg>`,
      }
    case 'gunship':
      return {
        ...none,
        css: `@keyframes gs${n}{0%{opacity:0;transform:translate(0,0)}15%{opacity:.85}85%{opacity:.85}100%{opacity:0;transform:translate(-40px,60px)}}`,
        win: `<svg x="88%" y="62%" overflow="visible"><g opacity="0" style="animation:gs${n} 4s ${at} ease-in-out forwards" fill="none" stroke="#e8f0e0" stroke-width="2"><circle r="70" stroke-dasharray="10 8"/><path d="M-100 0H-30M30 0H100M0 -100V-30M0 30V100"/><path d="${brackets(-24, -24, 48, 48, 10)}"/></g></svg>`,
      }
    case 'armor':
      return {
        ...none,
        css: fade + ping,
        radar: `<circle class="fx" r="${RR}" fill="none" stroke="${P.accent}" stroke-width="5" opacity="0" style="animation:pg${n} 1.4s ${at} ease-out forwards"/>`,
        win: `<svg x="50%" y="16%" overflow="visible"><text text-anchor="middle" ${FONT} font-size="40" letter-spacing="10" fill="${P.accent}" opacity="0" style="animation:fd${n} 2.6s ${at} ease-out forwards">ARMOR DEPLOYED</text></svg>`,
      }
  }
}

/** The whole scene at the moment `now` (epoch milliseconds). Effects that have run their length are left out. */
export const scene = (fxs: readonly Fx[], v: View, now: number): string => {
  const P = packOf(v.pack)
  const live = fxs.filter(fx => now - fx.t0 < LENGTH[fx.kind] * 1000)
  const drawn = live.map(fx => effect(P, fx, Math.max(0, (now - fx.t0) / 1000)))
  const layer = (key: keyof Drawn) => drawn.map(d => d[key]).join('')
  const t = now / 1000
  const loop = (name: string, dur: number, ease = 'ease-in-out') => `animation:${name} ${dur}s -${(t % dur).toFixed(2)}s ${ease} infinite`
  const spin = (dur: number) =>
    `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${dur}s" begin="-${(t % dur).toFixed(2)}s" repeatCount="indefinite"/>`
  const shots = v.hits + v.errs
  const acc = shots ? Math.round((100 * v.hits) / shots) : null
  const line = 'stroke="#ffffff" stroke-opacity=".12"'

  // ---- left column
  const hostiles = v.working ? (v.spotter ? ENEMIES : ENEMIES.slice(0, 2)) : []
  const radar = `<g transform="translate(${RX} ${RY})">
<circle r="${RR + 8}" fill="${P.panel}" fill-opacity=".85" ${line}/>
<g clip-path="url(#rdr)">
<g fill="none" ${line}><circle r="${RR * 0.66}"/><circle r="${RR * 0.33}"/><path d="M-${RR} 0H${RR}M0 -${RR}V${RR}"/></g>
<g><path d="M0 0L0 -${RR}A${RR} ${RR} 0 0 0 -${(RR * 0.7).toFixed(0)} -${(RR * 0.7).toFixed(0)}Z" fill="${P.good}" fill-opacity=".18"/><rect x="-.8" y="-${RR}" width="1.6" height="${RR}" fill="${P.good}" fill-opacity=".6"/>${spin(6)}</g>
${FRIENDS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${P.good}"/>`).join('')}
${hostiles.length ? `<g class="en">${hostiles.map(([x, y]) => `<rect x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" fill="${P.bad}" transform="rotate(45 ${x} ${y})"/>`).join('')}</g>` : ''}
${layer('radar')}
</g>
<path d="M0 -9L7 8L0 4L-7 8Z" fill="${P.text}" opacity="${v.lowProfile ? 0.3 : 1}"/>
<text y="-${RR - 16}" text-anchor="middle" ${FONT} font-size="12" fill="${P.accent}">N</text>
</g>`
  const plates = [0, 1, 2, 3, 4].map(i => `<rect x="${20 + i * 30}" y="0" width="26" height="6" fill="${i < v.plates ? (v.working ? P.good : P.dim) : P.text}" fill-opacity="${i < v.plates ? 1 : 0.12}"/>`).join('')
  const card = `<g class="wide" transform="translate(0 262)">
<rect x="8" y="0" width="${W - 16}" height="214" fill="${P.panel}" fill-opacity=".85" ${line}/>
<path d="${brackets(8, 0, W - 16, 214, 10)}" fill="none" stroke="${P.accent}" stroke-width="2"/>
<text x="20" y="28" ${FONT} font-size="16" letter-spacing="2" fill="${P.dim}">[${plain(v.unit)}] <tspan fill="${P.accent}">${plain(v.call)}</tspan></text>
<text x="20" y="46" ${FONT} font-size="12" letter-spacing="1.5" fill="${P.dim}">RECON · ${plain(v.gun)} · L${v.level}</text>
<g transform="translate(206 16) scale(1.2)" fill="${v.camo ?? P.text}">${GUNS[v.gunIcon] ?? ''}</g>
<text x="20" y="72" ${FONT} font-size="14" letter-spacing="1.5" fill="${v.working ? P.good : P.dim}">${plain(v.working ? v.act : 'STANDING BY').slice(0, 30)}</text>
<g transform="translate(0 84)">${plates}</g>
${bar(P, 118, 'DAMAGE', v.hits / 60, String(v.hits))}
${bar(P, 142, 'ACCURACY', (acc ?? 0) / 100, acc === null ? '--' : `${acc}%`)}
${bar(P, 166, 'RECON', v.reads / 40, String(v.reads))}
${bar(P, 190, 'DRONES', v.drones / 10, String(v.drones))}
</g>`
  const age = v.pop ? (now - v.pop.t) / 1000 : Infinity
  const popColour = v.pop?.kind === 'dmg' ? P.bad : v.pop?.kind === 'info' ? P.warn : P.accent
  // The banner sits under the radar card; in a window too narrow for the columns, under the compass.
  const bannerAt = (x: number, y: number, w: number) => v.pop && age < BANNER
    ? `<g transform="translate(${x} ${y})" opacity="0" style="animation:bn ${BANNER}s -${age.toFixed(2)}s ease-out forwards">
<rect width="${w}" height="56" fill="${P.panel}" fill-opacity=".92" stroke="${popColour}" stroke-width="1.5"/>
<g transform="translate(26 28)">${marker(10, popColour, 3)}</g>
<text x="50" y="27" ${FONT} font-size="17" letter-spacing="1.5" fill="${popColour}">${plain(v.pop.text).slice(0, 22)}</text>
<text x="50" y="45" ${FONT} font-size="12" letter-spacing="1" fill="${P.dim}">${plain(v.pop.sub)}</text>
</g>`
    : ''

  // ---- right column
  const tiles = (['UAV', 'AIRSTRIKE', 'GUNSHIP', 'ARMOR'] as const)
    .map((name, i) => {
      const need = v.needs[i] ?? 9
      const ready = v.streak >= need
      const x = 10 + i * 71

      return `<g transform="translate(${x} 62)"><rect width="66" height="40" fill="${P.panel}" fill-opacity=".88" stroke="${ready ? P.accent : P.text}" stroke-opacity="${ready ? 1 : 0.15}" stroke-width="1.5"/><text x="33" y="19" text-anchor="middle" ${FONT} font-size="11" letter-spacing=".5" fill="${ready ? P.accent : P.dim}">${name}</text><rect x="8" y="28" width="50" height="3" fill="${P.text}" fill-opacity=".12"/><rect x="8" y="28" width="${(50 * Math.min(1, v.streak / need)).toFixed(1)}" height="3" fill="${ready ? P.accent : P.dim}"/></g>`
    })
    .join('')
  const killfeed = [...v.feed]
    .reverse()
    .map((l, i) => {
      const y = 138 + i * 22
      const colour = l.k === 'kill' ? P.bad : l.k === 'warn' ? P.warn : P.dim
      const mark = l.k === 'kill'
        ? `<g transform="translate(240 ${y - 13}) scale(.66)" fill="${v.camo ?? P.text}">${GUNS[v.gunIcon] ?? ''}</g>`
        : `<rect x="276" y="${y - 8}" width="6" height="6" fill="${colour}"/>`

      return `<g opacity="${(1 - i * 0.15).toFixed(2)}"><text x="234" y="${y}" text-anchor="end" ${FONT} font-size="13"><tspan fill="${P.dim}" font-size="10">${hhmm(l.t)}</tspan> <tspan fill="${colour}">${plain(l.text).slice(0, 20)}</tspan></text>${mark}</g>`
    })
    .join('')
  const challenges = v.challenges
    .map((ch, i) => {
      const y = 296 + i * 38
      const colour = ch.done ? P.good : P.text

      return `<text x="20" y="${y}" ${FONT} font-size="12" letter-spacing="1" fill="${colour}">${plain(ch.n)}</text><text x="282" y="${y}" text-anchor="end" ${FONT} font-size="12" fill="${ch.done ? P.good : P.dim}">${ch.done ? 'DONE' : `${ch.have}/${ch.need}`}</text>${Array.from({ length: ch.need }, (_, k) => `<rect x="${(20 + (k * 262) / ch.need).toFixed(1)}" y="${y + 8}" width="${(262 / ch.need - 3).toFixed(1)}" height="3" fill="${k < ch.have ? (ch.done ? P.good : P.accent) : P.text}" fill-opacity="${k < ch.have ? 1 : 0.12}"/>`).join('')}`
    })
    .join('')
  const right = `<text x="282" y="40" text-anchor="end" ${FONT} font-size="18" letter-spacing="2" fill="${P.text}">${plain(v.rank)} <tspan fill="${P.dim}" font-size="13">XP ${v.xp}/100 · ${v.kills} KILLS</tspan></text>
${tiles}
${killfeed || `<text x="282" y="138" text-anchor="end" ${FONT} font-size="12" letter-spacing="1.5" fill="${P.dim}">QUIET ON THE NET</text>`}
<g class="wide"><rect x="8" y="254" width="${W - 16}" height="128" fill="${P.panel}" fill-opacity=".85" ${line}/><path d="${brackets(8, 254, W - 16, 128, 10)}" fill="none" stroke="${P.accent}" stroke-width="2"/>${challenges}</g>
${layer('right')}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<style>
.fx{transform-box:fill-box;transform-origin:center}
.cmp{${loop('cmp', 120, 'linear')}}
.en{${loop('en', v.working ? 2.4 : 6)}}
@keyframes cmp{to{transform:translateX(-${360 * DEG}px)}}
@keyframes en{50%{opacity:.15}}
@keyframes bn{0%{opacity:0}6%{opacity:1}80%{opacity:1}100%{opacity:0}}
@media (max-width:1399px){.wide{display:none}}
@media (max-width:1259px){.side{display:none}}
.narrow{display:none}
@media (max-width:1259px){.narrow{display:inline}}
${layer('css')}
</style>
<defs>
<radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<radialGradient id="hurt" cx="50%" cy="50%" r="72%"><stop offset=".5" stop-color="${P.bad}" stop-opacity="0"/><stop offset="1" stop-color="${P.bad}" stop-opacity=".7"/></radialGradient>
<radialGradient id="blast"><stop offset="0" stop-color="#ffd08a"/><stop offset=".45" stop-color="${P.accent}" stop-opacity=".6"/><stop offset="1" stop-color="${P.bad}" stop-opacity="0"/></radialGradient>
<linearGradient id="trail" gradientUnits="userSpaceOnUse" x1="-160" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${P.text}" stop-opacity="0"/><stop offset="1" stop-color="${P.text}" stop-opacity=".8"/></linearGradient>
<pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0V80" fill="none" stroke="#ffffff" stroke-opacity=".035"/></pattern>
<clipPath id="cmpw"><rect x="560" y="0" width="480" height="70"/></clipPath>
<clipPath id="rdr"><circle r="${RR}"/></clipPath>
</defs>
<svg width="100%" height="100%" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<rect width="1600" height="900" fill="url(#grid)"/>
<g fill="none" stroke="${P.good}" stroke-opacity=".06" stroke-width="1.5">${CONTOURS}</g>
</svg>
<rect width="100%" height="100%" fill="url(#vig)"/>
<svg width="100%" height="100%" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin meet" overflow="visible">
<g transform="translate(0 22)">
<rect x="560" y="0" width="480" height="40" fill="${P.panel}" fill-opacity=".7"/>
<g clip-path="url(#cmpw)"><g transform="translate(${800 - 360 * DEG} 4)"><g class="cmp" fill="${P.text}" ${FONT}>${compass(P)}</g></g></g>
<path d="M800 42l-7 9h14z" fill="${P.accent}"/>
<path d="${brackets(556, -4, 488, 48, 10)}" fill="none" stroke="${P.accent}" stroke-opacity=".6" stroke-width="1.5"/>
</g>
<g class="narrow">${bannerAt(650, 82, 300)}</g>
</svg>
<g class="side">
<svg width="100%" height="100%" viewBox="0 0 ${W} 900" preserveAspectRatio="xMinYMin meet" overflow="visible">
${radar}
${card}
${bannerAt(8, 492, W - 16)}
</svg>
<svg width="100%" height="100%" viewBox="0 0 ${W} 900" preserveAspectRatio="xMaxYMin meet" overflow="visible">
${right}
</svg>
</g>
${layer('win')}
</svg>`
}
