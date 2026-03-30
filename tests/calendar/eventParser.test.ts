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
