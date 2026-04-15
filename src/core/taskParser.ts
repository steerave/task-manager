import * as chrono from 'chrono-node'
import { Config, ParsedInput } from './types'
import { toISODate } from '../utils/dateUtils'

const DOMAIN_RULES: Array<{ patterns: RegExp[]; domain: string }> = [
  {
    patterns: [/\bfor work\b/i, /\bwork[- ]related\b/i, /\bwork project\b/i, /\bat work\b/i],
    domain: 'work',
  },
  {
    patterns: [/\bside project\b/i, /\bpersonal project\b/i, /\bbuilding\b/i, /\bprojects?\b/i],
    domain: 'projects',
  },
  {
    patterns: [/\bpersonal\b/i, /\berrands?\b/i, /\bhousehold\b/i],
    domain: 'personal',
  },
]

const PRIORITY_RULES: Array<{ patterns: RegExp[]; priority: string }> = [
  {
    patterns: [/\burgent\b/i, /\bASAP\b/i, /\bcritical\b/i, /\bimportant\b/i, /\bpriority[: ]?high\b/i],
    priority: 'priority/high',
  },
  {
    patterns: [/\bno rush\b/i, /\bwhenever\b/i, /\blow[- ]?priority\b/i, /\bsomeday\b/i],
    priority: 'priority/low',
  },
]

const CATEGORY_RULES: Array<{ patterns: RegExp[]; category: string }> = [
  { patterns: [/\bdentist\b/i, /\bdoctor\b/i, /\bgym\b/i, /\bmedical\b/i, /\bhealth\b/i], category: 'health' },
  { patterns: [/\bgroceries\b/i, /\berrands?\b/i, /\bpick up\b/i, /\bdry clean\b/i], category: 'errands' },
  { patterns: [/\bbudget\b/i, /\btax\b/i, /\bfinance\b/i, /\bexpense\b/i, /\binvoice\b/i], category: 'finance' },
  { patterns: [/\blearn\b/i, /\bstudy\b/i, /\bcourse\b/i, /\bread\b/i, /\bbook\b/i], category: 'learning' },
  { patterns: [/\badmin\b/i, /\bpaperwork\b/i, /\bforms?\b/i, /\bsubmit\b/i], category: 'admin' },
]

/**
 * Split input into task name portion and date portion.
 * Only parse dates from text after a "due"/"by"/"on"/"before" keyword,
 * or from a trailing date phrase (e.g., "tomorrow", "next Friday", "4/15").
 * This prevents chrono from eating words like "sun" (Sunday) in "sun room".
 */
function splitDatePhrase(input: string): { namePart: string; due: Date | null } {
  // Try to find a "due/by/before/on" keyword that introduces a date phrase
  const dueMatch = input.match(/\b(due|by|before)\s+/i)
  if (dueMatch && dueMatch.index !== undefined) {
    const beforeDue = input.slice(0, dueMatch.index)
    const afterDue = input.slice(dueMatch.index + dueMatch[0].length)
    const parsed = chrono.parseDate(afterDue, new Date())
    if (parsed) {
      // Strip the matched date text from the afterDue portion
      const results = chrono.parse(afterDue, new Date())
      let cleanedAfter = afterDue
      for (const result of results) {
        cleanedAfter = cleanedAfter.slice(0, result.index) + cleanedAfter.slice(result.index + result.text.length)
      }
      cleanedAfter = cleanedAfter.replace(/^\s*[.,;:]+\s*/, '').replace(/\s+/g, ' ').trim()
      const namePart = (beforeDue + ' ' + cleanedAfter).replace(/\s+/g, ' ').trim()
      return { namePart, due: parsed }
    }
  }

  // Fallback: try parsing the whole string but only accept dates at
  // the end of the input (last result) to avoid mid-sentence false positives
  const results = chrono.parse(input, new Date())
  if (results.length > 0) {
    const last = results[results.length - 1]
    const parsed = last.start.date()
    let cleaned = input.slice(0, last.index) + input.slice(last.index + last.text.length)
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    return { namePart: cleaned, due: parsed }
  }

  return { namePart: input, due: null }
}

function stripDomainPhrases(input: string): string {
  const allPatterns = DOMAIN_RULES.flatMap((r) => r.patterns)
  let cleaned = input
  for (const pattern of allPatterns) {
    cleaned = cleaned.replace(pattern, '')
  }
  return cleaned.replace(/\s+/g, ' ').trim()
}

export function parseTaskInput(input: string, _config: Config): ParsedInput {
  const tags: string[] = []

  // Parse due date and extract task name in one pass
  const { namePart, due: parsedDate } = splitDatePhrase(input)
  const due = parsedDate ? toISODate(parsedDate) : null

  // Infer domain
  let foundDomain: string | null = null
  for (const rule of DOMAIN_RULES) {
    if (rule.patterns.some((p) => p.test(input))) {
      foundDomain = rule.domain
      tags.push(rule.domain)
      break
    }
  }

  // Inbox if domain could not be inferred
  const needsInbox = !foundDomain
  if (needsInbox) {
    tags.push('status/inbox')
  } else {
    tags.push('status/todo')
  }

  // Infer priority
  let foundPriority = false
  for (const rule of PRIORITY_RULES) {
    if (rule.patterns.some((p) => p.test(input))) {
      tags.push(rule.priority)
      foundPriority = true
      break
    }
  }
  if (!foundPriority) {
    tags.push('priority/medium')
  }

  // Infer category
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(input))) {
      tags.push(rule.category)
      break
    }
  }

  // Clean up name: remove domain keywords and metadata
  let name = namePart
  name = stripDomainPhrases(name)
  // Remove the literal word "domain" (used as a hint, not part of the task name)
  name = name.replace(/\bdomain\b/gi, '')
  // Remove priority keywords and standalone "due" from name
  name = name.replace(/\b(urgent|ASAP|critical|important|no rush|whenever|someday|due)\b/gi, '')
  name = name.replace(/^[\s\-:,.]+/, '').replace(/[\s\-:,.]+$/, '').replace(/\s+/g, ' ').trim()

  return { name, due, tags, needsInbox }
}
