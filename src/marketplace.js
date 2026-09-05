import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

export const packagePattern = /^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/
const catalog = JSON.parse(await readFile(new URL('../data/marketplace.json', import.meta.url), 'utf8'))

export function runInstaller(profile, spec) {
  return new Promise((resolve, reject) => {
    const bin = path.join(path.dirname(require.resolve('@deepseek-ai/dsh/package.json')), 'lib/bin.js')
    const child = spawn(process.execPath, [bin, 'plugin', '--profile', profile, 'add', spec, '--ignore-scripts', '--save-exact', '--registry=https://registry.npmjs.org'], { stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' })
    let output = '', timedOut = false
    const collect = chunk => { output = (output + chunk.toString()).slice(-12000) }
    child.stdout.on('data', collect); child.stderr.on('data', collect)
    const timer = setTimeout(() => {
      timedOut = true
      try { process.platform === 'win32' ? child.kill('SIGKILL') : process.kill(-child.pid, 'SIGKILL') } catch {}
    }, 120000)
    child.on('error', error => { clearTimeout(timer); reject(error) })
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(timedOut ? 'Installation timed out. Retry when your connection is ready.' : `Installation failed. ${output.slice(-1500)}`)) })
  })
}

export function createMarketplace(profile, { install = runInstaller, fetchManifest = async name => {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, { signal: AbortSignal.timeout(15000), redirect: 'error' })
  if (!response.ok) throw new Error('This package is unavailable on npm.')
  return response.json()
}, home = process.env.DSH_HOME, loaded = () => false, restartSupported = false, lifecycle } = {}) {
  const enabled = Boolean(home && /^[a-zA-Z0-9_-]+$/.test(profile))
  const manifestPath = enabled ? path.join(home, 'profiles', profile, 'package.json') : null
  let bootDependencies = {}
  try { bootDependencies = JSON.parse(readFileSync(manifestPath, 'utf8')).dependencies || {} } catch {}
  const jobs = new Map()
  let active = false
  async function installed() {
    if (!manifestPath) return {}
    try { return JSON.parse(await readFile(manifestPath, 'utf8')).dependencies || {} } catch { return {} }
  }
  return {
    isInstalling: () => active,
    async list() {
      const dependencies = await installed()
      return { ...catalog, profile, pid: process.pid, restartSupported, installEnabled: enabled, plugins: catalog.plugins.map(p => ({ ...p, installed: Boolean(p.package && dependencies[p.package]), job: jobs.get(p.package) || null, loaded: Boolean(p.package && (lifecycle ? lifecycle.status(p.package).loaded : loaded(p.package))), manageable: Boolean(p.package && lifecycle?.status(p.package).manageable), restartRequired: Boolean(p.package && dependencies[p.package] && !(lifecycle ? lifecycle.status(p.package).manageable : loaded(p.package)) && dependencies[p.package] !== bootDependencies[p.package]) })) }
    },
    async change(id, action) {
      const item = catalog.plugins.find(p => p.id === id)
      if (!item?.package || !(await installed())[item.package]) throw new Error('Unknown installed plugin.')
      if (!lifecycle) throw new Error('Runtime plugin control is unavailable.')
      if (active) throw new Error('Another plugin operation is running. Please wait.')
      active = true
      try { await lifecycle.change(item.package, action); return await this.list() }
      finally { active = false }
    },
    async install(id) {
      if (!enabled) throw new Error('Installation requires an explicit DSH_HOME and profile.')
      const item = catalog.plugins.find(p => p.id === id)
      if (!item?.package || !packagePattern.test(item.package)) throw new Error('This plugin needs manual installation. Open its source for instructions.')
      if ((await installed())[item.package]) return { status: 'installed', package: item.package }
      if (active) throw new Error('Another plugin is installing. Please wait.')
      active = true
      const job = { status: 'installing', package: item.package }
      jobs.set(item.package, job)
      Promise.resolve().then(async () => {
        const manifest = await fetchManifest(item.package)
        if (manifest.name !== item.package || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version || '')) throw new Error('The package metadata could not be verified.')
        if (typeof manifest.dsh?.bundle?.patch !== 'string') throw new Error('This package does not publish a Harness bundle. Open its source for setup instructions.')
        await install(profile, `${item.package}@${manifest.version}`)
        if (!(await installed())[item.package]) throw new Error('The profile did not record this installation. Retry or open the source instructions.')
        Object.assign(job, { status: 'installed', version: manifest.version })
      }).catch(error => Object.assign(job, { status: 'failed', error: error.message })).finally(() => { active = false })
      return job
    },
  }
}
