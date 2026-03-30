# Task Manager — Project Context

A personal CLI task manager that stores tasks as markdown files in an Obsidian vault and generates daily/weekly summary notes.

---

## Stack

- **Language:** TypeScript / Node.js
- **CLI framework:** `commander`
- **Date parsing:** `chrono-node`
- **Frontmatter I/O:** `gray-matter`
- **Terminal output:** `chalk`
- **Date utils:** `dayjs`
- **File system:** `fs-extra`
- **Setup wizard:** `inquirer`
- **Tests:** `vitest`
- **LLM (optional, v0.2+):** `@anthropic-ai/sdk`

---

## Project Structure

```
src/
  cli.ts                    # Entry point, commander setup
  commands/                 # One file per CLI command
    add.ts, list.ts, done.ts, update.ts, delete.ts, today.ts, config.ts
  core/
    types.ts                # Task, Config, ParsedInput interfaces
    taskFile.ts             # Read/write markdown task files (gray-matter)
    taskParser.ts           # NLP: natural language → ParsedInput
    tagRegistry.ts          # Canonical tag enforcement against config
    vaultScanner.ts         # Scan vault directory for all task files
    dailyNoteGenerator.ts   # Generate today/this-week/next-week notes
  config/
    configLoader.ts         # Load/save config.json from vault
    setupWizard.ts          # First-run interactive setup
  utils/
    dateUtils.ts            # dayjs helpers
    idGenerator.ts          # Task ID generation (YYMMDD-slug-0001)
tests/
  core/                     # Unit tests for core modules
  commands/                 # Unit tests for command handlers
  integration/              # End-to-end tests using a temp vault
```

---

## Key Constraints

- **Tag registry is canonical:** LLM and parser can only assign tags defined in `config.json`. Use `task tags add <tag>` to extend.
- **Vault path is user-configured:** Never hardcode vault paths. Always read from `config.json`.
- **config.json and .task-index.json live in the vault**, not the repo — they are gitignored.
- **`/today` is atomic:** Checkbox sync runs before regeneration. Always syncs first.
- **Inbox tagging is mandatory:** When domain or due date cannot be inferred, tag `status/inbox` — never silently mis-tag.
- **Task ID format:** `YYMMDD-kebab-name-0001` — date prefix, task name slugified with filler words dropped, 4-digit sequence. Example: `260330-purchase-fruits-aldis-0001`.

---

## Key Commands

```bash
npm run dev        # Run CLI in dev mode (ts-node)
npm run build      # Compile TypeScript → dist/
npm test           # Run vitest
npm run lint       # ESLint check
```

---

## Config Schema (`config.json` — lives in vault root)

```json
{
  "vaultPath": "/path/to/TaskVault",
  "tags": {
    "domains": ["work", "personal", "personal-projects"],
    "priorities": ["priority/high", "priority/medium", "priority/low"],
    "categories": ["health", "finance", "errands", "learning", "admin", "creative"],
    "statuses": ["status/todo", "status/done", "status/blocked", "status/inbox"]
  }
}
```

---

## Versioned Roadmap

- **V0.1 (MVP):** Core CLI, rule-based NLP, `/today`, checkbox sync — see `docs/superpowers/plans/2026-03-29-task-manager-v0.1.md`
- **V0.2:** LLM parsing fallback, weekly review, index cache
- **V0.3:** `.ics` calendar export + calendar events in daily note
- **V1.0:** Recurring tasks, notifications, full test suite
