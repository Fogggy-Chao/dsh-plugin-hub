import { test } from 'node:test'
import assert from 'node:assert/strict'
const base = process.env.HUB_TEST_URL || 'http://127.0.0.1:3080'
async function request(path, body, headers = {}) {
  const res = await fetch(`${base}/plugin-hub/api/${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': base, 'X-Plugin-Hub': '1', ...headers }, body: JSON.stringify(body) } : {})
  return { status: res.status, body: await res.json() }
}
test('real Harness lifecycle: register, execute, dispose, reject absent tool, re-equip', async () => {
  await request('change', { id: 'hello', action: 'unequip' })
  const initial = (await request('state')).body
  assert.ok(initial.instances.some(i => i.name === 'plugin-hub'))
  assert.equal(initial.plugins.find(p => p.id === 'hello').registered, false)
  try {
    const equipped = await request('change', { id: 'hello', action: 'equip' })
    assert.equal(equipped.status, 200)
    assert.equal(equipped.body.plugins.find(p => p.id === 'hello').state, 'active')
    assert.equal(equipped.body.plugins.find(p => p.id === 'hello').registered, true)
    const result = await request('call', { id: 'hello', input: 'Ada' })
    assert.equal(result.status, 200)
    assert.equal(result.body.result.isError, false)
    assert.match(result.body.result.content[0].text, /Hello, Ada!/)
    const repeat = await request('change', { id: 'hello', action: 'equip' })
    assert.equal(repeat.body.instances.filter(i => i.name === 'hub-hello').length, 1)
    const removed = await request('change', { id: 'hello', action: 'unequip' })
    assert.equal(removed.body.plugins.find(p => p.id === 'hello').registered, false)
    assert.equal((await request('call', { id: 'hello', input: 'Ada' })).status, 400)
    const restored = await request('change', { id: 'hello', action: 'equip' })
    assert.equal(restored.body.pid, initial.pid)
    assert.equal(restored.body.plugins.find(p => p.id === 'hello').registered, true)
  } finally { await request('change', { id: 'hello', action: 'unequip' }) }
})
test('request boundary rejects foreign origin, arbitrary plugin and invalid input', async () => {
  assert.equal((await request('change', { id: 'hello', action: 'equip' }, { Origin: 'https://example.com' })).status, 403)
  assert.equal((await request('change', { id: '../../arbitrary-code', action: 'equip' })).status, 400)
  assert.equal((await request('call', { id: 'hello', input: '' })).status, 400)
})
test('all bundled tools run through the same pipeline and clean up', async () => {
  for (const [id, input, match] of [['text', 'Hello world', /"words":\s*2/], ['clock', 'Asia/Singapore', /GMT|Singapore/]]) {
    try {
      assert.equal((await request('change', { id, action: 'equip' })).status, 200)
      const result = await request('call', { id, input })
      assert.equal(result.body.result.isError, false)
      assert.match(result.body.result.content[0].text, match)
      if (id === 'clock') assert.equal((await request('call', { id, input: 'Invalid/Timezone' })).body.result.isError, true)
    } finally { await request('change', { id, action: 'unequip' }) }
  }
})
test('Quick Output temporarily registers a tool and always disposes it', async () => {
  await request('change', { id: 'clock', action: 'unequip' })
  const before = (await request('state')).body
  const result = await request('tryout', { id: 'clock', input: 'Asia/Singapore' })
  assert.equal(result.status, 200)
  assert.equal(result.body.result.isError, false)
  let after = (await request('state')).body
  assert.equal(after.plugins.find(p => p.id === 'clock').registered, false)
  assert.equal(after.instances.length, before.instances.length)
  assert.equal(after.pid, before.pid)
  const failed = await request('tryout', { id: 'clock', input: 'Invalid/Timezone' })
  assert.equal(failed.body.result.isError, true)
  after = (await request('state')).body
  assert.equal(after.plugins.find(p => p.id === 'clock').registered, false)
  assert.equal(after.instances.length, before.instances.length)
  try {
    await request('change', { id: 'clock', action: 'equip' })
    assert.equal((await request('tryout', { id: 'clock', input: 'UTC' })).status, 400)
    assert.equal((await request('state')).body.plugins.find(p => p.id === 'clock').registered, true)
  } finally { await request('change', { id: 'clock', action: 'unequip' }) }
})

test('marketplace HTTP boundary exposes catalog but rejects foreign-origin and arbitrary installs', async () => {
  const catalog = await request('marketplace')
  assert.equal(catalog.status,200)
  assert.ok(catalog.body.plugins.length > 3000)
  const item=catalog.body.plugins.find(p=>p.package)
  assert.equal((await request('install',{id:item.id},{Origin:'https://example.com'})).status,403)
  assert.equal((await request('install',{id:'not-a-catalog-id'})).status,400)
})

test('restart rejects foreign-origin requests without restarting the process', async () => {
  const before=(await request('state')).body.pid
  const rejected=await request('restart',{}, {Origin:'https://example.com'})
  assert.equal(rejected.status,403)
  assert.equal((await request('state')).body.pid,before)
})

test('installed mascot unloads and re-equips live without changing PID or uninstalling the package', async t => {
  const market=(await request('marketplace')).body
  const plugin=market.plugins.find(p=>p.package==='@falser101/mascot'&&p.installed&&p.manageable)
  if(!plugin) return t.skip('Mascot is not installed in this test profile')
  const before=(await request('state')).body.pid
  try {
    const unload=await request('market-change',{id:plugin.id,action:'unequip'})
    assert.equal(unload.status,200)
    const unloaded=unload.body.plugins.find(p=>p.id===plugin.id)
    assert.equal(unloaded.loaded,false);assert.equal(unloaded.manageable,true);assert.equal(unloaded.restartRequired,false)
    assert.equal(unloaded.installed,true)
    // The Web app fallback rejects POST once the mascot's exact route is disposed.
    assert.equal((await fetch(`${base}/mascot/lines`,{method:'POST'})).status,405)
    const equip=await request('market-change',{id:plugin.id,action:'equip'})
    assert.equal(equip.status,200);assert.equal(equip.body.plugins.find(p=>p.id===plugin.id).loaded,true)
    assert.equal((await request('state')).body.pid,before)
    assert.equal((await request('market-change',{id:plugin.id,action:'unequip'},{Origin:'https://example.com'})).status,403)
  } finally { await request('market-change',{id:plugin.id,action:plugin.loaded?'equip':'unequip'}) }
})
