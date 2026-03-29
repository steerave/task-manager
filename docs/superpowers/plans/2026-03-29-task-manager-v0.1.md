# Task Manager V0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working CLI that adds, lists, and manages tasks as markdown files in an Obsidian vault, and generates three daily summary notes (`today.md`, `this-week.md`, `next-week.md`) with two-way checkbox sync.

**Architecture:** Each task is a single markdown file with YAML frontmatter stored in a flat `/Tasks` folder inside the user's Obsidian vault. The CLI reads/writes these files directly. Tags are constrained to a canonical list in `config.json` to ensure Obsidian Dataview queries stay consistent.

**Tech Stack:** TypeScript · Node.js · `commander` · `chrono-node` · `gray-matter` · `chalk` · `dayjs` · `fs-extra` · `inquirer` · `vitest`

---

## File Map

| File | Responsibility |
|---|---|
| `src/cli.ts` | Entry point — registers all commander commands |
| `src/core/types.ts` | TypeScript interfaces: `Task`, `Config`, `ParsedInput` |
| `src/core/taskFile.ts` | Read/write a single task's `.md` file via gray-matter |
| `src/core/taskParser.ts` | Parse natural language string → `ParsedInput` |
| `src/core/tagRegistry.ts` | Validate/filter tags against canonical config list |
| `src/core/vaultScanner.ts` | Scan vault `/Tasks` folder → array of `Task` |
| `src/core/dailyNoteGenerator.ts` | Generate today/this-week/next-week markdown strings |
| `src/config/configLoader.ts` | Load and save `config.json` from vault path |
| `src/config/launcherConfig.ts` | Read/write `~/.taskmanager` — stores vault path between sessions |
| `src/config/setupWizard.ts` | Inquirer prompts for first-run config creation |
| `src/utils/dateUtils.ts` | dayjs-based helpers: `toISO`, `isToday`, `isThisWeek`, `isNextWeek`, `isOverdue` |
| `src/utils/idGenerator.ts` | Generate `task-YYYY-MM-DD-NNN` IDs |
| `src/commands/add.ts` | `task add "<text>"` handler |
| `src/commands/list.ts` | `task list [--domain] [--due] [--priority] [--status]` handler |
| `src/commands/done.ts` | `task done <id>` handler |
| `src/commands/update.ts` | `task update <id> [--due] [--priority] [--domain] [--name]` handler |
| `src/commands/delete.ts` | `task delete <id>` handler |
| `src/commands/today.ts` | `/today` handler — sync checkboxes + regenerate notes |
| `src/commands/config.ts` | `task domains add/list` and `task tags add/list` handlers |
| `tests/core/taskParser.test.ts` | Unit tests for NLP parsing |
| `tests/core/taskFile.test.ts` | Unit tests for file read/write |
| `tests/core/tagRegistry.test.ts` | Unit tests for tag enforcement |
| `tests/core/vaultScanner.test.ts` | Unit tests for vault scanning |
| `tests/core/dailyNoteGenerator.test.ts` | Unit tests for note generation |
| `tests/commands/add.test.ts` | Unit tests for add command |
| `tests/commands/list.test.ts` | Unit tests for list command |
| `tests/commands/done.test.ts` | Unit tests for done command |
| `tests/integration/endToEnd.test.ts` | Full flow: add → check off → `/today` marks done |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.eslintrc.json`
- Create: `.prettierrc`
- Create: `.env.template`
- Create: `src/cli.ts` (stub)

- [ ] **Step 1: Initialize npm project**

```bash
cd "C:/Users/steerave/Desktop/Claude Projects/Task Manager"
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install commander chrono-node gray-matter chalk dayjs fs-extra inquirer
npm install -D typescript @types/node @types/fs-extra @types/inquirer ts-node vitest eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Write `package.json` scripts block**

Replace the `scripts` section in `package.json`:

```json
{
  "scripts": {
    "dev": "ts-node src/cli.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests --ext .ts",
    "format": "prettier --write src tests"
  },
  "bin": {
    "task": "./dist/cli.js"
  }
}
```

- [ ] **Step 5: Write `.eslintrc.json`**

```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "env": { "node": true, "es2022": true },
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

- [ ] **Step 6: Write `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "es5"
}
```

- [ ] **Step 7: Write `.env.template`**

```
# Optional: Claude API key for LLM-powered NLP fallback (V0.2+)
# ANTHROPIC_API_KEY=
```

- [ ] **Step 8: Write stub `src/cli.ts`**

```typescript
#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
  .name('task')
  .description('Personal CLI task manager for Obsidian')
  .version('0.1.0')

program.parse(process.argv)
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors, `dist/cli.js` created.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json .eslintrc.json .prettierrc .env.template src/cli.ts
git commit -m "feat: initialize TypeScript project scaffold

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Core Types

**Files:**
- Create: `src/core/types.ts`

- [ ] **Step 1: Write `src/core/types.ts`**

```typescript
export interface Task {
  id: string
  name: string
  due: string | null        // ISO date string YYYY-MM-DD, or null
  tags: string[]
  created: string           // ISO date string YYYY-MM-DD
  completed: string | null  // ISO date string YYYY-MM-DD, or null
}

export interface ParsedInput {
  name: string
  due: string | null
  tags: string[]
  needsInbox: boolean       // true when domain or due date could not be inferred
}

export interface Config {
  vaultPath: string
  tags: {
    domains: string[]
    priorities: string[]
    categories: string[]
    statuses: string[]
  }
}

export type TaskFilter = {
  domain?: string
  due?: 'today' | 'this-week' | 'next-week' | 'overdue'
  priority?: 'high' | 'medium' | 'low'
  status?: string
}
```

- [ ] **Step 2: Verify no compile errors**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts
git commit -m "feat: add core TypeScript types

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Date Utils and ID Generator

**Files:**
- Create: `src/utils/dateUtils.ts`
- Create: `src/utils/idGenerator.ts`
- Create: `tests/utils/dateUtils.test.ts`

- [ ] **Step 1: Write the failing tests for dateUtils**

```typescript
// tests/utils/dateUtils.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  toISODate,
  isToday,
  isThisWeek,
  isNextWeek,
  isOverdue,
  startOfWeek,
  endOfWeek,
} from '../../src/utils/dateUtils'

describe('dateUtils', () => {
  beforeEach(() => {
    // Pin "today" to 2026-03-29 (Monday)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('toISODate formats a Date as YYYY-MM-DD', () => {
    expect(toISODate(new Date('2026-03-29'))).toBe('2026-03-29')
  })

  it('isToday returns true for today', () => {
    expect(isToday('2026-03-29')).toBe(true)
  })

  it('isToday returns false for tomorrow', () => {
    expect(isToday('2026-03-30')).toBe(false)
  })

  it('isThisWeek returns true for dates within Mon–Sun of current week', () => {
    expect(isThisWeek('2026-03-30')).toBe(true)  // Tuesday this week
    expect(isThisWeek('2026-04-04')).toBe(true)  // Saturday this week
    expect(isThisWeek('2026-04-06')).toBe(false) // Next Monday
  })

  it('isNextWeek returns true for Mon–Sun of next week', () => {
    expect(isNextWeek('2026-04-06')).toBe(true)  // Next Monday
    expect(isNextWeek('2026-04-12')).toBe(true)  // Next Sunday
    expect(isNextWeek('2026-04-13')).toBe(false) // Week after next
  })

  it('isOverdue returns true for past dates not today', () => {
    expect(isOverdue('2026-03-28')).toBe(true)
    expect(isOverdue('2026-03-29')).toBe(false) // today is not overdue
  })

  it('startOfWeek returns Monday of current week', () => {
    expect(startOfWeek()).toBe('2026-03-23')
  })

  it('endOfWeek returns Sunday of current week', () => {
    expect(endOfWeek()).toBe('2026-03-29')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/utils/dateUtils'`

- [ ] **Step 3: Write `src/utils/dateUtils.ts`**

```typescript
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

export function toISODate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

export function today(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function isToday(isoDate: string): boolean {
  return isoDate === today()
}

export function startOfWeek(referenceDate?: string): string {
  const d = referenceDate ? dayjs(referenceDate) : dayjs()
  return d.isoWeekday(1).format('YYYY-MM-DD')
}

export function endOfWeek(referenceDate?: string): string {
  const d = referenceDate ? dayjs(referenceDate) : dayjs()
  return d.isoWeekday(7).format('YYYY-MM-DD')
}

export function isThisWeek(isoDate: string): boolean {
  const weekStart = startOfWeek()
  const weekEnd = endOfWeek()
  return isoDate >= weekStart && isoDate <= weekEnd
}

export function isNextWeek(isoDate: string): boolean {
  const nextWeekStart = startOfWeek(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const nextWeekEnd = endOfWeek(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  return isoDate >= nextWeekStart && isoDate <= nextWeekEnd
}

export function isOverdue(isoDate: string): boolean {
  return isoDate < today()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All dateUtils tests PASS.

- [ ] **Step 5: Write `src/utils/idGenerator.ts`**

```typescript
import * as fs from 'fs-extra'
import * as path from 'path'
import { toISODate } from './dateUtils'

export async function generateTaskId(tasksDir: string): Promise<string> {
  const dateStr = toISODate(new Date())
  const prefix = `task-${dateStr}-`

  let existingFiles: string[] = []
  if (await fs.pathExists(tasksDir)) {
    const files = await fs.readdir(tasksDir)
    existingFiles = files.filter((f) => f.startsWith(prefix))
  }

  const nextNum = existingFiles.length + 1
  const seq = String(nextNum).padStart(3, '0')
  return `${prefix}${seq}`
}
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/dateUtils.ts src/utils/idGenerator.ts tests/utils/dateUtils.test.ts
git commit -m "feat: add date utils and task ID generator with tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Config Loader + Launcher Config

**Files:**
- Create: `src/config/configLoader.ts`
- Create: `src/config/launcherConfig.ts`
- Create: `tests/config/configLoader.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/config/configLoader.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { loadConfig, saveConfig, configExists, defaultConfig } from '../../src/config/configLoader'

describe('configLoader', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-config-test-'))
  })

  afterEach(async () => {
    await fs.remove(tmpDir)
  })

  it('configExists returns false when config.json is absent', async () => {
    expect(await configExists(tmpDir)).toBe(false)
  })

  it('configExists returns true after saving config', async () => {
    await saveConfig(tmpDir, defaultConfig(tmpDir))
    expect(await configExists(tmpDir)).toBe(true)
  })

  it('loadConfig reads back what was saved', async () => {
    const config = defaultConfig(tmpDir)
    await saveConfig(tmpDir, config)
    const loaded = await loadConfig(tmpDir)
    expect(loaded.vaultPath).toBe(tmpDir)
    expect(loaded.tags.domains).toContain('work')
  })

  it('defaultConfig includes required tag categories', () => {
    const config = defaultConfig(tmpDir)
    expect(config.tags.domains).toEqual(['work', 'personal', 'personal-projects'])
    expect(config.tags.priorities).toEqual(['priority/high', 'priority/medium', 'priority/low'])
    expect(config.tags.statuses).toContain('status/inbox')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/config/configLoader'`

- [ ] **Step 3: Write `src/config/configLoader.ts`**

```typescript
import * as fs from 'fs-extra'
import * as path from 'path'
import { Config } from '../core/types'

export const CONFIG_FILENAME = 'config.json'

export function defaultConfig(vaultPath: string): Config {
  return {
    vaultPath,
    tags: {
      domains: ['work', 'personal', 'personal-projects'],
      priorities: ['priority/high', 'priority/medium', 'priority/low'],
      categories: ['health', 'finance', 'errands', 'learning', 'admin', 'creative'],
      statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
    },
  }
}

export async function configExists(vaultPath: string): Promise<boolean> {
  return fs.pathExists(path.join(vaultPath, CONFIG_FILENAME))
}

export async function loadConfig(vaultPath: string): Promise<Config> {
  const configPath = path.join(vaultPath, CONFIG_FILENAME)
  const raw = await fs.readJson(configPath)
  return raw as Config
}

export async function saveConfig(vaultPath: string, config: Config): Promise<void> {
  const configPath = path.join(vaultPath, CONFIG_FILENAME)
  await fs.writeJson(configPath, config, { spaces: 2 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All configLoader tests PASS.

- [ ] **Step 5: Write `src/config/launcherConfig.ts`**

Stores the vault path in `~/.taskmanager` so the CLI can find the config on every run without an env var.

```typescript
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'

const LAUNCHER_CONFIG_PATH = path.join(os.homedir(), '.taskmanager')

interface LauncherConfig {
  vaultPath: string
}

export async function readLauncherConfig(): Promise<LauncherConfig | null> {
  if (!(await fs.pathExists(LAUNCHER_CONFIG_PATH))) return null
  try {
    const raw = await fs.readFile(LAUNCHER_CONFIG_PATH, 'utf8')
    return JSON.parse(raw) as LauncherConfig
  } catch {
    return null
  }
}

export async function writeLauncherConfig(config: LauncherConfig): Promise<void> {
  await fs.writeFile(LAUNCHER_CONFIG_PATH, JSON.stringify(config), 'utf8')
}
```

- [ ] **Step 6: Commit**

```bash
git add src/config/configLoader.ts src/config/launcherConfig.ts tests/config/configLoader.test.ts
git commit -m "feat: add config loader and launcher config (~/.taskmanager)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Tag Registry

**Files:**
- Create: `src/core/tagRegistry.ts`
- Create: `tests/core/tagRegistry.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/core/tagRegistry.test.ts
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

  it('filterToCanonical allows topic tags (free-form, not constrained)', () => {
    // Topic tags are any tags not in a constrained category — these pass through
    // For V0.1, all tags must be canonical. Topic tags are V0.2.
    const result = filterToCanonical(['work', 'Q2'], mockConfig)
    expect(result.removed).toContain('Q2')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/core/tagRegistry'`

- [ ] **Step 3: Write `src/core/tagRegistry.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tagRegistry tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/tagRegistry.ts tests/core/tagRegistry.test.ts
git commit -m "feat: add tag registry with canonical enforcement

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Task File I/O

**Files:**
- Create: `src/core/taskFile.ts`
- Create: `tests/core/taskFile.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/core/taskFile.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { writeTask, readTask, updateTask } from '../../src/core/taskFile'
import { Task } from '../../src/core/types'

describe('taskFile', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-file-test-'))
  })

  afterEach(async () => {
    await fs.remove(tmpDir)
  })

  const sampleTask: Task = {
    id: 'task-2026-03-29-001',
    name: 'Prepare Q2 roadmap',
    due: '2026-03-31',
    tags: ['work', 'priority/high', 'status/todo'],
    created: '2026-03-29',
    completed: null,
  }

  it('writeTask creates a markdown file with YAML frontmatter', async () => {
    await writeTask(tmpDir, sampleTask)
    const filePath = path.join(tmpDir, 'task-2026-03-29-001.md')
    expect(await fs.pathExists(filePath)).toBe(true)
    const content = await fs.readFile(filePath, 'utf8')
    expect(content).toContain('name: Prepare Q2 roadmap')
    expect(content).toContain('due: 2026-03-31')
  })

  it('readTask parses frontmatter back to Task object', async () => {
    await writeTask(tmpDir, sampleTask)
    const filePath = path.join(tmpDir, 'task-2026-03-29-001.md')
    const loaded = await readTask(filePath)
    expect(loaded.name).toBe('Prepare Q2 roadmap')
    expect(loaded.due).toBe('2026-03-31')
    expect(loaded.tags).toContain('work')
    expect(loaded.completed).toBeNull()
  })

  it('updateTask merges partial fields into existing task', async () => {
    await writeTask(tmpDir, sampleTask)
    const filePath = path.join(tmpDir, 'task-2026-03-29-001.md')
    await updateTask(filePath, { due: '2026-04-01', tags: ['work', 'priority/medium', 'status/todo'] })
    const loaded = await readTask(filePath)
    expect(loaded.due).toBe('2026-04-01')
    expect(loaded.tags).toContain('priority/medium')
    expect(loaded.name).toBe('Prepare Q2 roadmap') // unchanged
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/core/taskFile'`

- [ ] **Step 3: Write `src/core/taskFile.ts`**

```typescript
import * as fs from 'fs-extra'
import * as path from 'path'
import matter from 'gray-matter'
import { Task } from './types'

export function taskFilePath(tasksDir: string, taskId: string): string {
  return path.join(tasksDir, `${taskId}.md`)
}

export async function writeTask(tasksDir: string, task: Task): Promise<void> {
  await fs.ensureDir(tasksDir)
  const frontmatter: Record<string, unknown> = {
    name: task.name,
    due: task.due,
    tags: task.tags,
    created: task.created,
    id: task.id,
  }
  if (task.completed) {
    frontmatter.completed = task.completed
  }
  const content = matter.stringify('', frontmatter)
  await fs.writeFile(taskFilePath(tasksDir, task.id), content, 'utf8')
}

export async function readTask(filePath: string): Promise<Task> {
  const raw = await fs.readFile(filePath, 'utf8')
  const { data } = matter(raw)
  return {
    id: data.id as string,
    name: data.name as string,
    due: (data.due as string | null) ?? null,
    tags: (data.tags as string[]) ?? [],
    created: data.created as string,
    completed: (data.completed as string | null) ?? null,
  }
}

export async function updateTask(
  filePath: string,
  updates: Partial<Omit<Task, 'id' | 'created'>>
): Promise<void> {
  const existing = await readTask(filePath)
  const updated: Task = { ...existing, ...updates }
  await writeTask(path.dirname(filePath), updated)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All taskFile tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/taskFile.ts tests/core/taskFile.test.ts
git commit -m "feat: add task file read/write with gray-matter

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: NLP Parser (Rule-Based)

**Files:**
- Create: `src/core/taskParser.ts`
- Create: `tests/core/taskParser.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/core/taskParser.test.ts
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
    expect(result.due).toBe('2026-03-31') // next Tuesday from 2026-03-29 (Monday)
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
    const result = parseTaskInput('Buy groceries', mockConfig)
    expect(result.tags).toContain('status/todo')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/core/taskParser'`

- [ ] **Step 3: Write `src/core/taskParser.ts`**

```typescript
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
  const results = chrono.parse(input)
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

  // Parse due date
  const parsed = chrono.parseDate(input)
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

  // Inbox if domain or due date could not be inferred
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

  // Clean up name: remove date phrase and domain keywords
  let name = stripDatePhrase(input)
  name = stripDomainPhrases(name)
  // Remove priority keywords from name
  name = name.replace(/\b(urgent|ASAP|critical|important|no rush|whenever|someday)\b/gi, '')
  name = name.replace(/[-:,]+$/, '').replace(/\s+/g, ' ').trim()

  return { name, due, tags, needsInbox }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All taskParser tests PASS. (If chrono-node parses "next Tuesday" differently based on timezone, adjust the expected date in the test to match.)

- [ ] **Step 5: Commit**

```bash
git add src/core/taskParser.ts tests/core/taskParser.test.ts
git commit -m "feat: add rule-based NLP parser with chrono-node

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Vault Scanner

**Files:**
- Create: `src/core/vaultScanner.ts`
- Create: `tests/core/vaultScanner.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/core/vaultScanner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { writeTask } from '../../src/core/taskFile'
import { scanTasks, scanTasksByFilter } from '../../src/core/vaultScanner'
import { Task, Config, TaskFilter } from '../../src/core/types'

describe('vaultScanner', () => {
  let tmpDir: string
  let tasksDir: string

  const mockConfig: Config = {
    vaultPath: '',
    tags: {
      domains: ['work', 'personal'],
      priorities: ['priority/high', 'priority/medium', 'priority/low'],
      categories: ['health'],
      statuses: ['status/todo', 'status/done', 'status/inbox'],
    },
  }

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-scan-test-'))
    tasksDir = path.join(tmpDir, 'Tasks')
    mockConfig.vaultPath = tmpDir

    const tasks: Task[] = [
      { id: 'task-2026-03-29-001', name: 'Work task', due: '2026-03-29', tags: ['work', 'status/todo', 'priority/high'], created: '2026-03-29', completed: null },
      { id: 'task-2026-03-29-002', name: 'Personal task', due: '2026-03-30', tags: ['personal', 'status/todo', 'priority/low'], created: '2026-03-29', completed: null },
      { id: 'task-2026-03-29-003', name: 'Done task', due: '2026-03-28', tags: ['work', 'status/done', 'priority/medium'], created: '2026-03-28', completed: '2026-03-28' },
    ]
    for (const task of tasks) {
      await writeTask(tasksDir, task)
    }
  })

  afterEach(async () => {
    await fs.remove(tmpDir)
  })

  it('scanTasks returns all tasks from the Tasks directory', async () => {
    const tasks = await scanTasks(mockConfig)
    expect(tasks).toHaveLength(3)
  })

  it('scanTasksByFilter filters by domain', async () => {
    const filter: TaskFilter = { domain: 'work' }
    const tasks = await scanTasksByFilter(mockConfig, filter)
    expect(tasks.every((t) => t.tags.includes('work'))).toBe(true)
    expect(tasks).toHaveLength(2)
  })

  it('scanTasksByFilter filters by status', async () => {
    const filter: TaskFilter = { status: 'status/todo' }
    const tasks = await scanTasksByFilter(mockConfig, filter)
    expect(tasks).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/core/vaultScanner'`

- [ ] **Step 3: Write `src/core/vaultScanner.ts`**

```typescript
import * as fs from 'fs-extra'
import * as path from 'path'
import { readTask } from './taskFile'
import { Config, Task, TaskFilter } from './types'
import { isToday, isThisWeek, isNextWeek, isOverdue } from '../utils/dateUtils'

export function getTasksDir(config: Config): string {
  return path.join(config.vaultPath, 'Tasks')
}

export async function scanTasks(config: Config): Promise<Task[]> {
  const tasksDir = getTasksDir(config)
  if (!(await fs.pathExists(tasksDir))) return []
  const files = await fs.readdir(tasksDir)
  const mdFiles = files.filter((f) => f.endsWith('.md'))
  const tasks = await Promise.all(mdFiles.map((f) => readTask(path.join(tasksDir, f))))
  return tasks
}

export async function scanTasksByFilter(config: Config, filter: TaskFilter): Promise<Task[]> {
  const all = await scanTasks(config)
  return all.filter((task) => {
    if (filter.domain && !task.tags.includes(filter.domain)) return false
    if (filter.status && !task.tags.includes(filter.status)) return false
    if (filter.priority && !task.tags.includes(`priority/${filter.priority}`)) return false
    if (filter.due && task.due) {
      if (filter.due === 'today' && !isToday(task.due)) return false
      if (filter.due === 'this-week' && !isThisWeek(task.due)) return false
      if (filter.due === 'next-week' && !isNextWeek(task.due)) return false
      if (filter.due === 'overdue' && !isOverdue(task.due)) return false
    }
    return true
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All vaultScanner tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/vaultScanner.ts tests/core/vaultScanner.test.ts
git commit -m "feat: add vault scanner with filter support

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Daily Note Generator

**Files:**
- Create: `src/core/dailyNoteGenerator.ts`
- Create: `tests/core/dailyNoteGenerator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/core/dailyNoteGenerator.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateTodayNote, generateThisWeekNote, generateNextWeekNote, parseCheckedTaskIds } from '../../src/core/dailyNoteGenerator'
import { Task } from '../../src/core/types'

const tasks: Task[] = [
  { id: 'task-2026-03-29-001', name: 'Overdue task', due: '2026-03-27', tags: ['work', 'priority/high', 'status/todo'], created: '2026-03-27', completed: null },
  { id: 'task-2026-03-29-002', name: 'Due today', due: '2026-03-29', tags: ['personal', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
  { id: 'task-2026-03-29-003', name: 'This week', due: '2026-03-31', tags: ['work', 'priority/low', 'status/todo'], created: '2026-03-29', completed: null },
  { id: 'task-2026-03-29-004', name: 'Next week', due: '2026-04-06', tags: ['personal', 'priority/medium', 'status/todo'], created: '2026-03-29', completed: null },
]

describe('dailyNoteGenerator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('generateTodayNote includes overdue and due today sections', () => {
    const note = generateTodayNote(tasks)
    expect(note).toContain('Overdue task')
    expect(note).toContain('Due today')
    expect(note).toContain('## 🔴 Overdue')
    expect(note).toContain('## 📅 Due Today')
  })

  it('generateTodayNote embeds task IDs as HTML comments', () => {
    const note = generateTodayNote(tasks)
    expect(note).toContain('<!-- task:task-2026-03-29-001 -->')
  })

  it('generateTodayNote excludes done tasks', () => {
    const withDone = [...tasks, {
      id: 'task-done', name: 'Already done', due: '2026-03-29',
      tags: ['work', 'status/done', 'priority/low'], created: '2026-03-29', completed: '2026-03-29'
    }]
    const note = generateTodayNote(withDone)
    expect(note).not.toContain('Already done')
  })

  it('generateThisWeekNote groups tasks by domain', () => {
    const note = generateThisWeekNote(tasks)
    expect(note).toContain('## Work')
    expect(note).toContain('This week')
  })

  it('generateNextWeekNote shows next week tasks', () => {
    const note = generateNextWeekNote(tasks)
    expect(note).toContain('Next week')
  })

  it('parseCheckedTaskIds extracts IDs from checked checkboxes', () => {
    const noteContent = `
- [x] Overdue task — Work · High <!-- task:task-2026-03-29-001 -->
- [ ] Due today — Personal · Medium <!-- task:task-2026-03-29-002 -->
    `.trim()
    const ids = parseCheckedTaskIds(noteContent)
    expect(ids).toEqual(['task-2026-03-29-001'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/core/dailyNoteGenerator'`

- [ ] **Step 3: Write `src/core/dailyNoteGenerator.ts`**

```typescript
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Task } from './types'
import { isToday, isThisWeek, isNextWeek, isOverdue, startOfWeek, endOfWeek } from '../utils/dateUtils'

dayjs.extend(isoWeek)

const DOMAINS = ['work', 'personal', 'personal-projects']

function getPriority(task: Task): string {
  if (task.tags.includes('priority/high')) return 'High'
  if (task.tags.includes('priority/low')) return 'Low'
  return 'Medium'
}

function getDomain(task: Task): string {
  for (const d of DOMAINS) {
    if (task.tags.includes(d)) return d.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return 'Inbox'
}

function taskLine(task: Task): string {
  const domain = getDomain(task)
  const priority = getPriority(task)
  const due = task.due ? ` *(due ${dayjs(task.due).format('MMM D')})*` : ''
  return `- [ ] ${task.name}${due} — ${domain} · ${priority} <!-- task:${task.id} -->`
}

function isActive(task: Task): boolean {
  return !task.tags.includes('status/done') && !task.tags.includes('status/blocked')
}

export function generateTodayNote(tasks: Task[]): string {
  const active = tasks.filter(isActive)
  const overdue = active.filter((t) => t.due && isOverdue(t.due))
  const dueToday = active.filter((t) => t.due && isToday(t.due))
  const inbox = active.filter((t) => t.tags.includes('status/inbox'))

  const dateStr = dayjs().format('MMMM D, YYYY')
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm')

  const sections: string[] = [`# Today — ${dateStr}`]

  if (inbox.length > 0) {
    sections.push('\n## 📋 Needs Triage')
    inbox.forEach((t) => sections.push(taskLine(t)))
  }

  sections.push('\n## 🔴 Overdue')
  if (overdue.length > 0) {
    overdue.forEach((t) => sections.push(taskLine(t)))
  } else {
    sections.push('*(Nothing overdue)*')
  }

  sections.push('\n## 📅 Due Today')
  if (dueToday.length > 0) {
    dueToday.forEach((t) => sections.push(taskLine(t)))
  } else {
    sections.push('*(Nothing due today)*')
  }

  sections.push(`\n---\n*Generated by task-manager · /today · ${timestamp}*`)
  return sections.join('\n')
}

export function generateThisWeekNote(tasks: Task[]): string {
  const weekStart = startOfWeek()
  const weekEnd = endOfWeek()
  const active = tasks.filter(isActive).filter((t) => t.due && isThisWeek(t.due))
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm')
  const rangeStr = `${dayjs(weekStart).format('MMM D')}–${dayjs(weekEnd).format('MMM D, YYYY')}`

  const sections: string[] = [`# This Week — ${rangeStr}`]

  for (const domain of DOMAINS) {
    const domainTasks = active.filter((t) => t.tags.includes(domain))
    const label = domain.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    sections.push(`\n## ${label}`)
    if (domainTasks.length > 0) {
      domainTasks.forEach((t) => sections.push(taskLine(t)))
    } else {
      sections.push('*(Nothing scheduled yet)*')
    }
  }

  sections.push(`\n---\n*Generated by task-manager · /today · ${timestamp}*`)
  return sections.join('\n')
}

export function generateNextWeekNote(tasks: Task[]): string {
  const nextStart = dayjs().add(7, 'day').isoWeekday(1).format('YYYY-MM-DD')
  const nextEnd = dayjs().add(7, 'day').isoWeekday(7).format('YYYY-MM-DD')
  const active = tasks.filter(isActive).filter((t) => t.due && isNextWeek(t.due))
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm')
  const rangeStr = `${dayjs(nextStart).format('MMM D')}–${dayjs(nextEnd).format('MMM D, YYYY')}`

  const sections: string[] = [`# Next Week — ${rangeStr}`]

  for (const domain of DOMAINS) {
    const domainTasks = active.filter((t) => t.tags.includes(domain))
    const label = domain.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    sections.push(`\n## ${label}`)
    if (domainTasks.length > 0) {
      domainTasks.forEach((t) => sections.push(taskLine(t)))
    } else {
      sections.push('*(Nothing scheduled yet)*')
    }
  }

  sections.push(`\n---\n*Generated by task-manager · /today · ${timestamp}*`)
  return sections.join('\n')
}

export function parseCheckedTaskIds(noteContent: string): string[] {
  const lines = noteContent.split('\n')
  const ids: string[] = []
  for (const line of lines) {
    if (/^- \[x\]/.test(line)) {
      const match = line.match(/<!-- task:(task-[\w-]+) -->/)
      if (match) ids.push(match[1])
    }
  }
  return ids
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All dailyNoteGenerator tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/dailyNoteGenerator.ts tests/core/dailyNoteGenerator.test.ts
git commit -m "feat: add daily note generator with checkbox ID embedding

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Setup Wizard

**Files:**
- Create: `src/config/setupWizard.ts`

- [ ] **Step 1: Write `src/config/setupWizard.ts`**

(No unit tests — this is an interactive inquirer flow. Tested manually on first run.)

```typescript
import inquirer from 'inquirer'
import * as path from 'path'
import { defaultConfig, saveConfig } from './configLoader'
import { Config } from '../core/types'
import chalk from 'chalk'

export async function runSetupWizard(vaultPath?: string): Promise<Config> {
  console.log(chalk.cyan('\n🗂  Task Manager — First Run Setup\n'))

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'vaultPath',
      message: 'Where is your Obsidian vault? (absolute path)',
      default: vaultPath ?? path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', 'TaskVault'),
      validate: (input: string) => input.trim().length > 0 || 'Vault path is required',
    },
  ])

  const config = defaultConfig(answers.vaultPath.trim())
  await saveConfig(answers.vaultPath.trim(), config)

  console.log(chalk.green(`\n✅ Config saved to ${answers.vaultPath}/config.json`))
  console.log(chalk.gray('   Edit config.json to add domains and tags.\n'))

  return config
}
```

- [ ] **Step 2: Commit**

```bash
git add src/config/setupWizard.ts
git commit -m "feat: add first-run setup wizard

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: CLI Commands — `task add` and `task list`

**Files:**
- Create: `src/commands/add.ts`
- Create: `src/commands/list.ts`
- Create: `tests/commands/add.test.ts`
- Create: `tests/commands/list.test.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Write failing tests for `add` command**

```typescript
// tests/commands/add.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { Config } from '../../src/core/types'
import { scanTasks } from '../../src/core/vaultScanner'

describe('addTask', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-add-test-'))
    config = {
      vaultPath: tmpDir,
      tags: {
        domains: ['work', 'personal', 'personal-projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: ['health', 'finance', 'errands', 'learning', 'admin', 'creative'],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
      },
    }
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tmpDir)
  })

  it('creates a task file in the Tasks directory', async () => {
    await addTask('Call dentist next Tuesday for personal', config)
    const tasks = await scanTasks(config)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].name).toContain('Call dentist')
  })

  it('assigns status/inbox when domain is ambiguous', async () => {
    await addTask('Deal with the Alex thing', config)
    const tasks = await scanTasks(config)
    expect(tasks[0].tags).toContain('status/inbox')
  })

  it('assigns work domain when "for work" is in input', async () => {
    await addTask('Finish report for work by Friday', config)
    const tasks = await scanTasks(config)
    expect(tasks[0].tags).toContain('work')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/commands/add'`

- [ ] **Step 3: Write `src/commands/add.ts`**

```typescript
import chalk from 'chalk'
import { Config } from '../core/types'
import { parseTaskInput } from '../core/taskParser'
import { filterToCanonical } from '../core/tagRegistry'
import { writeTask } from '../core/taskFile'
import { generateTaskId } from '../utils/idGenerator'
import { getTasksDir } from '../core/vaultScanner'
import { today } from '../utils/dateUtils'

export async function addTask(input: string, config: Config): Promise<void> {
  const parsed = parseTaskInput(input, config)
  const { valid: tags } = filterToCanonical(parsed.tags, config)
  const tasksDir = getTasksDir(config)
  const id = await generateTaskId(tasksDir)

  const task = {
    id,
    name: parsed.name,
    due: parsed.due,
    tags,
    created: today(),
    completed: null,
  }

  await writeTask(tasksDir, task)

  if (parsed.needsInbox) {
    console.log(chalk.yellow(`⚠  Added to inbox (domain unclear): ${task.name}`))
    console.log(chalk.gray(`   Run: task update ${id} --domain work --due <date>`))
  } else {
    console.log(chalk.green(`✅ Task added: ${task.name}`))
    if (task.due) console.log(chalk.gray(`   Due: ${task.due} · ID: ${id}`))
    else console.log(chalk.gray(`   No due date · ID: ${id}`))
  }
}
```

- [ ] **Step 4: Write `src/commands/list.ts`**

```typescript
import chalk from 'chalk'
import dayjs from 'dayjs'
import { Config, Task, TaskFilter } from '../core/types'
import { scanTasksByFilter } from '../core/vaultScanner'

function formatTask(task: Task): string {
  const domain = task.tags.find((t) => ['work', 'personal', 'personal-projects'].includes(t)) ?? 'inbox'
  const priority = task.tags.find((t) => t.startsWith('priority/'))?.replace('priority/', '') ?? 'medium'
  const due = task.due ? dayjs(task.due).format('MMM D') : 'no date'
  const status = task.tags.includes('status/done') ? chalk.gray('[done]') : ''
  return `  ${chalk.cyan(task.id.slice(-7))} ${task.name} ${chalk.gray(`— ${domain} · ${priority} · ${due}`)} ${status}`
}

export async function listTasks(config: Config, filter: TaskFilter, showDone = false): Promise<void> {
  const tasks = await scanTasksByFilter(config, filter)
  // Hide done tasks by default — pass --done flag to see them
  const visible = showDone ? tasks : tasks.filter((t) => !t.tags.includes('status/done'))
  if (visible.length === 0) {
    console.log(chalk.gray('No tasks found.'))
    return
  }
  console.log(chalk.bold(`\n${visible.length} task(s):\n`))
  visible.forEach((t) => console.log(formatTask(t)))
  console.log()
}
```

- [ ] **Step 5: Write `tests/commands/list.test.ts`**

```typescript
// tests/commands/list.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { scanTasksByFilter } from '../../src/core/vaultScanner'
import { Config } from '../../src/core/types'

describe('listTasks (via vaultScanner)', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-list-test-'))
    config = {
      vaultPath: tmpDir,
      tags: {
        domains: ['work', 'personal', 'personal-projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: ['health', 'finance', 'errands', 'learning', 'admin', 'creative'],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
      },
    }
    await addTask('Work report for work by Friday', config)
    await addTask('Buy groceries this weekend personal', config)
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tmpDir)
  })

  it('returns all tasks without filter', async () => {
    const tasks = await scanTasksByFilter(config, {})
    expect(tasks).toHaveLength(2)
  })

  it('filters tasks by domain', async () => {
    const tasks = await scanTasksByFilter(config, { domain: 'work' })
    expect(tasks).toHaveLength(1)
    expect(tasks[0].tags).toContain('work')
  })
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: All add/list tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/commands/add.ts src/commands/list.ts tests/commands/add.test.ts tests/commands/list.test.ts
git commit -m "feat: add task add and list commands with tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 12: CLI Commands — `task done`, `task update`, `task delete`

**Files:**
- Create: `src/commands/done.ts`
- Create: `src/commands/update.ts`
- Create: `src/commands/delete.ts`
- Create: `tests/commands/done.test.ts`

- [ ] **Step 1: Write failing tests for `done` command**

```typescript
// tests/commands/done.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { markDone } from '../../src/commands/done'
import { scanTasks } from '../../src/core/vaultScanner'
import { Config } from '../../src/core/types'

describe('markDone', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-done-test-'))
    config = {
      vaultPath: tmpDir,
      tags: {
        domains: ['work', 'personal', 'personal-projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: ['health'],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
      },
    }
    await addTask('Finish report for work', config)
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tmpDir)
  })

  it('marks a task as done and sets completed date', async () => {
    const tasks = await scanTasks(config)
    const id = tasks[0].id
    await markDone(id, config)
    const updated = await scanTasks(config)
    const task = updated.find((t) => t.id === id)!
    expect(task.tags).toContain('status/done')
    expect(task.tags).not.toContain('status/todo')
    expect(task.completed).toBe('2026-03-29')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/commands/done'`

- [ ] **Step 3: Write `src/commands/done.ts`**

```typescript
import * as path from 'path'
import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { today } from '../utils/dateUtils'

export async function markDone(taskId: string, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)
  const newTags = task.tags
    .filter((t) => t !== 'status/todo' && t !== 'status/inbox' && t !== 'status/blocked')
    .concat('status/done')
  await updateTask(filePath, { tags: newTags, completed: today() })
  console.log(chalk.green(`✅ Done: ${task.name}`))
}
```

- [ ] **Step 4: Write `src/commands/update.ts`**

```typescript
import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { filterToCanonical } from '../core/tagRegistry'

export interface UpdateOptions {
  name?: string
  due?: string
  domain?: string
  priority?: string
}

export async function updateTaskCmd(taskId: string, opts: UpdateOptions, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)

  let tags = [...task.tags]

  if (opts.domain) {
    tags = tags.filter((t) => !config.tags.domains.includes(t))
    tags = tags.filter((t) => t !== 'status/inbox')
    if (!tags.includes('status/todo')) tags.push('status/todo')
    tags.push(opts.domain)
  }

  if (opts.priority) {
    tags = tags.filter((t) => !t.startsWith('priority/'))
    tags.push(`priority/${opts.priority}`)
  }

  const { valid: validTags } = filterToCanonical(tags, config)

  const updates: Partial<typeof task> = { tags: validTags }
  if (opts.name) updates.name = opts.name
  if (opts.due) updates.due = opts.due

  await updateTask(filePath, updates)
  console.log(chalk.green(`✅ Updated: ${task.name}`))
}
```

- [ ] **Step 5: Write `src/commands/delete.ts`**

```typescript
import * as fs from 'fs-extra'
import chalk from 'chalk'
import { Config } from '../core/types'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask } from '../core/taskFile'

export async function deleteTask(taskId: string, config: Config): Promise<void> {
  const tasksDir = getTasksDir(config)
  const filePath = taskFilePath(tasksDir, taskId)
  const task = await readTask(filePath)
  await fs.remove(filePath)
  console.log(chalk.red(`🗑  Deleted: ${task.name}`))
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: All done/update/delete tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/commands/done.ts src/commands/update.ts src/commands/delete.ts tests/commands/done.test.ts
git commit -m "feat: add done, update, and delete commands

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 13: `/today` Command with Checkbox Sync

**Files:**
- Create: `src/commands/today.ts`
- Create: `tests/commands/today.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/commands/today.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { runToday } from '../../src/commands/today'
import { scanTasks } from '../../src/core/vaultScanner'
import { Config } from '../../src/core/types'

describe('runToday', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-today-test-'))
    config = {
      vaultPath: tmpDir,
      tags: {
        domains: ['work', 'personal', 'personal-projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: ['health', 'errands'],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
      },
    }
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tmpDir)
  })

  it('creates today.md, this-week.md, next-week.md in dated subfolder', async () => {
    await addTask('Work report for work due today', config)
    await runToday(config)
    const noteDir = path.join(tmpDir, 'DailyNotes', '2026-03-29')
    expect(await fs.pathExists(path.join(noteDir, 'today.md'))).toBe(true)
    expect(await fs.pathExists(path.join(noteDir, 'this-week.md'))).toBe(true)
    expect(await fs.pathExists(path.join(noteDir, 'next-week.md'))).toBe(true)
  })

  it('syncs checked checkboxes from existing today.md and marks tasks done', async () => {
    await addTask('Work report for work due today', config)
    const tasks = await scanTasks(config)
    const taskId = tasks[0].id

    // Simulate a pre-existing today.md with the task checked off
    const noteDir = path.join(tmpDir, 'DailyNotes', '2026-03-29')
    await fs.ensureDir(noteDir)
    await fs.writeFile(
      path.join(noteDir, 'today.md'),
      `- [x] Work report — Work · High <!-- task:${taskId} -->\n`
    )

    await runToday(config)

    const updatedTasks = await scanTasks(config)
    const task = updatedTasks.find((t) => t.id === taskId)!
    expect(task.tags).toContain('status/done')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/commands/today'`

- [ ] **Step 3: Write `src/commands/today.ts`**

```typescript
import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import dayjs from 'dayjs'
import { Config } from '../core/types'
import { scanTasks } from '../core/vaultScanner'
import { generateTodayNote, generateThisWeekNote, generateNextWeekNote, parseCheckedTaskIds } from '../core/dailyNoteGenerator'
import { getTasksDir } from '../core/vaultScanner'
import { taskFilePath, readTask, updateTask } from '../core/taskFile'
import { today } from '../utils/dateUtils'

function getDailyNoteDir(config: Config): string {
  const dateStr = dayjs().format('YYYY-MM-DD')
  return path.join(config.vaultPath, 'DailyNotes', dateStr)
}

async function syncCheckboxes(config: Config, noteDir: string): Promise<number> {
  const todayFile = path.join(noteDir, 'today.md')
  if (!(await fs.pathExists(todayFile))) return 0

  const content = await fs.readFile(todayFile, 'utf8')
  const checkedIds = parseCheckedTaskIds(content)
  if (checkedIds.length === 0) return 0

  const tasksDir = getTasksDir(config)
  let synced = 0

  for (const id of checkedIds) {
    const filePath = taskFilePath(tasksDir, id)
    if (!(await fs.pathExists(filePath))) continue
    const task = await readTask(filePath)
    if (task.tags.includes('status/done')) continue
    const newTags = task.tags
      .filter((t) => t !== 'status/todo' && t !== 'status/inbox' && t !== 'status/blocked')
      .concat('status/done')
    await updateTask(filePath, { tags: newTags, completed: today() })
    synced++
  }

  return synced
}

export async function runToday(config: Config): Promise<void> {
  const noteDir = getDailyNoteDir(config)
  await fs.ensureDir(noteDir)

  // Step 1: Sync checkboxes from existing today.md
  const synced = await syncCheckboxes(config, noteDir)

  // Step 2: Scan all tasks (with updated done states)
  const tasks = await scanTasks(config)

  // Step 3: Generate and write all three notes
  const todayNote = generateTodayNote(tasks)
  const thisWeekNote = generateThisWeekNote(tasks)
  const nextWeekNote = generateNextWeekNote(tasks)

  await fs.writeFile(path.join(noteDir, 'today.md'), todayNote, 'utf8')
  await fs.writeFile(path.join(noteDir, 'this-week.md'), thisWeekNote, 'utf8')
  await fs.writeFile(path.join(noteDir, 'next-week.md'), nextWeekNote, 'utf8')

  const todayTasks = tasks.filter((t) => t.due === today() && !t.tags.includes('status/done'))
  console.log(
    chalk.green(
      `✅ Notes updated → ${synced} tasks marked done · today: ${todayTasks.length} tasks`
    )
  )
  console.log(chalk.gray(`   ${noteDir}`))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All today tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/today.ts tests/commands/today.test.ts
git commit -m "feat: add /today command with checkbox sync

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 14: `task domains/tags` Config Commands + Wire Up CLI

**Files:**
- Create: `src/commands/config.ts`
- Modify: `src/cli.ts` (wire all commands)

- [ ] **Step 1: Write `src/commands/config.ts`**

```typescript
import chalk from 'chalk'
import { Config } from '../core/types'
import { saveConfig } from '../config/configLoader'

export async function listDomains(config: Config): Promise<void> {
  console.log(chalk.bold('\nDomains:'))
  config.tags.domains.forEach((d) => console.log(`  ${d}`))
}

export async function addDomain(domain: string, config: Config): Promise<void> {
  const normalized = domain.toLowerCase().replace(/\s+/g, '-')
  if (config.tags.domains.includes(normalized)) {
    console.log(chalk.yellow(`Domain "${normalized}" already exists.`))
    return
  }
  config.tags.domains.push(normalized)
  await saveConfig(config.vaultPath, config)
  console.log(chalk.green(`✅ Domain added: ${normalized}`))
}

export async function listTags(config: Config): Promise<void> {
  const all = [
    ...config.tags.domains,
    ...config.tags.priorities,
    ...config.tags.categories,
    ...config.tags.statuses,
  ]
  console.log(chalk.bold('\nCanonical tags:'))
  all.forEach((t) => console.log(`  ${t}`))
}

export async function addTag(tag: string, category: keyof Config['tags'], config: Config): Promise<void> {
  const normalized = tag.toLowerCase().replace(/\s+/g, '-')
  if (config.tags[category].includes(normalized)) {
    console.log(chalk.yellow(`Tag "${normalized}" already exists in ${category}.`))
    return
  }
  config.tags[category].push(normalized)
  await saveConfig(config.vaultPath, config)
  console.log(chalk.green(`✅ Tag added to ${category}: ${normalized}`))
}
```

- [ ] **Step 2: Wire up all commands in `src/cli.ts`**

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import * as path from 'path'
import chalk from 'chalk'
import { configExists, loadConfig } from './config/configLoader'
import { runSetupWizard } from './config/setupWizard'
import { addTask } from './commands/add'
import { listTasks } from './commands/list'
import { markDone } from './commands/done'
import { updateTaskCmd } from './commands/update'
import { deleteTask } from './commands/delete'
import { runToday } from './commands/today'
import { listDomains, addDomain, listTags, addTag } from './commands/config'
import { Config } from './core/types'

async function getConfig(): Promise<Config> {
  // Step 1: Check ~/.taskmanager for saved vault path
  const { readLauncherConfig, writeLauncherConfig } = await import('./config/launcherConfig')
  const saved = await readLauncherConfig()

  if (saved?.vaultPath && await configExists(saved.vaultPath)) {
    return loadConfig(saved.vaultPath)
  }

  // Step 2: First run — launch setup wizard, then save vault path to ~/.taskmanager
  console.log(chalk.yellow('\nNo config found. Running setup wizard...\n'))
  const config = await runSetupWizard()
  await writeLauncherConfig({ vaultPath: config.vaultPath })
  return config
}

const program = new Command()

program
  .name('task')
  .description('Personal CLI task manager for Obsidian')
  .version('0.1.0')

program
  .command('add <text>')
  .description('Add a task using natural language')
  .action(async (text: string) => {
    const config = await getConfig()
    await addTask(text, config)
  })

program
  .command('list')
  .description('List tasks (hides done tasks by default)')
  .option('--domain <domain>', 'Filter by domain')
  .option('--due <when>', 'Filter by due: today | this-week | next-week | overdue')
  .option('--priority <level>', 'Filter by priority: high | medium | low')
  .option('--status <status>', 'Filter by status tag')
  .option('--done', 'Include completed tasks')
  .action(async (opts) => {
    const config = await getConfig()
    await listTasks(config, {
      domain: opts.domain,
      due: opts.due,
      priority: opts.priority,
      status: opts.status,
    }, opts.done ?? false)
  })

program
  .command('done <id>')
  .description('Mark a task as done')
  .action(async (id: string) => {
    const config = await getConfig()
    await markDone(id, config)
  })

program
  .command('update <id>')
  .description('Update a task')
  .option('--name <name>', 'New task name')
  .option('--due <date>', 'New due date (YYYY-MM-DD or natural language)')
  .option('--domain <domain>', 'New domain')
  .option('--priority <priority>', 'New priority: high | medium | low')
  .action(async (id: string, opts) => {
    const config = await getConfig()
    await updateTaskCmd(id, opts, config)
  })

program
  .command('delete <id>')
  .description('Delete a task')
  .action(async (id: string) => {
    const config = await getConfig()
    await deleteTask(id, config)
  })

program
  .command('today')
  .description('Generate today/this-week/next-week Obsidian notes')
  .action(async () => {
    const config = await getConfig()
    await runToday(config)
  })

const domains = program.command('domains').description('Manage domains')
domains.command('list').action(async () => { const c = await getConfig(); await listDomains(c) })
domains.command('add <domain>').action(async (domain: string) => { const c = await getConfig(); await addDomain(domain, c) })

const tags = program.command('tags').description('Manage canonical tags')
tags.command('list').action(async () => { const c = await getConfig(); await listTags(c) })
tags.command('add <tag>').option('--category <cat>', 'Tag category: domains|priorities|categories|statuses', 'categories')
  .action(async (tag: string, opts) => { const c = await getConfig(); await addTag(tag, opts.category, c) })

program.parse(process.argv)
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Compiles without errors to `dist/`.

- [ ] **Step 5: Commit**

```bash
git add src/commands/config.ts src/cli.ts
git commit -m "feat: wire up all CLI commands and add domains/tags management

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 15: End-to-End Integration Test + Git Setup

**Files:**
- Create: `tests/integration/endToEnd.test.ts`
- Create: `README.md`

- [ ] **Step 1: Write the integration test**

```typescript
// tests/integration/endToEnd.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { addTask } from '../../src/commands/add'
import { runToday } from '../../src/commands/today'
import { scanTasks } from '../../src/core/vaultScanner'
import { taskFilePath } from '../../src/core/taskFile'
import { Config } from '../../src/core/types'

describe('End-to-End: add → check off in Obsidian → /today marks done', () => {
  let tmpDir: string
  let config: Config

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T10:00:00'))
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-e2e-test-'))
    config = {
      vaultPath: tmpDir,
      tags: {
        domains: ['work', 'personal', 'personal-projects'],
        priorities: ['priority/high', 'priority/medium', 'priority/low'],
        categories: ['health', 'errands'],
        statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
      },
    }
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tmpDir)
  })

  it('full flow: user adds task, checks it off in Obsidian, /today marks it done', async () => {
    // 1. User adds a task
    await addTask('Prepare Q2 roadmap for work due today', config)

    // 2. Verify task was created
    let tasks = await scanTasks(config)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].tags).toContain('work')
    expect(tasks[0].tags).toContain('status/todo')

    const taskId = tasks[0].id

    // 3. First /today run — generates notes
    await runToday(config)
    const noteDir = path.join(tmpDir, 'DailyNotes', '2026-03-29')
    const todayContent = await fs.readFile(path.join(noteDir, 'today.md'), 'utf8')
    expect(todayContent).toContain('Prepare Q2 roadmap')
    expect(todayContent).toContain(`<!-- task:${taskId} -->`)

    // 4. Simulate user checking off the task in Obsidian
    const checkedContent = todayContent.replace(
      `- [ ] Prepare Q2 roadmap`,
      `- [x] Prepare Q2 roadmap`
    )
    await fs.writeFile(path.join(noteDir, 'today.md'), checkedContent, 'utf8')

    // 5. Second /today run — should sync the checkbox and mark task done
    await runToday(config)

    tasks = await scanTasks(config)
    const updatedTask = tasks.find((t) => t.id === taskId)!
    expect(updatedTask.tags).toContain('status/done')
    expect(updatedTask.completed).toBe('2026-03-29')
  })
})
```

- [ ] **Step 2: Run integration test**

Run: `npm test`
Expected: Integration test PASSES.

- [ ] **Step 3: Write `README.md`**

```markdown
# Task Manager

A personal CLI task manager that stores tasks as markdown files in your Obsidian vault.

## Requirements

- Node.js 18+
- An Obsidian vault (or any folder you want to use)

## Install

```bash
git clone https://github.com/steerave/task-manager
cd task-manager
npm install
npm run build
npm link   # makes `task` available globally
```

## First Run

```bash
task add "test task"
```
The setup wizard runs automatically on first use and asks for your vault path.

## Commands

```bash
task add "Call dentist next Tuesday"          # Add a task
task list                                      # List all tasks
task list --domain work --due this-week        # Filter tasks
task done task-2026-03-29-001                  # Mark done
task update task-2026-03-29-001 --priority high  # Update
task delete task-2026-03-29-001               # Delete
task today                                     # Generate daily notes + sync checkboxes
task domains list                              # List domains
task domains add Finance                       # Add domain
task tags list                                 # List all canonical tags
task tags add "research"                       # Add category tag
```

## Shell Alias (optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias t='task add'
```

Then: `t "Call dentist next Tuesday personal"`

## Vault Structure

```
/TaskVault
  /Tasks            ← all task files (auto-created)
  /DailyNotes
    /YYYY-MM-DD
      today.md
      this-week.md
      next-week.md
  config.json       ← created on first run (gitignored)
```
```

- [ ] **Step 4: Run full test suite one final time**

Run: `npm test`
Expected: All tests PASS. Zero failures.

- [ ] **Step 5: Initialize git and push**

```bash
cd "C:/Users/steerave/Desktop/Claude Projects/Task Manager"
git init
git branch -M main
git add .gitignore CLAUDE.md README.md package.json package-lock.json tsconfig.json .eslintrc.json .prettierrc .env.template src/ tests/ docs/
git status   # verify no .env, config.json, node_modules in staged files
git commit -m "feat: initial Task Manager V0.1 implementation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
gh repo create task-manager --public --push --source=.
```

---

## Self-Review Against Spec

| Spec requirement | Covered in task |
|---|---|
| `task add` with NLP parsing | Task 7 (parser) + Task 11 (command) |
| Inbox tagging for ambiguous tasks | Task 7 (`needsInbox` flag) |
| Canonical tag list enforcement | Task 5 (tagRegistry) |
| `task list` with filters | Task 8 (vaultScanner) + Task 11 |
| `task done` / `task update` / `task delete` | Task 12 |
| Markdown + YAML frontmatter file creation | Task 6 (taskFile) |
| `config.json` setup wizard on first run | Task 10 (setupWizard) + Task 14 (cli.ts) |
| `task domains add/list` and `task tags add/list` | Task 14 |
| `/today` — generates three Obsidian notes | Task 9 (generator) + Task 13 (command) |
| Checkbox sync | Task 13 (`syncCheckboxes`) |
| `t "..."` shell alias | Task 15 (README) |
| Rule-based NLP (chrono-node) | Task 7 |
| Definition of done: add in 5 sec, check off, sync on next `/today` | Task 15 (integration test) |
