import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { loadConfig, saveConfig, configExists, defaultConfig } from '../../src/config/configLoader'

describe('configLoader', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-config-test-'))
  })

  afterEach(async () => {
    await fs.remove(tmpDir)
  })

  it('configExists returns false when config.json is absent', async () => {
    expect(await configExists(tmpDir)).toBe(false)
  })

  it('configExists returns true after saving config', async () => {
    await saveConfig(tmpDir, defaultConfig(tmpDir))
    expect(await configExists(tmpDir)).toBe(true)
  })

  it('loadConfig reads back what was saved', async () => {
    const config = defaultConfig(tmpDir)
    await saveConfig(tmpDir, config)
    const loaded = await loadConfig(tmpDir)
    expect(loaded.vaultPath).toBe(tmpDir)
    expect(loaded.tags.domains).toContain('work')
  })

  it('defaultConfig includes required tag categories', () => {
    const config = defaultConfig(tmpDir)
    expect(config.tags.domains).toEqual(['work', 'personal', 'projects'])
    expect(config.tags.priorities).toEqual(['priority/high', 'priority/medium', 'priority/low'])
    expect(config.tags.statuses).toContain('status/inbox')
  })
})
