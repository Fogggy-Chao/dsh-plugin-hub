import { randomUUID } from 'node:crypto'
import { catalog, toolPlugin } from './catalog.js'
const states = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']

export function createController(ctx, profileLabel) {
  const mounted = new Map()
  const events = []
  let sequence = Promise.resolve()
  const record = (message, kind = 'info') => {
    events.unshift({ id: randomUUID(), time: new Date().toISOString(), message, kind })
    events.splice(40)
  }
  record('Connected to Harness')
  const resolve = id => {
    const item = catalog.find(item => item.id === id)
    if (!item) throw new Error('Unknown plugin.')
    return item
  }
  function snapshot() {
    const instances = []
    for (const runtime of ctx.registry.values()) {
      for (const fiber of runtime.fibers) instances.push({ id: fiber.uid, name: fiber.name, state: states[fiber.state] ?? 'unknown' })
    }
    return {
      profile: profileLabel, scope: 'process', persistent: false, pid: process.pid,
      instances: instances.sort((a, b) => a.name.localeCompare(b.name)),
      services: ['agents', 'llm', 'tools'].map(id => ({ id, active: Boolean(ctx.get(id)) })),
      plugins: catalog.map(({ run, ...item }) => {
        const fiber = mounted.get(item.id)
        return { ...item, state: fiber ? states[fiber.state] : 'unequipped', registered: Boolean(ctx.tools.get(item.tool)) }
      }), events,
    }
  }
  async function mutate(id, action) {
    const item = resolve(id)
    if (action === 'equip') {
      if (!mounted.has(id)) {
        const fiber = ctx.plugin(toolPlugin(item))
        mounted.set(id, fiber)
        await fiber.inertia
        if (fiber.state !== 2 || !ctx.tools.get(item.tool)) {
          await fiber.dispose()
          mounted.delete(id)
          throw new Error('Could not register the tool. Check runtime dependencies.')
        }
        record(`${item.name} equipped · ${item.tool} registered`, 'success')
      }
    } else if (action === 'unequip') {
      const fiber = mounted.get(id)
      if (fiber) {
        await fiber.dispose()
        mounted.delete(id)
        if (ctx.tools.get(item.tool)) throw new Error('Tool is still registered after removal.')
        record(`${item.name} returned to Available`)
      }
    } else throw new Error('Unsupported action.')
    return snapshot()
  }
  function enqueue(work) {
    const operation = sequence.then(work)
    sequence = operation.catch(() => {}) // Keep later actions available after a rejected action.
    return operation
  }
  return {
    snapshot,
    tryout: (id, input) => enqueue(async () => {
      const item = resolve(id)
      if (typeof input !== 'string' || !input.trim() || input.length > 4000) throw new Error('Enter between 1 and 4,000 characters.')
      if (mounted.has(id) || ctx.tools.get(item.tool)) throw new Error('Move this plugin out of Equipped before a temporary tryout.')
      const fiber = ctx.plugin(toolPlugin(item))
      try {
        await fiber.inertia
        if (fiber.state !== 2 || !ctx.tools.get(item.tool)) throw new Error('Could not prepare this plugin.')
        const start = performance.now()
        const result = await ctx.tools.execute({ callId: randomUUID(), name: item.tool, arguments: { input }, signal: AbortSignal.timeout(10000) })
        return { result, elapsedMs: Math.round(performance.now() - start), tool: item.tool }
      } finally {
        await fiber.dispose()
      }
    }),
    change: (id, action) => enqueue(() => mutate(id, action)),
    call: (id, input) => enqueue(async () => {
      const item = resolve(id)
      if (typeof input !== 'string' || !input.trim() || input.length > 4000) throw new Error('Enter between 1 and 4,000 characters.')
      if (!mounted.has(id) || !ctx.tools.get(item.tool)) throw new Error('Equip this plugin first.')
      const start = performance.now()
      const result = await ctx.tools.execute({ callId: randomUUID(), name: item.tool, arguments: { input }, signal: AbortSignal.timeout(10000) })
      record(`${item.tool} ${result.isError ? 'failed' : 'completed'}`, result.isError ? 'error' : 'success')
      return { result, elapsedMs: Math.round(performance.now() - start), tool: item.tool }
    }),
  }
}
