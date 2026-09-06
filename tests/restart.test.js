import test from 'node:test'
import assert from 'node:assert/strict'
import { createRestart } from '../src/restart.js'

test('direct launch disposes before re-exec and preserves launch arguments/environment', async () => {
  const calls=[]
  const runtime={env:{PATH:'/bin',DSH_HOME:'/tmp/custom'},argv:['node','/bin/dsh','web','--port','3082'],execArgv:['--no-warnings'],execPath:'/bin/node',execve:(...args)=>calls.push(['exec',...args])}
  const control=createRestart({root:{fiber:{dispose:async()=>calls.push(['dispose'])}}},runtime)
  assert.equal(control.supported,true)
  await control.restart();await control.restart()
  assert.deepEqual(calls,[['dispose'],['exec','/bin/node',['/bin/node','--no-warnings','/bin/dsh','web','--port','3082'],runtime.env]])
  assert.notEqual(control.bootId,createRestart({},runtime).bootId)
})
test('managed launcher retains its existing IPC restart path',async()=>{
  const calls=[]
  const control=createRestart({}, {env:{DSH_HUB_MANAGED:'1'},connected:true,send:message=>calls.push(message)})
  await control.restart();await control.restart()
  assert.deepEqual(calls,[{type:'plugin-hub:restart'}])
})
test('unsupported hosts reject restart without exiting',async()=>{
  const control=createRestart({}, {env:{},argv:[]})
  assert.equal(control.supported,false)
  await assert.rejects(control.restart(),/cannot restart in place/)
})
