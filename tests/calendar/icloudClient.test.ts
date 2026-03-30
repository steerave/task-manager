import { describe, it, expect } from 'vitest'
import { fetchTodayEvents } from '../../src/calendar/icloudClient'

describe('icloudClient', () => {
  it('fetchTodayEvents returns an array (empty or with events)', async () => {
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
