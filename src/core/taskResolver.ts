import * as fs from 'fs-extra'
import { getTasksDir } from './vaultScanner'
import { Config } from './types'

export async function resolveTaskId(input: string, config: Config): Promise<string> {
  // If it looks like a full ID (contains a slug), return as-is
  if (input.includes('-') && input.length > 6) return input

  // Otherwise treat as shorthand — match against sequence suffix
  const tasksDir = getTasksDir(config)
  if (!(await fs.pathExists(tasksDir))) {
    throw new Error(`No tasks found. Tasks directory does not exist.`)
  }

  const files = await fs.readdir(tasksDir)
  const mdFiles = files.filter((f) => f.endsWith('.md'))

  // Match by sequence number (e.g., "0011" matches "260330-cpap-...-0011.md")
  const padded = input.padStart(4, '0')
  const matches = mdFiles.filter((f) => f.replace('.md', '').endsWith(`-${padded}`))

  if (matches.length === 0) {
    throw new Error(`No task found matching "${input}"`)
  }
  if (matches.length > 1) {
    throw new Error(`Multiple tasks match "${input}": ${matches.map((f) => f.replace('.md', '')).join(', ')}`)
  }

  return matches[0].replace('.md', '')
}
