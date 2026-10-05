import { test, expect } from 'claude-code/testing'
import { scrub } from './register'

// Fake credentials are built at run time so this file never holds a complete token-shaped literal
// (GitHub push protection and other scanners would flag it).
const fake = {
  aws: 'AKIA' + 'IOSFODNN7EXAMPLE',
  github: 'ghp_' + 'a1B2'.repeat(9),
  githubPat: 'github_pat_' + 'x'.repeat(60),
  anthropic: 'sk-ant-' + 'api03-' + 'q'.repeat(40),
  openai: 'sk-' + 'proj-' + 'Z9'.repeat(20),
  slack: 'xoxb-' + '1234567890-' + 'abcdefghij',
  stripe: 'sk_live_' + 'k'.repeat(24),
  google: 'AIza' + 'S'.repeat(35),
  npm: 'npm_' + 'n'.repeat(36),
  privateKey: '-----BEGIN ' + 'RSA PRIVATE KEY-----\nMIIBOgIBAAJBAK\nline2\n-----END ' + 'RSA PRIVATE KEY-----',
}

test('masks each known format and names the kind', () => {
  const cases: [string, string][] = [
    [fake.aws, 'AWS access key'],
    [fake.github, 'GitHub token'],
    [fake.githubPat, 'GitHub token'],
    [fake.anthropic, 'Anthropic API key'],
    [fake.openai, 'OpenAI API key'],
    [fake.slack, 'Slack token'],
    [fake.stripe, 'Stripe live key'],
    [fake.google, 'Google API key'],
    [fake.npm, 'npm token'],
    [fake.privateKey, 'private key'],
  ]
  for (const [secret, kind] of cases) {
    const r = scrub(`before ${secret} after`)
    expect(r.kinds, kind).toEqual([kind])
    expect(r.text, kind).toBe(`before [REDACTED: ${kind}] after`)
  }
})

test('an Anthropic key is reported as Anthropic, not as an OpenAI-style key', () => {
  expect(scrub(fake.anthropic).kinds).toEqual(['Anthropic API key'])
})

test('masks a whole private key block, and an unterminated one to the end', () => {
  expect(scrub(`x\n${fake.privateKey}\ny`).text).toBe('x\n[REDACTED: private key]\ny')
  expect(scrub('a\n-----BEGIN ' + 'PRIVATE KEY-----\nMIIE...').text).toBe('a\n[REDACTED: private key]')
})

test('several secrets, each kind listed once', () => {
  const r = scrub(`${fake.github} and ${fake.aws} and ${fake.github}`)
  expect(r.kinds).toEqual(['AWS access key', 'GitHub token'])
  expect(r.text).not.toContain('ghp_')
})

test('leaves ordinary text alone', () => {
  for (const t of [
    'please fix the failing test in sk-learn style pipelines',
    'the task-based risk-assessment-framework-for-everything-in-our-org-docs is long',
    'AKIA is a prefix, and ghp_ too, but these are short',
    'export const key = process.env.OPENAI_API_KEY',
    'see -----BEGIN CERTIFICATE----- blocks (public, not a private key)',
    '',
  ]) {
    const r = scrub(t)
    expect(r.kinds, t).toEqual([])
    expect(r.text, t).toBe(t)
  }
})

test('the result never contains the secret', () => {
  const r = scrub(`token ${fake.github}`)
  expect(JSON.stringify(r)).not.toContain(fake.github)
})

// bottom of the stack: what the engine would do with the prompt that gets through
const bottom = (on: any) => on('prompt.submit', (_$: any, e: any) => ({ text: e.text }))

test('mask mode (default): the model gets the masked prompt', async ($, on) => {
  bottom(on)
  const r = await $.prompt.submit({ text: `use ${fake.github} please` } as never)
  expect(r.drop).toBeUndefined()
  expect(r.text).toBe('use [REDACTED: GitHub token] please')
})

test('block mode: the prompt is refused with a reason that omits the secret', { options: { mode: 'block' } }, async ($, on) => {
  bottom(on)
  const r = await $.prompt.submit({ text: `use ${fake.github} please` } as never)
  expect(r.drop).toContain('GitHub token')
  expect(r.drop).not.toContain('ghp_')
})

test('a clean prompt passes through untouched', async ($, on) => {
  bottom(on)
  const r = await $.prompt.submit({ text: 'refactor the parser' } as never)
  expect(r.text).toBe('refactor the parser')
})

test('a prompt that did not come from the user is left alone', async ($, on) => {
  bottom(on)
  const r = await $.prompt.submit({ text: `use ${fake.github}`, origin: { kind: 'task-notification' } } as never)
  expect(r.text).toContain('ghp_')
})
