import type { Register } from 'claude-code'

type Seen = { mtimeMs: number; reads: number }

// One full Read of a large file. Returns the refusal, or undefined to let it through. Counts only reads that go through.
// A changed file (new mtime) starts its count over.
export function check(seen: Map<string, Seen>, path: string, mtimeMs: number, max: number): string | undefined {
  const s = seen.get(path)
  const reads = s && s.mtimeMs === mtimeMs ? s.reads : 0
  if (reads >= max)
    return `read-budget: ${path} is unchanged and was already read in full ${reads}× this session. Use what you read, Grep for the part you need, or Read it with offset/limit. If you really need the whole file again, Read it with offset: 1.`
  seen.set(path, { mtimeMs, reads: reads + 1 })
}

export const register: Register = (on, options) => {
  // ponytail: per-session in-memory counts, reset on reload. Persist in $.state if reloads matter.
  const seen = new Map<string, Seen>()

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    // a ranged read is the cheap path we point to, so it always passes
    if (e.agentId !== undefined || e.offset !== undefined || e.limit !== undefined) return next(e)
    const st = await $.fs.stat(e.file_path).catch(() => undefined)
    if (!st || st.kind !== 'file' || st.size < Number(options.minKb) * 1024) return next(e)
    const deny = check(seen, e.file_path, st.mtimeMs, Number(options.maxFullReads))
    return deny ? { deny } : next(e)
  })

  // compaction drops what was read, so a re-read is legitimate again
  on('session.compact', ($, e, next) => {
    seen.clear()
    return next(e)
  })
  on('session.end', ($, e, next) => {
    seen.clear()
    return next(e)
  })
}
