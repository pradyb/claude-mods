import { test, expect } from 'claude-code/testing'
import { summary, took } from './register'

test('took: seconds under a minute, minutes and seconds after', () => {
  expect(took(42_400)).toBe('42s')
  expect(took(64_000)).toBe('1m 04s')
})

test('summary: done turn, zero counts left out', () => {
  expect(summary({ startedAt: 0, ms: 42_000, tools: 11, agents: 2, background: 1 }, 0)).toBe('✓ ⏱ 42s · 11 tools · 2 agents (1 background)')
  expect(summary({ startedAt: 0, ms: 3_000, tools: 1, agents: 0, background: 0 }, 0)).toBe('✓ ⏱ 3s · 1 tool')
  expect(summary({ startedAt: 0, ms: 3_000, tools: 0, agents: 0, background: 0 }, 0)).toBe('✓ ⏱ 3s')
})

test('summary: running turn shows time so far', () => {
  expect(summary({ startedAt: 1000, tools: 2, agents: 0, background: 0 }, 6000)).toBe('… ⏱ 5s · 2 tools')
})
