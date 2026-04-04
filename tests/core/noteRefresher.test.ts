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
