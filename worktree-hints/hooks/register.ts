import type { Register } from 'claude-code'

export const HINT = `# Worktree session
This session is isolated in a git worktree. Its guard refuses any Bash command it cannot verify stays inside the worktree, and each refusal costs a retry. So:
- Change files with Edit or Write, never with \`python3 - <<EOF\`, \`sed -i\`, \`awk\` or \`node -e\` scripts.
- One plain command per Bash call: no heredocs, no multi-line scripts, no \`for\`/\`while\` loops around git.
- Don't \`cd\` to a variable or computed path. Run from the worktree root, or use \`git -C <dir>\` / \`./gradlew -p <dir>\` / \`pnpm -C <dir>\`.
- Read files with Read and search with Grep, not \`cat\`/\`grep\` chains.`

// A worktree session's root is not its repository's main working tree: either under <repo>/.claude/worktrees/ or outside the repo.
export const isWorktree = (root: string, repoRoot: string | undefined) =>
  root.includes('/.claude/worktrees/') || (!!repoRoot && root !== repoRoot && !root.startsWith(repoRoot + '/'))

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    const [root, repo] = await Promise.all([$.session.root(), $.session.repo().catch(() => null)])
    if (!isWorktree(root, repo?.root)) return r
    return { sections: [...r.sections, { id: 'worktree-hints:rules', text: HINT, scope: 'session' as const }] }
  })
}
