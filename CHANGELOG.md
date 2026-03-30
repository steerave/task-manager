# Changelog

All notable changes to the Task Manager are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `task calendar add` command — create events on iCloud Home calendar using natural language
- `task calendar today` command — regenerate daily note with fresh calendar events
- Events Today section in the daily note showing today's iCloud calendar events after Due Today
- All-day event support (no time given = all-day)
- Default 1-hour duration when only a start time is provided
- Graceful fallback when iCloud credentials aren't configured or network is unavailable

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
