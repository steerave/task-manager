import * as fs from 'fs-extra'
import * as path from 'path'
import { readTask } from './taskFile'
import { Config, Task, TaskFilter } from './types'
import { isToday, isThisWeek, isNextWeek, isOverdue } from '../utils/dateUtils'

export function getTasksDir(config: Config): string {
  return path.join(config.vaultPath, 'Tasks')
}

export async function scanTasks(config: Config): Promise<Task[]> {
  const tasksDir = getTasksDir(config)
  if (!(await fs.pathExists(tasksDir))) return []
  const files = await fs.readdir(tasksDir)
  const mdFiles = files.filter((f) => f.endsWith('.md'))
  const tasks = await Promise.all(mdFiles.map(async (f) => {
    const filePath = path.join(tasksDir, f)
    const task = await readTask(filePath)
    const stat = await fs.stat(filePath)
    task.modified = stat.mtime.toISOString().slice(0, 10)
    return task
  }))
  return tasks
}

export async function scanTasksByFilter(config: Config, filter: TaskFilter): Promise<Task[]> {
  const all = await scanTasks(config)
  return all.filter((task) => {
    if (filter.domain && !task.tags.includes(filter.domain)) return false
    if (filter.status && !task.tags.includes(filter.status)) return false
    if (filter.priority && !task.tags.includes(`priority/${filter.priority}`)) return false
    if (filter.due && task.due) {
      if (filter.due === 'today' && !isToday(task.due)) return false
      if (filter.due === 'this-week' && !isThisWeek(task.due)) return false
      if (filter.due === 'next-week' && !isNextWeek(task.due)) return false
      if (filter.due === 'overdue' && !isOverdue(task.due)) return false
    }
    return true
  })
}
