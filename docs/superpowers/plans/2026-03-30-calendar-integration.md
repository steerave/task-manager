# Calendar Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add iCloud calendar integration — read today's events into the daily note and create events from the CLI using natural language.

**Architecture:** A new `src/calendar/` module handles all CalDAV communication with iCloud via `tsdav`. An event parser uses `chrono-node` to extract dates and times from natural language. The daily note generator accepts an optional events array and renders an "Events Today" section after Due Today. All calendar operations gracefully degrade when credentials aren't configured or iCloud is unreachable.

**Tech Stack:** `tsdav` (CalDAV client) · `dotenv` (env loading) · `node-ical` (ics parsing) · `chrono-node` (date/time NLP, already installed)

---

## File Map

| File | Responsibility |
|---|---|
| `src/calendar/types.ts` | `CalendarEvent` interface |
| `src/calendar/icloudClient.ts` | Connect to iCloud CalDAV, fetch today's events, create events |
| `src/calendar/eventParser.ts` | Parse natural language event input → name, date, startTime, endTime, isAllDay |
| `src/commands/calendar.ts` | CLI handlers for `calendar add` and `calendar today` |
| `tests/calendar/eventParser.test.ts` | Unit tests for event NLP parsing |
| `tests/calendar/icloudClient.test.ts` | Integration test for CalDAV fetch/create |
| `src/core/dailyNoteGenerator.ts` | Modified: accept optional `CalendarEvent[]`, render Events Today section |
| `src/commands/today.ts` | Modified: fetch calendar events before generating note |
| `src/cli.ts` | Modified: register `calendar add` and `calendar today` subcommands |

---

## Task 1: Calendar Types and Install Dependencies

**Files:**
- Create: `src/calendar/types.ts`

- [ ] **Step 1: Install node-ical**

```bash
cd "C:/Users/steerave/Desktop/Claude Projects/Task Manager"
npm install node-ical
npm install -D @types/node-ical
```

Note: `tsdav` and `dotenv` are already installed.

- [ ] **Step 2: Write `src/calendar/types.ts`**

```typescript
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
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/calendar/types.ts package.json package-lock.json
git commit -m "feat: add calendar types and install node-ical

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

---

## Task 2: Event Parser (NLP for calendar events)

**Files:**
- Create: `src/calendar/eventParser.ts`
- Create: `tests/calendar/eventParser.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/calendar/eventParser.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseEventInput } from '../../src/calendar/eventParser'

describe('parseEventInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses a timed event with start and end', () => {
    const result = parseEventInput('Bettendorf swim meet on 4/26 from 1pm to 3pm')
    expect(result.name).toBe('Bettendorf swim meet')
    expect(result.date).toBe('2026-04-26')
    expect(result.startTime).toBe('13:00')
    expect(result.endTime).toBe('15:00')
    expect(result.isAllDay).toBe(false)
  })

  it('parses event with start time only — defaults to 1 hour duration', () => {
    const result = parseEventInput('Dentist appointment tomorrow at 2pm')
    expect(result.name).toBe('Dentist appointment')
    expect(result.date).toBe('2026-03-31')
    expect(result.startTime).toBe('14:00')
    expect(result.endTime).toBe('15:00')
    expect(result.isAllDay).toBe(false)
  })

  it('parses all-day event when no time given', () => {
    const result = parseEventInput("Mom's birthday on 5/15")
    expect(result.name).toBe("Mom's birthday")
    expect(result.date).toBe('2026-05-15')
    expect(result.isAllDay).toBe(true)
    expect(result.startTime).toBeNull()
    expect(result.endTime).toBeNull()
  })

  it('parses relative dates', () => {
    const result = parseEventInput('Team lunch next Friday at noon')
    expect(result.name).toBe('Team lunch')
    expect(result.startTime).toBe('12:00')
    expect(result.isAllDay).toBe(false)
  })

  it('throws when no date can be parsed', () => {
    expect(() => parseEventInput('something without a date')).toThrow('Could not parse a date')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/calendar/eventParser'`

- [ ] **Step 3: Write `src/calendar/eventParser.ts`**

```typescript
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
    .replace(/\b(from|on|at)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-:,]+/, '')
    .replace(/[-:,]+$/, '')
    .trim()

  return { name, date, startTime, endTime, isAllDay }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All 5 eventParser tests PASS. All previous tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/calendar/eventParser.ts tests/calendar/eventParser.test.ts
git commit -m "feat: add calendar event NLP parser

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

---

## Task 3: iCloud CalDAV Client

**Files:**
- Create: `src/calendar/icloudClient.ts`

- [ ] **Step 1: Write `src/calendar/icloudClient.ts`**

```typescript
import 'dotenv/config'
import { createDAVClient, DAVCalendar, DAVClient } from 'tsdav'
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
  // String format: 20260426T130000 or 20260426
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

  return createDAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials: { username: email, password },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  })
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
      if (comp.type !== 'VEVENT') continue

      const start = parseICSDate(comp.start as Date | string)
      const end = comp.end ? parseICSDate(comp.end as Date | string) : null
      const isAllDay = !start.time

      events.push({
        uid: comp.uid ?? key,
        name: (comp.summary as string) ?? 'Untitled event',
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
    // All-day event: use DATE format (no time component)
    const [year, month, day] = date.split('-')
    dtstart = `${year}${month}${day}`
    // All-day events end on the next day in ICS format
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/calendar/icloudClient.ts
git commit -m "feat: add iCloud CalDAV client for reading and creating events

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

---

## Task 4: Update Daily Note Generator to Include Events

**Files:**
- Modify: `src/core/dailyNoteGenerator.ts`
- Modify: `tests/core/dailyNoteGenerator.test.ts`

- [ ] **Step 1: Write failing test for events in daily note**

Add these tests to `tests/core/dailyNoteGenerator.test.ts`:

```typescript
// Add import at top of file
import { CalendarEvent } from '../../src/calendar/types'

// Add these tests inside the describe block:

  it('renders Events Today section after Due Today when events are provided', () => {
    const events: CalendarEvent[] = [
      { uid: 'e1', name: 'Team standup', date: '2026-03-29', startTime: '09:00', endTime: '09:30', isAllDay: false },
      { uid: 'e2', name: "Mom's birthday", date: '2026-03-29', startTime: null, endTime: null, isAllDay: true },
    ]
    const note = generateDailyNote(tasks, events)
    expect(note).toContain('### Events Today')
    expect(note).toContain('09:00–09:30 · Team standup')
    expect(note).toContain("Mom's birthday *(all day)*")
  })

  it('puts Events Today after Due Today', () => {
    const events: CalendarEvent[] = [
      { uid: 'e1', name: 'Meeting', date: '2026-03-29', startTime: '10:00', endTime: '11:00', isAllDay: false },
    ]
    const note = generateDailyNote(tasks, events)
    const dueTodayIndex = note.indexOf('### Due Today')
    const eventsIndex = note.indexOf('### Events Today')
    expect(dueTodayIndex).toBeLessThan(eventsIndex)
  })

  it('skips Events Today section when no events', () => {
    const note = generateDailyNote(tasks, [])
    expect(note).not.toContain('### Events Today')
  })

  it('skips Events Today section when events is undefined', () => {
    const note = generateDailyNote(tasks)
    expect(note).not.toContain('### Events Today')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `generateDailyNote` does not accept events parameter yet.

- [ ] **Step 3: Update `src/core/dailyNoteGenerator.ts`**

Change the `generateDailyNote` function signature and add the Events Today section.

Add this import at the top of the file:

```typescript
import { CalendarEvent } from '../calendar/types'
```

Change the function signature from:

```typescript
export function generateDailyNote(tasks: Task[]): string {
```

to:

```typescript
export function generateDailyNote(tasks: Task[], events?: CalendarEvent[]): string {
```

Add this block right after the Due Today section (after the `if (overdue.length === 0 && dueToday.length === 0 && inbox.length === 0)` block, before the `// ── This Week ──` comment):

```typescript
  // ── Events Today ──
  if (events && events.length > 0) {
    sections.push('### Events Today')
    for (const event of events) {
      if (event.isAllDay) {
        sections.push(`- ${event.name} *(all day)*`)
      } else {
        sections.push(`- ${event.startTime}–${event.endTime} · ${event.name}`)
      }
    }
    sections.push('')
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass including the 4 new event tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/dailyNoteGenerator.ts tests/core/dailyNoteGenerator.test.ts
git commit -m "feat: add Events Today section to daily note generator

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

---

## Task 5: Update `today.ts` to Fetch Calendar Events

**Files:**
- Modify: `src/commands/today.ts`

- [ ] **Step 1: Update `src/commands/today.ts`**

Add import at top:

```typescript
import { fetchTodayEvents } from '../calendar/icloudClient'
```

In the `runToday` function, change:

```typescript
  // Step 2: Scan all tasks (with updated done states)
  const tasks = await scanTasks(config)

  // Step 3: Generate and write the consolidated daily note
  const note = generateDailyNote(tasks)
```

to:

```typescript
  // Step 2: Scan all tasks (with updated done states)
  const tasks = await scanTasks(config)

  // Step 3: Fetch calendar events (gracefully skip on failure)
  let events: import('../calendar/types').CalendarEvent[] = []
  try {
    events = await fetchTodayEvents()
  } catch (err: any) {
    console.log(chalk.yellow(`Warning: Could not fetch calendar events: ${err.message}`))
  }

  // Step 4: Generate and write the consolidated daily note
  const note = generateDailyNote(tasks, events)
```

Also update the summary output to include event count:

```typescript
  console.log(
    chalk.green(
      `Notes updated: ${synced} tasks marked done · today: ${todayTasks.length} tasks · ${events.length} events`
    )
  )
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass. (The today.test.ts tests still work because `fetchTodayEvents` returns `[]` when no credentials are configured, so it gracefully degrades.)

- [ ] **Step 4: Commit**

```bash
git add src/commands/today.ts
git commit -m "feat: fetch iCloud calendar events in task today

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

---

## Task 6: Calendar CLI Commands

**Files:**
- Create: `src/commands/calendar.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Write `src/commands/calendar.ts`**

```typescript
import chalk from 'chalk'
import dayjs from 'dayjs'
import { parseEventInput } from '../calendar/eventParser'
import { createEvent } from '../calendar/icloudClient'

export async function addCalendarEvent(input: string): Promise<void> {
  const parsed = parseEventInput(input)

  await createEvent(parsed.name, parsed.date, parsed.startTime, parsed.endTime, parsed.isAllDay)

  const dateDisplay = dayjs(parsed.date).format('MMM D, YYYY')
  if (parsed.isAllDay) {
    console.log(chalk.green(`Event created: ${parsed.name}`))
    console.log(chalk.gray(`   ${dateDisplay} · all day`))
  } else {
    console.log(chalk.green(`Event created: ${parsed.name}`))
    console.log(chalk.gray(`   ${dateDisplay} · ${parsed.startTime} – ${parsed.endTime}`))
  }
}
```

- [ ] **Step 2: Update `src/cli.ts` — register calendar commands**

Add import at top:

```typescript
import { addCalendarEvent } from './commands/calendar'
```

Add before `program.parse(process.argv)`:

```typescript
const calendar = program.command('calendar').description('Manage calendar events')
calendar
  .command('add <text>')
  .description('Add an event to your iCloud calendar')
  .action(async (text: string) => {
    try {
      await addCalendarEvent(text)
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`))
    }
  })
calendar
  .command('today')
  .description('Regenerate daily note with fresh calendar events')
  .action(async () => {
    const config = await getConfig()
    await runToday(config)
  })
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/commands/calendar.ts src/cli.ts
git commit -m "feat: add calendar add and calendar today CLI commands

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

---

## Task 7: Integration Test and Docs Update

**Files:**
- Create: `tests/calendar/icloudClient.test.ts`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write integration test**

This test requires iCloud credentials to run. It's skipped in CI.

```typescript
// tests/calendar/icloudClient.test.ts
import { describe, it, expect } from 'vitest'
import { fetchTodayEvents } from '../../src/calendar/icloudClient'

describe('icloudClient', () => {
  it('fetchTodayEvents returns an array (empty or with events)', async () => {
    // This test requires ICLOUD_EMAIL and ICLOUD_APP_PASSWORD in .env
    // It verifies the CalDAV connection works and returns valid data
    const events = await fetchTodayEvents()
    expect(Array.isArray(events)).toBe(true)
    for (const event of events) {
      expect(event).toHaveProperty('uid')
      expect(event).toHaveProperty('name')
      expect(event).toHaveProperty('date')
      expect(event).toHaveProperty('isAllDay')
    }
  })
})
```

- [ ] **Step 2: Run integration test**

Run: `npm test`
Expected: All tests pass including the iCloud integration test (credentials are in `.env`).

- [ ] **Step 3: Update `README.md`**

Add this section after the "Daily Note Generation" section:

```markdown
### Calendar Integration

```bash
task calendar add "Bettendorf swim meet on 4/26 from 1pm to 3pm"   # Timed event
task calendar add "Dentist appointment tomorrow at 2pm"              # 1-hour default
task calendar add "Mom's birthday on 5/15"                           # All-day event
task calendar today                                                   # Refresh daily note with events
```

Events from your iCloud calendar appear in the daily note under "Events Today". Creating events from the CLI adds them directly to your iCloud Home calendar.

**Setup:** Generate an app-specific password at appleid.apple.com and add your credentials to `.env` (see `.env.template`).
```

- [ ] **Step 4: Update `CHANGELOG.md`**

Add under `## [Unreleased]` at the top (before the `## [0.1.0]` section):

```markdown
## [Unreleased]

### Added
- `task calendar add` command — create events on iCloud Home calendar using natural language
- `task calendar today` command — regenerate daily note with fresh calendar events
- Events Today section in the daily note showing today's iCloud calendar events after Due Today
- All-day event support (no time given = all-day)
- Default 1-hour duration when only a start time is provided
- Graceful fallback when iCloud credentials aren't configured or network is unavailable
```

- [ ] **Step 5: Update `CLAUDE.md`**

In the Key Constraints section, add:

```markdown
- **Calendar credentials live in `.env` only** — never in `config.json` which could sync via Obsidian.
```

In the Key Commands section, add:

```markdown
task calendar add "event name on date at time"   # Create iCloud event
task calendar today                                # Refresh daily note with events
```

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add tests/calendar/icloudClient.test.ts README.md CHANGELOG.md CLAUDE.md
git commit -m "feat: add calendar integration tests, update docs and changelog

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

---

## Self-Review Against Spec

| Spec Requirement | Covered in Task |
|---|---|
| `task calendar add` with NLP parsing | Task 2 (parser) + Task 6 (command) |
| `task calendar today` command | Task 6 (command) |
| Events Today section in daily note | Task 4 (generator) |
| Events appear after Due Today | Task 4 (test verifies ordering) |
| Timed events: `HH:MM–HH:MM · name` | Task 4 (generator) |
| All-day events: `name *(all day)*` | Task 4 (generator) |
| Events sorted: timed first, all-day last | Task 3 (icloudClient sort) |
| 1-hour default when no end time | Task 2 (parser) |
| All-day when no time given | Task 2 (parser) |
| Graceful skip when no credentials | Task 3 (returns `[]`) + Task 5 (try/catch) |
| Graceful skip when network fails | Task 5 (try/catch in today.ts) |
| Warning when calendar not found | Task 3 (`console.warn`) |
| Error when create fails | Task 6 (try/catch in CLI) |
| Error when no date parsed | Task 2 (throws) |
| Credentials in `.env` only | Task 3 (reads `process.env`) |
| README updated | Task 7 |
| CHANGELOG updated | Task 7 |
| No events in This Week / Next Week | Task 4 (only in Today section) |
| Events are read-only in note | By design (no checkbox sync for events) |
| Definition of done | Task 6 (add event) + Task 5 (events in note) |
