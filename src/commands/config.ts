import chalk from 'chalk'
import { Config } from '../core/types'
import { saveConfig } from '../config/configLoader'

export async function listDomains(config: Config): Promise<void> {
  console.log(chalk.bold('\nDomains:'))
  config.tags.domains.forEach((d) => console.log(`  ${d}`))
}

export async function addDomain(domain: string, config: Config): Promise<void> {
  const normalized = domain.toLowerCase().replace(/\s+/g, '-')
  if (config.tags.domains.includes(normalized)) {
    console.log(chalk.yellow(`Domain "${normalized}" already exists.`))
    return
  }
  config.tags.domains.push(normalized)
  await saveConfig(config.vaultPath, config)
  console.log(chalk.green(`Domain added: ${normalized}`))
}

export async function listTags(config: Config): Promise<void> {
  const all = [
    ...config.tags.domains,
    ...config.tags.priorities,
    ...config.tags.categories,
    ...config.tags.statuses,
  ]
  console.log(chalk.bold('\nCanonical tags:'))
  all.forEach((t) => console.log(`  ${t}`))
}

export async function addTag(tag: string, category: keyof Config['tags'], config: Config): Promise<void> {
  const normalized = tag.toLowerCase().replace(/\s+/g, '-')
  if (config.tags[category].includes(normalized)) {
    console.log(chalk.yellow(`Tag "${normalized}" already exists in ${category}.`))
    return
  }
  config.tags[category].push(normalized)
  await saveConfig(config.vaultPath, config)
  console.log(chalk.green(`Tag added to ${category}: ${normalized}`))
}
