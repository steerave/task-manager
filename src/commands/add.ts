import chalk from 'chalk'
import { Config } from '../core/types'
import { parseTaskInput } from '../core/taskParser'
import { filterToCanonical } from '../core/tagRegistry'
import { writeTask } from '../core/taskFile'
import { generateTaskId } from '../utils/idGenerator'
import { getTasksDir } from '../core/vaultScanner'
import { today } from '../utils/dateUtils'

export async function addTask(input: string, config: Config): Promise<void> {
  const parsed = parseTaskInput(input, config)
  const { valid: tags } = filterToCanonical(parsed.tags, config)
  const tasksDir = getTasksDir(config)
  const id = await generateTaskId(tasksDir, parsed.name)

  const task = {
    id,
    name: parsed.name,
    due: parsed.due,
    tags,
    created: today(),
    completed: null,
  }

  await writeTask(tasksDir, task)

  if (parsed.needsInbox) {
    console.log(chalk.yellow(`Warning: Added to inbox (domain unclear): ${task.name}`))
    console.log(chalk.gray(`   Run: task update ${id} --domain work --due <date>`))
  } else {
    console.log(chalk.green(`Task added: ${task.name}`))
    if (task.due) console.log(chalk.gray(`   Due: ${task.due} · ID: ${id}`))
    else console.log(chalk.gray(`   No due date · ID: ${id}`))
  }
}
