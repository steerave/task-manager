import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { setPriority } from '../../src/commands/priority'
import { Config } from '../../src/core/types'
import { readTask } from '../../src/core/taskFile'

vi.mock('../../src/calendar/icloudClient', () => ({
  fetchTodayEvents: vi.fn().mockResolvedValue([]),
}))

describe('priority command', () => {
  let vaultPath: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T10:00:00'))
    vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pri-test-'))
    await fs.ensureDir(path.join(vaultPath, 'Tasks'))
    await fs.ensureDir(path.join(vaultPath, 'DailyNotes'))
    config = {
      vaultPath,
      tags: {
        domains: ['work', 'personal', 'projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: [],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox', 'status/waiting'],
      },
    }
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(vaultPath)
  })

  async function createTask(id: string, tags: string[]): Promise<void> {
    const file = path.join(vaultPath, 'Tasks', `${id}.md`)
    await fs.writeFile(
      file,
      `---
name: Sample task
due: '2026-04-05'
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
created: '2026-04-04'
id: ${id}
---

`
    )
  }

  it('sets priority to high, removing existing priority tag', async () => {
    await createTask('sample-0001', ['work', 'priority/medium', 'status/todo'])
    await setPriority('sample-0001', 'high', config)
    const task = await readTask(path.join(vaultPath, 'Tasks', 'sample-0001.md'))
    expect(task.tags).toContain('priority/high')
    expect(task.tags).not.toContain('priority/medium')
  })

  it('sets priority to low', async () => {
    await createTask('sample-0002', ['work', 'priority/high', 'status/todo'])
    await setPriority('sample-0002', 'low', config)
    const task = await readTask(path.join(vaultPath, 'Tasks', 'sample-0002.md'))
    expect(task.tags).toContain('priority/low')
    expect(task.tags).not.toContain('priority/high')
  })

  it('adds a priority tag when none exists', async () => {
    await createTask('sample-0003', ['work', 'status/todo'])
    await setPriority('sample-0003', 'medium', config)
    const task = await readTask(path.join(vaultPath, 'Tasks', 'sample-0003.md'))
    expect(task.tags).toContain('priority/medium')
  })

  it('rejects invalid priority levels', async () => {
    await createTask('sample-0004', ['work', 'priority/medium', 'status/todo'])
    await expect(setPriority('sample-0004', 'urgent', config)).rejects.toThrow(/Invalid priority/)
  })

  it('regenerates the daily note after setting priority', async () => {
    await createTask('sample-0005', ['personal', 'priority/medium', 'status/todo'])
    await setPriority('sample-0005', 'high', config)
    const noteFile = path.join(vaultPath, 'DailyNotes', '20260404 - Daily Task.md')
    expect(await fs.pathExists(noteFile)).toBe(true)
    const content = await fs.readFile(noteFile, 'utf8')
    expect(content).toContain('Sample task')
    expect(content).toContain('· High')
  })
})
