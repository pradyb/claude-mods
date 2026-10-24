export type Draft = { name: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    snippets: { draft: Draft; note: string; rev: number }
  }
}
