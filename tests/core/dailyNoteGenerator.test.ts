import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateTodayNote, generateThisWeekNote, generateNextWeekNote, parseCheckedTaskIds } from '../../src/core/dailyNoteGenerator'
import { Task } from '../../src/core/types'

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

  it('generateTodayNote includes overdue and due today sections', () => {
    const note = generateTodayNote(tasks)
    expect(note).toContain('Overdue task')
    expect(note).toContain('Due today')
    expect(note).toContain('Overdue')
    expect(note).toContain('Due Today')
  })

  it('generateTodayNote embeds task IDs as HTML comments', () => {
    const note = generateTodayNote(tasks)
    expect(note).toContain('<!-- task:task-2026-03-29-001 -->')
  })

  it('generateTodayNote excludes done tasks', () => {
    const withDone = [...tasks, {
      id: 'task-done', name: 'Already done', due: '2026-03-29',
      tags: ['work', 'status/done', 'priority/low'], created: '2026-03-29', completed: '2026-03-29'
    }]
    const note = generateTodayNote(withDone)
    expect(note).not.toContain('Already done')
  })

  it('generateThisWeekNote groups tasks by domain', () => {
    const note = generateThisWeekNote(tasks)
    expect(note).toContain('Work')
    expect(note).toContain('This week')
  })

  it('generateNextWeekNote shows next week tasks', () => {
    const note = generateNextWeekNote(tasks)
    expect(note).toContain('Next week')
  })

  it('parseCheckedTaskIds extracts IDs from checked checkboxes', () => {
    const noteContent = `
- [x] Overdue task — Work · High <!-- task:task-2026-03-29-001 -->
- [ ] Due today — Personal · Medium <!-- task:task-2026-03-29-002 -->
    `.trim()
    const ids = parseCheckedTaskIds(noteContent)
    expect(ids).toEqual(['task-2026-03-29-001'])
  })
})
