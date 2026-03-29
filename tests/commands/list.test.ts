// tests/commands/list.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { scanTasksByFilter } from '../../src/core/vaultScanner'
import { Config } from '../../src/core/types'

describe('listTasks (via vaultScanner)', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-list-test-'))
    config = {
      vaultPath: tmpDir,
      tags: {
        domains: ['work', 'personal', 'personal-projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: ['health', 'finance', 'errands', 'learning', 'admin', 'creative'],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
      },
    }
    await addTask('Work report for work by Friday', config)
    await addTask('Buy groceries this weekend personal', config)
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tmpDir)
  })

  it('returns all tasks without filter', async () => {
    const tasks = await scanTasksByFilter(config, {})
    expect(tasks).toHaveLength(2)
  })

  it('filters tasks by domain', async () => {
    const tasks = await scanTasksByFilter(config, { domain: 'work' })
    expect(tasks).toHaveLength(1)
    expect(tasks[0].tags).toContain('work')
  })
})
