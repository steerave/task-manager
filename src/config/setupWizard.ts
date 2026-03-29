import inquirer from 'inquirer'
import * as path from 'path'
import { defaultConfig, saveConfig } from './configLoader'
import { Config } from '../core/types'
import chalk from 'chalk'

export async function runSetupWizard(vaultPath?: string): Promise<Config> {
  console.log(chalk.cyan('\nTask Manager — First Run Setup\n'))

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'vaultPath',
      message: 'Where is your Obsidian vault? (absolute path)',
      default: vaultPath ?? path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', 'TaskVault'),
      validate: (input: string) => input.trim().length > 0 || 'Vault path is required',
    },
  ])

  const config = defaultConfig(answers.vaultPath.trim())
  await saveConfig(answers.vaultPath.trim(), config)

  console.log(chalk.green(`\nConfig saved to ${answers.vaultPath}/config.json`))
  console.log(chalk.gray('   Edit config.json to add domains and tags.\n'))

  return config
}
