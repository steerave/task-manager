import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { writeTask, readTask, updateTask, taskFilePath } from '../../src/core/taskFile'
import { Task } from '../../src/core/types'

describe('taskFile', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-file-test-'))
  })

  afterEach(async () => {
    await fs.remove(tmpDir)
  })

  const sampleTask: Task = {
    id: 'task-2026-03-29-001',
    name: 'Prepare Q2 roadmap',
    due: '2026-03-31',
    tags: ['work', 'priority/high', 'status/todo'],
    created: '2026-03-29',
    completed: null,
  }

  it('writeTask creates a markdown file with YAML frontmatter', async () => {
    await writeTask(tmpDir, sampleTask)
    const filePath = path.join(tmpDir, 'task-2026-03-29-001.md')
    expect(await fs.pathExists(filePath)).toBe(true)
    const content = await fs.readFile(filePath, 'utf8')
    expect(content).toContain('name: Prepare Q2 roadmap')
    expect(content).toContain('due:')
    expect(content).toContain('2026-03-31')
  })

  it('readTask parses frontmatter back to Task object', async () => {
    await writeTask(tmpDir, sampleTask)
    const filePath = path.join(tmpDir, 'task-2026-03-29-001.md')
    const loaded = await readTask(filePath)
    expect(loaded.name).toBe('Prepare Q2 roadmap')
    expect(loaded.due).toBe('2026-03-31')
    expect(loaded.tags).toContain('work')
    expect(loaded.completed).toBeNull()
  })

  it('updateTask merges partial fields into existing task', async () => {
    await writeTask(tmpDir, sampleTask)
    const filePath = path.join(tmpDir, 'task-2026-03-29-001.md')
    await updateTask(filePath, { due: '2026-04-01', tags: ['work', 'priority/medium', 'status/todo'] })
    const loaded = await readTask(filePath)
    expect(loaded.due).toBe('2026-04-01')
    expect(loaded.tags).toContain('priority/medium')
    expect(loaded.name).toBe('Prepare Q2 roadmap') // unchanged
  })
})
