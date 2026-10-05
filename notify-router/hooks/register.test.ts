import { test, expect, mock } from 'claude-code/testing'
import { inQuietHours } from './register'

const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m).getTime() // local time
const done = (secs: number, over: object = {}) => ({ answer: 'ok', durationMs: secs * 1000, isAborted: false, turnId: 't', reason: 'answer', ...over }) as never
const settle = () => new Promise(r => setTimeout(r, 0))
const OFF = { desktop: false, chime: false, ntfyTopic: '' }

// Stands in for the engine: records osascript runs and ntfy posts.
function engine(on: any, now = at(12), withClock = true, cwd = '/Users/x/my-proj') {
  const seen = { chimes: 0, desktop: [] as string[][], ntfy: [] as { url: string; init: any }[] }
  if (withClock) on('clock.now', () => ({ value: now }))
  on('process.run', (_$: any, e: any) => { seen.desktop.push([...e.argv]); return { value: { exitCode: 0, stdout: '', stderr: '' } } })
  on('http.fetch', (_$: any, e: any) => { seen.ntfy.push({ url: e.url, init: e.init }); return { value: { status: 200, ok: true, headers: {}, text: '' } } })
  on('audio.play', () => { seen.chimes++ })
  on('session.cwd', () => ({ value: cwd }))
  on('turn.complete', (_$: any, e: any) => ({ text: e.answer }))
  on('classic.Notification', () => ({}))
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
