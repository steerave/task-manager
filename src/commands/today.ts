import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import dayjs from 'dayjs'
import { Config } from '../core/types'
import { scanTasks, getTasksDir } from '../core/vaultScanner'
import { generateTodayNote, generateThisWeekNote, generateNextWeekNote, parseCheckedTaskIds } from '../core/dailyNoteGenerator'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { today } from '../utils/dateUtils'

function getDailyNoteDir(config: Config): string {
  const dateStr = dayjs().format('YYYY-MM-DD')
  return path.join(config.vaultPath, 'DailyNotes', dateStr)
}

async function syncCheckboxes(config: Config, noteDir: string): Promise<number> {
  const todayFile = path.join(noteDir, 'today.md')
  if (!(await fs.pathExists(todayFile))) return 0

  const content = await fs.readFile(todayFile, 'utf8')
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
  const noteDir = getDailyNoteDir(config)
  await fs.ensureDir(noteDir)

  // Step 1: Sync checkboxes from existing today.md
  const synced = await syncCheckboxes(config, noteDir)

  // Step 2: Scan all tasks (with updated done states)
  const tasks = await scanTasks(config)

  // Step 3: Generate and write all three notes
  const todayNote = generateTodayNote(tasks)
  const thisWeekNote = generateThisWeekNote(tasks)
  const nextWeekNote = generateNextWeekNote(tasks)

  await fs.writeFile(path.join(noteDir, 'today.md'), todayNote, 'utf8')
  await fs.writeFile(path.join(noteDir, 'this-week.md'), thisWeekNote, 'utf8')
  await fs.writeFile(path.join(noteDir, 'next-week.md'), nextWeekNote, 'utf8')

  const todayTasks = tasks.filter((t) => t.due === today() && !t.tags.includes('status/done'))
  console.log(
    chalk.green(
      `Notes updated: ${synced} tasks marked done · today: ${todayTasks.length} tasks`
    )
  )
  console.log(chalk.gray(`   ${noteDir}`))
}
