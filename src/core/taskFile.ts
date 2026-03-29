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

export async function readTask(filePath: string): Promise<Task> {
  const raw = await fs.readFile(filePath, 'utf8')
  const { data } = matter(raw)
  return {
    id: data.id as string,
    name: data.name as string,
    due: (data.due as string | null) ?? null,
    tags: (data.tags as string[]) ?? [],
    created: data.created as string,
    completed: (data.completed as string | null) ?? null,
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
