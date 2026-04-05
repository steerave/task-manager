import * as fs from 'fs-extra'
import * as path from 'path'
import matter from 'gray-matter'
import { Task } from './types'

export function taskFilePath(tasksDir: string, taskId: string): string {
  return path.join(tasksDir, `${taskId}.md`)
}

export async function writeTask(tasksDir: string, task: Task): Promise<void> {
  await fs.ensureDir(tasksDir)
  const frontmatter: Record<string, unknown> = {
    name: task.name,
    due: task.due,
    tags: task.tags,
    created: task.created,
    id: task.id,
  }
  if (task.completed) {
    frontmatter.completed = task.completed
  }
  const content = matter.stringify('', frontmatter)
  await fs.writeFile(taskFilePath(tasksDir, task.id), content, 'utf8')
}

function normalizeDate(value: unknown): string | null {
  if (value == null) return null
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'string') {
    // Strip time component if present (e.g., "2026-03-31T00:00:00.000Z" → "2026-03-31")
    return value.slice(0, 10)
  }
  return null
}

export async function readTask(filePath: string): Promise<Task> {
  const raw = await fs.readFile(filePath, 'utf8')
  const { data } = matter(raw)
  return {
    id: data.id as string,
    name: data.name as string,
    due: normalizeDate(data.due),
    tags: (data.tags as string[]) ?? [],
    created: normalizeDate(data.created) ?? '',
    completed: normalizeDate(data.completed),
  }
}

export async function updateTask(
  filePath: string,
  updates: Partial<Omit<Task, 'id' | 'created'>>
): Promise<void> {
  const existing = await readTask(filePath)
  const updated: Task = { ...existing, ...updates }
  await writeTask(path.dirname(filePath), updated)
}
