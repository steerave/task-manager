import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import dayjs from 'dayjs'
import { Config } from '../core/types'
import { scanTasks, getTasksDir } from '../core/vaultScanner'
import { generateDailyNote, parseCheckedTaskIds } from '../core/dailyNoteGenerator'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { today } from '../utils/dateUtils'

function getDailyNoteFile(config: Config): string {
  const dateStr = dayjs().format('YYYYMMDD')
  return path.join(config.vaultPath, 'DailyNotes', `${dateStr} - Daily Task.md`)
}

async function syncCheckboxes(config: Config, noteFile: string): Promise<number> {
  if (!(await fs.pathExists(noteFile))) return 0

  const content = await fs.readFile(noteFile, 'utf8')
  const checkedIds = parseCheckedTaskIds(content)
  if (checkedIds.length === 0) return 0

  const tasksDir = getTasksDir(config)
  let synced = 0

  for (const id of checkedIds) {
    const filePath = taskFilePath(tasksDir, id)
    if (!(await fs.pathExists(filePath))) continue
    const task = await readTask(filePath)
    if (task.tags.includes('status/done')) continue
    const newTags = task.tags
      .filter((t) => t !== 'status/todo' && t !== 'status/inbox' && t !== 'status/blocked')
      .concat('status/done')
    await updateTask(filePath, { tags: newTags, completed: today() })
    synced++
  }

  return synced
}

export async function runToday(config: Config): Promise<void> {
  const noteFile = getDailyNoteFile(config)
  const noteDir = path.dirname(noteFile)
  await fs.ensureDir(noteDir)

  // Step 1: Sync checkboxes from existing daily note
  const synced = await syncCheckboxes(config, noteFile)

  // Step 2: Scan all tasks (with updated done states)
  const tasks = await scanTasks(config)

  // Step 3: Generate and write the consolidated daily note
  const note = generateDailyNote(tasks)
  await fs.writeFile(noteFile, note, 'utf8')

  const todayTasks = tasks.filter((t) => t.due === today() && !t.tags.includes('status/done'))
  console.log(
    chalk.green(
      `Notes updated: ${synced} tasks marked done · today: ${todayTasks.length} tasks`
    )
  )
  console.log(chalk.gray(`   ${noteFile}`))
}
