import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import dayjs from 'dayjs'
import { Config } from './types'
import { scanTasks } from './vaultScanner'
import { generateDailyNote } from './dailyNoteGenerator'
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

export async function refreshDailyNote(config: Config, options: RefreshOptions): Promise<void> {
  const noteFile = dailyNotePath(config)
  await fs.ensureDir(path.dirname(noteFile))

  const tasks = await scanTasks(config)

  let events: CalendarEvent[] = []
  if (options.freshCalendar) {
    try {
      events = await fetchTodayEvents()
      await writeCachedEvents(config, events)
    } catch (err: any) {
      console.log(chalk.yellow(`Warning: Could not fetch calendar events: ${err.message}`))
    }
  } else {
    events = await readCachedEvents(config)
  }

  const note = generateDailyNote(tasks, events)
  await fs.writeFile(noteFile, note, 'utf8')
}
