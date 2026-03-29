import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { writeTask } from '../../src/core/taskFile'
import { scanTasks, scanTasksByFilter, getTasksDir } from '../../src/core/vaultScanner'
import { Task, Config, TaskFilter } from '../../src/core/types'

describe('vaultScanner', () => {
  let tmpDir: string
  let tasksDir: string

  const mockConfig: Config = {
    vaultPath: '',
    tags: {
      domains: ['work', 'personal'],
      priorities: ['priority/high', 'priority/medium', 'priority/low'],
      categories: ['health'],
      statuses: ['status/todo', 'status/done', 'status/inbox'],
    },
  }

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-scan-test-'))
    tasksDir = path.join(tmpDir, 'Tasks')
    mockConfig.vaultPath = tmpDir

    const tasks: Task[] = [
      { id: 'task-2026-03-29-001', name: 'Work task', due: '2026-03-29', tags: ['work', 'status/todo', 'priority/high'], created: '2026-03-29', completed: null },
      { id: 'task-2026-03-29-002', name: 'Personal task', due: '2026-03-30', tags: ['personal', 'status/todo', 'priority/low'], created: '2026-03-29', completed: null },
      { id: 'task-2026-03-29-003', name: 'Done task', due: '2026-03-28', tags: ['work', 'status/done', 'priority/medium'], created: '2026-03-28', completed: '2026-03-28' },
    ]
    for (const task of tasks) {
      await writeTask(tasksDir, task)
    }
  })

  afterEach(async () => {
    await fs.remove(tmpDir)
  })

  it('scanTasks returns all tasks from the Tasks directory', async () => {
    const tasks = await scanTasks(mockConfig)
    expect(tasks).toHaveLength(3)
  })

  it('scanTasksByFilter filters by domain', async () => {
    const filter: TaskFilter = { domain: 'work' }
    const tasks = await scanTasksByFilter(mockConfig, filter)
    expect(tasks.every((t) => t.tags.includes('work'))).toBe(true)
    expect(tasks).toHaveLength(2)
  })

  it('scanTasksByFilter filters by status', async () => {
    const filter: TaskFilter = { status: 'status/todo' }
    const tasks = await scanTasksByFilter(mockConfig, filter)
    expect(tasks).toHaveLength(2)
  })
})
