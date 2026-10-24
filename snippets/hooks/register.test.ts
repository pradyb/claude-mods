import { test, expect } from 'claude-code/testing'
import { expand, run } from './register'

const s = { cr: 'Please review this carefully.', two: 'a\nb', nest: 'see ;cr' }

test('expand: on its own, at start or after whitespace', () => {
  expect(expand(';cr', s)).toBe('Please review this carefully.')
  expect(expand('hi ;cr, thanks', s)).toBe('hi Please review this carefully., thanks')
  expect(expand('x\n;two', s)).toBe('x\na\nb')
})

test('expand: leaves code, unknown names, inherited keys and nested ones alone', () => {
  expect(expand('a;cr foo; bar ;nope ;constructor', s)).toBe('a;cr foo; bar ;nope ;constructor')
  expect(expand(';nest', s)).toBe('see ;cr')
})

test('expand: $ in a snippet is literal', () => {
  expect(expand(';p', { p: 'cost $& $1' })).toBe('cost $& $1')
})

test('run: add, replace, remove, list, errors', () => {
  let r = run('add cr Hello\\nthere', {})
  expect(r).toEqual({ text: 'Added ;cr', snippets: { cr: 'Hello\nthere' } })
  r = run('add ;cr Hi', r.snippets!)
  expect(r).toEqual({ text: 'Replaced ;cr', snippets: { cr: 'Hi' } })
  expect(run('list', r.snippets!).text).toBe(';cr  →  Hi')
  expect(run('', {}).text).toContain('No snippets yet')
  expect(run('rm cr', r.snippets!)).toEqual({ text: 'Removed ;cr', snippets: {} })
  expect(run('rm cr', {}).text).toBe('No snippet ;cr')
  expect(run('add bad!name x', {}).snippets).toBeUndefined()
  expect(run('add onlyname', {}).snippets).toBeUndefined()
  expect(run('wat', {}).text).toContain('Usage')
})
