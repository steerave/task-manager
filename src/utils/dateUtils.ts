import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

export function toISODate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

export function today(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function isToday(isoDate: string): boolean {
  return isoDate === today()
}

export function startOfWeek(referenceDate?: string): string {
  const d = referenceDate ? dayjs(referenceDate) : dayjs()
  return d.isoWeekday(1).format('YYYY-MM-DD')
}

export function endOfWeek(referenceDate?: string): string {
  const d = referenceDate ? dayjs(referenceDate) : dayjs()
  return d.isoWeekday(7).format('YYYY-MM-DD')
}

export function isThisWeek(isoDate: string): boolean {
  const weekStart = startOfWeek()
  const weekEnd = endOfWeek()
  return isoDate >= weekStart && isoDate <= weekEnd
}

export function isNextWeek(isoDate: string): boolean {
  const nextWeekStart = startOfWeek(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const nextWeekEnd = endOfWeek(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  return isoDate >= nextWeekStart && isoDate <= nextWeekEnd
}

export function isOverdue(isoDate: string): boolean {
  return isoDate < today()
}
