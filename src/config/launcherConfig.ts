import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'

const LAUNCHER_CONFIG_PATH = path.join(os.homedir(), '.taskmanager')

interface LauncherConfig {
  vaultPath: string
}

export async function readLauncherConfig(): Promise<LauncherConfig | null> {
  if (!(await fs.pathExists(LAUNCHER_CONFIG_PATH))) return null
  try {
    const raw = await fs.readFile(LAUNCHER_CONFIG_PATH, 'utf8')
    return JSON.parse(raw) as LauncherConfig
  } catch {
    return null
  }
}

export async function writeLauncherConfig(config: LauncherConfig): Promise<void> {
  await fs.writeFile(LAUNCHER_CONFIG_PATH, JSON.stringify(config), 'utf8')
}
