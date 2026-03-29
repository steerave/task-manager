import chalk from 'chalk'
import dayjs from 'dayjs'
import { Config, Task, TaskFilter } from '../core/types'
import { scanTasksByFilter } from '../core/vaultScanner'

function formatTask(task: Task): string {
  const domain = task.tags.find((t) => ['work', 'personal', 'personal-projects'].includes(t)) ?? 'inbox'
  const priority = task.tags.find((t) => t.startsWith('priority/'))?.replace('priority/', '') ?? 'medium'
  const due = task.due ? dayjs(task.due).format('MMM D') : 'no date'
  const status = task.tags.includes('status/done') ? chalk.gray('[done]') : ''
  return `  ${chalk.cyan(task.id.slice(-7))} ${task.name} ${chalk.gray(`— ${domain} · ${priority} · ${due}`)} ${status}`
}

export async function listTasks(config: Config, filter: TaskFilter, showDone = false): Promise<void> {
  const tasks = await scanTasksByFilter(config, filter)
  // Hide done tasks by default — pass --done flag to see them
  const visible = showDone ? tasks : tasks.filter((t) => !t.tags.includes('status/done'))
  if (visible.length === 0) {
    console.log(chalk.gray('No tasks found.'))
    return
  }
  console.log(chalk.bold(`\n${visible.length} task(s):\n`))
  visible.forEach((t) => console.log(formatTask(t)))
  console.log()
}
