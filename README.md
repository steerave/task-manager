# Task Manager

A personal CLI task manager that stores tasks as markdown files in your Obsidian vault. Add tasks in plain English, get organized daily summaries, and check off tasks directly in Obsidian.

## Features

- **Natural language task creation** — type `task add "call dentist next Tuesday personal"` and the tool infers the due date, domain, priority, and category automatically
- **Smart tagging** — domains (Work, Personal, Personal Projects), priorities (High/Medium/Low), and categories (Health, Finance, Errands, etc.) are detected from your input
- **Inbox for ambiguous tasks** — when the tool can't confidently categorize a task, it flags it as Inbox so nothing gets silently mis-tagged
- **Consolidated daily note** — run `task today` to generate a single Obsidian note with three sections: Today, This Week, and Next Week
- **Two-way checkbox sync** — check off a task in Obsidian's daily note, and the next `task today` run marks the source task file as done automatically
- **Obsidian wiki-links** — every task in the daily note links directly to its task file in your vault
- **Flexible filtering** — list tasks by domain, due date, priority, or status
- **Canonical tag registry** — tags are constrained to a defined list in `config.json`, keeping your Obsidian Dataview queries consistent
- **Extensible domains and tags** — add new domains or tags via `task domains add` and `task tags add`
- **iCloud calendar integration** — create events on your iCloud calendar using natural language via `task calendar add`
- **Calendar events in daily note** — today's iCloud calendar events appear in the Events Today section of your daily note
- **All-day and timed events** — specify a time for timed events, or omit it for all-day events; start-only defaults to 1 hour
- **Waiting on status** — mark tasks as "waiting on someone else" with `task waiting` — they show with a half-complete `[/]` checkbox in Obsidian and stay visible in your daily note until resolved
- **Completed today tracking** — tasks you finish today stay in the daily note as checked-off items so you can see what you accomplished
- **Shorthand task IDs** — use just the sequence number (e.g., `task done 0011`) instead of the full ID; the tool resolves it automatically
- **Human-readable storage** — every task is a plain markdown file with YAML frontmatter, editable in Obsidian or any text editor

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

The setup wizard runs automatically on first use and asks for your Obsidian vault path. The config is saved so every command after that just works.

## Commands

### Adding Tasks

```bash
task add "Call dentist next Tuesday"
task add "Finish API integration by Friday for work"
task add "Learn Rust basics - personal project, no rush"
```

The parser automatically detects:
- **Due dates** from phrases like "next Tuesday", "by Friday", "end of month"
- **Domains** from "for work", "side project", "personal"
- **Priority** from "urgent", "ASAP" (high), "no rush", "whenever" (low)
- **Categories** from keywords like "dentist" (health), "groceries" (errands), "budget" (finance)

### Listing and Filtering

```bash
task list                              # All active tasks (hides completed)
task list --domain work                # Only work tasks
task list --due today                  # Due today
task list --due this-week              # Due this week
task list --priority high              # High priority only
task list --done                       # Include completed tasks
```

### Managing Tasks

```bash
task done 260330-purchase-fruits-aldis-0001      # Mark done (full ID)
task done 0001                                    # Mark done (shorthand)
task waiting 0010                                 # Mark as waiting on someone else
task update 260330-call-dentist-0001 --priority high   # Change priority
task update 260330-call-dentist-0001 --domain work     # Change domain
task update 260330-call-dentist-0001 --due 2026-04-05  # Change due date
task delete 260330-call-dentist-0001                   # Permanently delete
```

### Daily Note Generation

```bash
task today
```

Generates a single consolidated Obsidian note (`YYYYMMDD - Daily Task.md`) with:
- **Today** — overdue tasks + tasks due today, plus any inbox items needing triage
- **This Week** — tasks due this week, grouped by domain (empty domains are hidden)
- **Next Week** — tasks due next week, grouped by domain

Each task in the note is a clickable wiki-link to its source file. Checking off a task checkbox in Obsidian and running `task today` again will automatically mark that task as done.

### Calendar Integration

```bash
task calendar add "Bettendorf swim meet on 4/26 from 1pm to 3pm"   # Timed event
task calendar add "Dentist appointment tomorrow at 2pm"              # 1-hour default
task calendar add "Mom's birthday on 5/15"                           # All-day event
task calendar today                                                   # Refresh daily note with events
```

Events from your iCloud calendar appear in the daily note under "Events Today". Creating events from the CLI adds them directly to your iCloud Home calendar.

**Setup:** Generate an app-specific password at appleid.apple.com and add your credentials to `.env` (see `.env.template`).

### Domain and Tag Management

```bash
task domains list                      # List all domains
task domains add Finance               # Add a new domain
task tags list                         # List all canonical tags
task tags add "research"               # Add a category tag
task tags add "priority/critical" --category priorities  # Add to specific category
```

## Task ID Format

Task files are named `YYMMDD-slug-0001.md` where:
- `YYMMDD` is the creation date
- `slug` is the task name in kebab-case with filler words removed
- `0001` is a 4-digit sequence number

Example: `260330-purchase-fruits-aldis-0001.md`

## Shell Alias (optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias t='task add'
```

Then: `t "Call dentist next Tuesday personal"`

## Vault Structure

```
/YourVault
  /Tasks                          ← all task files (flat, auto-created)
  /DailyNotes
    20260330 - Daily Task.md      ← consolidated daily note
    20260331 - Daily Task.md
  config.json                     ← domains, tags, vault path (created on first run)
```

## Development

```bash
npm run dev        # Run CLI in dev mode (ts-node)
npm run build      # Compile TypeScript
npm test           # Run tests (52 tests)
npm run lint       # ESLint check
```
