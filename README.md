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
task list --done                               # Include completed tasks
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
/YourVault
  /Tasks            ← all task files (auto-created)
  /DailyNotes
    /YYYY-MM-DD
      today.md
      this-week.md
      next-week.md
  config.json       ← created on first run
```

## Development

```bash
npm run dev        # Run CLI in dev mode
npm run build      # Compile TypeScript
npm test           # Run tests
npm run lint       # ESLint check
```
