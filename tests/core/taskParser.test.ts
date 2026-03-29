import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseTaskInput } from '../../src/core/taskParser'
import { Config } from '../../src/core/types'

const mockConfig: Config = {
  vaultPath: '/vault',
  tags: {
    domains: ['work', 'personal', 'personal-projects'],
    priorities: ['priority/high', 'priority/medium', 'priority/low'],
    categories: ['health', 'finance', 'errands', 'learning', 'admin', 'creative'],
    statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
  },
}

describe('parseTaskInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('extracts task name without date phrase', () => {
    const result = parseTaskInput('Call the dentist next Tuesday', mockConfig)
    expect(result.name).toBe('Call the dentist')
  })

  it('parses relative date "next Tuesday" to ISO date', () => {
    const result = parseTaskInput('Call the dentist next Tuesday', mockConfig)
    // next Tuesday from 2026-03-29 (Sunday) = 2026-03-31
    expect(result.due).toMatch(/^2026-03-3[0-1]$/)
  })

  it('infers work domain from "for work"', () => {
    const result = parseTaskInput('Finish API integration by Friday for work', mockConfig)
    expect(result.tags).toContain('work')
  })

  it('infers personal-projects domain from "side project"', () => {
    const result = parseTaskInput('Learn Rust basics - side project', mockConfig)
    expect(result.tags).toContain('personal-projects')
  })

  it('infers priority/high from "urgent"', () => {
    const result = parseTaskInput('Urgent: fix production bug for work', mockConfig)
    expect(result.tags).toContain('priority/high')
  })

  it('infers priority/low from "no rush"', () => {
    const result = parseTaskInput('Clean garage, no rush', mockConfig)
    expect(result.tags).toContain('priority/low')
  })

  it('infers health category from "dentist"', () => {
    const result = parseTaskInput('Call dentist', mockConfig)
    expect(result.tags).toContain('health')
  })

  it('sets needsInbox=true when domain is ambiguous', () => {
    const result = parseTaskInput('Deal with the Alex thing', mockConfig)
    expect(result.needsInbox).toBe(true)
    expect(result.tags).toContain('status/inbox')
  })

  it('sets needsInbox=false when domain is clear', () => {
    const result = parseTaskInput('Submit report for work by Friday', mockConfig)
    expect(result.needsInbox).toBe(false)
  })

  it('defaults to priority/medium when no priority keyword found', () => {
    const result = parseTaskInput('Buy groceries', mockConfig)
    expect(result.tags).toContain('priority/medium')
  })

  it('defaults to status/todo', () => {
    const result = parseTaskInput('Buy groceries for personal', mockConfig)
    expect(result.tags).toContain('status/todo')
  })
})
