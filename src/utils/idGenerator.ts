import * as fs from 'fs-extra'
import dayjs from 'dayjs'

const FILLER_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'this', 'that', 'my', 'your', 'its', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'has', 'have', 'had', 'been', 'being',
  'some', 'any', 'all', 'just', 'about', 'into', 'over', 'after',
])

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .split(/[\s\-_]+/)
    .filter((word) => word.length > 0 && !FILLER_WORDS.has(word))
    .join('-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function generateTaskId(tasksDir: string, taskName: string): Promise<string> {
  const dateStr = dayjs().format('YYMMDD')
  const slug = toSlug(taskName)
  const datePrefix = `${dateStr}-`

  let maxSeq = 0
  if (await fs.pathExists(tasksDir)) {
    const files = await fs.readdir(tasksDir)
    for (const f of files) {
      const match = f.match(/-(\d{4})\.md$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxSeq) maxSeq = num
      }
    }
  }

  const seq = String(maxSeq + 1).padStart(4, '0')
  return `${dateStr}-${slug}-${seq}`
}
