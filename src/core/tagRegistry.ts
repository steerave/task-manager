import { Config } from './types'

export function getAllCanonicalTags(config: Config): string[] {
  const { domains, priorities, categories, statuses } = config.tags
  return [...domains, ...priorities, ...categories, ...statuses]
}

export function validateTags(tags: string[], config: Config): boolean {
  const canonical = getAllCanonicalTags(config)
  return tags.every((t) => canonical.includes(t))
}

export function filterToCanonical(
  tags: string[],
  config: Config
): { valid: string[]; removed: string[] } {
  const canonical = getAllCanonicalTags(config)
  const valid = tags.filter((t) => canonical.includes(t))
  const removed = tags.filter((t) => !canonical.includes(t))
  if (removed.length > 0) {
    console.warn(`[tag-registry] Removed unknown tags: ${removed.join(', ')}`)
  }
  return { valid, removed }
}
