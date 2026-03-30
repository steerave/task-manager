import 'dotenv/config'
import { DAVCalendar, DAVClient } from 'tsdav'
import type { VEvent } from 'node-ical'
import { CalendarEvent } from './types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatICSDate(dateStr: string, timeStr: string | null): string {
  const [year, month, day] = dateStr.split('-')
  if (!timeStr) return `${year}${month}${day}`
  const [hours, minutes] = timeStr.split(':')
  return `${year}${month}${day}T${hours}${minutes}00`
}

function parseICSDate(icsDate: string | Date): { date: string; time: string | null } {
  if (icsDate instanceof Date) {
    const date = `${icsDate.getFullYear()}-${pad(icsDate.getMonth() + 1)}-${pad(icsDate.getDate())}`
    const hours = icsDate.getHours()
    const minutes = icsDate.getMinutes()
    if (hours === 0 && minutes === 0) return { date, time: null }
    return { date, time: `${pad(hours)}:${pad(minutes)}` }
  }
  const str = String(icsDate)
  const date = `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  if (str.length <= 8) return { date, time: null }
  const time = `${str.slice(9, 11)}:${str.slice(11, 13)}`
  return { date, time }
}

async function getClient(): Promise<DAVClient | null> {
  const email = process.env.ICLOUD_EMAIL
  const password = process.env.ICLOUD_APP_PASSWORD
  if (!email || !password) return null

  const client = new DAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials: { username: email, password },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  })
  await client.login()
  return client
}

async function getCalendar(client: DAVClient): Promise<DAVCalendar | null> {
  const calendarName = process.env.ICLOUD_CALENDAR_NAME ?? 'Home'
  const calendars = await client.fetchCalendars()
  return calendars.find((c) => c.displayName === calendarName) ?? null
}

export async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  const client = await getClient()
  if (!client) return []

  const calendar = await getCalendar(client)
  if (!calendar) {
    console.warn('[calendar] Calendar not found on iCloud — skipping events')
    return []
  }

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const objects = await client.fetchCalendarObjects({
    calendar,
    timeRange: {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString(),
    },
  })

  const ical = await import('node-ical')
  const events: CalendarEvent[] = []

  for (const obj of objects) {
    if (!obj.data) continue
    const parsed = ical.sync.parseICS(obj.data)
    for (const key of Object.keys(parsed)) {
      const comp = parsed[key]
      if (!comp || comp.type !== 'VEVENT') continue

      const vevent = comp as VEvent
      const start = parseICSDate(vevent.start as Date | string)
      const end = vevent.end ? parseICSDate(vevent.end as Date | string) : null
      const isAllDay = !start.time

      events.push({
        uid: vevent.uid ?? key,
        name: (typeof vevent.summary === 'string' ? vevent.summary : vevent.summary?.val) ?? 'Untitled event',
        date: start.date,
        startTime: start.time,
        endTime: end?.time ?? null,
        isAllDay,
      })
    }
  }

  // Sort: timed events by start time, all-day events last
  events.sort((a, b) => {
    if (a.isAllDay && !b.isAllDay) return 1
    if (!a.isAllDay && b.isAllDay) return -1
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
    return 0
  })

  return events
}

export async function createEvent(
  name: string,
  date: string,
  startTime: string | null,
  endTime: string | null,
  isAllDay: boolean
): Promise<void> {
  const client = await getClient()
  if (!client) {
    throw new Error('iCloud credentials not configured. Add ICLOUD_EMAIL and ICLOUD_APP_PASSWORD to .env')
  }

  const calendar = await getCalendar(client)
  if (!calendar) {
    throw new Error(`Calendar "${process.env.ICLOUD_CALENDAR_NAME ?? 'Home'}" not found on iCloud`)
  }

  const eventId = `task-manager-${Date.now()}`

  let dtstart: string
  let dtend: string

  if (isAllDay) {
    const [year, month, day] = date.split('-')
    dtstart = `${year}${month}${day}`
    const endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day) + 1)
    dtend = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}`
  } else {
    dtstart = formatICSDate(date, startTime)
    dtend = formatICSDate(date, endTime)
  }

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Task Manager//EN',
    'BEGIN:VEVENT',
    `UID:${eventId}@taskmanager`,
  ]

  if (isAllDay) {
    icsLines.push(`DTSTART;VALUE=DATE:${dtstart}`)
    icsLines.push(`DTEND;VALUE=DATE:${dtend}`)
  } else {
    icsLines.push(`DTSTART:${dtstart}`)
    icsLines.push(`DTEND:${dtend}`)
  }

  icsLines.push(
    `SUMMARY:${name}`,
    'END:VEVENT',
    'END:VCALENDAR'
  )

  await client.createCalendarObject({
    calendar,
    filename: `${eventId}.ics`,
    iCalString: icsLines.join('\r\n'),
  })
}
