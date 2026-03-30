import * as chrono from 'chrono-node'
import { Config, ParsedInput } from './types'
import { toISODate } from '../utils/dateUtils'

const DOMAIN_RULES: Array<{ patterns: RegExp[]; domain: string }> = [
  {
    patterns: [/\bfor work\b/i, /\bwork([ -]related)?\b/i, /\bwork project\b/i],
    domain: 'work',
  },
  {
    patterns: [/\bside project\b/i, /\bpersonal project\b/i, /\bbuilding\b/i, /\bpersonal-projects\b/i],
    domain: 'personal-projects',
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

function stripDatePhrase(input: string): string {
  const results = chrono.parse(input, new Date())
  if (results.length === 0) return input
  let cleaned = input
  for (const result of results) {
    cleaned = cleaned.slice(0, result.index) + cleaned.slice(result.index + result.text.length)
  }
  return cleaned.replace(/\s+/g, ' ').trim()
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

  // Parse due date — pass current Date() so fake timers in tests work
  const parsed = chrono.parseDate(input, new Date())
  const due = parsed ? toISODate(parsed) : null

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

  // Clean up name: remove date phrase, "due" keyword, and domain keywords
  let name = stripDatePhrase(input)
  name = stripDomainPhrases(name)
  // Remove priority keywords and standalone "due" from name
  name = name.replace(/\b(urgent|ASAP|critical|important|no rush|whenever|someday|due)\b/gi, '')
  name = name.replace(/^[\s\-:,]+/, '').replace(/[-:,]+$/, '').replace(/\s+/g, ' ').trim()

  return { name, due, tags, needsInbox }
}
