import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { refreshDailyNote } from '../core/noteRefresher'

const VALID_LEVELS = ['high', 'medium', 'low'] as const
type PriorityLevel = typeof VALID_LEVELS[number]

function isValidLevel(level: string): level is PriorityLevel {
  return (VALID_LEVELS as readonly string[]).includes(level)
}

export async function setPriority(taskId: string, level: string, config: Config): Promise<void> {
  if (!isValidLevel(level)) {
    throw new Error(`Invalid priority "${level}". Must be one of: high, medium, low`)
  }

  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)

  const newTags = task.tags.filter((t) => !t.startsWith('priority/')).concat(`priority/${level}`)
  await updateTask(filePath, { tags: newTags })

  const label = level.charAt(0).toUpperCase() + level.slice(1)
  console.log(chalk.green(`Priority set: ${task.name} → ${label}`))

  await refreshDailyNote(config, { freshCalendar: false })
}
