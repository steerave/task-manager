# Project Status Log

## 2026-04-05

**Done:**
- Fix checkbox sync to scan all prior daily notes, not just today's — items checked off in yesterday's note now sync on next `task today` run
- Rename domain `personal-projects` → `projects` across source, tests, docs, config, and existing task files; parser now recognizes the bare word "project"/"projects"

## 2026-04-04

**Done:**
- Rewrite daily note layout as flat `All Open Tasks` view grouped by domain, sorted by priority then due date ascending
- Add inline `⚠️` overdue marker, removing the separate Overdue/Due Today/This Week/Next Week/Needs Triage sections
- Handle no-due-date tasks by sorting them to the bottom of their priority group
- Add `noteRefresher` module with per-day calendar event cache at `{vault}/.calendar-cache.json`
- Wire `task today` to always fetch fresh calendar events; `add`/`done`/`update`/`delete`/`waiting`/`priority` use cached events to avoid redundant iCloud API calls
- Add `task priority <id> <high|medium|low>` shortcut command with full TDD test coverage
- Delegate `task today` checkbox sync + regeneration to the refresher module
- Fix `domainLabel` to replace all hyphens (not just the first) so multi-hyphen domains render correctly
- Normalize date fields from YAML in `readTask` — YAML unquoted timestamps were parsed as Date objects and broke the string-based sort
- Separate fetch and cache-write error paths in `noteRefresher` so a write failure doesn't report as a fetch failure
- Write and execute the full daily note redesign plan with spec compliance + code quality reviews per subagent-driven development flow

## 2026-04-02

**Done:**
- Filter calendar events to only show today's date in the daily note
- Show modified date on tasks in the daily note
- Remove 'mod' prefix from modified date display — show clean date only
- Write daily note redesign spec (`docs/superpowers/specs/daily-note-redesign.md`)
- Update `/status` skill to require feature-specific bullets instead of vague project phases

**Next:**
- Implement daily note redesign per `docs/superpowers/specs/daily-note-redesign.md`

## 2026-04-01

**Done:**
- Switched task ID generation to a global sequence counter instead of per-day counters
- Updated CHANGELOG with global counter feature

**In Progress:**
- V0.1 MVP development — core CLI commands and task management features

**Next:**
- Continue V0.1 implementation per `docs/superpowers/plans/2026-03-29-task-manager-v0.1.md`
- Add remaining CLI commands and tests
