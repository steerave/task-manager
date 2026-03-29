import * as fs from 'fs-extra'
import * as path from 'path'
import { toISODate } from './dateUtils'

export async function generateTaskId(tasksDir: string): Promise<string> {
  const dateStr = toISODate(new Date())
  const prefix = `task-${dateStr}-`

  let existingFiles: string[] = []
  if (await fs.pathExists(tasksDir)) {
    const files = await fs.readdir(tasksDir)
    existingFiles = files.filter((f) => f.startsWith(prefix))
  }

  const nextNum = existingFiles.length + 1
  const seq = String(nextNum).padStart(3, '0')
  return `${prefix}${seq}`
}
