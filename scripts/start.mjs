import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const runtime = path.join(root, '.runtime')
await mkdir(runtime, { recursive: true })
const patch = path.join(runtime, 'hub.patch.yml')
await writeFile(patch, `- insert:\n    - id: plugin-hub\n      name: ${JSON.stringify(path.join(root, 'src/index.js'))}\n      config:\n        profileLabel: web\n`)
// The launcher owns the child lifecycle; the HTTP plugin never exits an unmanaged host.
let child, stopping=false, restartRequested=false, forceTimer
function launch() {
  child = spawn(process.execPath, [path.join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), '--profile', 'web', '--patch', patch, '--no-open', '--port', process.env.PORT || '3080'], { cwd: root, stdio: ['inherit', 'inherit', 'inherit', 'ipc'], env: { ...process.env, DSH_HOME: runtime, DSH_HUB_MANAGED: '1' } })
  child.on('message', message => {
    if (message?.type !== 'plugin-hub:restart' || stopping || restartRequested) return
    restartRequested=true
    child.kill('SIGTERM')
    forceTimer=setTimeout(()=>child.kill('SIGKILL'),15000)
  })
  child.on('error', error => { console.error(error.message); process.exitCode=1 })
  child.on('exit', code => {
    clearTimeout(forceTimer)
    if (restartRequested && !stopping) { restartRequested=false; launch() }
    else process.exitCode=code ?? 1
  })
}
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{stopping=true;child?.kill(signal)})
launch()
