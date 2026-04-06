import chalk from 'chalk'
import dayjs from 'dayjs'
import path from 'path'
import { Config } from '../core/types'
import { refreshDailyNote } from '../core/noteRefresher'

function getDailyNoteFile(config: Config): string {
  const dateStr = dayjs().format('YYYYMMDD')
  return path.join(config.vaultPath, 'DailyNotes', `${dateStr} - Daily Task.md`)
}

export async function runToday(config: Config): Promise<void> {
  const noteFile = getDailyNoteFile(config)

  const { synced } = await refreshDailyNote(config, { freshCalendar: true })

  console.log(chalk.green(`Notes updated: ${synced} tasks marked done`))
  console.log(chalk.gray(`   ${noteFile}`))
}
