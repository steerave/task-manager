# Changelog

All notable changes to the Task Manager are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Domain renamed: `personal-projects` → `projects` (shows as `#### Projects` in the daily note). The natural-language parser now also detects the bare word "projects"/"project" to assign this domain.
- **Daily note redesigned** — now shows every open task in one flat `All Open Tasks` section grouped by domain, sorted by priority then due date. Overdue tasks are flagged inline with `⚠️` instead of living in a separate section. Tasks with no due date appear at the bottom of their priority group.
- Removed the `This Week`, `Next Week`, `Due Today`, `Overdue`, and `Needs Triage` sections — they're all consolidated into the flat view.
- `task today` now always fetches fresh calendar events; mutation commands use a cached copy (`.calendar-cache.json` in the vault) to avoid redundant iCloud API calls.

### Fixed
- Checkbox sync now runs before every daily note regeneration (add, done, update, delete, etc.) — previously only ran during `task today`, so checking boxes in Obsidian then running any other command would overwrite the checks
- Parser now strips the literal word "domain" from task names (e.g., "Projects domain" no longer leaves "domain" in the title)
- Checkbox sync now scans all prior daily notes, not just today's — checking off a task in yesterday's note (or any older daily note) will correctly mark it done on the next `task today` run
- Calendar events from adjacent days (e.g., tomorrow's all-day events) no longer leak into today's Events section

### Added
- **This Week's Calendar** section at the bottom of the daily note — shows upcoming events for the rest of the week grouped by day with titles, dates, and times
- Auto-archive old daily notes — every note regeneration moves non-today notes into `DailyNotes/Archive/`, keeping only today's note at the top level. Checkbox sync scans the archive too.
- Daily note auto-regenerates after every task mutation (add, done, update, delete, waiting) — no need to run `task today` manually after each change
- Modified date shown on each task in the daily note — uses filesystem mtime so edits from both the CLI and Obsidian are captured
- `task calendar add` command — create events on iCloud Home calendar using natural language
- `task calendar today` command — regenerate daily note with fresh calendar events
- Events Today section in the daily note showing today's iCloud calendar events after Due Today
- All-day event support (no time given = all-day)
- Default 1-hour duration when only a start time is provided
- Graceful fallback when iCloud credentials aren't configured or network is unavailable
- `task waiting` command — mark tasks as "waiting on someone else" with `status/waiting` tag
- Waiting On section in daily note with `[/]` half-complete Obsidian checkbox
- Completed Today section in daily note — finished tasks stay visible as checked-off items
- Checkbox sync skips waiting tasks so they don't get re-marked as done
- Shorthand task IDs — use just the sequence number (e.g., `task done 0011`) instead of the full ID
- Global task sequence counter — numbers never reset, eliminating shorthand ID collisions across days
- `task priority <id> <level>` command — quickly set task priority to high, medium, or low

## [0.1.0] - 2026-03-30

### Added
- `task add` command with natural language parsing — automatically detects due dates, domains, priorities, and categories from plain English input
- `task list` command with filters for domain, due date, priority, and status — hides completed tasks by default, `--done` flag to include them
- `task done` command to mark tasks as completed
- `task update` command to change task name, due date, domain, or priority
- `task delete` command to permanently remove a task
- `task today` command generates a single consolidated daily note in Obsidian with Today, This Week, and Next Week sections
- Two-way checkbox sync — check off tasks in Obsidian's daily note, and the next `task today` run marks them done in the source files
- Obsidian wiki-links in daily notes — each task links directly to its task file
- Inbox tagging for ambiguous tasks that can't be confidently categorized
- Canonical tag registry — tags constrained to a defined list in `config.json` to keep Dataview queries consistent
- `task domains add/list` and `task tags add/list` for managing domains and canonical tags
- First-run setup wizard that asks for your vault path and saves it to `~/.taskmanager`
- Rule-based NLP using chrono-node for date parsing and keyword matching for domain/priority/category inference
- Task ID format: `YYMMDD-kebab-name-0001` with filler words removed from the slug
- Domain groups in daily notes are hidden when empty (no empty Work or Personal Projects sections)
- `/today` slash command for Claude Code
