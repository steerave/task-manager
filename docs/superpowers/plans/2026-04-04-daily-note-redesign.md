# Daily Note Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the daily note layout around a flat "All Open Tasks by Domain" view, add auto-regeneration on every task mutation with a calendar cache, and add a `task priority` shortcut command.

**Architecture:** Introduce a `noteRefresher.ts` module that centralizes daily note regeneration and owns the calendar cache logic. Each mutation command calls it with `{ freshCalendar: false }`; only `task today` / `task calendar today` passes `{ freshCalendar: true }`. `dailyNoteGenerator.ts` is rewritten as a pure function producing the new layout.

**Tech Stack:** TypeScript, Node.js, commander, gray-matter, dayjs, fs-extra, vitest, chalk

**Spec:** `docs/superpowers/specs/2026-04-02-daily-note-redesign.md`

---

## File Structure

**New files:**
- `src/core/noteRefresher.ts` — orchestration + calendar cache read/write
- `src/commands/priority.ts` — `task priority <id> <level>` command
- `tests/core/noteRefresher.test.ts` — unit tests for refresh layer
- `tests/commands/priority.test.ts` — unit tests for priority command

**Modified files:**
- `src/core/dailyNoteGenerator.ts` — rewrite layout (all open by domain, sorted priority+date)
- `src/commands/today.ts` — delegate to `refreshDailyNote({ freshCalendar: true })`
- `src/commands/add.ts` — call `refreshDailyNote({ freshCalendar: false })` at end
- `src/commands/done.ts` — call `refreshDailyNote({ freshCalendar: false })` at end
- `src/commands/update.ts` — call `refreshDailyNote({ freshCalendar: false })` at end
- `src/commands/delete.ts` — call `refreshDailyNote({ freshCalendar: false })` at end
- `src/commands/waiting.ts` — call `refreshDailyNote({ freshCalendar: false })` at end
- `src/cli.ts` — register `priority` command
- `tests/core/dailyNoteGenerator.test.ts` — rewrite tests for new layout
- `.gitignore` — add `.calendar-cache.json` (in case vault is the repo)
- `README.md` — update Commands and Features sections
- `CHANGELOG.md` — add entry under `[Unreleased]`

---

## Task 1: Rewrite `dailyNoteGenerator.ts` Tests (Red)

**Files:**
- Modify: `tests/core/dailyNoteGenerator.test.ts`

Replace all existing test cases with ones that describe the new layout.

- [ ] **Step 1: Replace the test file with new layout tests**

Write to `tests/core/dailyNoteGenerator.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateDailyNote, parseCheckedTaskIds } from '../../src/core/dailyNoteGenerator'
import { Task } from '../../src/core/types'
import { CalendarEvent } from '../../src/calendar/types'

const tasks: Task[] = [
  { id: 't-001', name: 'Overdue high', due: '2026-03-27', tags: ['work', 'priority/high', 'status/todo'], created: '2026-03-27', completed: null },
  { id: 't-002', name: 'Due today medium', due: '2026-03-29', tags: ['personal', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
  { id: 't-003', name: 'Later low', due: '2026-04-05', tags: ['work', 'priority/low', 'status/todo'], created: '2026-03-29', completed: null },
  { id: 't-004', name: 'No due date', due: null, tags: ['personal', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
  { id: 't-005', name: 'Project task', due: '2026-04-01', tags: ['personal-projects', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
]

describe('dailyNoteGenerator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the Today header and All Open Tasks section', () => {
    const note = generateDailyNote(tasks)
    expect(note).toContain('## Today')
    expect(note).toContain('### All Open Tasks')
  })

  it('groups tasks under domain subheadings with #### prefix', () => {
    const note = generateDailyNote(tasks)
    expect(note).toContain('#### Work')
    expect(note).toContain('#### Personal')
    expect(note).toContain('#### Personal Projects')
  })

  it('sorts tasks within a domain by priority (high>medium>low) then by due date ascending', () => {
    const mixedPriority: Task[] = [
      { id: 'a', name: 'Low early', due: '2026-03-28', tags: ['work', 'priority/low', 'status/todo'], created: '2026-03-29', completed: null },
      { id: 'b', name: 'High late', due: '2026-04-10', tags: ['work', 'priority/high', 'status/todo'], created: '2026-03-29', completed: null },
      { id: 'c', name: 'Medium mid', due: '2026-04-01', tags: ['work', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
      { id: 'd', name: 'High early', due: '2026-03-30', tags: ['work', 'priority/high', 'status/todo'], created: '2026-03-29', completed: null },
    ]
    const note = generateDailyNote(mixedPriority)
    const idxHighEarly = note.indexOf('High early')
    const idxHighLate = note.indexOf('High late')
    const idxMedium = note.indexOf('Medium mid')
    const idxLow = note.indexOf('Low early')
    expect(idxHighEarly).toBeLessThan(idxHighLate)
    expect(idxHighLate).toBeLessThan(idxMedium)
    expect(idxMedium).toBeLessThan(idxLow)
  })

  it('puts tasks with no due date at the bottom of their priority group', () => {
    const sample: Task[] = [
      { id: 'a', name: 'Dated medium', due: '2026-04-01', tags: ['personal', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
      { id: 'b', name: 'Undated medium', due: null, tags: ['personal', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
      { id: 'c', name: 'Dated high', due: '2026-04-02', tags: ['personal', 'priority/high', 'status/todo'], created: '2026-03-29', completed: null },
    ]
    const note = generateDailyNote(sample)
    const idxHigh = note.indexOf('Dated high')
    const idxDated = note.indexOf('Dated medium')
    const idxUndated = note.indexOf('Undated medium')
    expect(idxHigh).toBeLessThan(idxDated)
    expect(idxDated).toBeLessThan(idxUndated)
  })

  it('marks overdue tasks with ⚠️ and overdue label', () => {
    const note = generateDailyNote(tasks)
    expect(note).toContain('⚠️')
    expect(note).toContain('overdue')
    expect(note).toMatch(/⚠️.*Overdue high/)
  })

  it('shows priority label inline after domain', () => {
    const note = generateDailyNote(tasks)
    expect(note).toMatch(/Overdue high.*· High/)
    expect(note).toMatch(/Due today medium.*· Medium/)
    expect(note).toMatch(/Later low.*· Low/)
  })

  it('excludes done, blocked, and waiting tasks from All Open Tasks', () => {
    const extra: Task[] = [
      ...tasks,
      { id: 'done', name: 'Finished', due: '2026-03-29', tags: ['work', 'priority/low', 'status/done'], created: '2026-03-29', completed: '2026-03-29' },
      { id: 'block', name: 'Blocked item', due: '2026-03-29', tags: ['work', 'priority/low', 'status/blocked'], created: '2026-03-29', completed: null },
      { id: 'wait', name: 'Waiting item', due: '2026-03-29', tags: ['work', 'priority/low', 'status/waiting'], created: '2026-03-29', completed: null },
    ]
    const note = generateDailyNote(extra)
    const openSection = note.substring(note.indexOf('### All Open Tasks'), note.indexOf('### Waiting On'))
    expect(openSection).not.toContain('Finished')
    expect(openSection).not.toContain('Blocked item')
    expect(openSection).not.toContain('Waiting item')
  })

  it('renders Waiting On section with [/] checkbox', () => {
    const waitingTasks: Task[] = [
      { id: 'w1', name: 'Waiting item', due: '2026-04-01', tags: ['personal', 'priority/medium', 'status/waiting'], created: '2026-03-29', completed: null },
    ]
    const note = generateDailyNote(waitingTasks)
    expect(note).toContain('### Waiting On')
    expect(note).toContain('- [/] [[w1|Waiting item]]')
  })

  it('renders Events section when events are provided', () => {
    const events: CalendarEvent[] = [
      { uid: 'e1', name: 'Team standup', date: '2026-03-29', startTime: '09:00', endTime: '09:30', isAllDay: false },
      { uid: 'e2', name: 'Holiday', date: '2026-03-29', startTime: null, endTime: null, isAllDay: true },
    ]
    const note = generateDailyNote(tasks, events)
    expect(note).toContain('### Events')
    expect(note).toContain('09:00–09:30 · Team standup')
    expect(note).toContain('Holiday *(all day)*')
  })

  it('renders Completed Today section with [x] for tasks completed today', () => {
    const withCompleted: Task[] = [
      ...tasks,
      { id: 'c1', name: 'Finished today', due: '2026-03-29', tags: ['work', 'priority/low', 'status/done'], created: '2026-03-29', completed: '2026-03-29' },
    ]
    const note = generateDailyNote(withCompleted)
    expect(note).toContain('### Completed Today')
    expect(note).toContain('- [x] [[c1|Finished today]]')
  })

  it('orders sections: All Open Tasks > Waiting On > Events > Completed Today', () => {
    const events: CalendarEvent[] = [
      { uid: 'e1', name: 'Meeting', date: '2026-03-29', startTime: '10:00', endTime: '11:00', isAllDay: false },
    ]
    const withAll: Task[] = [
      ...tasks,
      { id: 'w', name: 'Waiting item', due: '2026-04-01', tags: ['personal', 'priority/medium', 'status/waiting'], created: '2026-03-29', completed: null },
      { id: 'd', name: 'Done item', due: '2026-03-29', tags: ['work', 'priority/low', 'status/done'], created: '2026-03-29', completed: '2026-03-29' },
    ]
    const note = generateDailyNote(withAll, events)
    const idxOpen = note.indexOf('### All Open Tasks')
    const idxWaiting = note.indexOf('### Waiting On')
    const idxEvents = note.indexOf('### Events')
    const idxCompleted = note.indexOf('### Completed Today')
    expect(idxOpen).toBeLessThan(idxWaiting)
    expect(idxWaiting).toBeLessThan(idxEvents)
    expect(idxEvents).toBeLessThan(idxCompleted)
  })

  it('omits Waiting On, Events, and Completed Today sections when empty', () => {
    const note = generateDailyNote(tasks)
    expect(note).not.toContain('### Waiting On')
    expect(note).not.toContain('### Events')
    expect(note).not.toContain('### Completed Today')
  })

  it('does not include This Week or Next Week sections', () => {
    const note = generateDailyNote(tasks)
    expect(note).not.toContain('## This Week')
    expect(note).not.toContain('## Next Week')
  })

  it('embeds task IDs as HTML comments and wiki-links', () => {
    const note = generateDailyNote(tasks)
    expect(note).toContain('<!-- task:t-001 -->')
    expect(note).toContain('[[t-001|Overdue high]]')
  })

  it('parseCheckedTaskIds extracts IDs from checked checkboxes', () => {
    const noteContent = `
- [x] Overdue high — Work · High <!-- task:t-001 -->
- [ ] Due today — Personal · Medium <!-- task:t-002 -->
    `.trim()
    const ids = parseCheckedTaskIds(noteContent)
    expect(ids).toEqual(['t-001'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx vitest run tests/core/dailyNoteGenerator.test.ts`

Expected: Most tests FAIL because the current generator still produces the old layout (Today/This Week/Next Week).

- [ ] **Step 3: Commit failing tests**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git add tests/core/dailyNoteGenerator.test.ts
git commit -m "test: rewrite dailyNoteGenerator tests for new layout"
```

---

## Task 2: Rewrite `dailyNoteGenerator.ts` (Green)

**Files:**
- Modify: `src/core/dailyNoteGenerator.ts`

Replace the layout logic to produce the new flat-by-domain structure.

- [ ] **Step 1: Replace the file contents**

Write to `src/core/dailyNoteGenerator.ts`:

```typescript
import dayjs from 'dayjs'
import { Task } from './types'
import { CalendarEvent } from '../calendar/types'
import { isToday, isOverdue } from '../utils/dateUtils'

const DOMAINS = ['work', 'personal', 'personal-projects']

function domainLabel(domain: string): string {
  return domain.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function priorityRank(task: Task): number {
  if (task.tags.includes('priority/high')) return 0
  if (task.tags.includes('priority/medium')) return 1
  if (task.tags.includes('priority/low')) return 2
  return 1 // default to medium if unset
}

function priorityLabel(task: Task): string {
  if (task.tags.includes('priority/high')) return 'High'
  if (task.tags.includes('priority/low')) return 'Low'
  return 'Medium'
}

function getDomain(task: Task): string {
  for (const d of DOMAINS) {
    if (task.tags.includes(d)) return d
  }
  return 'inbox'
}

function isOpen(task: Task): boolean {
  return (
    !task.tags.includes('status/done') &&
    !task.tags.includes('status/blocked') &&
    !task.tags.includes('status/waiting')
  )
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pa = priorityRank(a)
    const pb = priorityRank(b)
    if (pa !== pb) return pa - pb

    // Within same priority: due date ascending, nulls last
    if (a.due === null && b.due === null) return 0
    if (a.due === null) return 1
    if (b.due === null) return -1
    return a.due.localeCompare(b.due)
  })
}

function openTaskLine(task: Task): string {
  const overdue = task.due !== null && isOverdue(task.due)
  const prefix = overdue ? '⚠️ ' : ''
  const dueBit = task.due
    ? overdue
      ? ` *(due ${dayjs(task.due).format('MMM D')} — overdue)*`
      : ` *(due ${dayjs(task.due).format('MMM D')})*`
    : ''
  const priority = priorityLabel(task)
  return `- [ ] ${prefix}[[${task.id}|${task.name}]]${dueBit} · ${priority} <!-- task:${task.id} -->`
}

function waitingTaskLine(task: Task): string {
  const dueBit = task.due ? ` *(due ${dayjs(task.due).format('MMM D')})*` : ''
  const domain = domainLabel(getDomain(task))
  return `- [/] [[${task.id}|${task.name}]]${dueBit} — ${domain} <!-- task:${task.id} -->`
}

function completedTaskLine(task: Task): string {
  const domain = domainLabel(getDomain(task))
  return `- [x] [[${task.id}|${task.name}]] — ${domain} <!-- task:${task.id} -->`
}

export function generateDailyNote(tasks: Task[], events?: CalendarEvent[]): string {
  const dateStr = dayjs().format('MMMM D, YYYY')
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm')

  const open = tasks.filter(isOpen)
  const waiting = tasks.filter((t) => t.tags.includes('status/waiting'))
  const completedToday = tasks.filter(
    (t) => t.tags.includes('status/done') && t.completed && isToday(t.completed)
  )

  const sections: string[] = []

  sections.push('')
  sections.push(`## Today — ${dateStr}`)
  sections.push('')

  // ── All Open Tasks ──
  sections.push('### All Open Tasks')
  sections.push('')
  let anyOpen = false
  for (const domain of DOMAINS) {
    const domainTasks = sortTasks(open.filter((t) => t.tags.includes(domain)))
    if (domainTasks.length === 0) continue
    anyOpen = true
    sections.push(`#### ${domainLabel(domain)}`)
    domainTasks.forEach((t) => sections.push(openTaskLine(t)))
    sections.push('')
  }
  // Inbox-only tasks (no domain)
  const inboxTasks = sortTasks(open.filter((t) => !DOMAINS.some((d) => t.tags.includes(d))))
  if (inboxTasks.length > 0) {
    anyOpen = true
    sections.push('#### Inbox')
    inboxTasks.forEach((t) => sections.push(openTaskLine(t)))
    sections.push('')
  }
  if (!anyOpen) {
    sections.push('*(No open tasks)*')
    sections.push('')
  }

  // ── Waiting On ──
  if (waiting.length > 0) {
    sections.push('### Waiting On')
    waiting.forEach((t) => sections.push(waitingTaskLine(t)))
    sections.push('')
  }

  // ── Events ──
  if (events && events.length > 0) {
    sections.push('### Events')
    for (const event of events) {
      if (event.isAllDay) {
        sections.push(`- ${event.name} *(all day)*`)
      } else {
        sections.push(`- ${event.startTime}–${event.endTime} · ${event.name}`)
      }
    }
    sections.push('')
  }

  // ── Completed Today ──
  if (completedToday.length > 0) {
    sections.push('### Completed Today')
    completedToday.forEach((t) => sections.push(completedTaskLine(t)))
    sections.push('')
  }

  sections.push('---')
  sections.push(`*Generated by task-manager · ${timestamp}*`)

  return sections.join('\n')
}

export function parseCheckedTaskIds(noteContent: string): string[] {
  const lines = noteContent.split('\n')
  const ids: string[] = []
  for (const line of lines) {
    if (/^- \[x\]/.test(line)) {
      const match = line.match(/<!-- task:([\w-]+) -->/)
      if (match) ids.push(match[1])
    }
  }
  return ids
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx vitest run tests/core/dailyNoteGenerator.test.ts`

Expected: All tests PASS.

- [ ] **Step 3: Run full test suite to check for regressions**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx vitest run`

Expected: `tests/commands/today.test.ts` and `tests/integration/endToEnd.test.ts` may fail because they assert on old section names like "This Week" or "Needs Triage". Note which tests fail — they will be updated in Task 8.

- [ ] **Step 4: Type-check**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git add src/core/dailyNoteGenerator.ts
git commit -m "feat: rewrite daily note layout as flat all-open-tasks view"
```

---

## Task 3: Write `noteRefresher.ts` Tests (Red)

**Files:**
- Create: `tests/core/noteRefresher.test.ts`

- [ ] **Step 1: Write the test file**

Write to `tests/core/noteRefresher.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { refreshDailyNote } from '../../src/core/noteRefresher'
import { Config } from '../../src/core/types'
import { CalendarEvent } from '../../src/calendar/types'

// Mock the iCloud client so tests don't hit the network
vi.mock('../../src/calendar/icloudClient', () => ({
  fetchTodayEvents: vi.fn(),
}))
import { fetchTodayEvents } from '../../src/calendar/icloudClient'

describe('noteRefresher', () => {
  let vaultPath: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T10:00:00'))
    vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), 'nr-test-'))
    await fs.ensureDir(path.join(vaultPath, 'Tasks'))
    await fs.ensureDir(path.join(vaultPath, 'DailyNotes'))
    config = {
      vaultPath,
      tags: {
        domains: ['work', 'personal', 'personal-projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: [],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox', 'status/waiting'],
      },
    }
    ;(fetchTodayEvents as any).mockReset()
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(vaultPath)
  })

  it('writes a daily note file at DailyNotes/YYYYMMDD - Daily Task.md', async () => {
    ;(fetchTodayEvents as any).mockResolvedValue([])
    await refreshDailyNote(config, { freshCalendar: true })
    const noteFile = path.join(vaultPath, 'DailyNotes', '20260404 - Daily Task.md')
    expect(await fs.pathExists(noteFile)).toBe(true)
  })

  it('fetches fresh calendar events when freshCalendar is true', async () => {
    const events: CalendarEvent[] = [
      { uid: 'e1', name: 'Meeting', date: '2026-04-04', startTime: '10:00', endTime: '11:00', isAllDay: false },
    ]
    ;(fetchTodayEvents as any).mockResolvedValue(events)
    await refreshDailyNote(config, { freshCalendar: true })
    expect(fetchTodayEvents).toHaveBeenCalledOnce()
    const noteFile = path.join(vaultPath, 'DailyNotes', '20260404 - Daily Task.md')
    const content = await fs.readFile(noteFile, 'utf8')
    expect(content).toContain('Meeting')
  })

  it('writes calendar events to cache file after fresh fetch', async () => {
    const events: CalendarEvent[] = [
      { uid: 'e1', name: 'Cached meeting', date: '2026-04-04', startTime: '13:00', endTime: '14:00', isAllDay: false },
    ]
    ;(fetchTodayEvents as any).mockResolvedValue(events)
    await refreshDailyNote(config, { freshCalendar: true })
    const cacheFile = path.join(vaultPath, '.calendar-cache.json')
    expect(await fs.pathExists(cacheFile)).toBe(true)
    const cache = JSON.parse(await fs.readFile(cacheFile, 'utf8'))
    expect(cache.date).toBe('2026-04-04')
    expect(cache.events).toHaveLength(1)
    expect(cache.events[0].name).toBe('Cached meeting')
  })

  it('reads events from cache when freshCalendar is false and cache is current', async () => {
    const cacheFile = path.join(vaultPath, '.calendar-cache.json')
    await fs.writeFile(
      cacheFile,
      JSON.stringify({
        date: '2026-04-04',
        events: [
          { uid: 'e1', name: 'From cache', date: '2026-04-04', startTime: '09:00', endTime: '10:00', isAllDay: false },
        ],
      })
    )
    await refreshDailyNote(config, { freshCalendar: false })
    expect(fetchTodayEvents).not.toHaveBeenCalled()
    const noteFile = path.join(vaultPath, 'DailyNotes', '20260404 - Daily Task.md')
    const content = await fs.readFile(noteFile, 'utf8')
    expect(content).toContain('From cache')
  })

  it('returns empty events when freshCalendar is false and cache is stale (different date)', async () => {
    const cacheFile = path.join(vaultPath, '.calendar-cache.json')
    await fs.writeFile(
      cacheFile,
      JSON.stringify({
        date: '2026-04-03',
        events: [
          { uid: 'e1', name: 'Yesterday event', date: '2026-04-03', startTime: '09:00', endTime: '10:00', isAllDay: false },
        ],
      })
    )
    await refreshDailyNote(config, { freshCalendar: false })
    expect(fetchTodayEvents).not.toHaveBeenCalled()
    const noteFile = path.join(vaultPath, 'DailyNotes', '20260404 - Daily Task.md')
    const content = await fs.readFile(noteFile, 'utf8')
    expect(content).not.toContain('Yesterday event')
    expect(content).not.toContain('### Events')
  })

  it('returns empty events when freshCalendar is false and cache file does not exist', async () => {
    await refreshDailyNote(config, { freshCalendar: false })
    expect(fetchTodayEvents).not.toHaveBeenCalled()
    const noteFile = path.join(vaultPath, 'DailyNotes', '20260404 - Daily Task.md')
    const content = await fs.readFile(noteFile, 'utf8')
    expect(content).not.toContain('### Events')
  })

  it('gracefully handles iCloud fetch errors when freshCalendar is true', async () => {
    ;(fetchTodayEvents as any).mockRejectedValue(new Error('network fail'))
    await expect(refreshDailyNote(config, { freshCalendar: true })).resolves.toBeUndefined()
    const noteFile = path.join(vaultPath, 'DailyNotes', '20260404 - Daily Task.md')
    expect(await fs.pathExists(noteFile)).toBe(true)
  })

  it('scans tasks from Tasks directory and includes them in the note', async () => {
    const taskFile = path.join(vaultPath, 'Tasks', 'sample-task-0001.md')
    await fs.writeFile(
      taskFile,
      `---
name: Sample open task
due: '2026-04-05'
tags:
  - personal
  - priority/medium
  - status/todo
created: '2026-04-04'
id: sample-task-0001
---

`
    )
    ;(fetchTodayEvents as any).mockResolvedValue([])
    await refreshDailyNote(config, { freshCalendar: true })
    const noteFile = path.join(vaultPath, 'DailyNotes', '20260404 - Daily Task.md')
    const content = await fs.readFile(noteFile, 'utf8')
    expect(content).toContain('Sample open task')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx vitest run tests/core/noteRefresher.test.ts`

Expected: FAIL — `Cannot find module '../../src/core/noteRefresher'`

- [ ] **Step 3: Commit failing tests**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git add tests/core/noteRefresher.test.ts
git commit -m "test: add noteRefresher tests"
```

---

## Task 4: Implement `noteRefresher.ts` (Green)

**Files:**
- Create: `src/core/noteRefresher.ts`

- [ ] **Step 1: Write the module**

Write to `src/core/noteRefresher.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx vitest run tests/core/noteRefresher.test.ts`

Expected: All tests PASS.

- [ ] **Step 3: Type-check**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git add src/core/noteRefresher.ts
git commit -m "feat: add noteRefresher with calendar cache"
```

---

## Task 5: Simplify `today.ts` to Use the Refresher

**Files:**
- Modify: `src/commands/today.ts`

Rewrite `today.ts` so it delegates to `refreshDailyNote({ freshCalendar: true })`. Keep the checkbox sync step.

- [ ] **Step 1: Replace file contents**

Write to `src/commands/today.ts`:

```typescript
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

  // Step 1: Sync checkboxes from existing daily note
  const synced = await syncCheckboxes(config, noteFile)

  // Step 2: Regenerate note with fresh calendar events
  await refreshDailyNote(config, { freshCalendar: true })

  console.log(chalk.green(`Notes updated: ${synced} tasks marked done`))
  console.log(chalk.gray(`   ${noteFile}`))
}
```

- [ ] **Step 2: Type-check**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git add src/commands/today.ts
git commit -m "refactor: delegate today command to noteRefresher"
```

---

## Task 6: Add `refreshDailyNote` Calls to Mutation Commands

**Files:**
- Modify: `src/commands/add.ts`
- Modify: `src/commands/done.ts`
- Modify: `src/commands/update.ts`
- Modify: `src/commands/delete.ts`
- Modify: `src/commands/waiting.ts`

Each gets a `refreshDailyNote(config, { freshCalendar: false })` call at the end (after the existing console.log).

- [ ] **Step 1: Update `add.ts`**

Add to imports at the top of `src/commands/add.ts`:

```typescript
import { refreshDailyNote } from '../core/noteRefresher'
```

Then at the very end of the `addTask` function (after the last `console.log`), add:

```typescript
  await refreshDailyNote(config, { freshCalendar: false })
```

- [ ] **Step 2: Update `done.ts`**

Replace `src/commands/done.ts` with:

```typescript
import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { today } from '../utils/dateUtils'
import { refreshDailyNote } from '../core/noteRefresher'

export async function markDone(taskId: string, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)
  const newTags = task.tags
    .filter((t) => t !== 'status/todo' && t !== 'status/inbox' && t !== 'status/blocked' && t !== 'status/waiting')
    .concat('status/done')
  await updateTask(filePath, { tags: newTags, completed: today() })
  console.log(chalk.green(`Done: ${task.name}`))
  await refreshDailyNote(config, { freshCalendar: false })
}
```

- [ ] **Step 3: Update `update.ts`**

Add to imports at the top of `src/commands/update.ts`:

```typescript
import { refreshDailyNote } from '../core/noteRefresher'
```

At the very end of `updateTaskCmd` (after the console.log), add:

```typescript
  await refreshDailyNote(config, { freshCalendar: false })
```

- [ ] **Step 4: Update `delete.ts`**

Replace `src/commands/delete.ts` with:

```typescript
import * as fs from 'fs-extra'
import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask } from '../core/taskFile'
import { refreshDailyNote } from '../core/noteRefresher'

export async function deleteTask(taskId: string, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)
  await fs.remove(filePath)
  console.log(chalk.red(`Deleted: ${task.name}`))
  await refreshDailyNote(config, { freshCalendar: false })
}
```

- [ ] **Step 5: Update `waiting.ts`**

Replace `src/commands/waiting.ts` with:

```typescript
import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { refreshDailyNote } from '../core/noteRefresher'

export async function markWaiting(taskId: string, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)
  const newTags = task.tags
    .filter((t) => t !== 'status/todo' && t !== 'status/inbox' && t !== 'status/blocked' && t !== 'status/done')
    .concat('status/waiting')
  await updateTask(filePath, { tags: newTags, completed: null })
  console.log(chalk.cyan(`Waiting: ${task.name}`))
  await refreshDailyNote(config, { freshCalendar: false })
}
```

- [ ] **Step 6: Type-check**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git add src/commands/add.ts src/commands/done.ts src/commands/update.ts src/commands/delete.ts src/commands/waiting.ts
git commit -m "feat: auto-regenerate daily note on task mutations"
```

---

## Task 7: Add `task priority` Command (TDD)

**Files:**
- Create: `tests/commands/priority.test.ts`
- Create: `src/commands/priority.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Write failing test**

Write to `tests/commands/priority.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { setPriority } from '../../src/commands/priority'
import { Config } from '../../src/core/types'
import { readTask } from '../../src/core/taskFile'

vi.mock('../../src/calendar/icloudClient', () => ({
  fetchTodayEvents: vi.fn().mockResolvedValue([]),
}))

describe('priority command', () => {
  let vaultPath: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T10:00:00'))
    vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pri-test-'))
    await fs.ensureDir(path.join(vaultPath, 'Tasks'))
    await fs.ensureDir(path.join(vaultPath, 'DailyNotes'))
    config = {
      vaultPath,
      tags: {
        domains: ['work', 'personal', 'personal-projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: [],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox', 'status/waiting'],
      },
    }
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(vaultPath)
  })

  async function createTask(id: string, tags: string[]): Promise<void> {
    const file = path.join(vaultPath, 'Tasks', `${id}.md`)
    await fs.writeFile(
      file,
      `---
name: Sample task
due: '2026-04-05'
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
created: '2026-04-04'
id: ${id}
---

`
    )
  }

  it('sets priority to high, removing existing priority tag', async () => {
    await createTask('sample-0001', ['work', 'priority/medium', 'status/todo'])
    await setPriority('sample-0001', 'high', config)
    const task = await readTask(path.join(vaultPath, 'Tasks', 'sample-0001.md'))
    expect(task.tags).toContain('priority/high')
    expect(task.tags).not.toContain('priority/medium')
  })

  it('sets priority to low', async () => {
    await createTask('sample-0002', ['work', 'priority/high', 'status/todo'])
    await setPriority('sample-0002', 'low', config)
    const task = await readTask(path.join(vaultPath, 'Tasks', 'sample-0002.md'))
    expect(task.tags).toContain('priority/low')
    expect(task.tags).not.toContain('priority/high')
  })

  it('adds a priority tag when none exists', async () => {
    await createTask('sample-0003', ['work', 'status/todo'])
    await setPriority('sample-0003', 'medium', config)
    const task = await readTask(path.join(vaultPath, 'Tasks', 'sample-0003.md'))
    expect(task.tags).toContain('priority/medium')
  })

  it('rejects invalid priority levels', async () => {
    await createTask('sample-0004', ['work', 'priority/medium', 'status/todo'])
    await expect(setPriority('sample-0004', 'urgent', config)).rejects.toThrow(/Invalid priority/)
  })

  it('regenerates the daily note after setting priority', async () => {
    await createTask('sample-0005', ['personal', 'priority/medium', 'status/todo'])
    await setPriority('sample-0005', 'high', config)
    const noteFile = path.join(vaultPath, 'DailyNotes', '20260404 - Daily Task.md')
    expect(await fs.pathExists(noteFile)).toBe(true)
    const content = await fs.readFile(noteFile, 'utf8')
    expect(content).toContain('Sample task')
    expect(content).toContain('· High')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx vitest run tests/commands/priority.test.ts`

Expected: FAIL — `Cannot find module '../../src/commands/priority'`

- [ ] **Step 3: Write the implementation**

Write to `src/commands/priority.ts`:

```typescript
import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { refreshDailyNote } from '../core/noteRefresher'

const VALID_LEVELS = ['high', 'medium', 'low'] as const
type PriorityLevel = typeof VALID_LEVELS[number]

function isValidLevel(level: string): level is PriorityLevel {
  return (VALID_LEVELS as readonly string[]).includes(level)
}

export async function setPriority(taskId: string, level: string, config: Config): Promise<void> {
  if (!isValidLevel(level)) {
    throw new Error(`Invalid priority "${level}". Must be one of: high, medium, low`)
  }

  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)

  const newTags = task.tags.filter((t) => !t.startsWith('priority/')).concat(`priority/${level}`)
  await updateTask(filePath, { tags: newTags })

  const label = level.charAt(0).toUpperCase() + level.slice(1)
  console.log(chalk.green(`Priority set: ${task.name} → ${label}`))

  await refreshDailyNote(config, { freshCalendar: false })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx vitest run tests/commands/priority.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Register the command in `cli.ts`**

Add to the imports at the top of `src/cli.ts`:

```typescript
import { setPriority } from './commands/priority'
```

Then add the command registration after the `update` command block (around line 97, before the `delete` command):

```typescript
program
  .command('priority <id> <level>')
  .description('Set task priority (high | medium | low)')
  .action(async (id: string, level: string) => {
    const config = await getConfig()
    const resolved = await resolveTaskId(id, config)
    await setPriority(resolved, level, config)
  })
```

- [ ] **Step 6: Type-check**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 7: Smoke test via CLI**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx ts-node src/cli.ts priority --help`

Expected: Prints usage for the priority command.

- [ ] **Step 8: Commit**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git add src/commands/priority.ts src/cli.ts tests/commands/priority.test.ts
git commit -m "feat: add task priority shortcut command"
```

---

## Task 8: Update Existing Tests That Reference Old Layout

**Files:**
- Modify: `tests/commands/today.test.ts`
- Modify: `tests/integration/endToEnd.test.ts` (if it references old sections)

These tests assert on the old layout (This Week, Needs Triage, etc.) and will fail after the generator rewrite.

- [ ] **Step 1: Run full test suite to identify failures**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx vitest run`

Note which tests fail and which strings they assert on. The failing tests are likely checking for:
- `## This Week`
- `## Next Week`
- `### Due Today`
- `### Overdue`
- `### Needs Triage`

- [ ] **Step 2: Read the failing test files**

Read `tests/commands/today.test.ts` and `tests/integration/endToEnd.test.ts` to understand what they're testing.

- [ ] **Step 3: Update failing assertions**

For each failing assertion:
- If it asserts on old section names (`## This Week`, `### Due Today`, `### Overdue`, `### Needs Triage`), replace with equivalents in the new layout (`### All Open Tasks`, `#### <Domain>`, or `⚠️` for overdue).
- If it asserts on task content appearing in a specific old section, update to assert on the task appearing in `### All Open Tasks` under the correct `#### <Domain>` subheading.
- Preserve the intent of the test (e.g., "overdue task is shown prominently" → "overdue task has ⚠️ prefix").

Example transformation:
```typescript
// Before:
expect(note).toContain('### Due Today')
expect(note).toContain('My task')

// After:
expect(note).toContain('### All Open Tasks')
expect(note).toContain('My task')
```

- [ ] **Step 4: Run full test suite to verify all pass**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx vitest run`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git add tests/
git commit -m "test: update existing tests for new daily note layout"
```

---

## Task 9: Update `.gitignore`, README, and CHANGELOG

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add calendar cache to `.gitignore`**

Read the current `.gitignore` and add this line (under a suitable section):

```
.calendar-cache.json
```

- [ ] **Step 2: Update `README.md` Features section**

Read `README.md` and find the Features section. Add bullets describing:
- Daily note now shows all open tasks grouped by domain, sorted by priority then due date
- Auto-regenerates on every task mutation (add, done, update, delete, waiting, priority)
- Calendar events are cached to avoid redundant API calls

- [ ] **Step 3: Update `README.md` Commands section**

Add a command block for `task priority`:

```bash
task priority <id> <high|medium|low>  # Set task priority
```

- [ ] **Step 4: Update `CHANGELOG.md`**

Under `## [Unreleased]`, add a new section:

```markdown
### Changed
- Daily note redesigned: all open tasks now shown in one view grouped by domain, sorted by priority then due date
- Overdue tasks marked with ⚠️ prefix (no longer a separate section)
- Daily note auto-regenerates after every task change (add, done, update, delete, waiting, priority)
- Calendar events cached per day to avoid redundant iCloud API calls on auto-regen
- Removed This Week / Next Week / Due Today / Needs Triage sections (replaced by flat All Open Tasks view)

### Added
- `task priority <id> <level>` command — quickly set task priority to high, medium, or low
```

(Place this above any existing `### Added` under Unreleased, or merge with it.)

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git add .gitignore README.md CHANGELOG.md
git commit -m "docs: document daily note redesign and task priority command"
```

---

## Task 10: End-to-End Manual Verification

**Files:** None

- [ ] **Step 1: Run `task today`**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx ts-node src/cli.ts today`

Expected: Daily note regenerated. Open the note in the vault and confirm:
- `### All Open Tasks` is the first section
- Tasks are grouped under `#### Personal`, `#### Personal Projects`, etc.
- Overdue tasks show `⚠️` and are sorted to the top
- `### Waiting On` appears below (if any waiting tasks)
- `### Events` appears with current iCloud events
- `### Completed Today` appears at the bottom (if any)

- [ ] **Step 2: Run `task add` and confirm auto-refresh**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx ts-node src/cli.ts add "personal due tomorrow Test task for verification"`

Expected: Task added. Open the daily note — the new task should appear without running `task today`. The Events section should still show cached events (no new iCloud fetch).

- [ ] **Step 3: Run `task priority` and confirm**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx ts-node src/cli.ts priority <id> high`

Expected: Task priority updated, daily note regenerated, task sorted to top of its domain.

- [ ] **Step 4: Run `task done` and verify cleanup**

Run: `cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager" && npx ts-node src/cli.ts done <id>`

Expected: Task moved from All Open Tasks to Completed Today.

- [ ] **Step 5: Verify calendar cache file exists**

Read the vault path from `~/.taskmanager` (the launcher config), then check for the cache file:

```bash
node -e "const c=require('fs').readFileSync(require('os').homedir()+'/.taskmanager','utf8');const p=JSON.parse(c).vaultPath;console.log(p+'/.calendar-cache.json')"
```

Then `ls -la` the printed path, or use the Read tool on that path.

Expected: `.calendar-cache.json` exists in the vault root with today's date inside.

- [ ] **Step 6: Push everything**

```bash
cd "/c/Users/steerave/Desktop/Claude Projects/Task Manager"
git push
```

Expected: All commits pushed to `main`.
