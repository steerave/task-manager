import dayjs from 'dayjs'
import { Task } from './types'
import { CalendarEvent } from '../calendar/types'
import { isToday, isOverdue } from '../utils/dateUtils'

const DOMAINS = ['work', 'personal', 'projects']

function domainLabel(domain: string): string {
  return domain.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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

export interface DailyNoteOptions {
  events?: CalendarEvent[]
  weekEvents?: CalendarEvent[]
}

export function generateDailyNote(tasks: Task[], options?: DailyNoteOptions): string {
  const events = options?.events
  const weekEvents = options?.weekEvents
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

  // ── This Week's Calendar ──
  if (weekEvents && weekEvents.length > 0) {
    sections.push('### This Week\'s Calendar')
    sections.push('')
    let currentDate = ''
    for (const event of weekEvents) {
      if (event.date !== currentDate) {
        currentDate = event.date
        sections.push(`**${dayjs(event.date).format('ddd, MMM D')}**`)
      }
      if (event.isAllDay) {
        sections.push(`- ${event.name} *(all day)*`)
      } else {
        sections.push(`- ${event.startTime}–${event.endTime} · ${event.name}`)
      }
    }
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
