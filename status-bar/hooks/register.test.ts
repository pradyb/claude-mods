import { test, expect } from 'claude-code/testing'
import { segments, duration, bar, resetIn, parseStatus, gitFlags } from './register'

const clock = new Date(Date.parse('2026-01-01T00:00:00Z')).toTimeString().slice(0, 5)
const base = { cwd: '/Users/x/my-proj', elapsedMs: 3_900_000, turns: 3, rateLimits: [], now: Date.parse('2026-01-01T00:00:00Z') }

test('duration', () => {
  expect(duration(5 * 60000)).toBe('5m')
  expect(duration(65 * 60000)).toBe('1h05m')
  expect(duration(-5)).toBe('0m')
})

test('segments: every figure but the model, colours by level', () => {
  const s = segments({
    ...base, git: { branch: 'main', staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0 }, contextPercent: 92, costUsd: 1.5,
    rateLimits: [{ kind: 'five_hour', percentUsed: 40.4, resetsAt: '2026-01-01T02:13:00Z' }],
  })
  expect(s.map(x => x.text)).toEqual(['my-proj', 'main', '40% · 2h13m', '92%', '1.50', '1h05m', '3', clock])
  expect(s.find(x => x.label === 'ctx')?.color).toBe('error')
  expect(s.find(x => x.label === '5h')?.color).toBe('success')
})

test('segments: missing figures are left out', () => {
  const s = segments({ ...base, turns: 0 })
  expect(s.map(x => x.text)).toEqual(['my-proj', '1h05m', clock])
})

test('rate limits carry a bar in their level colour', () => {
  expect(bar(40.4)).toEqual(['██', '░░'])
  expect(bar(0)).toEqual(['', '░░░░'])
  expect(bar(130)).toEqual(['████', ''])
  const s = segments({ ...base, rateLimits: [{ kind: 'seven_day', percentUsed: 65 }] })
  expect(s.find(x => x.label === '7d')).toMatchObject({ bar: ['███', '░'], color: 'warning', text: '65%' })
})

test('resetIn: hours and minutes under a day, whole days after', () => {
  expect(resetIn(3 * 3600e3 + 31 * 60e3)).toBe('3h31m')
  expect(resetIn(50 * 3600e3 + 31 * 60e3)).toBe('2d')
  expect(resetIn(24 * 3600e3)).toBe('1d')
})

test('git status: branch, counts, ahead/behind, odd headers', () => {
  const g = parseStatus('## main...origin/main [ahead 2, behind 1]\nM  a.ts\n M b.ts\nMM c.ts\n?? d.ts\n')
  expect(g).toEqual({ branch: 'main', staged: 2, modified: 2, untracked: 1, ahead: 2, behind: 1 })
  expect(parseStatus('## feature/x\n')).toMatchObject({ branch: 'feature/x', ahead: 0 })
  expect(parseStatus('## HEAD (no branch)\n')?.branch).toBe('detached')
  expect(parseStatus('## No commits yet on main\n')?.branch).toBe('main')
  expect(parseStatus('fatal: not a git repository')).toBeUndefined()
  expect(gitFlags(g!).map(f => f.text)).toEqual(['+2', '~2', '?1', '↑2', '↓1'])
  expect(gitFlags(parseStatus('## main\n')!)).toEqual([{ text: '✓', color: 'success' }])
})

test('ctx shows tokens; cache counts down from the last turn and goes cold', () => {
  const at = (minAgo: number) => segments({ ...base, contextPercent: 17, contextTokens: 172_400, lastTurnAt: base.now - minAgo * 60000 })
  expect(at(5).find(x => x.label === 'ctx')?.text).toBe('17% · 172k')
  expect(at(5).find(x => x.label === 'cache')).toMatchObject({ text: '55m', color: 'success' })
  expect(at(40).find(x => x.label === 'cache')).toMatchObject({ text: '20m', color: 'warning' })
  expect(at(50).find(x => x.label === 'cache')).toMatchObject({ text: '10m', color: 'error' })
  expect(at(61).find(x => x.label === 'cache')).toMatchObject({ text: 'cold', color: 'error' })
  expect(segments(base).some(x => x.label === 'cache')).toBe(false)
  const short = (minAgo: number) => segments({ ...base, lastTurnAt: base.now - minAgo * 60000, cacheTtlMs: 5 * 60000 }).find(x => x.label === 'cache')
  expect(short(2)).toMatchObject({ text: '3m', color: 'success' })
  expect(short(3)).toMatchObject({ text: '2m', color: 'warning' })
  expect(short(10)).toMatchObject({ text: 'cold', color: 'error' })
})
