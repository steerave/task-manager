import * as chrono from 'chrono-node'
import { ParsedEventInput } from './types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseEventInput(input: string): ParsedEventInput {
  const results = chrono.parse(input, new Date())

  if (results.length === 0) {
    throw new Error('Could not parse a date from your input. Try: task calendar add "event name on <date>"')
  }

  const result = results[0]
  const startDate = result.start.date()
  const date = formatDate(startDate)

  // Determine if time was explicitly specified
  const hasStartTime = result.start.isCertain('hour')
  const hasEndTime = result.end?.isCertain('hour') ?? false

  let startTime: string | null = null
  let endTime: string | null = null
  let isAllDay = true

  if (hasStartTime) {
    isAllDay = false
    startTime = formatTime(startDate)

    if (hasEndTime && result.end) {
      endTime = formatTime(result.end.date())
    } else {
      // Default to 1 hour duration
      endTime = formatTime(addHours(startDate, 1))
    }
  }

  // Strip date/time phrases from input to get event name
  let name = input
  for (const r of results) {
    name = name.slice(0, r.index) + name.slice(r.index + r.text.length)
  }
  // Clean up filler words around the date
  name = name
    .replace(/\b(from|on|at|for|due)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-:,]+/, '')
    .replace(/[-:,]+$/, '')
    .trim()

  return { name, date, startTime, endTime, isAllDay }
}
