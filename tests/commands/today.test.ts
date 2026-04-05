import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { runToday } from '../../src/commands/today'
import { scanTasks } from '../../src/core/vaultScanner'
import { Config } from '../../src/core/types'

describe('runToday', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-today-test-'))
    config = {
      vaultPath: tmpDir,
      tags: {
        domains: ['work', 'personal', 'personal-projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: ['health', 'errands'],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
      },
    }
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tmpDir)
  })

  it('creates a single consolidated daily note in DailyNotes/', async () => {
    await addTask('Work report for work due today', config)
    await runToday(config)
    const noteFile = path.join(tmpDir, 'DailyNotes', '20260329 - Daily Task.md')
    expect(await fs.pathExists(noteFile)).toBe(true)
    const content = await fs.readFile(noteFile, 'utf8')
    expect(content).toContain('## Today')
    expect(content).toContain('### All Open Tasks')
    expect(content).toContain('#### Work')
  })

  it('syncs checked checkboxes from existing daily note and marks tasks done', async () => {
    await addTask('Work report for work due today', config)
    const tasks = await scanTasks(config)
    const taskId = tasks[0].id

    // Simulate a pre-existing daily note with the task checked off
    const noteDir = path.join(tmpDir, 'DailyNotes')
    await fs.ensureDir(noteDir)
    await fs.writeFile(
      path.join(noteDir, '20260329 - Daily Task.md'),
      `- [x] Work report — Work · High <!-- task:${taskId} -->\n`
    )

    await runToday(config)

    const updatedTasks = await scanTasks(config)
    const task = updatedTasks.find((t) => t.id === taskId)!
    expect(task.tags).toContain('status/done')
  })
})
