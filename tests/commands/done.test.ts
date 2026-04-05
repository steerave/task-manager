// tests/commands/done.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { markDone } from '../../src/commands/done'
import { scanTasks } from '../../src/core/vaultScanner'
import { Config } from '../../src/core/types'

describe('markDone', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-done-test-'))
    config = {
      vaultPath: tmpDir,
      tags: {
        domains: ['work', 'personal', 'projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: ['health'],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
      },
    }
    await addTask('Finish report for work', config)
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tmpDir)
  })

  it('marks a task as done and sets completed date', async () => {
    const tasks = await scanTasks(config)
    const id = tasks[0].id
    await markDone(id, config)
    const updated = await scanTasks(config)
    const task = updated.find((t) => t.id === id)!
    expect(task.tags).toContain('status/done')
    expect(task.tags).not.toContain('status/todo')
    expect(task.completed).toBe('2026-03-29')
  })
})
