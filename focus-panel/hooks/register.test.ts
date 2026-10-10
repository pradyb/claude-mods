import { test, expect } from 'claude-code/testing'
import { extract, build, rows, parseModel, clean } from './register'

const ANSWER = `Done. I changed the loader.

\`\`\`
// TODO: this is code, ignore
Note: also code
\`\`\`

- [ ] Add a test for the empty case
- [x] Fix the loader
Warning: this changes the cache key, old caches are dropped.
**Next step:** run the full suite
Should I also bump the version?`

test('extract: rules find each kind, skip code fences', () => {
  const r = extract(ANSWER)
  expect(r.next?.text).toBe('run the full suite')
  expect(r.heads.map(x => x.text)).toEqual(['this changes the cache key, old caches are dropped.'])
  expect(r.todos.map(x => x.text)).toEqual(['Add a test for the empty case'])
  expect(r.needs.map(x => x.text)).toEqual(['Should I also bump the version?'])
})

test('extract: heading-style next takes the first list item under it', () => {
  expect(extract('Next steps:\n\n- ship it\n- celebrate').next?.text).toBe('ship it')
})

test('build: task list gives the next id and the open to-dos; errors and refusals show', () => {
  const tasks = {
    '1': { subject: 'Done thing', status: 'completed', isBlocked: false },
    '2': { subject: 'Blocked thing', status: 'pending', isBlocked: true },
    '3': { subject: 'Wire the panel', status: 'pending', isBlocked: false },
    '4': { subject: 'Write the README', status: 'pending', isBlocked: false },
  }
  const f = build({ turnId: 't', answer: 'ok', reason: 'refusal', errors: [{ text: 'Bash: exit 1' }], tasks })
  expect(f.next).toEqual({ id: '#3', text: 'Wire the panel' })
  expect(f.todos.map(x => x.id)).toEqual(['#2', '#4'])
  expect(f.errors.map(x => x.text)).toEqual(['The model declined to answer', 'Bash: exit 1'])
})

test('build: explicit next in the text beats the task list; model items merge without duplicates', () => {
  const f = build({
    turnId: 't', answer: 'Next: deploy', reason: 'answer', errors: [],
    tasks: { '3': { subject: 'Wire the panel', status: 'pending', isBlocked: false } },
    model: { needs: ['Which region should I deploy to?', 'which region should i deploy to?'], next: 'ignored' },
  })
  expect(f.next).toEqual({ text: 'deploy' })
  expect(f.needs).toHaveLength(1)
})

test('rows: capped per section, then trimmed from the bottom to fit', () => {
  const f = { turnId: 't', needs: [{ text: 'a' }, { text: 'b' }, { text: 'c' }], errors: [{ text: 'e' }], next: { text: 'n' }, todos: [{ text: 't' }], heads: [{ text: 'h' }] }
  const all = rows(f, 2, 99)
  expect(all.map(r => r.section)).toEqual(['needs', 'needs', 'errors', 'next', 'todos', 'heads'])
  expect(all[1].more).toBe(1)
  expect(rows(f, 2, 4).map(r => r.section)).toEqual(['needs', 'needs', 'errors', 'next'])
  expect(rows(f, 2, 1).map(r => r.section)).toEqual(['needs'])
})

test('parseModel and clean', () => {
  expect(parseModel('Sure: {"needs":["x"]} done')).toEqual({ needs: ['x'] })
  expect(parseModel('no json')).toBeUndefined()
  expect(parseModel('{broken')).toBeUndefined()
  expect(clean('- [ ] **Bold** `code`  text')).toBe('Bold code text')
  expect(clean('x'.repeat(200)).length).toBe(120)
})
