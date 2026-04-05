import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import dayjs from 'dayjs'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { parseCheckedTaskIds } from '../core/dailyNoteGenerator'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { today } from '../utils/dateUtils'
import { refreshDailyNote } from '../core/noteRefresher'

function getDailyNotesDir(config: Config): string {
  return path.join(config.vaultPath, 'DailyNotes')
}

function getDailyNoteFile(config: Config): string {
  const dateStr = dayjs().format('YYYYMMDD')
  return path.join(getDailyNotesDir(config), `${dateStr} - Daily Task.md`)
}

async function collectCheckedIds(config: Config): Promise<Set<string>> {
  const dir = getDailyNotesDir(config)
  if (!(await fs.pathExists(dir))) return new Set()

  const files = await fs.readdir(dir)
  const noteFiles = files.filter((f) => f.endsWith(' - Daily Task.md'))
  const ids = new Set<string>()

  for (const file of noteFiles) {
    const content = await fs.readFile(path.join(dir, file), 'utf8')
    for (const id of parseCheckedTaskIds(content)) {
      ids.add(id)
    }
  }

  return ids
}

async function syncCheckboxes(config: Config): Promise<number> {
  const checkedIds = await collectCheckedIds(config)
  if (checkedIds.size === 0) return 0

  const tasksDir = getTasksDir(config)
  let synced = 0

  for (const id of checkedIds) {
    const filePath = taskFilePath(tasksDir, id)
    if (!(await fs.pathExists(filePath))) continue
    const task = await readTask(filePath)
    if (task.tags.includes('status/done') || task.tags.includes('status/waiting')) continue
    const newTags = task.tags
      .filter((t) => t !== 'status/todo' && t !== 'status/inbox' && t !== 'status/blocked' && t !== 'status/waiting')
      .concat('status/done')
    await updateTask(filePath, { tags: newTags, completed: today() })
    synced++
  }

  return synced
}

export async function runToday(config: Config): Promise<void> {
  const noteFile = getDailyNoteFile(config)

  // Step 1: Sync checkboxes from all daily notes (catches items checked in prior days' notes)
  const synced = await syncCheckboxes(config)

  // Step 2: Regenerate note with fresh calendar events
  await refreshDailyNote(config, { freshCalendar: true })

  console.log(chalk.green(`Notes updated: ${synced} tasks marked done`))
  console.log(chalk.gray(`   ${noteFile}`))
}
