import dayjs from 'dayjs'
import { Task } from './types'
import { CalendarEvent } from '../calendar/types'
import { isToday, isThisWeek, isNextWeek, isOverdue, startOfWeek, endOfWeek } from '../utils/dateUtils'

const DOMAINS = ['work', 'personal', 'personal-projects']

function getPriority(task: Task): string {
  if (task.tags.includes('priority/high')) return 'High'
  if (task.tags.includes('priority/low')) return 'Low'
  return 'Medium'
}

function getDomain(task: Task): string {
  for (const d of DOMAINS) {
    if (task.tags.includes(d)) return d.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return 'Inbox'
}

function taskLine(task: Task): string {
  const domain = getDomain(task)
  const priority = getPriority(task)
  const due = task.due ? ` *(due ${dayjs(task.due).format('MMM D')})*` : ''
  const mod = task.modified ? ` <small>${dayjs(task.modified).format('MMM D')}</small>` : ''
  const checkbox = task.tags.includes('status/done') ? '- [x]'
    : task.tags.includes('status/waiting') ? '- [/]'
    : '- [ ]'
  return `${checkbox} [[${task.id}|${task.name}]]${due} — ${domain} · ${priority}${mod} <!-- task:${task.id} -->`
}

function isActive(task: Task): boolean {
  return !task.tags.includes('status/done') && !task.tags.includes('status/blocked') && !task.tags.includes('status/waiting')
}

function renderDomainGroups(tasks: Task[]): string[] {
  const lines: string[] = []
  for (const domain of DOMAINS) {
    const domainTasks = tasks.filter((t) => t.tags.includes(domain))
    if (domainTasks.length === 0) continue
    const label = domain.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    lines.push(`### ${label}`)
    domainTasks.forEach((t) => lines.push(taskLine(t)))
    lines.push('')
  }
  return lines
}

export function generateDailyNote(tasks: Task[], events?: CalendarEvent[]): string {
  const active = tasks.filter(isActive)
  const dateStr = dayjs().format('MMMM D, YYYY')
  const fileTitle = dayjs().format('YYYYMMDD')
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm')

  const weekStart = startOfWeek()
  const weekEnd = endOfWeek()
  const weekRange = `${dayjs(weekStart).format('MMM D')}–${dayjs(weekEnd).format('MMM D, YYYY')}`

  const nextWeekDate = dayjs().add(7, 'day').format('YYYY-MM-DD')
  const nextStart = startOfWeek(nextWeekDate)
  const nextEnd = endOfWeek(nextWeekDate)
  const nextWeekRange = `${dayjs(nextStart).format('MMM D')}–${dayjs(nextEnd).format('MMM D, YYYY')}`

  const overdue = active.filter((t) => t.due && isOverdue(t.due))
  const dueToday = active.filter((t) => t.due && isToday(t.due))
  const waiting = tasks.filter((t) => t.tags.includes('status/waiting'))
  const completedToday = tasks.filter((t) => t.tags.includes('status/done') && t.completed && isToday(t.completed))
  const inbox = active.filter((t) => t.tags.includes('status/inbox'))
  const thisWeekTasks = active.filter((t) => t.due && isThisWeek(t.due))
  const nextWeekTasks = active.filter((t) => t.due && isNextWeek(t.due))

  const sections: string[] = []

  // ── Today ──
  sections.push('')
  sections.push(`## Today — ${dateStr}`)
  sections.push('')

  if (inbox.length > 0) {
    sections.push('### Needs Triage')
    inbox.forEach((t) => sections.push(taskLine(t)))
    sections.push('')
  }

  if (overdue.length > 0) {
    sections.push('### Overdue')
    overdue.forEach((t) => sections.push(taskLine(t)))
    sections.push('')
  }

  if (dueToday.length > 0) {
    sections.push('### Due Today')
    dueToday.forEach((t) => sections.push(taskLine(t)))
    sections.push('')
  }

  if (waiting.length > 0) {
    sections.push('### Waiting On')
    waiting.forEach((t) => sections.push(taskLine(t)))
    sections.push('')
  }

  if (completedToday.length > 0) {
    sections.push('### Completed Today')
    completedToday.forEach((t) => sections.push(taskLine(t)))
    sections.push('')
  }

  if (overdue.length === 0 && dueToday.length === 0 && inbox.length === 0 && completedToday.length === 0 && waiting.length === 0) {
    sections.push('*(Nothing due today)*')
    sections.push('')
  }

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

  // ── This Week ──
  sections.push('---')
  sections.push('')
  sections.push(`## This Week — ${weekRange}`)
  sections.push('')

  const thisWeekDomains = renderDomainGroups(thisWeekTasks)
  if (thisWeekDomains.length > 0) {
    sections.push(...thisWeekDomains)
  } else {
    sections.push('*(Nothing scheduled this week)*')
    sections.push('')
  }

  // ── Next Week ──
  sections.push('---')
  sections.push('')
  sections.push(`## Next Week — ${nextWeekRange}`)
  sections.push('')

  const nextWeekDomains = renderDomainGroups(nextWeekTasks)
  if (nextWeekDomains.length > 0) {
    sections.push(...nextWeekDomains)
  } else {
    sections.push('*(Nothing scheduled next week)*')
    sections.push('')
  }

  // ── Footer ──
  sections.push('---')
  sections.push(`*Generated by task-manager · /today · ${timestamp}*`)

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
