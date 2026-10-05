import type { EngineInterface, PluginOptions, Register } from 'claude-code'

type Kind = 'done' | 'blocked' | 'error'

const NTFY_TAG: Record<Kind, string> = { done: 'white_check_mark', blocked: 'warning', error: 'x' }

// "22:00-07:00" against minutes since local midnight; wraps past midnight. Anything malformed = never quiet.
export function inQuietHours(spec: string, minutes: number): boolean {
  const m = /^(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(spec.trim())
  if (!m) return false
  const from = +m[1] * 60 + +m[2]
  const to = +m[3] * 60 + +m[4]
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to
}

// Rules, then sinks. `last` holds the time each kind was last sent (dedupe).
// ponytail: in-memory dedupe, resets on reload; one alert at a time per sink, sinks run in parallel.
async function deliver($: EngineInterface, o: PluginOptions, last: Map<Kind, number>, kind: Kind, message: string) {
  try {
    if (!String(o.notifyOn).split(',').map(s => s.trim()).includes(kind)) return
    const now = await $.clock.now()
    const d = new Date(now)
    if (inQuietHours(String(o.quietHours), d.getHours() * 60 + d.getMinutes())) return
    const prev = last.get(kind)
    if (prev !== undefined && now - prev < Number(o.dedupeSeconds) * 1000) return
    last.set(kind, now)

    const text = message.slice(0, 200)
    // which session is asking: the folder it runs in
    const folder = o.includeFolder ? (await $.session.cwd().catch(() => '')).split(/[\\/]/).filter(Boolean).pop() : undefined
    const title = folder ? `Claude Code: ${folder}` : 'Claude Code'
    const sinks: [string, Promise<unknown>][] = []

    // argv form: the text never enters the AppleScript source, so quotes can't break or inject.
    // ponytail: macOS only (osascript); elsewhere it fails and is logged at debug level.
    if (o.desktop) {
      sinks.push(['desktop', $.process.run(['osascript', '-e', 'on run argv', '-e', 'display notification (item 1 of argv) with title (item 2 of argv)', '-e', 'end run', text, title])])
    }
    // ponytail: one sound for every event; macOS only (afplay), elsewhere the clip is skipped
    if (o.chime) sinks.push(['chime', $.audio.play({ asset: 'sounds/done.wav' })])
    if (o.ntfyTopic) {
      const server = String(o.ntfyServer).replace(/\/+$/, '')
      const headers: Record<string, string> = { Title: title.replace(/[^\x20-\x7E]/g, '?'), Tags: NTFY_TAG[kind], Priority: kind === 'done' ? 'default' : 'high' }
      if (o.ntfyToken) headers.Authorization = `Bearer ${o.ntfyToken}`
      sinks.push(['ntfy', $.http.fetch(`${server}/${encodeURIComponent(String(o.ntfyTopic))}`, { method: 'POST', headers, body: text })])
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

export const register: Register = (on, options) => {
  const last = new Map<Kind, number>()
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
