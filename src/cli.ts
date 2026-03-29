#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
  .name('task')
  .description('Personal CLI task manager for Obsidian')
  .version('0.1.0')

program.parse(process.argv)
