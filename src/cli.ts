#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import { configExists, loadConfig } from './config/configLoader'
import { readLauncherConfig, writeLauncherConfig } from './config/launcherConfig'
import { runSetupWizard } from './config/setupWizard'
import { addTask } from './commands/add'
import { listTasks } from './commands/list'
import { markDone } from './commands/done'
import { updateTaskCmd } from './commands/update'
import { deleteTask } from './commands/delete'
import { runToday } from './commands/today'
import { listDomains, addDomain, listTags, addTag } from './commands/config'
import { addCalendarEvent } from './commands/calendar'
import { Config } from './core/types'

async function getConfig(): Promise<Config> {
  // Step 1: Check ~/.taskmanager for saved vault path
  const saved = await readLauncherConfig()

  if (saved?.vaultPath && await configExists(saved.vaultPath)) {
    return loadConfig(saved.vaultPath)
  }

  // Step 2: First run — launch setup wizard, then save vault path to ~/.taskmanager
  console.log(chalk.yellow('\nNo config found. Running setup wizard...\n'))
  const config = await runSetupWizard()
  await writeLauncherConfig({ vaultPath: config.vaultPath })
  return config
}

const program = new Command()

program
  .name('task')
  .description('Personal CLI task manager for Obsidian')
  .version('0.1.0')

program
  .command('add <text>')
  .description('Add a task using natural language')
  .action(async (text: string) => {
    const config = await getConfig()
    await addTask(text, config)
  })

program
  .command('list')
  .description('List tasks (hides done tasks by default)')
  .option('--domain <domain>', 'Filter by domain')
  .option('--due <when>', 'Filter by due: today | this-week | next-week | overdue')
  .option('--priority <level>', 'Filter by priority: high | medium | low')
  .option('--status <status>', 'Filter by status tag')
  .option('--done', 'Include completed tasks')
  .action(async (opts) => {
    const config = await getConfig()
    await listTasks(config, {
      domain: opts.domain,
      due: opts.due,
      priority: opts.priority,
      status: opts.status,
    }, opts.done ?? false)
  })

program
  .command('done <id>')
  .description('Mark a task as done')
  .action(async (id: string) => {
    const config = await getConfig()
    await markDone(id, config)
  })

program
  .command('update <id>')
  .description('Update a task')
  .option('--name <name>', 'New task name')
  .option('--due <date>', 'New due date (YYYY-MM-DD)')
  .option('--domain <domain>', 'New domain')
  .option('--priority <priority>', 'New priority: high | medium | low')
  .action(async (id: string, opts) => {
    const config = await getConfig()
    await updateTaskCmd(id, opts, config)
  })

program
  .command('delete <id>')
  .description('Delete a task')
  .action(async (id: string) => {
    const config = await getConfig()
    await deleteTask(id, config)
  })

program
  .command('today')
  .description('Generate today/this-week/next-week Obsidian notes')
  .action(async () => {
    const config = await getConfig()
    await runToday(config)
  })

const domains = program.command('domains').description('Manage domains')
domains.command('list').action(async () => { const c = await getConfig(); await listDomains(c) })
domains.command('add <domain>').action(async (domain: string) => { const c = await getConfig(); await addDomain(domain, c) })

const tags = program.command('tags').description('Manage canonical tags')
tags.command('list').action(async () => { const c = await getConfig(); await listTags(c) })
tags.command('add <tag>')
  .option('--category <cat>', 'Tag category: domains|priorities|categories|statuses', 'categories')
  .action(async (tag: string, opts) => { const c = await getConfig(); await addTag(tag, opts.category, c) })

const calendar = program.command('calendar').description('Manage calendar events')
calendar
  .command('add <text>')
  .description('Add an event to your iCloud calendar')
  .action(async (text: string) => {
    try {
      await addCalendarEvent(text)
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`))
    }
  })
calendar
  .command('today')
  .description('Regenerate daily note with fresh calendar events')
  .action(async () => {
    const config = await getConfig()
    await runToday(config)
  })

program.parse(process.argv)
