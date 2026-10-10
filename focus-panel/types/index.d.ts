export type Item = { text: string; id?: string }
export type Focus = {
  turnId: string
  needs: Item[]
  errors: Item[]
  next?: Item
  todos: Item[]
  heads: Item[]
}
export type Task = { subject: string; status: string; isBlocked: boolean }

declare module 'claude-code' {
  interface PluginState {
    'focus-panel': { focus: Focus | null; tasks: Record<string, Task> }
  }
}
