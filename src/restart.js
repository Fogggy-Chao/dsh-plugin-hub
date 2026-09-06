import { randomUUID } from 'node:crypto'

export function createRestart(ctx, runtime = process) {
  const bootId = randomUUID()
  const managed = runtime.env.DSH_HUB_MANAGED === '1' && runtime.connected && typeof runtime.send === 'function'
  const supported = managed || (typeof runtime.execve === 'function' && Boolean(runtime.argv[1]))
  let pending = false
  return {
    bootId, supported,
    async restart() {
      if (!supported) throw new Error('This Node runtime cannot restart in place. Restart DSH in your terminal.')
      if (pending) return
      pending = true
      if (managed) { runtime.send({ type: 'plugin-hub:restart' }); return }
      // Capture launch state before disposal removes services and watchers.
      const args = [runtime.execPath, ...runtime.execArgv, ...runtime.argv.slice(1)]
      const env = Object.fromEntries(Object.entries(runtime.env).filter(([,value]) => typeof value === 'string'))
      let timer
      try {
        await Promise.race([
          ctx.root.fiber.dispose(),
          new Promise(resolve => { timer = setTimeout(resolve, 5000) }),
        ])
      } catch (error) { console.error('Plugin Hub restart: cleanup failed:', error.message) }
      finally { clearTimeout(timer) }
      // execve preserves terminal ownership/PID and replaces the entire runtime.
      runtime.execve(runtime.execPath, args, env)
    },
  }
}
