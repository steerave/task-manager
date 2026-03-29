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

  it('creates today.md, this-week.md, next-week.md in dated subfolder', async () => {
    await addTask('Work report for work due today', config)
    await runToday(config)
    const noteDir = path.join(tmpDir, 'DailyNotes', '2026-03-29')
    expect(await fs.pathExists(path.join(noteDir, 'today.md'))).toBe(true)
    expect(await fs.pathExists(path.join(noteDir, 'this-week.md'))).toBe(true)
    expect(await fs.pathExists(path.join(noteDir, 'next-week.md'))).toBe(true)
  })

  it('syncs checked checkboxes from existing today.md and marks tasks done', async () => {
    await addTask('Work report for work due today', config)
    const tasks = await scanTasks(config)
    const taskId = tasks[0].id

    // Simulate a pre-existing today.md with the task checked off
    const noteDir = path.join(tmpDir, 'DailyNotes', '2026-03-29')
    await fs.ensureDir(noteDir)
    await fs.writeFile(
      path.join(noteDir, 'today.md'),
      `- [x] Work report — Work · High <!-- task:${taskId} -->\n`
    )

    await runToday(config)

    const updatedTasks = await scanTasks(config)
    const task = updatedTasks.find((t) => t.id === taskId)!
    expect(task.tags).toContain('status/done')
  })
})
