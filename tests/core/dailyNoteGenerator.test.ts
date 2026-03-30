import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateDailyNote, parseCheckedTaskIds } from '../../src/core/dailyNoteGenerator'
import { Task } from '../../src/core/types'
import { CalendarEvent } from '../../src/calendar/types'

const tasks: Task[] = [
  { id: 'task-2026-03-29-001', name: 'Overdue task', due: '2026-03-27', tags: ['work', 'priority/high', 'status/todo'], created: '2026-03-27', completed: null },
  { id: 'task-2026-03-29-002', name: 'Due today', due: '2026-03-29', tags: ['personal', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
  { id: 'task-2026-03-29-003', name: 'This week', due: '2026-03-28', tags: ['work', 'priority/low', 'status/todo'], created: '2026-03-29', completed: null },
  { id: 'task-2026-03-29-004', name: 'Next week', due: '2026-04-01', tags: ['personal', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
]

describe('dailyNoteGenerator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('generates a consolidated note with Today, This Week, and Next Week sections', () => {
    const note = generateDailyNote(tasks)
    expect(note).toContain('## Today')
    expect(note).toContain('## This Week')
    expect(note).toContain('## Next Week')
  })

  it('does not include a top-level title (filename is the title)', () => {
    const note = generateDailyNote(tasks)
    expect(note).not.toMatch(/^# /m)
  })

  it('includes overdue and due today tasks in the Today section', () => {
    const note = generateDailyNote(tasks)
    expect(note).toContain('Overdue task')
    expect(note).toContain('Due today')
    expect(note).toContain('### Overdue')
    expect(note).toContain('### Due Today')
  })

  it('embeds task IDs as HTML comments and links to task files', () => {
    const note = generateDailyNote(tasks)
    expect(note).toContain('<!-- task:task-2026-03-29-001 -->')
    expect(note).toContain('[[task-2026-03-29-001|Overdue task]]')
  })

  it('excludes done tasks from Due Today but shows in Completed Today if completed today', () => {
    const withDone = [...tasks, {
      id: 'task-done', name: 'Already done', due: '2026-03-29',
      tags: ['work', 'status/done', 'priority/low'], created: '2026-03-29', completed: '2026-03-29'
    }]
    const note = generateDailyNote(withDone)
    // Should NOT appear in Due Today section
    const dueTodayIdx = note.indexOf('### Due Today')
    const completedIdx = note.indexOf('### Completed Today')
    const alreadyDoneIdx = note.indexOf('Already done')
    expect(alreadyDoneIdx).toBeGreaterThan(completedIdx)
    // Should show as checked off
    expect(note).toContain('- [x] [[task-done|Already done]]')
  })

  it('skips domain headers when no tasks exist for that domain', () => {
    const personalOnly: Task[] = [
      { id: 'p1', name: 'Personal task', due: '2026-03-28', tags: ['personal', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
    ]
    const note = generateDailyNote(personalOnly)
    expect(note).toContain('### Personal')
    expect(note).not.toContain('### Work')
    expect(note).not.toContain('### Personal Projects')
  })

  it('uses --- separators between sections', () => {
    const note = generateDailyNote(tasks)
    const separators = note.match(/^---$/gm)
    expect(separators).not.toBeNull()
    expect(separators!.length).toBeGreaterThanOrEqual(3)
  })

  it('parseCheckedTaskIds extracts IDs from checked checkboxes', () => {
    const noteContent = `
- [x] Overdue task — Work · High <!-- task:task-2026-03-29-001 -->
- [ ] Due today — Personal · Medium <!-- task:task-2026-03-29-002 -->
    `.trim()
    const ids = parseCheckedTaskIds(noteContent)
    expect(ids).toEqual(['task-2026-03-29-001'])
  })

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
})
