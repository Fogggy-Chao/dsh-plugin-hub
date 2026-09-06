import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createMarketplace, packagePattern } from '../src/marketplace.js'
const tick = () => new Promise(resolve=>setTimeout(resolve,15))
test('marketplace rejects arbitrary package inputs and disabled installations', async () => {
  assert.equal(packagePattern.test('foo;touch /tmp/no'), false)
  const market=createMarketplace('web',{home:''})
  const list=await market.list()
  assert.ok(list.plugins.length>3000)
  await assert.rejects(market.install(list.plugins[0].id), /valid Harness home/)
})
test('installation pins verified bundle version, serializes jobs and records actual profile state', async () => {
  const home=await mkdtemp(path.join(tmpdir(),'hub-market-'))
  try {
    const dir=path.join(home,'profiles','web');await mkdir(dir,{recursive:true})
    let release, calls=[]
    const gate=new Promise(resolve=>{release=resolve})
    const market=createMarketplace('web',{home,fetchManifest: async name=>({name,version:'1.2.3',dsh:{bundle:{patch:'./cordis.yml'}}}), install:async(profile,spec)=>{
      calls.push([profile,spec]);await gate
      await writeFile(path.join(dir,'package.json'),JSON.stringify({dependencies:{[spec.slice(0,spec.lastIndexOf('@'))]:'1.2.3'}}))
    }})
    const items=(await market.list()).plugins.filter(p=>p.package)
    await assert.rejects(market.install('$(bad)'),/manual installation/)
    assert.equal((await market.install(items[0].id)).status,'installing')
    await assert.rejects(market.install(items[1].id),/Another plugin/)
    assert.equal((await market.list()).plugins.find(p=>p.id===items[0].id).installed,false)
    release();await tick()
    const result=(await market.list()).plugins.find(p=>p.id===items[0].id)
    assert.equal(result.installed,true);assert.equal(result.job.status,'installed');assert.equal(result.restartRequired,true)
    assert.deepEqual(calls,[['web',`${items[0].package}@1.2.3`]])
    await market.install(items[0].id);assert.equal(calls.length,1)
  } finally {await rm(home,{recursive:true,force:true})}
})
test('non-bundles and failed installs never report success', async () => {
  const home=await mkdtemp(path.join(tmpdir(),'hub-market-'))
  try {
    let called=false
    const market=createMarketplace('web',{home,fetchManifest:async name=>({name,version:'1.0.0'}),install:async()=>{called=true}})
    const item=(await market.list()).plugins.find(p=>p.package)
    await market.install(item.id);await tick()
    const result=(await market.list()).plugins.find(p=>p.id===item.id)
    assert.equal(result.job.status,'failed');assert.equal(result.installed,false);assert.equal(called,false)
  } finally {await rm(home,{recursive:true,force:true})}
})

test('already loaded bundles do not request restart', async () => {
  const home=await mkdtemp(path.join(tmpdir(),'hub-loaded-'))
  try {
    const market=createMarketplace('web',{home,loaded:()=>true,restartSupported:true})
    const item=(await market.list()).plugins.find(p=>p.package)
    const dir=path.join(home,'profiles','web');await mkdir(dir,{recursive:true})
    await writeFile(path.join(dir,'package.json'),JSON.stringify({dependencies:{[item.package]:'1.0.0'}}))
    const list=await market.list(), plugin=list.plugins.find(p=>p.id===item.id)
    assert.equal(plugin.restartRequired,false);assert.equal(plugin.loaded,true);assert.equal(list.restartSupported,true)
  } finally {await rm(home,{recursive:true,force:true})}
})

test('normal dsh web launch enables the marketplace without DSH_HOME', async () => {
  const previous=process.env.DSH_HOME
  try {
    delete process.env.DSH_HOME
    const market=createMarketplace('web')
    assert.equal((await market.list()).installEnabled,true)
    assert.equal((await createMarketplace('../other').list()).installEnabled,false)
  } finally { if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous }
})
test('resolved home is passed to the installer, including custom environment homes', async () => {
  const previous=process.env.DSH_HOME, home=await mkdtemp(path.join(tmpdir(),'hub-env-home-'))
  try {
    process.env.DSH_HOME=home
    const dir=path.join(home,'profiles','web');await mkdir(dir,{recursive:true})
    let receivedHome
    const market=createMarketplace('web',{fetchManifest:async name=>({name,version:'1.2.3',dsh:{bundle:{patch:'./cordis.yml'}}}),install:async(profile,spec,resolvedHome)=>{
      receivedHome=resolvedHome
      await writeFile(path.join(dir,'package.json'),JSON.stringify({dependencies:{[spec.slice(0,spec.lastIndexOf('@'))]:'1.2.3'}}))
    }})
    const item=(await market.list()).plugins.find(p=>p.package)
    await market.install(item.id)
    for(let i=0;i<50&&market.isInstalling();i++)await tick()
    assert.equal(receivedHome,home)
    assert.equal((await market.list()).plugins.find(p=>p.id===item.id).job.status,'installed')
  } finally {if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;await rm(home,{recursive:true,force:true})}
})
