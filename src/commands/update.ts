import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { filterToCanonical } from '../core/tagRegistry'
import { refreshDailyNote } from '../core/noteRefresher'

export interface UpdateOptions {
  name?: string
  due?: string
  domain?: string
  priority?: string
}

export async function updateTaskCmd(taskId: string, opts: UpdateOptions, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)

  let tags = [...task.tags]

  if (opts.domain) {
    tags = tags.filter((t) => !config.tags.domains.includes(t))
    tags = tags.filter((t) => t !== 'status/inbox')
    if (!tags.includes('status/todo')) tags.push('status/todo')
    tags.push(opts.domain)
  }

  if (opts.priority) {
    tags = tags.filter((t) => !t.startsWith('priority/'))
    tags.push(`priority/${opts.priority}`)
  }

  const { valid: validTags } = filterToCanonical(tags, config)

  const updates: Partial<typeof task> = { tags: validTags }
  if (opts.name) updates.name = opts.name
  if (opts.due) updates.due = opts.due

  await updateTask(filePath, updates)
  console.log(chalk.green(`Updated: ${task.name}`))
  await refreshDailyNote(config, { freshCalendar: false })
}
