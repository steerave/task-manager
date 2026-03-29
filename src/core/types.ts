export interface Task {
  id: string
  name: string
  due: string | null        // ISO date string YYYY-MM-DD, or null
  tags: string[]
  created: string           // ISO date string YYYY-MM-DD
  completed: string | null  // ISO date string YYYY-MM-DD, or null
}

export interface ParsedInput {
  name: string
  due: string | null
  tags: string[]
  needsInbox: boolean       // true when domain or due date could not be inferred
}

export interface Config {
  vaultPath: string
  tags: {
    domains: string[]
    priorities: string[]
    categories: string[]
    statuses: string[]
  }
}

export type TaskFilter = {
  domain?: string
  due?: 'today' | 'this-week' | 'next-week' | 'overdue'
  priority?: 'high' | 'medium' | 'low'
  status?: string
}
