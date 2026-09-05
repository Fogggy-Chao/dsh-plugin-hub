import test from 'node:test'
import assert from 'node:assert/strict'
import { createInstalledLifecycle } from '../src/installed-lifecycle.js'
const makeEntry = name => ({options:{name},fiber:{state:2},async update({disabled}) {this.options.disabled=disabled;this.disabled=Boolean(disabled);this.fiber=disabled?undefined:{state:2,inertia:Promise.resolve()}}})
test('installed plugin unload and re-equip retain the same entry and isolate unrelated plugins',async()=>{
 const entry=makeEntry('@demo/mascot'),other=makeEntry('@demo/other')
 const lifecycle=createInstalledLifecycle({get:()=>({entries:()=>[entry,other]})})
 assert.equal(lifecycle.status('@demo/mascot').loaded,true)
 await lifecycle.change('@demo/mascot','unequip')
 assert.deepEqual(lifecycle.status('@demo/mascot'),{loaded:false,manageable:true})
 assert.equal(other.fiber.state,2)
 await lifecycle.change('@demo/mascot','equip')
 assert.equal(entry.fiber.state,2)
 await lifecycle.change('@demo/mascot','unequip');await lifecycle.change('@demo/mascot','unequip')
 assert.equal(entry.fiber,undefined)
 await assert.rejects(lifecycle.change('unknown','equip'),/not joined/)
 await assert.rejects(lifecycle.change('@demo/mascot','delete'),/Unsupported/)
})
test('failed activation restores disabled state',async()=>{
 const entry=makeEntry('demo');await entry.update({disabled:true})
 entry.update=async({disabled})=>{entry.options.disabled=disabled;entry.disabled=Boolean(disabled);entry.fiber=disabled?undefined:{state:0}}
 const lifecycle=createInstalledLifecycle({get:()=>({entries:()=>[entry]})})
 await assert.rejects(lifecycle.change('demo','equip'),/could not activate/)
 assert.equal(entry.options.disabled,true);assert.equal(entry.fiber,undefined)
})
