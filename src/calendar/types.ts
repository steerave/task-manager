export interface CalendarEvent {
  uid: string
  name: string
  date: string          // ISO date YYYY-MM-DD
  startTime: string | null  // HH:MM in local time, null for all-day
  endTime: string | null    // HH:MM in local time, null for all-day
  isAllDay: boolean
}

export interface ParsedEventInput {
  name: string
  date: string          // ISO date YYYY-MM-DD
  startTime: string | null  // HH:MM
  endTime: string | null    // HH:MM
  isAllDay: boolean
}
