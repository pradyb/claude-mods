import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { stepFor, firstPrompt, fileName, handoverDir, projectSlug } from './register'

test('suggestion steps', () => {
  expect(stepFor(39, 40)).toBe(0)
  expect(stepFor(40, 40)).toBe(40)
  expect(stepFor(59, 40)).toBe(40)
  expect(stepFor(61, 40)).toBe(60)
  expect(stepFor(90, 0)).toBe(0)
})

test('note file is named after the session title, else its id', () => {
  expect(fileName('Fix: period filter (US-014-12)!', 'abcdef1234')).toBe('fix-period-filter-us-014-12.md')
  expect(fileName(undefined, 'abcdef1234')).toBe('session-abcdef12.md')
  expect(fileName('  !!  ', 'abcdef1234')).toBe('session-abcdef12.md')
})

test('notes go in the main repo\'s project folder', () => {
  expect(projectSlug('/Users/p/repo/.claude/worktrees/us-1')).toBe('-Users-p-repo--claude-worktrees-us-1')
  expect(handoverDir('/h/.claude/projects', '/Users/p/vault-mint')).toBe('/h/.claude/projects/-Users-p-vault-mint/handovers')
})

test('first prompt carries the note and its path', () => {
  const p = firstPrompt('/r/.claude/handover.md', '## Next\n- ship')
  expect(p).toContain('/r/.claude/handover.md')
  expect(p).toContain('## Next\n- ship')
})

// what the engine would answer beneath the plugin
const world = (on: On) => {
  on('session.root', () => ({ value: '/r/app/.claude/worktrees/us-1' }) as never)
  on('session.repo', () => ({ value: { root: '/r/app', remote: null, internal: false, name: null } }) as never)
  on('session.id', () => ({ value: 'abcdef1234' }) as never)
  on('env.get', () => ({ value: '/h' }) as never)
  // no settings hooks beneath: the classic events end here
  on('classic.SessionStart', () => ({}) as never)
  on('classic.UserPromptSubmit', () => ({}) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
}

test('/handover writes the note, clears, then continues from it', async ($, on) => {
  const clock = mock.clock(on)
  world(on)
  const calls: string[] = []
  let written = ''
  let submitted = ''
  let path = ''
  on('model.fork', () => ({ value: { isAnswered: true, text: 'NOTE', usage: {} } }) as never)
  on('fs.write', (_$, e) => {
    written = (e as { text: string }).text
    path = (e as { path: string }).path
    calls.push('write')
    return { value: undefined } as never
  })
  on('command.run', { command: 'clear' }, () => {
    calls.push('clear')
    return { text: '' }
  })
  on('prompt.submit', (_$, e) => {
    submitted = e.text
    calls.push('submit')
    return { text: e.text }
  })
  await $.classic.SessionStart({ source: 'resume', prompt: '', transcript_path: '/h/.claude/projects/-r-app--claude-worktrees-us-1/s.jsonl' })
  await $.classic.UserPromptSubmit({ prompt: 'go', session_title: 'Fix period filter' })
  await $.command.run({ command: 'handover' })
  await clock.settle()
  expect(path).toBe('/h/.claude/projects/-r-app/handovers/fix-period-filter.md')
  expect(written).toBe('NOTE\n')
  expect(calls).toEqual(['write', 'clear', 'submit'])
  expect(submitted).toContain('NOTE')
})

test('/handover save writes but does not clear', async ($, on) => {
  const clock = mock.clock(on)
  world(on)
  const calls: string[] = []
  on('model.fork', () => ({ value: { isAnswered: true, text: 'NOTE', usage: {} } }) as never)
  on('fs.write', () => (calls.push('write'), { value: undefined }) as never)
  on('command.run', { command: 'clear' }, () => (calls.push('clear'), { text: '' }))
  await $.command.run({ command: 'handover', args: 'save' })
  await clock.settle()
  expect(calls).toEqual(['write'])
})

test('/handover with nothing to fork clears nothing', async ($, on) => {
  world(on)
  const calls: string[] = []
  on('model.fork', () => ({ value: { isAnswered: false, reason: 'nothing-to-fork' } }) as never)
  on('fs.write', () => (calls.push('write'), { value: undefined }) as never)
  const r = await $.command.run({ command: 'handover' })
  expect(r.text).toContain('Nothing was cleared')
  expect(calls).toEqual([])
})
