import chalk from 'chalk'
import dayjs from 'dayjs'
import { parseEventInput } from '../calendar/eventParser'
import { createEvent } from '../calendar/icloudClient'

export async function addCalendarEvent(input: string): Promise<void> {
  const parsed = parseEventInput(input)

  await createEvent(parsed.name, parsed.date, parsed.startTime, parsed.endTime, parsed.isAllDay)

  const dateDisplay = dayjs(parsed.date).format('MMM D, YYYY')
  if (parsed.isAllDay) {
    console.log(chalk.green(`Event created: ${parsed.name}`))
    console.log(chalk.gray(`   ${dateDisplay} · all day`))
  } else {
    console.log(chalk.green(`Event created: ${parsed.name}`))
    console.log(chalk.gray(`   ${dateDisplay} · ${parsed.startTime} – ${parsed.endTime}`))
  }
}
