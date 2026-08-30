# Task Manager — Brainstorm

---

## 🤖 TL;DR for Claude Code

**What to build:** A personal CLI task manager that stores tasks as markdown files in an Obsidian vault and generates daily/weekly summary notes.

**The one-line pitch:** User types `task add "call dentist next Tuesday"` → Claude parses it → a structured markdown file lands in `/Tasks/` → running `/today` generates three Obsidian notes (today, this week, next week) with checkbox sync back to the source files.

**Stack:** Node.js / TypeScript. Key libs: `commander`, `chrono-node`, `gray-matter`, `chalk`, `@anthropic-ai/sdk` (optional LLM fallback), `dayjs`.

**Core data model:** Each task = one markdown file with three user-facing fields only: `name`, `due`, `tags`. Tags are constrained to a canonical list in `config.json` — the LLM cannot invent new ones.

**MVP scope (V0.1) — build these, nothing else:**
- `task add` with NLP parsing (rule-based + optional LLM fallback)
- `task list`, `task done`, `task update`, `task delete`
- Inbox tagging (`#status/inbox`) for ambiguous tasks
- `/today` command → generates `today.md`, `this-week.md`, `next-week.md` in `/DailyNotes/YYYY-MM-DD/`
- Checkbox sync: `/today` reads existing `today.md`, detects `[x]` checked items, marks those task files as done, then regenerates
- `t "..."` shell alias for fast capture
- `config.json` setup wizard on first run
- `task domains add/list` and `task tags add/list`

**Do not build in MVP:** LLM parsing, calendar sync, index cache, recurring tasks, notifications, TUI.

**Vault structure:**
```
/TaskVault
  /Tasks          ← flat, all tasks here, no subfolders
  /DailyNotes
    /YYYY-MM-DD
      today.md
      this-week.md
      next-week.md
  /Templates
  config.json
```

**Full details, versioned roadmap, and design decisions follow below.**

---

> **Status:** In Progress — working document, not final
> **Last Updated:** 2026-03-25
> **Purpose:** Capture raw ideas, decisions, and open questions before writing the formal spec

---

## What Are We Building?

A personal task management system built *on top of Obsidian*. The system consists of two layers:

1. **A CLI tool** — the primary interface for adding, updating, and querying tasks using natural language
2. **An Obsidian vault structure** — where all task data lives as markdown files, readable and editable by both the CLI and directly in Obsidian

The philosophy: **Obsidian is the UI. The CLI is the brain.**

---

## Core Decisions (Already Made)

| Decision | Choice | Reason |
|---|---|---|
| Data storage | Obsidian-native markdown | No lock-in, portable, human-readable |
| Primary interface | CLI tool | Fast, keyboard-driven, scriptable |
| Daily summary format | Obsidian daily note | Keeps everything in one place |
| NLP / input style | Natural language parsing | e.g. `task add "Call dentist next Tuesday personal"` → auto-categorized |
| Domains | Work, Personal Projects, Personal (+ extensible) | Covers main life areas |

---

## Domains

Domains are the top-level buckets that tasks belong to. They map to folders in the Obsidian vault.

### Initial Domains
- **Work** — job tasks, meetings, deliverables, deadlines
- **Personal Projects** — side projects, creative work, building things
- **Personal** — errands, health, relationships, household, general life admin

### Extensibility
- Domains should be defined in a config file (e.g. `domains.yaml` or `config.json`), not hardcoded
- Adding a new domain = adding one line to the config + the CLI auto-creates the folder
- Example future domains: `Finance`, `Health`, `Learning`, `Travel`

---

## Vault Structure

```
/TaskVault  (or inside an existing Obsidian vault)
│
├── /Tasks                        ← all tasks live here, flat (no subfolders)
│   ├── task-2026-03-24-001.md
│   ├── task-2026-03-24-002.md
│   └── task-2026-03-24-003.md
│
├── /DailyNotes
│   └── /2026-03-25
│       ├── today.md
│       ├── this-week.md
│       └── next-week.md
│
├── /Templates
│   └── task-template.md
│
└── config.json   ← domains, vault path, preferences
```

**Design decision:** All tasks live in a single flat `/Tasks` folder. There are no subfolders per domain. Domain and category separation is handled entirely through tags.

### Performance Scaling — Index File

The flat `/Tasks` folder works well up to ~200 tasks. Beyond that, every `/today` run reading every file gets slow. From V0.2 onward, the tool maintains a lightweight JSON index file (`.task-index.json`) in the vault root that caches all task metadata. It updates on every write operation (add, done, update) and is used as the read source for list/filter/generate operations. The actual markdown files remain the source of truth — the index is purely a performance cache and can be safely deleted and rebuilt with `task index --rebuild`.

```
.task-index.json   ← auto-maintained metadata cache (gitignore this)
```

---

## Task Structure

Each task is a single markdown file with YAML frontmatter. The schema is intentionally minimal — just three user-facing fields. Everything else is managed automatically.

### Core Fields (the only three things that matter)

| Field | Set By | Description |
|---|---|---|
| `name` | User (via natural language input) | The task title, cleaned up by Claude |
| `due` | User (inferred by Claude from natural language) | Due date, e.g. `2026-03-28` |
| `tags` | Claude (auto-managed) | Domain, category, priority, and topic tags |

### Tags — Managed by Claude

Tags are the primary way tasks are organized and filtered. Claude infers them automatically from the natural language input and is responsible for keeping them consistent. The user never needs to assign tags manually (though they can override in the file if they want).

**Tag Consistency Rule — Critical Architectural Requirement**

The LLM can only assign tags that exist in the canonical tag list defined in `config.json`. It cannot invent new tags on the fly. This prevents silent inconsistencies (e.g., `#Work` vs `#work` vs `#work-tasks`) that would break Dataview queries in Obsidian. New tags can be added to the config at any time with `task tags add "finance"`, at which point they become available for inference. The config ships with a sensible default set.

```json
// config.json — canonical tag registry
{
  "tags": {
    "domains": ["work", "personal", "personal-projects"],
    "priorities": ["priority/high", "priority/medium", "priority/low"],
    "categories": ["health", "finance", "errands", "learning", "admin", "creative"],
    "statuses": ["status/todo", "status/done", "status/blocked", "status/inbox"]
  }
}
```

**Tag categories Claude manages:**

| Tag type | Examples | How inferred |
|---|---|---|
| Domain | `#work` `#personal` `#personal-projects` | Keywords in input ("for work", "side project") |
| Priority | `#priority/high` `#priority/medium` `#priority/low` | Words like "urgent", "ASAP", "whenever" |
| Category | `#health` `#finance` `#errands` `#learning` | Task content keywords ("dentist" → `#health`) |
| Status | `#status/todo` `#status/done` `#status/blocked` `#status/inbox` | Updated by CLI commands |
| Topic | `#Q2` `#rust` `#roadmap` | Specific nouns/topics extracted from input (free-form, not constrained) |

### Inbox — Unconfident Task Triage

When Claude cannot confidently assign a domain or due date from the input (e.g., "deal with the Alex thing"), the task is tagged `#status/inbox` instead of being silently mis-tagged. Inbox tasks surface at the top of `today.md` under a "Needs Triage" section every day until resolved. The user clarifies them with a quick `task update <id> --domain work --due Friday`, at which point they move into the normal flow. This is a day-one MVP requirement — it's what keeps the system trustworthy.

### Example Task File (`task-2026-03-25-001.md`)
```markdown
---
name: Prepare Q2 roadmap presentation
due: 2026-03-28
tags: [work, priority/high, roadmap, Q2, status/todo]
created: 2026-03-25
---
```

That's it. No extra fields required. The file body can hold freeform notes if the user wants to add context, but nothing is required there either.

### Additional Metadata (auto-managed, never edited by user)

```markdown
---
name: Prepare Q2 roadmap presentation
due: 2026-03-28
tags: [work, priority/high, roadmap, Q2, status/todo]
created: 2026-03-25
completed:          ← set automatically when marked done
id: task-2026-03-25-001  ← for internal reference
---
```

---

## CLI Interface

The tool should feel fast and natural. Primary commands:

```bash
# Add a task (natural language)
task add "Call the dentist sometime next week"
task add "Finish API integration by Friday for the work project"
task add "Learn Rust basics - personal project, no deadline"

# List tasks
task list
task list --domain work
task list --due today
task list --due this-week
task list --priority high

# Update a task
task done task-2026-03-24-001
task update task-2026-03-24-001 --priority high
task update task-2026-03-24-001 --due 2026-03-30

# Generate daily summary note (manual trigger)
/today               # primary shorthand — generates today's summary note in Obsidian
task daily           # longer alias for the same command
task daily --week    # generates a weekly overview

# Domain management
task domains list
task domains add "Finance"

# Interactive mode (optional stretch goal)
task   # launches a TUI (terminal UI)
```

### `/today` Command — Design Notes

- The primary way to generate the daily summary is typing `/today` into the CLI
- It should be instant — scans the vault, writes the note, and prints a confirmation with a count of tasks in each section
- If a note already exists for today, it asks whether to overwrite or append
- Optionally: auto-opens the note in Obsidian after generating (`--open` flag, or set as default in config)

### Natural Language Parsing — Key Behaviors

The CLI should intelligently infer from free text:

| Input phrase | Inferred field |
|---|---|
| "next Tuesday", "by Friday", "end of month" | `due` date |
| "for work", "work project", "work-related" | `domain: work` |
| "personal project", "side project", "building" | `domain: personal-projects` |
| "urgent", "ASAP", "critical", "important" | `priority: high` |
| "low priority", "whenever", "no rush" | `priority: low` |
| keywords like "dentist", "doctor", "groceries" | `tags: [health]`, `tags: [errands]` |

**NLP Approach options:**
- Option A: Use an LLM API call (OpenAI / Claude) to parse natural language → structured JSON
- Option B: Rule-based regex + date parsing library (chrono-node for JS, dateparser for Python)
- Option C: Hybrid — rule-based first, fall back to LLM for ambiguous input

→ **Recommendation: Option C (hybrid).** Fast for common cases, smart for complex ones.

---

## Daily Summary Notes

Triggered by `/today` (or `task daily`). Instead of a single note, the command generates **three separate Obsidian notes** in one shot — each focused on a distinct time horizon.

### The Three Files

| File | Contents | Time Range |
|---|---|---|
| `today.md` | Tasks due today + any overdue tasks | Today's date only (+ past due) |
| `this-week.md` | Tasks due within the current calendar week | Mon–Sun of current week |
| `next-week.md` | Tasks due within the following calendar week | Mon–Sun of next week |

All three are written to `/DailyNotes/YYYY-MM-DD/` (a dated subfolder per run, so history is preserved).

### Vault Structure Update

```
/DailyNotes
  /2026-03-25
    today.md
    this-week.md
    next-week.md
  /2026-03-24
    today.md
    this-week.md
    next-week.md
```

### Example: `today.md`

```markdown
# Today — March 25, 2026

## 🔴 Overdue
- [ ] Submit expense report *(due Mar 20)* — Work · High
- [ ] Book car service *(due Mar 22)* — Personal · Medium

## 📅 Due Today
- [ ] Prepare Q2 roadmap presentation — Work · High
- [ ] Call dentist — Personal · Medium

---
*Generated by task-manager · /today · 2026-03-25 08:02*
```

### Example: `this-week.md`

```markdown
# This Week — Mar 23–29, 2026

## Work
- [ ] Team retrospective *(Mar 27)* · Medium
- [ ] Submit timesheet *(Mar 28)* · High

## Personal Projects
- [ ] Review Rust chapter 3 *(Mar 29)* · Low

## Personal
- [ ] Pick up dry cleaning *(Mar 26)* · Low

---
*Generated by task-manager · /today · 2026-03-25 08:02*
```

### Example: `next-week.md`

```markdown
# Next Week — Mar 30–Apr 5, 2026

## Work
- [ ] Q2 planning kickoff *(Apr 1)* · High

## Personal Projects
- [ ] Ship landing page draft *(Mar 31)* · Medium

## Personal
- [ ] (Nothing scheduled yet)

---
*Generated by task-manager · /today · 2026-03-25 08:02*
```

### Checkbox Sync — Two-Way Task Completion

When `/today` runs and a `today.md` already exists for that date, the tool first scans the existing file for any checked-off checkboxes before regenerating. It cross-references them against the embedded task IDs (stored as a hidden comment on each task line), marks those task files as `status/done` in the `/Tasks` folder, and then regenerates all three notes with the updated state.

This means **checking off a task directly in Obsidian is a valid way to mark it done** — you don't have to go back to the CLI. The next `/today` run picks it up automatically.

**How task IDs are embedded in the note (invisible in Obsidian's reading view):**
```markdown
- [x] Prepare Q2 roadmap presentation — Work · High <!-- task:task-2026-03-25-001 -->
- [ ] Call dentist — Personal · Medium <!-- task:task-2026-03-25-002 -->
```

**The `/today` run sequence:**
1. Check if `today.md` exists for today's date
2. If yes → scan for checked boxes → mark those task files as done → proceed
3. Scan all task files (or index) for today's, overdue, this-week, next-week tasks
4. Pull today's calendar events (if calendar sync is enabled)
5. Write three fresh notes to `/DailyNotes/YYYY-MM-DD/`
6. Print summary and optionally open `today.md` in Obsidian

### Calendar Events in today.md

When calendar sync is enabled (V0.3+), `today.md` gains a **Calendar** section showing today's meetings and appointments pulled from the connected calendar. This gives you a complete picture of your day in one note — both what you need to *do* and when you need to *be somewhere*.

**Updated `today.md` structure with calendar:**

```markdown
# Today — March 25, 2026

## 📋 Needs Triage
- [ ] Deal with the Alex thing <!-- task:task-2026-03-25-005 -->  ← inbox task, needs clarification

---

## 🗓️ Calendar
- 09:00–09:30 · Standup — Engineering (Google Calendar)
- 11:00–12:00 · Q2 Planning meeting (Google Calendar)
- 14:00–14:30 · 1:1 with Sarah (Google Calendar)

---

## 🔴 Overdue
- [ ] Submit expense report *(due Mar 20)* — Work · High <!-- task:task-2026-03-24-001 -->

## 📅 Due Today
- [ ] Prepare Q2 roadmap presentation — Work · High <!-- task:task-2026-03-25-001 -->
- [ ] Call dentist — Personal · Medium <!-- task:task-2026-03-25-002 -->

---
*Generated by task-manager · /today · 2026-03-25 08:02 · checkbox sync: 0 tasks marked done*
```

Calendar events are **read-only** in the note — they're pulled from the calendar, not managed by this tool. No times or events from the calendar are ever modified by the CLI.

### Behavior Details
- All three files are always generated together — running `/today` is a single atomic action
- First run of the day: generates all three files fresh
- Subsequent runs: syncs checkboxes first, then regenerates with updated state
- Each file groups tasks by domain (Work → Personal Projects → Personal) within its time range
- Empty domains are shown with `(Nothing scheduled yet)` so the structure stays consistent
- After generating, the CLI prints a summary:
  `✅ Notes updated → 2 tasks marked done · today: 4 tasks · this-week: 6 tasks · next-week: 3 tasks`
- Optional `--open` flag opens `today.md` in Obsidian automatically after generation

---

## Obsidian Integration Points

The vault structure is designed to work with these Obsidian plugins:

| Plugin | How It's Used |
|---|---|
| **Tasks** | Renders task checkboxes with due dates, filter views |
| **Dataview** | Query tasks across domains like a database |
| **Templater** | Auto-fill new task files from templates |
| **Periodic Notes** | Scaffolds daily note structure |
| **Calendar** | Visual calendar view of tasks by due date |

**Important:** The CLI and Obsidian are *peers* — either can edit task files. The CLI uses file locking or simple conventions to avoid conflicts.

---

## Tech Stack Options

### Language
- **Python** — great NLP libraries, easy scripting, broad familiarity
- **Node.js / TypeScript** — good for async, rich CLI ecosystem (commander, inquirer), chrono for dates
- → **Leaning toward Node.js/TypeScript** for CLI ergonomics, but open to Python

### Key Libraries (Node.js path)
| Library | Purpose |
|---|---|
| `commander` or `yargs` | CLI argument parsing |
| `chrono-node` | Natural language date parsing |
| `gray-matter` | Read/write YAML frontmatter in markdown |
| `fs-extra` | File system operations |
| `chalk` | Colored terminal output |
| `openai` or `@anthropic-ai/sdk` | LLM fallback for NLP |
| `dayjs` | Date manipulation |

### Key Libraries (Python path)
| Library | Purpose |
|---|---|
| `click` or `typer` | CLI framework |
| `dateparser` | Natural language date parsing |
| `python-frontmatter` | YAML frontmatter in markdown |
| `rich` | Beautiful terminal output |
| `anthropic` | LLM fallback for NLP |

---

## Open Questions

- [ ] Where does the Obsidian vault live? (User sets path in config on first run)
- [ ] Should the CLI auto-open the created task in Obsidian? (Nice to have)
- [ ] Do we want a recurring tasks feature? (e.g. "every Monday: weekly review")
- [ ] What happens to completed tasks — archived or deleted?
- [ ] Should the daily note be auto-generated on a schedule (cron) or manually triggered?
- [ ] Do we want subtasks / task dependencies?
- [ ] Should there be a `task edit` command that opens the file in the default editor?
- [ ] API key for LLM — required or optional? (Should work without it)

---

## Stretch Goals (Post-V1)

- TUI (terminal UI) with interactive task list using `ink` (React for terminals) or `textual` (Python)
- `task weekly` — auto-generated weekly review note
- Recurring tasks (e.g. "every Sunday, remind me to plan the week")
- Sync to a mobile app or simple web dashboard
- Git-based backup of the vault
- macOS notification when tasks are due
- Natural language queries: `task query "what's overdue from last week?"`

---

## Calendar Sync

Calendar sync bridges the gap between tasks and time — it lets due dates and scheduled tasks show up on the user's actual calendar, and optionally pulls calendar events into the daily summary.

### Approach

Rather than building a direct calendar integration from scratch (which requires OAuth flows, API keys, and platform-specific SDKs), the cleanest approach for a CLI tool is a **tiered strategy**:

| Tier | Method | Complexity | Works With |
|---|---|---|---|
| **Tier 1** | `.ics` file export | Low | Any calendar (Google, Apple, Outlook) |
| **Tier 2** | CalDAV sync | Medium | Google Calendar, Apple Calendar, Fastmail |
| **Tier 3** | Google Calendar API / Apple EventKit | High | Platform-specific |

**Recommendation for MVP:** Tier 1 (`.ics` export) — universally compatible, zero OAuth setup, user just imports or subscribes to the file.

**Recommendation for V2:** CalDAV sync — gives two-way sync without being platform-locked.

### How `.ics` Export Works

The CLI generates a standard iCalendar file from all tasks that have a `due` date:

```bash
task calendar export              # writes tasks.ics to vault root
task calendar export --domain work  # only work tasks
```

The `.ics` file can then be:
- **Imported manually** into Google Calendar / Apple Calendar / Outlook
- **Subscribed to** as a local file URL (auto-refreshes when regenerated)
- **Served locally** via a tiny HTTP server (`task calendar serve --port 8080`) so calendar apps can subscribe to a live URL

### Two-Way Sync (V2)

In V2, the tool reads calendar events and pulls them into the daily summary:

```markdown
## Today's Calendar Events
- 10:00 AM — Team standup (Google Calendar)
- 2:00 PM — Dentist appointment (Personal Calendar)
```

This requires storing a CalDAV connection in config (server URL, credentials stored in system keychain — never in plaintext).

### Task Fields for Calendar Sync

Two new optional fields added to task frontmatter:

```yaml
calendar_event_id:   # ID of synced calendar event (for two-way updates)
scheduled_time:      # Optional specific time, e.g. "14:00" (vs just a date)
```

### Calendar Sync Commands

```bash
task calendar export             # export .ics file
task calendar serve              # serve .ics over local HTTP for live subscription
task calendar sync               # two-way CalDAV sync (V2)
task calendar connect google     # OAuth setup for Google Calendar (V2/V3)
task calendar connect apple      # macOS EventKit setup (V2/V3)
```

---

## Versioned Roadmap

### MVP — V0.1: Core Foundation
**Goal:** A working CLI that adds, lists, and manages tasks in an Obsidian vault. Nothing more.

**Included:**
- `task add` with natural language parsing (date + domain inference)
- Inbox tagging (`#status/inbox`) for tasks Claude can't confidently categorize
- Canonical tag list enforcement — LLM constrained to tags defined in `config.json`
- `task list` with basic filters (domain, due, priority, status)
- `task done` / `task update` / `task delete`
- Markdown + YAML frontmatter file creation in the vault
- `config.json` setup wizard on first run (vault path, domains, tag registry)
- `task domains add/list` and `task tags add/list` for config management
- `/today` — generates three Obsidian notes (`today.md`, `this-week.md`, `next-week.md`) in a dated subfolder
- Checkbox sync — `/today` detects checked boxes in existing `today.md` and marks tasks as done before regenerating
- `t "..."` global shell alias for ultra-fast capture
- Rule-based NLP (chrono-node for dates, keyword matching for domain/priority)

**Not included:** LLM parsing, calendar sync, recurring tasks, notifications, index cache

**Definition of done:** Joe can add a task in 5 seconds, check it off in Obsidian, and see it marked done on the next `/today` run.

---

### V0.2: Smart Parsing + Automation
**Goal:** Make the NLP actually smart, add the weekly review habit, and introduce the index cache.

**Included:**
- LLM-powered parsing fallback (Claude API — optional, graceful degradation without it)
- Improved tag inference from task content
- `.task-index.json` cache introduced — all reads go through index, writes update it; `task index --rebuild` for recovery
- `/week` — weekly review note generation (what got done, what was deferred, what's coming)
- Stale task detection — tasks untouched for 14+ days get `#stale` tag; surfaced in weekly review
- `task list --overdue` and `task list --upcoming 7` views
- Completed task archiving (move to `/Archive/YYYY/` instead of deleting)
- `task edit <id>` — opens task file in `$EDITOR`

---

### V0.3: Calendar Sync (Tier 1)
**Goal:** Tasks show up on your calendar, and your calendar shows up in your daily note.

**Included:**
- `.ics` export (`task calendar export`) — tasks with due dates exported as calendar events
- Local HTTP server for live calendar subscription (`task calendar serve`) — subscribe once, auto-refreshes
- `scheduled_time` field added to task schema for specific times (not just dates)
- **Calendar events pulled into `today.md`** — meetings and appointments from Google/Apple Calendar appear in a Calendar section at the top of the daily note, read-only
- Documentation for connecting to Google Calendar, Apple Calendar, Outlook

---

### V1.0: Stable & Polished
**Goal:** Everything works reliably, the tool feels complete for daily use.

**Included:**
- Recurring tasks (`task add "every Monday: weekly review" --recur weekly`)
- macOS / Linux system notifications for due tasks (`task notify --enable`)
- Full test suite (unit + integration)
- `task stats` — simple analytics (tasks completed per week, by domain, etc.)
- Proper error handling and helpful error messages throughout
- README and setup documentation
- Homebrew tap or npm global install for easy setup

---

### V1.5: Two-Way Calendar Sync
**Goal:** Calendar and task system stay in sync automatically.

**Included:**
- CalDAV two-way sync (`task calendar sync`)
- Calendar events pulled into daily summary
- Conflict resolution strategy (task due date vs calendar event)
- Credentials stored securely in system keychain (macOS Keychain, Linux Secret Service)

---

### V2.0: TUI + Power Features
**Goal:** A richer interactive experience and advanced productivity features.

**Included:**
- Terminal UI (TUI) — interactive task browser with keyboard navigation
- Natural language queries: `task query "what did I finish last week?"`
- Subtasks and task dependencies
- Time estimates per task (`task add "Write spec" --estimate 2h`)
- `task focus` — Pomodoro-style focus mode for a single task
- Google Calendar API / Apple EventKit direct integration (optional, for users who want it)
- Simple web dashboard (read-only, served locally)

---

## What We're NOT Building (Ever, Unless Requirements Change)

- A full cloud-hosted web app
- Real-time multi-user collaboration
- A replacement for Obsidian itself
- Mobile app (the vault syncs to mobile via Obsidian Sync or iCloud/Dropbox)
- Time tracking as a primary feature

---

## Next Steps

1. ✅ Brainstorm captured
2. ⬜ Review and refine this document together
3. ⬜ Create `spec.md` — formal, structured project specification
4. ⬜ Create `CLAUDE.md` — instructions for Claude Code to work on the project
5. ⬜ Hand off to Claude Code to scaffold the project
