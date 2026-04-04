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
