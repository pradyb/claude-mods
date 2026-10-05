import type { EngineInterface, PluginOptions, Register, SessionMeasureInput } from 'claude-code'

type Kind = 'done' | 'blocked' | 'error' | 'usage'

const NTFY_TAG: Record<Kind, string> = { done: 'white_check_mark', blocked: 'warning', error: 'x', usage: 'bar_chart' }

// one clip per event; a usage warning sounds like `blocked` (it wants your attention too)
const SOUND: Record<Kind, string> = { done: 'sounds/done.wav', blocked: 'sounds/blocked.wav', error: 'sounds/error.wav', usage: 'sounds/blocked.wav' }

const WINDOW_LABEL: Record<string, string> = { five_hour: '5-hour limit', seven_day: '7-day limit', spend_limit: 'Spend limit' }

// The list settings (notifyOn, chimeOn) are comma-separated event names: "done, error" has "error".
export const inList = (spec: unknown, kind: string): boolean => String(spec).split(',').some(s => s.trim() === kind)

type WebhookFormat = 'slack' | 'discord' | 'json'

// `auto` picks the format from the URL's host: Slack and Discord webhooks are recognisable, anything else gets plain JSON.
export function webhookFormat(url: string, setting: unknown): WebhookFormat {
  if (setting === 'slack' || setting === 'discord' || setting === 'json') return setting
  const host = (/^https?:\/\/(?:[^/?#@]*@)?([^/?#:]+)/i.exec(url)?.[1] ?? '').toLowerCase()
  if (/(^|\.)slack(-gov)?\.com$/.test(host)) return 'slack'
  if (/(^|\.)discord(app)?\.com$/.test(host)) return 'discord'
  return 'json'
}

// The request body. Slack: `&`, `<` and `>` are escaped, so `<!channel>` or `<@U123>` in a folder name or message is plain text and pings no one.
// Discord: `allowed_mentions.parse` is empty, so `@everyone` and role mentions never ping. JSON: the fields as they are.
export function webhookBody(format: WebhookFormat, a: { kind: Kind; title: string; text: string; at: string }): string {
  if (format === 'slack') {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return JSON.stringify({ text: `*${esc(a.title)}*\n${esc(a.text)}` })
  }
  if (format === 'discord') return JSON.stringify({ content: `**${a.title}**\n${a.text}`.slice(0, 2000), allowed_mentions: { parse: [] } })
  return JSON.stringify({ event: a.kind, title: a.title, message: a.text, at: a.at })
}

// "80,95" -> [80, 95]; ignores anything that is not a percentage.
export function parseThresholds(spec: string): number[] {
  return [...new Set(spec.split(',').map(s => Number(s.trim())).filter(n => n > 0 && n <= 100))].sort((a, b) => a - b)
}

// One reading against the thresholds. `prev` is the highest threshold already announced for this metric.
// Alerts when a higher threshold is crossed; forgets lower ones, so crossing again after a drop alerts again.
export function thresholdAlert(thresholds: number[], percent: number, prev: number): { announced: number; alert?: number } {
  const hit = thresholds.filter(t => t <= percent).pop() ?? 0
  return hit > prev ? { announced: hit, alert: hit } : { announced: hit }
}

// 4_800_000 ms -> "1h 20m". Past or unparseable -> "".
export function formatReset(ms: number): string {
  if (!(ms > 0)) return ''
  const mins = Math.max(1, Math.round(ms / 60_000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}

// "22:00-07:00" against minutes since local midnight; wraps past midnight. Anything malformed = never quiet.
export function inQuietHours(spec: string, minutes: number): boolean {
  const m = /^(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(spec.trim())
  if (!m) return false
  const from = +m[1] * 60 + +m[2]
  const to = +m[3] * 60 + +m[4]
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to
}

// Rules, then sinks. `last` holds the time each `key` was last sent (dedupe); the key defaults to the kind.
// ponytail: in-memory dedupe, resets on reload; one alert at a time per sink, sinks run in parallel.
async function deliver($: EngineInterface, o: PluginOptions, last: Map<string, number>, kind: Kind, message: string, key: string = kind) {
  try {
    if (!inList(o.notifyOn, kind)) return
    const now = await $.clock.now()
    const d = new Date(now)
    if (inQuietHours(String(o.quietHours), d.getHours() * 60 + d.getMinutes())) return
    const prev = last.get(key)
    if (prev !== undefined && now - prev < Number(o.dedupeSeconds) * 1000) return
    last.set(key, now)

    const text = message.slice(0, 200)
    // which session is asking: the folder it runs in
    const folder = o.includeFolder ? (await $.session.cwd().catch(() => '')).split(/[\\/]/).filter(Boolean).pop() : undefined
    // two sessions in one folder: the first characters of the session id tell them apart
    const label = o.sessionLabel ? (await $.session.id().catch(() => '')).slice(0, 4) : ''
    const title = `Claude Code${folder ? `: ${folder}` : ''}${label ? ` #${label}` : ''}`
    const sinks: [string, Promise<unknown>][] = []

    // argv form: the text never enters the AppleScript source, so quotes can't break or inject.
    // ponytail: macOS only (osascript); elsewhere it fails and is logged at debug level.
    if (o.desktop) {
      sinks.push(['desktop', $.process.run(['osascript', '-e', 'on run argv', '-e', 'display notification (item 1 of argv) with title (item 2 of argv)', '-e', 'end run', text, title])])
    }
    // ponytail: macOS only (afplay), elsewhere the clip is skipped
    if (o.chime && inList(o.chimeOn, kind)) sinks.push(['chime', $.audio.play({ asset: SOUND[kind] })])
    if (o.ntfyTopic) {
      const server = String(o.ntfyServer).replace(/\/+$/, '')
      const headers: Record<string, string> = { Title: title.replace(/[^\x20-\x7E]/g, '?'), Tags: NTFY_TAG[kind], Priority: kind === 'done' ? 'default' : 'high' }
      if (o.ntfyToken) headers.Authorization = `Bearer ${o.ntfyToken}`
      sinks.push(['ntfy', $.http.fetch(`${server}/${encodeURIComponent(String(o.ntfyTopic))}`, { method: 'POST', headers, body: text })])
    }

    if (o.webhookUrl && o.webhookFormat !== 'off') {
      const url = String(o.webhookUrl)
      if (/^https?:\/\//i.test(url)) {
        const body = webhookBody(webhookFormat(url, o.webhookFormat), { kind, title, text, at: d.toISOString() })
        sinks.push(['webhook', $.http.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })])
      } else $.ui.log('notify-router: webhookUrl must start with http:// or https://', { to: 'debug' })
    }

    const results = await Promise.allSettled(sinks.map(([, p]) => p))
    results.forEach((r, i) => {
      // class and HTTP status only, never the URL (it carries the topic)
      const why = r.status === 'rejected' ? 'error' : (r.value as { ok?: boolean; status?: number })?.ok === false ? `HTTP ${(r.value as { status?: number }).status}` : ''
      if (why) $.ui.log(`notify-router: ${sinks[i][0]} failed (${why})`, { to: 'debug' })
    })
  } catch {
    // an alert must never break a turn
  }
}

// Context fill and each rate-limit window against the thresholds. `announced` is the highest threshold already alerted per metric.
async function checkUsage($: EngineInterface, o: PluginOptions, last: Map<string, number>, announced: Map<string, number>, e: SessionMeasureInput) {
  try {
    const thresholds = parseThresholds(String(o.usageThresholds))
    if (!thresholds.length || !e.changed.some(u => u === 'context' || u === 'rateLimits')) return
    const now = await $.clock.now()
    const readings: { metric: string; percent: number; label: string; resetsAt?: string }[] = e.rateLimits.map(r => ({
      metric: r.kind,
      percent: r.percentUsed,
      label: WINDOW_LABEL[r.kind] ?? r.kind,
      resetsAt: r.resetsAt,
    }))
    if (e.context.percent !== undefined) readings.push({ metric: 'context', percent: e.context.percent, label: 'Context window' })

    for (const r of readings) {
      const { announced: next, alert } = thresholdAlert(thresholds, r.percent, announced.get(r.metric) ?? 0)
      announced.set(r.metric, next)
      if (alert === undefined) continue
      const reset = r.resetsAt ? formatReset(Date.parse(r.resetsAt) - now) : ''
      const text = r.metric === 'context' ? `Context window ${Math.floor(r.percent)}% full` : `${r.label} at ${Math.floor(r.percent)}%${reset ? `, resets in ${reset}` : ''}`
      await deliver($, o, last, 'usage', text, `usage:${r.metric}:${alert}`)
    }
  } catch {
    // an alert must never break a turn
  }
}

export const register: Register = (on, options) => {
  const last = new Map<string, number>()
  const announced = new Map<string, number>()
  let pending: { cancel(): void } | undefined
  const cancel = () => {
    pending?.cancel()
    pending = undefined
  }

  on('turn.complete', ($, e, next) => {
    cancel() // the turn is over, so whatever it was blocked on was answered
    if (e.agentId === undefined && !e.isAborted) {
      const secs = Math.round(e.durationMs / 1000)
      if (e.reason === 'answer') {
        if (secs >= Number(options.doneAfterSeconds)) void deliver($, options, last, 'done', `Done in ${secs}s`)
      } else {
        void deliver($, options, last, 'error', `Turn ended (${e.reason}) after ${secs}s`)
      }
    }
    return next(e)
  })

  // Claude is waiting on you (permission prompt, question). Alert only if it stays that way.
  on('classic.Notification', ($, e, next) => {
    if (e.notification_type !== 'idle_prompt' && e.notification_type !== 'auth_success') {
      cancel()
      const fire = () => {
        pending = undefined
        void deliver($, options, last, 'blocked', e.message)
      }
      const ms = Number(options.blockedAfterSeconds) * 1000
      if (ms > 0) pending = $.clock.after(ms, fire)
      else fire()
    }
    return next(e)
  })

  // The engine pushes usage whenever the context fill or a rate-limit window moves.
  on('session.measure', ($, e, next) => {
    void checkUsage($, options, last, announced, e)
    return next(e)
  })

  // The user acted, so the pending "blocked" alert is moot.
  on('prompt.submit', (_$, e, next) => {
    cancel()
    return next(e)
  })
  on('tool.call', (_$, e, next) => {
    cancel()
    return next(e)
  })
}
