// Use Loader entries so disposal also reaches browser-module registration and HMR.
// Entry.update changes the in-memory node; unlike Loader.update it does not write the tree.
export function createInstalledLifecycle(ctx) {
  const entriesFor = name => [...(ctx.get('loader')?.entries() || [])].filter(entry => entry.options.name === name || entry.options.name?.startsWith(`${name}/`))
  return {
    status(name) {
      const entries = entriesFor(name)
      return { loaded: entries.some(entry => entry.fiber?.state === 2), manageable: entries.length > 0 && entries.every(entry => !entry.options.group && (!entry.fiber || entry.fiber !== ctx.fiber)) }
    },
    async change(name, action) {
      if (!['equip', 'unequip'].includes(action)) throw new Error('Unsupported action.')
      const entries = entriesFor(name)
      if (!entries.length) throw new Error('This bundle has not joined the running profile yet.')
      if (entries.some(entry => entry.options.group || (entry.fiber && entry.fiber === ctx.fiber))) throw new Error('This bundle cannot be toggled from Plugin Hub.')
      const previous = entries.map(entry => entry.options.disabled)
      try {
        for (const entry of action === 'unequip' ? [...entries].reverse() : entries) await entry.update({ disabled: action === 'unequip' })
        if (action === 'equip') {
          for (const entry of entries) {
            await entry.fiber?.inertia
            if (entry.disabled || entry.fiber?.state !== 2) throw new Error('The plugin could not activate. Check its required services and configuration.')
          }
        } else if (entries.some(entry => entry.fiber)) throw new Error('The plugin has not finished unloading.')
      } catch (error) {
        const rollback = await Promise.allSettled(entries.map((entry,index) => entry.update({ disabled: previous[index] ?? null })))
        if (rollback.some(result=>result.status==='rejected')) throw new Error(`${error.message} Previous state could not be fully restored; refresh to inspect it.`)
        throw error
      }
    },
  }
}
