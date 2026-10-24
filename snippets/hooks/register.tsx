import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Draft } from '../types'

export type Snippets = Record<string, string>

const NAME = /^[A-Za-z0-9_-]+$/

// `;name` standing alone: at the start or after whitespace, and followed by whitespace, punctuation or the end.
// So `a;b`, `foo; bar` and `;` in code are left alone, and an unknown `;name` stays as typed. One pass: a snippet's own `;other` is not expanded again.
export function expand(text: string, snippets: Snippets): string {
  return text.replace(/(^|\s);([A-Za-z0-9_-]+)(?=$|[\s.,!?:;)\]}])/g, (all, lead: string, name: string) =>
    Object.hasOwn(snippets, name) ? lead + snippets[name] : all,
  )
}

// What /snip was asked: `add <name> <text>` (adds or replaces; `\n` in the text is a line break), `rm <name>`, `list` (the default), `path`.
export function run(args: string, snippets: Snippets): { text: string; snippets?: Snippets } {
  const [, v = '', rest = ''] = /^\s*(\S*)\s*([\s\S]*)$/.exec(args) ?? []
  const verb = v || 'list'
  const [, raw = '', body = ''] = /^;?(\S*)\s*([\s\S]*)$/.exec(rest) ?? []
  switch (verb) {
    case 'add': {
      if (!NAME.test(raw) || !body) return { text: 'Usage: /snip add <name> <text>   (letters, digits, - and _ in the name; \\n for a new line)' }
      const had = Object.hasOwn(snippets, raw)
      return { text: `${had ? 'Replaced' : 'Added'} ;${raw}`, snippets: { ...snippets, [raw]: body.replace(/\\n/g, '\n') } }
    }
    case 'rm': {
      if (!Object.hasOwn(snippets, raw)) return { text: `No snippet ;${raw}` }
      const { [raw]: _gone, ...left } = snippets
      return { text: `Removed ;${raw}`, snippets: left }
    }
    case 'list': {
      const names = Object.keys(snippets).sort()
      return { text: names.length ? names.map(n => `;${n}  →  ${(snippets[n] ?? '').replace(/\n/g, '⏎')}`).join('\n') : 'No snippets yet. /snip add <name> <text>' }
    }
    default:
      return { text: 'Usage: /snip [list] | add <name> <text> | rm <name> | path' }
  }
}

const isUsersOwn = (origin?: { kind: string }) => origin === undefined || origin.kind === 'composer' || origin.kind === 'bridge'

async function file($: EngineInterface) {
  return `${await $.env.get('HOME')}/.claude/snippets.json`
}

// A missing or broken file is an empty set: it must never stop a prompt. Only well-formed string entries count.
async function load($: EngineInterface): Promise<Snippets> {
  try {
    const data: unknown = JSON.parse(await $.fs.read(await file($)))
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {}
    return Object.fromEntries(Object.entries(data).filter(([k, v]) => NAME.test(k) && typeof v === 'string')) as Snippets
  } catch {
    return {}
  }
}

const PANE = 'snippets'
const EMPTY: Draft = { name: '', text: '' }
// The form being filled in, a one-line message under it, and a counter that redraws the list after the file changes.
const draft = atom({ plugin: 'snippets', key: 'draft' } as const, EMPTY)
const note = atom({ plugin: 'snippets', key: 'note' } as const, '')
const rev = atom({ plugin: 'snippets', key: 'rev' } as const, 0)

async function store($: EngineInterface, snippets: Snippets) {
  await $.fs.write(await file($), JSON.stringify(snippets, null, 2) + '\n')
  await update($, rev, n => n + 1)
}

async function save($: EngineInterface) {
  const { name, text } = await read($, draft)
  const key = name.trim().replace(/^;/, '')
  if (!NAME.test(key) || !text.trim()) return update($, note, () => 'A name (letters, digits, - and _) and some text are needed.')
  const had = Object.hasOwn(await load($), key)
  await store($, { ...(await load($)), [key]: text })
  await update($, draft, () => EMPTY)
  await update($, note, () => `${had ? 'Replaced' : 'Saved'} ;${key}`)
}

async function remove($: EngineInterface, name: string) {
  const { [name]: _gone, ...left } = await load($)
  await store($, left)
  await update($, note, () => `Deleted ;${name}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'snip', description: 'Text snippets: /snip opens the editor; add <name> <text> | rm <name> | list | path. Type ;name in a prompt to expand it.' })
    return next(e)
  })

  on('command.run', { command: 'snip' }, async ($, e) => {
    if (/^\s*(ui)?\s*$/.test(e.args)) {
      await $.ui.open({ id: PANE, title: 'Snippets', focus: true })
      return { text: 'Snippets editor opened.' }
    }
    if (/^\s*path\s*$/.test(e.args)) return { text: `${await file($)}  (edit it by hand if you like: {"name": "text"})` }
    const r = run(e.args, await load($))
    if (r.snippets) await store($, r.snippets)
    return { text: r.text }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (e.surface === 'mobile') return next(e) // no Input there: the pane is not drawn, /snip add|rm|list still work
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    await read($, rev) // subscribe: a change to the file redraws the list
    const [snippets, form, message] = [await load($), await read($, draft), await read($, note)]
    const entries = Object.entries(snippets).sort(([a], [b]) => a.localeCompare(b))
    const nameWidth = entries.reduce((m, [n]) => Math.max(m, n.length), 0) + 2 // `;` and a space
    const LABEL = 6 // the form's label column: its fields and buttons start after it

    return (
      <Box flexDirection="column" rowGap={1}>
        <Box flexDirection="column">
          {entries.length === 0 && <Text dimColor>No snippets yet. Add one below, then type ;name in a prompt.</Text>}
          {entries.map(([n, text]) => (
            <Box key={`row-${n}`} flexDirection="row" columnGap={1} alignItems="center">
              <Box width={nameWidth} flexShrink={0}>
                <Text bold>{`;${n}`}</Text>
              </Box>
              <Box flexGrow={1} flexShrink={1} overflow="hidden">
                <Text dimColor wrap="truncate-end">{text.replace(/\n/g, '⏎')}</Text>
              </Box>
              <Box flexShrink={0} columnGap={1}>
                <Button key={`edit-${n}`} label="Edit" onPress={() => update($, draft, () => ({ name: n, text }))} />
                <Button key={`del-${n}`} label="Delete" onPress={() => remove($, n)} />
              </Box>
            </Box>
          ))}
        </Box>
        <Box flexDirection="column" rowGap={1}>
          <Box flexDirection="row" columnGap={1} alignItems="center">
            <Box width={LABEL} flexShrink={0}>
              <Text dimColor>Name</Text>
            </Box>
            <Box flexGrow={1}>
              <Input key="name" placeholder=";cr" value={form.name} submitLabel="next" onInput={v => update($, draft, d => ({ ...d, name: v }))} onSubmit={() => $.ui.focus({ requestId: PANE, key: 'text' })} />
            </Box>
          </Box>
          <Box flexDirection="row" columnGap={1}>
            <Box width={LABEL} flexShrink={0}>
              <Text dimColor>Text</Text>
            </Box>
            <Box flexGrow={1}>
              <Input key="text" placeholder="what ;name expands to" rows={3} value={form.text} submitLabel="save" onInput={v => update($, draft, d => ({ ...d, text: v }))} onSubmit={() => save($)} />
            </Box>
          </Box>
          <Box flexDirection="row" columnGap={1} alignItems="center" paddingLeft={LABEL + 1}>
            <Button key="save" label="Save" variant="primary" onPress={() => save($)} />
            <Button key="clear" label="Clear" onPress={() => update($, draft, () => EMPTY)} />
            <Text dimColor>{message}</Text>
          </Box>
        </Box>
      </Box>
    )
  })

  // Expand on Enter. A slash-command line takes no rewrite (the engine says so), so it is passed as is.
  on('prompt.submit', async ($, e, next) => {
    if (e.command || !isUsersOwn(e.origin) || !e.text.includes(';')) return next(e)
    const snippets = await load($)
    return next({ ...e, text: expand(e.text, snippets) })
  }).catch(($, e, next) => next(e)) // never block a prompt
}
