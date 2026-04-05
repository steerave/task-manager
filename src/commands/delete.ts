import * as fs from 'fs-extra'
import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask } from '../core/taskFile'
import { refreshDailyNote } from '../core/noteRefresher'

export async function deleteTask(taskId: string, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)
  await fs.remove(filePath)
  console.log(chalk.red(`Deleted: ${task.name}`))
  await refreshDailyNote(config, { freshCalendar: false })
}
