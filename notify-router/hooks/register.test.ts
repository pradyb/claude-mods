import { test, expect, mock } from 'claude-code/testing'
import { formatReset, inList, webhookBody, webhookFormat, inQuietHours, parseThresholds, thresholdAlert } from './register'

const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m).getTime() // local time
const done = (secs: number, over: object = {}) => ({ answer: 'ok', durationMs: secs * 1000, isAborted: false, turnId: 't', reason: 'answer', ...over }) as never
const settle = () => new Promise(r => setTimeout(r, 0))
const OFF = { desktop: false, chime: false, ntfyTopic: '' }

// Stands in for the engine: records osascript runs and ntfy posts.
function engine(on: any, now = at(12), withClock = true, cwd = '/Users/x/my-proj') {
  const seen = { chimes: 0, sounds: [] as string[], desktop: [] as string[][], ntfy: [] as { url: string; init: any }[] }
  if (withClock) on('clock.now', () => ({ value: now }))
  on('process.run', (_$: any, e: any) => { seen.desktop.push([...e.argv]); return { value: { exitCode: 0, stdout: '', stderr: '' } } })
  on('http.fetch', (_$: any, e: any) => { seen.ntfy.push({ url: e.url, init: e.init }); return { value: { status: 200, ok: true, headers: {}, text: '' } } })
  on('audio.play', (_$: any, e: any) => { seen.chimes++; seen.sounds.push(e.clip?.asset ?? e.asset) })
  on('session.cwd', () => ({ value: cwd }))
  on('turn.complete', (_$: any, e: any) => ({ text: e.answer }))
  on('classic.Notification', () => ({}))
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  return seen
}

test('quiet hours, including past midnight', () => {
  expect(inQuietHours('22:00-07:00', 23 * 60)).toBe(true)
  expect(inQuietHours('22:00-07:00', 3 * 60)).toBe(true)
  expect(inQuietHours('22:00-07:00', 12 * 60)).toBe(false)
  expect(inQuietHours('09:00-17:00', 12 * 60)).toBe(true)
  expect(inQuietHours('09:00-17:00', 17 * 60)).toBe(false)
  expect(inQuietHours('', 12 * 60)).toBe(false)
  expect(inQuietHours('nonsense', 12 * 60)).toBe(false)
})

test('desktop: long turn alerts, short turn and abort do not', async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(5))
  await settle()
  await $.turn.complete(done(30, { isAborted: true, reason: 'aborted' }))
  await settle()
  expect(seen.desktop.length).toBe(0)
  await $.turn.complete(done(30))
  await settle()
  expect(seen.desktop.length).toBe(1)
  expect(seen.desktop[0]).toContain('Done in 30s')
})

test('osascript gets the text as argv, never inside the script', async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(30, { reason: 'error' }))
  await settle()
  await $.classic.Notification({ message: 'x" & do shell script "evil', notification_type: 'permission_prompt' } as never)
  await settle()
  expect(seen.desktop.length).toBeGreaterThan(0)
  for (const argv of seen.desktop) expect(argv.slice(0, 6).join(' ')).not.toContain('evil')
})

test('ntfy: posts to the topic with title, tag, priority and bearer token', { options: { ...OFF, ntfyTopic: 'my topic', ntfyServer: 'https://ntfy.example/', ntfyToken: 'tk_1' } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(30, { reason: 'error' }))
  await settle()
  expect(seen.desktop.length).toBe(0)
  expect(seen.ntfy.length).toBe(1)
  expect(seen.ntfy[0].url).toBe('https://ntfy.example/my%20topic')
  const h = seen.ntfy[0].init.headers
  expect(h.Authorization).toBe('Bearer tk_1')
  expect(h.Tags).toBe('x')
  expect(h.Priority).toBe('high')
})

test('notifyOn filters event types', { options: { notifyOn: 'blocked' } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(30))
  await settle()
  expect(seen.desktop.length).toBe(0)
})

test('quiet hours drop alerts, and dedupe drops repeats', { options: { quietHours: '22:00-07:00', dedupeSeconds: 60 } }, async ($, on) => {
  const quiet = engine(on, at(23, 30))
  await $.turn.complete(done(30))
  await settle()
  expect(quiet.desktop.length).toBe(0)
})

test('dedupe: same kind within the window sends once', async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(30))
  await settle()
  await $.turn.complete(done(30))
  await settle()
  expect(seen.desktop.length).toBe(1)
})

test('blocked with no delay alerts at once; idle_prompt never does', { options: { blockedAfterSeconds: 0 } }, async ($, on) => {
  const seen = engine(on)
  await $.classic.Notification({ message: 'Claude is waiting for your input', notification_type: 'idle_prompt' } as never)
  await settle()
  expect(seen.desktop.length).toBe(0)
  await $.classic.Notification({ message: 'Claude needs your permission to use Bash', notification_type: 'permission_prompt' } as never)
  await settle()
  expect(seen.desktop.length).toBe(1)
})

test('blocked: alerts only after the wait, if still blocked', { options: { blockedAfterSeconds: 60 } }, async ($, on) => {
  const clock = mock.clock(on, { now: at(12) })
  const seen = engine(on, 0, false)
  await $.classic.Notification({ message: 'Claude needs your permission to use Bash', notification_type: 'permission_prompt' } as never)
  await settle()
  await clock.advance(59_000)
  expect(seen.desktop.length).toBe(0)
  await clock.advance(2_000)
  expect(seen.desktop.length).toBe(1)
  expect(seen.desktop[0]).toContain('Claude needs your permission to use Bash')
})

test('blocked: cancelled when the user acts before the wait ends', { options: { blockedAfterSeconds: 60 } }, async ($, on) => {
  const clock = mock.clock(on, { now: at(12) })
  const seen = engine(on, 0, false)
  on('tool.call', () => ({ result: 'ok' }) as never)
  await $.classic.Notification({ message: 'Claude needs your permission to use Bash', notification_type: 'permission_prompt' } as never)
  await settle()
  await clock.advance(30_000)
  await $.tool.call({ tool: 'Read', file_path: '/p/README.md' })
  await clock.advance(120_000)
  expect(seen.desktop.length).toBe(0)
})

test('desktop title names the session folder', async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(30))
  await settle()
  expect(seen.desktop[0].at(-1)).toBe('Claude Code: my-proj')
})

test('ntfy title names the folder, ASCII only', { options: { desktop: false, ntfyTopic: 't' } }, async ($, on) => {
  const seen = engine(on, at(12), true, 'C:\\work\\café-app')
  await $.turn.complete(done(30))
  await settle()
  expect(seen.ntfy[0].init.headers.Title).toBe('Claude Code: caf?-app')
})

test('includeFolder off keeps the title plain', { options: { includeFolder: false } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(30))
  await settle()
  expect(seen.desktop[0].at(-1)).toBe('Claude Code')
})

test('chime plays with an alert, not for short turns, quiet hours or when off', async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(5))
  await settle()
  expect(seen.chimes).toBe(0)
  await $.turn.complete(done(30))
  await settle()
  expect(seen.chimes).toBe(1)
})

test('chime is silenced by quiet hours', { options: { quietHours: '22:00-07:00' } }, async ($, on) => {
  const seen = engine(on, at(23, 30))
  await $.turn.complete(done(30))
  await settle()
  expect(seen.chimes).toBe(0)
})

test('chime off', { options: { chime: false } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(30))
  await settle()
  expect(seen.chimes).toBe(0)
  expect(seen.desktop.length).toBe(1)
})

// ---- usage alerts
const ctx = (percent: number) => ({ context: { window: 200_000, percent }, rateLimits: [], changed: ['context'] }) as never
const limit = (kind: string, percentUsed: number, resetsAt?: string) =>
  ({ context: { window: 200_000 }, rateLimits: [{ kind, percentUsed, resetsAt }], changed: ['rateLimits'] }) as never

test('parseThresholds keeps valid percentages, sorted and unique', () => {
  expect(parseThresholds('95, 80,80,abc,0,150,-5')).toEqual([80, 95])
  expect(parseThresholds('')).toEqual([])
})

test('thresholdAlert: alerts on a new higher threshold, once, and re-arms after a drop', () => {
  const t = [80, 95]
  expect(thresholdAlert(t, 50, 0)).toEqual({ announced: 0 })
  expect(thresholdAlert(t, 81, 0)).toEqual({ announced: 80, alert: 80 })
  expect(thresholdAlert(t, 85, 80)).toEqual({ announced: 80 })
  expect(thresholdAlert(t, 96, 80)).toEqual({ announced: 95, alert: 95 })
  expect(thresholdAlert(t, 85, 95)).toEqual({ announced: 80 }) // compaction: back to the 80 band
  expect(thresholdAlert(t, 96, 80)).toEqual({ announced: 95, alert: 95 }) // ...and 95 alerts again
  expect(thresholdAlert(t, 10, 95)).toEqual({ announced: 0 })
})

test('formatReset', () => {
  expect(formatReset(80 * 60_000)).toBe('1h 20m')
  expect(formatReset(45 * 60_000)).toBe('45m')
  expect(formatReset(30_000)).toBe('1m')
  expect(formatReset((2 * 1440 + 3 * 60) * 60_000)).toBe('2d 3h')
  expect(formatReset(-5)).toBe('')
  expect(formatReset(NaN)).toBe('')
})

test('usage: context alerts at each threshold once', async ($, on) => {
  const seen = engine(on)
  await $.session.measure(ctx(50)); await settle()
  expect(seen.desktop.length).toBe(0)
  await $.session.measure(ctx(81)); await settle()
  expect(seen.desktop.length).toBe(1)
  expect(seen.desktop[0]).toContain('Context window 81% full')
  await $.session.measure(ctx(85)); await settle()
  expect(seen.desktop.length).toBe(1)
  await $.session.measure(ctx(96)); await settle()
  expect(seen.desktop.length).toBe(2)
  expect(seen.desktop[1]).toContain('Context window 96% full')
})

test('usage: a rate-limit window names itself and when it resets', async ($, on) => {
  const seen = engine(on)
  await $.session.measure(limit('five_hour', 82.5, new Date(at(12) + 80 * 60_000).toISOString())); await settle()
  expect(seen.desktop.length).toBe(1)
  expect(seen.desktop[0]).toContain('5-hour limit at 82%, resets in 1h 20m')
})

test('usage: metrics are tracked separately', async ($, on) => {
  const seen = engine(on)
  await $.session.measure(limit('five_hour', 85)); await settle()
  await $.session.measure(limit('seven_day', 85)); await settle()
  expect(seen.desktop.length).toBe(2)
  expect(seen.desktop[1]).toContain('7-day limit at 85%')
})

test('usage: off with empty thresholds, or when usage is not in notifyOn', { options: { usageThresholds: '' } }, async ($, on) => {
  const seen = engine(on)
  await $.session.measure(ctx(99)); await settle()
  expect(seen.desktop.length).toBe(0)
})

test('usage: not alerted when notifyOn leaves it out', { options: { notifyOn: 'done,blocked,error' } }, async ($, on) => {
  const seen = engine(on)
  await $.session.measure(ctx(99)); await settle()
  expect(seen.desktop.length).toBe(0)
})

test('usage: quiet hours drop it, and the chime stays silent', { options: { quietHours: '22:00-07:00' } }, async ($, on) => {
  const seen = engine(on, at(23, 30))
  await $.session.measure(ctx(99)); await settle()
  expect(seen.desktop.length).toBe(0)
  expect(seen.chimes).toBe(0)
})

// ---- 0.3.0: per-event sounds, session label
test('inList: comma-separated names, spaces ignored, whole words only', () => {
  expect(inList('done, error', 'error')).toBe(true)
  expect(inList('done,error', 'err')).toBe(false)
  expect(inList('', 'done')).toBe(false)
})

test('each event plays its own sound', async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(30))
  await settle()
  await $.turn.complete(done(30, { reason: 'error' }))
  await settle()
  expect(seen.sounds).toEqual(['sounds/done.wav', 'sounds/error.wav'])
})

test('blocked plays the blocked sound', { options: { blockedAfterSeconds: 0 } }, async ($, on) => {
  const seen = engine(on)
  await $.classic.Notification({ notification_type: 'permission_prompt', message: 'Allow Bash?' } as never)
  await settle()
  expect(seen.sounds).toEqual(['sounds/blocked.wav'])
})

test('chimeOn silences the chime for the events left out, the notification still goes', { options: { chimeOn: 'error' } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(30))
  await settle()
  expect(seen.chimes).toBe(0)
  expect(seen.desktop.length).toBe(1)
  await $.turn.complete(done(30, { reason: 'error' }))
  await settle()
  expect(seen.sounds).toEqual(['sounds/error.wav'])
})

test('sessionLabel adds the first four characters of the session id to the title', { options: { sessionLabel: true } }, async ($, on) => {
  const seen = engine(on)
  on('session.id', () => ({ value: 'a1b2c3d4-0000-4000-8000-000000000000' }))
  await $.turn.complete(done(30))
  await settle()
  expect(seen.desktop[0].at(-1)).toBe('Claude Code: my-proj #a1b2')
})

test('sessionLabel without the folder', { options: { sessionLabel: true, includeFolder: false } }, async ($, on) => {
  const seen = engine(on)
  on('session.id', () => ({ value: 'a1b2c3d4-0000-4000-8000-000000000000' }))
  await $.turn.complete(done(30))
  await settle()
  expect(seen.desktop[0].at(-1)).toBe('Claude Code #a1b2')
})

test('no sessionLabel by default', async ($, on) => {
  const seen = engine(on)
  on('session.id', () => ({ value: 'a1b2c3d4-0000-4000-8000-000000000000' }))
  await $.turn.complete(done(30))
  await settle()
  expect(seen.desktop[0].at(-1)).toBe('Claude Code: my-proj')
})

// ---- 0.4.0: webhook sink
const SLACK = 'https://hooks.slack.com/services/T000/B000/xxxx'
const DISCORD = 'https://discord.com/api/webhooks/123/abc'
const A = { kind: 'done' as const, title: 'Claude Code: my-proj', text: 'Done in 42s', at: '2026-01-01T12:00:00.000Z' }

test('webhookFormat: auto-detects Slack and Discord from the host, anything else is JSON, a setting wins', () => {
  expect(webhookFormat(SLACK, 'auto')).toBe('slack')
  expect(webhookFormat('https://hooks.slack-gov.com/services/x', 'auto')).toBe('slack')
  expect(webhookFormat(DISCORD, 'auto')).toBe('discord')
  expect(webhookFormat('https://discordapp.com/api/webhooks/1/a', 'auto')).toBe('discord')
  expect(webhookFormat('https://example.com/hook', 'auto')).toBe('json')
  expect(webhookFormat('https://hooks.slack.com.evil.example/x', 'auto')).toBe('json')
  expect(webhookFormat('https://example.com/hooks.slack.com', 'auto')).toBe('json')
  expect(webhookFormat('https://hooks.slack.com@example.com/x', 'auto')).toBe('json')
  expect(webhookFormat('https://example.com/hook', 'slack')).toBe('slack')
  expect(webhookFormat(SLACK, 'json')).toBe('json')
})

test('webhookBody slack: text is escaped so no mention or link can form', () => {
  expect(JSON.parse(webhookBody('slack', A))).toEqual({ text: '*Claude Code: my-proj*\nDone in 42s' })
  const b = JSON.parse(webhookBody('slack', { ...A, title: 'Claude Code: <!channel>', text: 'ping <@U123> & <https://x.example|click>' }))
  expect(b.text).toBe('*Claude Code: &lt;!channel&gt;*\nping &lt;@U123&gt; &amp; &lt;https://x.example|click&gt;')
  expect(b.text).not.toContain('<')
})

test('webhookBody discord: mentions are disabled', () => {
  const b = JSON.parse(webhookBody('discord', { ...A, text: '@everyone <@&123> hi' }))
  expect(b.allowed_mentions).toEqual({ parse: [] })
  expect(b.content).toBe('**Claude Code: my-proj**\n@everyone <@&123> hi')
  expect(JSON.parse(webhookBody('discord', { ...A, text: 'x'.repeat(5000) })).content.length).toBe(2000)
})

test('webhookBody json: event, title, message and time', () => {
  expect(JSON.parse(webhookBody('json', A))).toEqual({ event: 'done', title: 'Claude Code: my-proj', message: 'Done in 42s', at: '2026-01-01T12:00:00.000Z' })
})

test('webhook: an alert is posted to the URL as JSON, in the format the host calls for', { options: { webhookUrl: SLACK } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(42))
  await settle()
  expect(seen.ntfy.length).toBe(1)
  expect(seen.ntfy[0].url).toBe(SLACK)
  expect(seen.ntfy[0].init.method).toBe('POST')
  expect(seen.ntfy[0].init.headers['Content-Type']).toBe('application/json')
  expect(JSON.parse(seen.ntfy[0].init.body)).toEqual({ text: '*Claude Code: my-proj*\nDone in 42s' })
})

test('webhook: the event filter, quiet hours and dedupe apply to it', { options: { webhookUrl: DISCORD, notifyOn: 'error', ...OFF, quietHours: '' } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(42))
  await settle()
  expect(seen.ntfy.length).toBe(0)
})

test('webhook: a URL that is not http(s) is never fetched', { options: { webhookUrl: 'file:///etc/passwd' } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(42))
  await settle()
  expect(seen.ntfy.length).toBe(0)
  expect(seen.desktop.length).toBe(1)
})

test('webhook: off when no URL is set', async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(done(42))
  await settle()
  expect(seen.ntfy.length).toBe(0)
})
