# Calendar Integration — Feature Spec

## What This Does

Adds the ability to read and write events on your iCloud Home calendar from the CLI. Events from today appear in the daily task note, and you can create new events using plain English.

---

## Commands

### `task calendar add "<event description>"`

Creates an event on your iCloud Home calendar using natural language.

**Examples:**
- `task calendar add "Bettendorf swim meet on 4/26 from 1pm to 3pm"` — timed event
- `task calendar add "Dentist appointment tomorrow at 2pm"` — 1-hour default (no end time given)
- `task calendar add "Mom's birthday on 5/15"` — all-day event (no time given)

**Parsing rules:**
- Date is required — parser detects "on 4/26", "tomorrow", "next Monday", etc.
- If start time is given but no end time, duration defaults to 1 hour
- If no time is given at all, the event is created as an all-day event
- Event name is everything left after stripping the date and time phrases

**Output:**
```
Event created: Bettendorf swim meet
   Apr 26, 2026 · 1:00 PM – 3:00 PM · Home calendar
```

### `task calendar today`

Regenerates the daily task note with fresh calendar events pulled from iCloud. This is functionally the same as `task today` — it regenerates the entire daily note, ensuring events are current.

---

## Daily Note Changes

When `task today` or `task calendar today` runs, today's calendar events are fetched from iCloud and included in the Today section of the daily note. Events appear after Due Today.

**Section order in the daily note:**

```markdown
## Today — March 30, 2026

### Needs Triage
(only shown if inbox tasks exist)

### Overdue
(only shown if overdue tasks exist)

### Due Today
- [ ] [[260330-purchase-fruits-aldis-0001|purchase fruits from aldis]] *(due Mar 30)* — Personal · Medium <!-- task:260330-purchase-fruits-aldis-0001 -->

### Events Today
- 09:00–10:00 · Team standup
- 14:00–15:00 · Dentist appointment
- Mom's birthday *(all day)*

---

## This Week — ...
(no calendar events in this section)

## Next Week — ...
(no calendar events in this section)
```

**Event display format:**
- Timed events: `- HH:MM–HH:MM · Event name`
- All-day events: `- Event name *(all day)*`
- Events are sorted by start time, all-day events listed last

**Events are read-only in the note** — checking a box or editing text in the Events section has no effect on the calendar. Only tasks have checkbox sync.

---

## Error Handling

| Situation | What Happens |
|---|---|
| `.env` has no iCloud credentials | Events section is skipped silently; rest of daily note generates normally |
| iCloud is unreachable (network error) | Events section is skipped; a warning is printed to the terminal but the note still generates |
| Home calendar not found on iCloud | Warning printed: "Home calendar not found on iCloud — skipping events"; note generates without events |
| Event creation fails (bad credentials, network) | Error printed to terminal; no partial event created |
| NLP can't parse a date from the input | Error: "Could not parse a date from your input. Try: task calendar add 'event name on <date>'" |

---

## Architecture

### New Files

| File | Purpose |
|---|---|
| `src/calendar/types.ts` | `CalendarEvent` interface (name, date, startTime, endTime, isAllDay) |
| `src/calendar/icloudClient.ts` | CalDAV connection to iCloud — fetch today's events, create event |
| `src/calendar/eventParser.ts` | NLP parsing for event input — extract name, date, start time, end time |
| `src/commands/calendar.ts` | CLI handlers for `calendar add` and `calendar today` |
| `tests/calendar/eventParser.test.ts` | Unit tests for event NLP parsing |
| `tests/calendar/icloudClient.test.ts` | Integration test for CalDAV (requires credentials, can be skipped in CI) |

### Modified Files

| File | Change |
|---|---|
| `src/core/dailyNoteGenerator.ts` | `generateDailyNote` accepts optional `CalendarEvent[]` param; renders Events Today section after Due Today |
| `src/commands/today.ts` | Fetches calendar events before calling `generateDailyNote`; passes them in |
| `src/cli.ts` | Registers `calendar add` and `calendar today` subcommands |

### Dependencies

| Package | Purpose |
|---|---|
| `tsdav` | CalDAV client for iCloud (already installed) |
| `dotenv` | Load `.env` credentials (already installed) |
| `node-ical` | Parse .ics event data from CalDAV responses |

`chrono-node` (already installed) handles date/time parsing for the event NLP.

---

## Config & Security

- **Credentials** live in `.env` only (gitignored):
  - `ICLOUD_EMAIL` — Apple ID email
  - `ICLOUD_APP_PASSWORD` — app-specific password
  - `ICLOUD_CALENDAR_NAME` — calendar name (default: Home)
- **No credentials in `config.json`** — config.json stays in the vault and could be synced via Obsidian Sync
- `.env.template` documents the required variables (no values)

---

## Future Extensibility

- Multiple calendars: commands expand to `task calendar home add "..."`, `task calendar work add "..."`, `task calendar all today`
- Calendar names would be listed in `config.json` under a `calendars` key; each maps to a name in iCloud
- The `icloudClient.ts` already accepts a calendar name parameter, making this a config-only change later
- For now, all commands target the single calendar defined in `ICLOUD_CALENDAR_NAME` env var (default: Home)

---

## What This Does NOT Do

- No two-way sync — creating an event on your phone does not create a task
- No editing or deleting events from the CLI (V1.5+)
- No recurring event creation from the CLI (V1.0+)
- No events in the This Week or Next Week sections (Today only)
- No calendar notifications or reminders

---

## Definition of Done

> Joe types `task calendar add "Bettendorf swim meet on 4/26 from 1pm to 3pm"`, sees confirmation, checks his iPhone and the event is there. He runs `task today` and sees today's calendar events listed under Events Today in his Obsidian daily note.
