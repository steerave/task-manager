import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import dayjs from 'dayjs'
import { Config } from './types'
import { getTasksDir, scanTasks } from './vaultScanner'
import { generateDailyNote, parseCheckedTaskIds } from './dailyNoteGenerator'
import { taskFilePath, readTask, updateTask } from './taskFile'
import { today } from '../utils/dateUtils'
import { fetchTodayEvents } from '../calendar/icloudClient'
import { CalendarEvent } from '../calendar/types'

export interface RefreshOptions {
  freshCalendar: boolean
}

interface CalendarCache {
  date: string
  events: CalendarEvent[]
}

function dailyNotePath(config: Config): string {
  const dateStr = dayjs().format('YYYYMMDD')
  return path.join(config.vaultPath, 'DailyNotes', `${dateStr} - Daily Task.md`)
}

function cachePath(config: Config): string {
  return path.join(config.vaultPath, '.calendar-cache.json')
}

async function readCachedEvents(config: Config): Promise<CalendarEvent[]> {
  const file = cachePath(config)
  if (!(await fs.pathExists(file))) return []
  try {
    const raw = await fs.readFile(file, 'utf8')
    const cache = JSON.parse(raw) as CalendarCache
    const today = dayjs().format('YYYY-MM-DD')
    if (cache.date !== today) return []
    return cache.events
  } catch {
    return []
  }
}

async function writeCachedEvents(config: Config, events: CalendarEvent[]): Promise<void> {
  const cache: CalendarCache = {
    date: dayjs().format('YYYY-MM-DD'),
    events,
  }
  await fs.writeFile(cachePath(config), JSON.stringify(cache, null, 2), 'utf8')
}

function getDailyNotesDir(config: Config): string {
  return path.join(config.vaultPath, 'DailyNotes')
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

export async function refreshDailyNote(config: Config, options: RefreshOptions): Promise<{ synced: number }> {
  const noteFile = dailyNotePath(config)
  await fs.ensureDir(path.dirname(noteFile))

  // Always sync checkboxes before regenerating to preserve manual checks from Obsidian
  const synced = await syncCheckboxes(config)

  const tasks = await scanTasks(config)

  let events: CalendarEvent[] = []
  if (options.freshCalendar) {
    try {
      events = await fetchTodayEvents()
    } catch (err: any) {
      console.log(chalk.yellow(`Warning: Could not fetch calendar events: ${err.message}`))
    }
    try {
      await writeCachedEvents(config, events)
    } catch (err: any) {
      console.log(chalk.yellow(`Warning: Could not write calendar cache: ${err.message}`))
    }
  } else {
    events = await readCachedEvents(config)
  }

  const note = generateDailyNote(tasks, events)
  await fs.writeFile(noteFile, note, 'utf8')

  return { synced }
}
