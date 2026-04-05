// tests/commands/add.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { Config } from '../../src/core/types'
import { scanTasks } from '../../src/core/vaultScanner'

describe('addTask', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-add-test-'))
    config = {
      vaultPath: tmpDir,
      tags: {
        domains: ['work', 'personal', 'projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: ['health', 'finance', 'errands', 'learning', 'admin', 'creative'],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
      },
    }
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tmpDir)
  })

  it('creates a task file in the Tasks directory', async () => {
    await addTask('Call dentist next Tuesday for personal', config)
    const tasks = await scanTasks(config)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].name).toContain('Call dentist')
  })

  it('assigns status/inbox when domain is ambiguous', async () => {
    await addTask('Deal with the Alex thing', config)
    const tasks = await scanTasks(config)
    expect(tasks[0].tags).toContain('status/inbox')
  })

  it('assigns work domain when "for work" is in input', async () => {
    await addTask('Finish report for work by Friday', config)
    const tasks = await scanTasks(config)
    expect(tasks[0].tags).toContain('work')
  })
})
