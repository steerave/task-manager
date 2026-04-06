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

function getArchiveDir(config: Config): string {
  return path.join(getDailyNotesDir(config), 'Archive')
}

async function collectNoteFiles(dir: string): Promise<string[]> {
  if (!(await fs.pathExists(dir))) return []
  const files = await fs.readdir(dir)
  return files.filter((f) => f.endsWith(' - Daily Task.md')).map((f) => path.join(dir, f))
}

async function collectCheckedIds(config: Config): Promise<Set<string>> {
  const dir = getDailyNotesDir(config)
  const archiveDir = getArchiveDir(config)

  // Scan both top-level and Archives for checked checkboxes
  const allFiles = [
    ...(await collectNoteFiles(dir)),
    ...(await collectNoteFiles(archiveDir)),
  ]

  const ids = new Set<string>()
  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf8')
    for (const id of parseCheckedTaskIds(content)) {
      ids.add(id)
    }
  }

  return ids
}

async function archiveOldNotes(config: Config): Promise<number> {
  const dir = getDailyNotesDir(config)
  const archiveDir = getArchiveDir(config)
  const todayPrefix = dayjs().format('YYYYMMDD')

  const files = await fs.readdir(dir)
  const oldNotes = files.filter(
    (f) => f.endsWith(' - Daily Task.md') && !f.startsWith(todayPrefix)
  )

  if (oldNotes.length === 0) return 0

  await fs.ensureDir(archiveDir)

  for (const file of oldNotes) {
    await fs.move(path.join(dir, file), path.join(archiveDir, file), { overwrite: true })
  }

  return oldNotes.length
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

export async function refreshDailyNote(config: Config, options: RefreshOptions): Promise<{ synced: number; archived: number }> {
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

  // Move older daily notes into Archives/
  const archived = await archiveOldNotes(config)

  return { synced, archived }
}
