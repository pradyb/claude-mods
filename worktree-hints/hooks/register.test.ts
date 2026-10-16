import { test, expect } from 'claude-code/testing'
import { isWorktree } from './register'

test('worktree detection', () => {
  expect(isWorktree('/r/app/.claude/worktrees/us-1', '/r/app')).toBe(true)
  expect(isWorktree('/r/app-wt-2', '/r/app')).toBe(true)
  expect(isWorktree('/r/app', '/r/app')).toBe(false)
  expect(isWorktree('/r/app/backend', '/r/app')).toBe(false)
  expect(isWorktree('/tmp/x', undefined)).toBe(false)
})
