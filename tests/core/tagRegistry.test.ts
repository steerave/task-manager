import { describe, it, expect } from 'vitest'
import { Config } from '../../src/core/types'
import { validateTags, filterToCanonical, getAllCanonicalTags } from '../../src/core/tagRegistry'

const mockConfig: Config = {
  vaultPath: '/vault',
  tags: {
    domains: ['work', 'personal'],
    priorities: ['priority/high', 'priority/low'],
    categories: ['health', 'errands'],
    statuses: ['status/todo', 'status/done', 'status/inbox'],
  },
}

describe('tagRegistry', () => {
  it('getAllCanonicalTags returns flat list of all valid tags', () => {
    const all = getAllCanonicalTags(mockConfig)
    expect(all).toContain('work')
    expect(all).toContain('priority/high')
    expect(all).toContain('status/inbox')
  })

  it('validateTags returns true when all tags are canonical', () => {
    expect(validateTags(['work', 'priority/high', 'status/todo'], mockConfig)).toBe(true)
  })

  it('validateTags returns false when any tag is not canonical', () => {
    expect(validateTags(['work', 'invented-tag'], mockConfig)).toBe(false)
  })

  it('filterToCanonical removes unknown tags and logs them', () => {
    const result = filterToCanonical(['work', 'made-up', 'priority/high'], mockConfig)
    expect(result.valid).toEqual(['work', 'priority/high'])
    expect(result.removed).toEqual(['made-up'])
  })

  it('filterToCanonical allows only canonical tags (no free-form topic tags in V0.1)', () => {
    const result = filterToCanonical(['work', 'Q2'], mockConfig)
    expect(result.removed).toContain('Q2')
  })
})
