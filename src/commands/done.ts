import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { today } from '../utils/dateUtils'

export async function markDone(taskId: string, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)
  const newTags = task.tags
    .filter((t) => t !== 'status/todo' && t !== 'status/inbox' && t !== 'status/blocked' && t !== 'status/waiting')
    .concat('status/done')
  await updateTask(filePath, { tags: newTags, completed: today() })
  console.log(chalk.green(`Done: ${task.name}`))
}
