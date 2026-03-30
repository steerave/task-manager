import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { runToday } from '../../src/commands/today'
import { scanTasks } from '../../src/core/vaultScanner'
import { Config } from '../../src/core/types'

describe('End-to-End: add → check off in Obsidian → /today marks done', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-e2e-test-'))
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

  it('full flow: user adds task, checks it off in Obsidian, /today marks it done', async () => {
    // 1. User adds a task
    await addTask('Prepare Q2 roadmap for work due today', config)

    // 2. Verify task was created
    let tasks = await scanTasks(config)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].tags).toContain('work')
    expect(tasks[0].tags).toContain('status/todo')

    const taskId = tasks[0].id

    // 3. First /today run — generates consolidated daily note
    await runToday(config)
    const noteFile = path.join(tmpDir, 'DailyNotes', '20260329 - Daily Task.md')
    const noteContent = await fs.readFile(noteFile, 'utf8')
    expect(noteContent).toContain('Prepare Q2 roadmap')
    expect(noteContent).toContain(`<!-- task:${taskId} -->`)

    // 4. Simulate user checking off the task in Obsidian
    const checkedContent = noteContent.replace(
      '- [ ] [[',
      '- [x] [['
    )
    await fs.writeFile(noteFile, checkedContent, 'utf8')

    // 5. Second /today run — should sync the checkbox and mark task done
    await runToday(config)

    tasks = await scanTasks(config)
    const updatedTask = tasks.find((t) => t.id === taskId)!
    expect(updatedTask.tags).toContain('status/done')
    expect(updatedTask.completed).toBe('2026-03-29')
  })
})
