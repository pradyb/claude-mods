import { test, expect } from 'claude-code/testing'
import { check } from './register'

test('third full read of an unchanged file is refused', () => {
  const seen = new Map()
  expect(check(seen, '/a.md', 1, 2)).toBeUndefined()
  expect(check(seen, '/a.md', 1, 2)).toBeUndefined()
  expect(check(seen, '/a.md', 1, 2)).toContain('offset')
  expect(check(seen, '/a.md', 1, 2)).toBeDefined()
})

test('a changed file and other files start over', () => {
  const seen = new Map()
  check(seen, '/a.md', 1, 2)
  check(seen, '/a.md', 1, 2)
  expect(check(seen, '/a.md', 2, 2)).toBeUndefined()
  expect(check(seen, '/b.md', 1, 2)).toBeUndefined()
})
