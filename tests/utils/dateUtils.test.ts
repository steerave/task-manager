import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  toISODate,
  isToday,
  isThisWeek,
  isNextWeek,
  isOverdue,
  startOfWeek,
  endOfWeek,
} from '../../src/utils/dateUtils'

describe('dateUtils', () => {
  beforeEach(() => {
    // Pin "today" to 2026-03-29 (Sunday)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('toISODate formats a Date as YYYY-MM-DD', () => {
    expect(toISODate(new Date('2026-03-29T10:00:00'))).toBe('2026-03-29')
  })

  it('isToday returns true for today', () => {
    expect(isToday('2026-03-29')).toBe(true)
  })

  it('isToday returns false for tomorrow', () => {
    expect(isToday('2026-03-30')).toBe(false)
  })

  it('isThisWeek returns true for dates within Mon–Sun of current week', () => {
    expect(isThisWeek('2026-03-30')).toBe(false)  // Monday next week
    expect(isThisWeek('2026-03-29')).toBe(true)   // Sunday this week (today)
    expect(isThisWeek('2026-03-23')).toBe(true)   // Monday this week
    expect(isThisWeek('2026-04-06')).toBe(false)  // Next Monday (next week)
  })

  it('isNextWeek returns true for Mon–Sun of next week', () => {
    expect(isNextWeek('2026-03-30')).toBe(true)   // Monday next week
    expect(isNextWeek('2026-04-05')).toBe(true)   // Sunday next week
    expect(isNextWeek('2026-04-06')).toBe(false)  // Week after next
  })

  it('isOverdue returns true for past dates not today', () => {
    expect(isOverdue('2026-03-28')).toBe(true)
    expect(isOverdue('2026-03-29')).toBe(false)  // today is not overdue
  })

  it('startOfWeek returns Monday of current week', () => {
    expect(startOfWeek()).toBe('2026-03-23')
  })

  it('endOfWeek returns Sunday of current week', () => {
    expect(endOfWeek()).toBe('2026-03-29')
  })
})
