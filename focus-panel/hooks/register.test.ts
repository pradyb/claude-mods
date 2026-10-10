import { test, expect } from 'claude-code/testing'
import { extract, build, rows, urgent, parseModel, clean } from './register'

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

test('extract: bullets take their kind from the heading above them; ticked boxes are skipped', () => {
  const r = extract(`Done with the refactor.

## What's next
- Wire the config flag
- Add docs
- [x] Add tests

### Failures
- \`parse.test.ts\` fails on the empty case

**Needs you:**
1. Pick a **port** for the dev server

All good otherwise.
- a plain bullet is ignored`)
  expect(r.next?.text).toBe('Wire the config flag')
  expect(r.todos.map(x => x.text)).toEqual(['Add docs'])
  expect(r.errors.map(x => x.text)).toEqual(['parse.test.ts fails on the empty case'])
  expect(r.needs.map(x => x.text)).toEqual(['Pick a port for the dev server'])
})

test('extract: lines that say their own kind; fenced code and plain prose give nothing', () => {
  const r = extract('❌ build broke on Java 21\nFailed: lint\n⚠️ cache is cold\n```\n- Failed: not real\n```')
  expect(r.errors.map(x => x.text)).toEqual(['build broke on Java 21', 'lint'])
  expect(r.heads.map(x => x.text)).toEqual(['cache is cold'])
  expect(extract('All done. Renamed the helper and updated the callers.')).toEqual({ needs: [], errors: [], todos: [], heads: [] })
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

test('urgent: the frame is red for an error, amber for a question, plain otherwise', () => {
  const f = { turnId: 't', needs: [{ text: 'a' }], errors: [{ text: 'e' }], next: { text: 'n' }, todos: [], heads: [] }
  expect(urgent(rows(f, 2, 99))).toBe('error')
  expect(urgent(rows({ ...f, errors: [] }, 2, 99))).toBe('warning')
  expect(urgent(rows({ ...f, errors: [], needs: [] }, 2, 99))).toBe('subtle')
})

test('parseModel and clean', () => {
  expect(parseModel('Sure: {"needs":["x"]} done')).toEqual({ needs: ['x'] })
  expect(parseModel('no json')).toBeUndefined()
  expect(parseModel('{broken')).toBeUndefined()
  expect(clean('- [ ] **Bold** `code`  text')).toBe('Bold code text')
  expect(clean('x'.repeat(200)).length).toBe(120)
})
