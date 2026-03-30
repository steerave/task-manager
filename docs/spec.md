# Task Manager — Product Spec

**What is this?**
A personal task management tool you run from the terminal. You type a task in plain English, and it gets saved as a file inside your Obsidian vault. You can list your tasks, mark them done, and generate a daily summary note — all from the command line.

The idea: **Obsidian is your notebook. This tool is the brain that organizes it.**

---

## Who Is This For

Just you. A solo tool designed for one person who:
- Uses Obsidian as their personal knowledge base
- Prefers the terminal for quick actions
- Wants task data stored as readable files — not locked in a proprietary app
- Wants to see today's tasks, this week's tasks, and next week's tasks in one place

---

## How It Works (The Big Picture)

1. You type something like: `task add "call dentist next Tuesday"`
2. The tool figures out the due date, what kind of task it is, and how important it seems
3. It saves a small text file in your Obsidian vault
4. Any time you want a summary of what's on your plate, you run `task today`
5. It creates three notes in Obsidian: **today**, **this week**, and **next week**
6. If you check off a task directly in Obsidian, the next time you run `task today` it sees that and marks it done automatically

---

## First-Time Setup

When you run the tool for the first time, it asks you one question: **where is your Obsidian vault?**

You give it the folder path, and it saves that answer. Every command after that just works — no need to set anything up again.

The tool creates two folders inside your vault:
- `/Tasks` — where all your task files live
- `/DailyNotes` — where daily summary notes are saved

---

## The Commands

### `task add "..."`
Add a task using plain English. Examples:
- `task add "call dentist next Tuesday"`
- `task add "finish API integration by Friday for work"`
- `task add "learn Rust basics — personal project, no rush"`

The tool automatically figures out:
- **Due date** — from phrases like "next Tuesday", "by Friday", "end of month"
- **Domain** — Work, Personal, or Personal Projects (from words like "for work", "side project")
- **Priority** — High, Medium, or Low (from words like "urgent", "ASAP", "no rush")
- **Category** — e.g. Health (if you say "dentist"), Finance, Errands, Learning, etc.

If it can't figure out the domain (e.g. "deal with the Alex thing"), it flags the task as **Inbox** so you know to clarify it later.

**Shortcut:** You can set up a shell alias `t "..."` so you don't have to type `task add` every time.

---

### `task list`
Show all your tasks. You can filter:
- `task list --domain work` — only work tasks
- `task list --due today` — only tasks due today
- `task list --due this-week` — tasks due this week
- `task list --priority high` — high priority only
- By default, completed tasks are hidden

---

### `task done <id>`
Mark a task as done. The task ID is shown when you add it or list it.
Example: `task done task-2026-03-29-001`

---

### `task update <id>`
Change details on an existing task:
- `task update task-2026-03-29-001 --due Friday`
- `task update task-2026-03-29-001 --priority high`
- `task update task-2026-03-29-001 --domain work`
- `task update task-2026-03-29-001 --name "New task name"`

---

### `task delete <id>`
Permanently removes the task file. No undo in V0.1.

---

### `task today`
The main daily command. Does three things in order:
1. Checks if you already checked off any tasks in Obsidian today
2. Marks those as done in the task files
3. Regenerates three fresh notes in your vault:
   - **today.md** — overdue tasks + tasks due today
   - **this-week.md** — everything due this calendar week, grouped by domain
   - **next-week.md** — everything due next calendar week, grouped by domain

Output confirmation: `✅ Notes updated → 2 tasks marked done · today: 4 tasks · this-week: 6 tasks`

The notes are saved to `/DailyNotes/YYYY-MM-DD/` so your history is preserved.

---

### `task domains list / add`
See or add life domains (e.g. Work, Personal, Personal Projects).
Adding a domain makes it available for the parser to detect automatically.

### `task tags list / add`
See or add tags to the canonical list. The tool only uses tags that are in this list — this prevents messy inconsistencies across your vault.

---

## Inbox — When The Tool Isn't Sure

If you type something ambiguous — like `task add "deal with the Alex thing"` — the tool won't guess. Instead it:
- Tags the task as **Inbox**
- Saves it anyway
- Shows it at the top of your `today.md` every day under "Needs Triage" until you clarify it

To fix it: `task update <id> --domain work --due Friday`

---

## How Tasks Are Stored

Each task is one small text file in `/Tasks`. The file looks like this:

```
---
name: Call dentist
due: 2026-04-01
tags: [personal, priority/medium, health, status/todo]
created: 2026-03-29
id: task-2026-03-29-001
---
```

That's it. No database. No proprietary format. You can open, edit, or delete any task file directly in Obsidian if you want.

---

## Tags — How They Work

Tags are how the tool organizes and filters tasks. They fall into four groups:

| Group | Examples |
|---|---|
| Domain | `work`, `personal`, `personal-projects` |
| Priority | `priority/high`, `priority/medium`, `priority/low` |
| Category | `health`, `finance`, `errands`, `learning`, `admin`, `creative` |
| Status | `status/todo`, `status/done`, `status/blocked`, `status/inbox` |

**Important rule:** The tool only assigns tags from this list. It never invents new ones. This keeps your Obsidian Dataview queries working consistently. You can always add new tags to the list with `task tags add`.

---

## Edge Cases and How They're Handled

| Situation | What Happens |
|---|---|
| You add a task with no due date | Saved without a due date; won't show in dated views |
| You add a task with no recognizable domain | Tagged as Inbox, surfaced daily until you clarify |
| You run `task today` twice in a row | First run syncs checkboxes; second run is safe (already synced, notes are regenerated cleanly) |
| A task file was manually edited in Obsidian | The tool reads whatever's in the file — edits are respected |
| You check a task off in Obsidian | Picked up automatically on the next `task today` run |
| Two conflicting priority signals in one input | First match wins (e.g. "urgent but low priority" → high) |
| Input has both work and personal signals | First domain match wins; you can always update it |
| You run `task today` with no tasks | Generates the notes with "nothing scheduled" in each section |
| Your vault folder doesn't exist yet | The tool creates it automatically |

---

## What's NOT In This Tool (By Design)

- No cloud sync — your data stays local
- No mobile app — use Obsidian Sync or iCloud/Dropbox if you want mobile access
- No recurring tasks (coming in V1.0)
- No calendar integration in MVP (coming in V0.3)
- No notifications or reminders (coming in V1.0)
- No subtasks or task dependencies (coming in V2.0)
- No undo for delete in V0.1
- No TUI (interactive terminal UI) — that's V2.0

---

## Version Roadmap

### V0.1 — MVP (What We're Building First)
**Goal:** You can add a task in 5 seconds, check it off in Obsidian, and see it marked done on the next `task today` run.

Includes:
- `task add` with natural language parsing
- `task list`, `task done`, `task update`, `task delete`
- Inbox tagging for ambiguous tasks
- `task today` — generates three daily notes + checkbox sync
- First-run setup wizard
- `task domains` and `task tags` management
- Shell alias setup instructions

---

### V0.2 — Smarter and More Automated
- **LLM-powered parsing** — Claude API as fallback for complex or ambiguous input (optional, works without it)
- **Weekly review note** — `task weekly` generates a summary of what got done, deferred, and what's coming
- **Stale task detection** — tasks untouched for 14+ days get flagged in the weekly review
- **Completed task archiving** — done tasks move to `/Archive/YYYY/` instead of staying in `/Tasks`
- **Performance cache** — a lightweight index file speeds up reads when you have 200+ tasks
- `task edit <id>` — opens the task file in your default text editor

---

### V0.3 — Calendar Management *(partially shipped)*
- ~~**Calendar events in today.md**~~ *(done — Events Today section in daily note)*
- ~~**Create events from CLI**~~ *(done — `task calendar add`)*
- **`task calendar delete`** — delete events from iCloud calendar via CLI
- **`task calendar list`** — list upcoming events from the CLI
- **Multiple calendar support** — `task calendar home add`, `task calendar work add`

---

### V1.0 — Stable and Complete
- **Recurring tasks** — `task add "every Monday: weekly review"`
- **Notifications** — desktop alerts when tasks are due (macOS/Linux)
- **Stats** — `task stats` shows tasks completed per week, by domain, etc.
- **Full test coverage** and polished error messages
- **Easy installation** via npm global install or Homebrew

---

### V1.5 — Two-Way Calendar Sync
- Full two-way CalDAV sync so tasks and calendar events stay in sync automatically
- Credentials stored securely in your system keychain (never in a file)

---

### V2.0 — Power Features
- **TUI** — interactive terminal UI with keyboard navigation
- **Natural language queries** — `task query "what did I finish last week?"`
- **Subtasks and dependencies**
- **Focus mode** — Pomodoro-style single-task focus
- **Simple local web dashboard** (read-only)

---

## Definition of Done (V0.1)

> Joe types `task add "prepare Q2 roadmap by Friday for work"`, gets back a confirmation. He opens Obsidian, checks off the task in today's note, runs `task today` again, and the task shows as done.

That's the bar. Everything else is secondary.

---

*Last updated: 2026-03-29 · Status: Draft — awaiting review*
