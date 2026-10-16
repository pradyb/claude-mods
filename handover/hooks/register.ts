import type { EngineInterface, Register } from 'claude-code'

export const PROMPT = `Write a handover note so a fresh session with none of this conversation can continue the work without redoing or undoing anything. Markdown, at most 500 words, only these sections (skip one that would be empty):

## Goal
What we are doing and why, in two lines. Name the story/issue/PR ids.
## Where things are
Branch, worktree path, PR number and CI state, what is committed vs. only local.
## Done
What is finished and verified.
## Decisions
Choices made and their reason, especially ones the code alone does not show.
## Gotchas
What failed, what is flaky, what not to try again.
## Next
The exact next steps in order, the first one concrete enough to start on.
## Files
The files that matter, one line each.

Reply with the note only.`

const MAX_AGE_MS = 12 * 3600_000
const STEP = 20

// The highest suggestion step `percent` has reached: threshold, threshold+20, ... ; 0 below the threshold or when off.
export const stepFor = (percent: number, threshold: number) =>
  threshold > 0 && percent >= threshold ? threshold + Math.floor((percent - threshold) / STEP) * STEP : 0

export const firstPrompt = (path: string, note: string) =>
  `Continue from this handover of the previous session (saved at ${path}). Check "Where things are" against git before acting, then start on "Next".\n\n${note}`

// Claude Code's folder name for a project path: every character but a letter or digit becomes '-'.
export const projectSlug = (path: string) => path.replace(/[^a-zA-Z0-9]/g, '-')

// The session title as a file name; before Claude Code has titled the session, its id.
export function fileName(title: string | undefined, sessionId: string) {
  const t = (title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/^-+|-+$/g, '')
  return `${t || `session-${sessionId.slice(0, 8)}`}.md`
}

// <projects>/<main repo's folder>/handovers, <projects> being the folder above the transcript's own.
// A worktree session uses its repository's folder, so the next story's session finds the note.
export const handoverDir = (projects: string, repoRoot: string) => `${projects}/${projectSlug(repoRoot)}/handovers`

async function dirFor($: EngineInterface, transcript: string | undefined) {
  const root = (await $.session.repo().catch(() => null))?.root ?? (await $.session.root())
  const projects = transcript ? transcript.replace(/\/[^/]+\/[^/]+$/, '') : `${await $.env.get('HOME')}/.claude/projects`
  return handoverDir(projects, root)
}

// a fresh session in a project with a recent note: offer to pick up the newest
async function offerRecent($: EngineInterface, transcript: string | undefined) {
  try {
    const dir = await dirFor($, transcript)
    const now = await $.clock.now()
    let best: { path: string; mtimeMs: number } | undefined
    for (const f of await $.fs.list(dir)) {
      if (f.kind !== 'file' || !f.name.endsWith('.md')) continue
      const st = await $.fs.stat(`${dir}/${f.name}`)
      if (now - st.mtimeMs < MAX_AGE_MS && st.mtimeMs > (best?.mtimeMs ?? 0)) best = { path: `${dir}/${f.name}`, mtimeMs: st.mtimeMs }
    }
    if (best) await $.prompt.suggest({ text: `Continue from the handover in ${best.path}` })
  } catch {
    // no folder yet, or no prompt box: nothing to offer
  }
}

export const register: Register = (on, options) => {
  let announced = 0 // highest step already suggested this session
  let due = false
  let title: string | undefined // from Claude Code's own hook events, the only place the title reaches a mod
  let transcript: string | undefined

  const reset = () => {
    announced = 0
    due = false
  }

  on('session.start', async ($, e, next) => {
    const r = await next(e)
    reset()
    await $.command.register({ name: 'handover', description: 'Write a handover note, clear, and continue in a fresh session', argumentHint: '[save] [focus for the next session]' })
    return r
  })

  on('classic.SessionStart', async ($, e, next) => {
    transcript = e.transcript_path
    title = e.session_title
    if (e.source === 'startup') void offerRecent($, transcript)
    return next(e)
  })
  on('classic.UserPromptSubmit', ($, e, next) => {
    transcript = e.transcript_path
    if (e.session_title) title = e.session_title
    return next(e)
  })

  on('session.measure', ($, e, next) => {
    const step = stepFor(e.context.percent ?? 0, Number(options.threshold))
    if (step > announced) {
      announced = step
      due = true
    }
    return next(e)
  })

  // suggestions only show while the session is idle, so wait for the main turn to end
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (due && e.agentId === undefined && !e.isAborted) {
      due = false
      $.ui.toast(`Context ${announced}%+ — /handover continues this work in a fresh session`)
      void $.prompt.suggest({ text: '/handover' }).catch(() => {})
    }
    return r
  })

  on('session.compact', ($, e, next) => {
    if (e.agentId === undefined) reset()
    return next(e)
  })
  on('session.end', ($, e, next) => {
    reset()
    return next(e)
  })

  on('command.run', { command: 'handover' }, async ($, e) => {
    const args = (e.args ?? '').trim()
    const saveOnly = /^save\b/.test(args)
    const focus = args.replace(/^save\b\s*/, '')
    $.ui.toast('handover: writing the note…')
    const r = await $.model.fork({ prompt: focus ? `${PROMPT}\n\nThe next session should focus on: ${focus}` : PROMPT })
    if (!r.isAnswered) return { text: `handover: no note written (${r.reason}). Nothing was cleared.` }

    const path = `${await dirFor($, transcript)}/${fileName(title, await $.session.id())}`
    await $.fs.write(path, `${r.text.trim()}\n`)
    if (saveOnly) return { text: `handover: note saved to ${path}` }

    // command.run can't be called from inside this hook, so clear and continue once it has returned
    $.clock.after(0, async () => {
      try {
        await $.command.run({ command: 'clear' })
        await $.prompt.submit({ text: firstPrompt(path, r.text.trim()), asUser: true })
      } catch {
        $.ui.toast(`handover: couldn't clear. The note is in ${path}; run /clear and paste it.`)
      }
    })
    return { text: `handover: note saved to ${path}. Clearing and continuing from it…` }
  })
}
