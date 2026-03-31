import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'

export async function markWaiting(taskId: string, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)
  const newTags = task.tags
    .filter((t) => t !== 'status/todo' && t !== 'status/inbox' && t !== 'status/blocked' && t !== 'status/done')
    .concat('status/waiting')
  await updateTask(filePath, { tags: newTags, completed: null })
  console.log(chalk.cyan(`Waiting: ${task.name}`))
}
