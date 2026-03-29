import * as fs from 'fs-extra'
import * as path from 'path'
import { Config } from '../core/types'

export const CONFIG_FILENAME = 'config.json'

export function defaultConfig(vaultPath: string): Config {
  return {
    vaultPath,
    tags: {
      domains: ['work', 'personal', 'personal-projects'],
      priorities: ['priority/high', 'priority/medium', 'priority/low'],
      categories: ['health', 'finance', 'errands', 'learning', 'admin', 'creative'],
      statuses: ['status/todo', 'status/done', 'status/blocked', 'status/inbox'],
    },
  }
}

export async function configExists(vaultPath: string): Promise<boolean> {
  return fs.pathExists(path.join(vaultPath, CONFIG_FILENAME))
}

export async function loadConfig(vaultPath: string): Promise<Config> {
  const configPath = path.join(vaultPath, CONFIG_FILENAME)
  const raw = await fs.readJson(configPath)
  return raw as Config
}

export async function saveConfig(vaultPath: string, config: Config): Promise<void> {
  const configPath = path.join(vaultPath, CONFIG_FILENAME)
  await fs.writeJson(configPath, config, { spaces: 2 })
}
