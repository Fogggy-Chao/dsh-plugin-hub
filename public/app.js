import { createJelly, bounce } from './jelly.js'

const $ = selector => document.querySelector(selector)
const glyphs = {
  module: '<rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><path d="M17 14v6m-3-3h6"/>',
  wave: '<path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-3a1.5 1.5 0 0 1 3 0v6c0 5-3 7-7 7-2 0-4-1-5-3l-4-6c-1-2 1-3 2-2l2 2"/>',
  text: '<path d="M5 5h14M12 5v14M8 19h8M5 8V5m14 3V5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
}
let state, quickId=null, busy=false, online=false, actionId=null, drag=null, noticeTimer, lastState=''
let externalPlugins=[], externalActions={}, pendingMove=null, mutationVersion=0
const plugins=()=>[...(state?.plugins||[]),...externalPlugins]
export function setExternalPlugins(items, actions) {
  externalPlugins=items; externalActions=actions
  for(const [id,node] of nodes) if(id.startsWith('market:')&&!items.some(p=>p.id===id)) {jellies.get(id)?.dispose();jellies.delete(id);node.remove();nodes.delete(id)}
  if(!drag) sync()
}
const nodes=new Map(), jellies=new Map()
const reduced=matchMedia('(prefers-reduced-motion: reduce)')

async function api(path, data) {
  const response=await fetch(`/plugin-hub/api/${path}`, data ? {method:'POST',headers:{'Content-Type':'application/json','X-Plugin-Hub':'1'},body:JSON.stringify(data)} : {cache:'no-store'})
  const payload=await response.json()
  if(!response.ok) throw new Error(payload.error || 'Something went wrong. Try again.')
  return payload
}
function notify(message) {
  clearTimeout(noticeTimer)
  $('#notice').textContent=message; $('#notice').hidden=false
  noticeTimer=setTimeout(()=>$('#notice').hidden=true,4000)
}
function locationOf(id) { if(pendingMove?.id===id) return pendingMove.destination; if(pendingMove?.destination==='quick'&&quickId===id) return 'available'; return plugins().find(p=>p.id===id)?.registered ? 'equipped' : quickId===id ? 'quick' : 'available' }
function targetFor(zone) { return zone==='quick' ? $('#try-stage') : $(`#${zone}`) }
function createPlugin(p) {
  const node=document.createElement('button')
  node.type='button'; node.className=p.external?'plugin installed-plugin':'plugin'; node.dataset.id=p.id; node.draggable=false
  node.setAttribute('aria-haspopup','true')
  node.title=p.description
  node.innerHTML=`<span class="icon-art"><span class="jelly-fallback"></span><span class="glyph"><svg viewBox="0 0 24 24" aria-hidden="true">${glyphs[p.icon]||glyphs.module}</svg></span></span><span class="plugin-name"></span>`
  node.querySelector('.plugin-name').textContent=p.name
  const jelly=createJelly(node.querySelector('.icon-art'),p.id)
  jellies.set(p.id,jelly)
  node.addEventListener('pointerenter',()=>{if(!busy&&!drag) bounce(node.querySelector('.icon-art'),'hover')})
  node.addEventListener('pointermove',event=>{
    if(drag || reduced.matches) return
    const r=node.getBoundingClientRect()
    jelly.tilt((event.clientX-r.left)/r.width-.5,(event.clientY-r.top)/r.height-.5)
  })
  node.addEventListener('pointerleave',()=>jelly.reset())
  node.addEventListener('click',event=>{
    if(node.dataset.ignoreClick==='true') { delete node.dataset.ignoreClick; return }
    if(!busy&&!drag) showActions(p.id,node)
  })
  return node
}
function sync() {
  if(!state) return
  const quickPlugin=plugins().find(p=>p.id===quickId)
  if(quickPlugin?.registered) setQuick(null)
  for(const p of plugins()) {
    if(!nodes.has(p.id)) nodes.set(p.id,createPlugin(p))
    const node=nodes.get(p.id), zone=locationOf(p.id), target=targetFor(zone)
    if(node.parentElement!==target) target.append(node)
    node.setAttribute('aria-label',`${p.name}, ${zone==='equipped'?'equipped':zone==='quick'?'in Quick Output':'available'}. Open actions.`)
    node.setAttribute('aria-disabled',String(busy||!online))
    node.setAttribute('aria-busy',String(pendingMove?.id===p.id))
  }
  $('#tool-input').disabled=busy||!quickId||!online
  $('#run').disabled=busy||!quickId||!online
  $('#run span').textContent=busy ? 'Wait' : 'Run'
}
function setQuick(id) {
  quickId=id
  const p=plugins().find(p=>p.id===id)
  $('#tool-input').value=p?.input||''
  $('#tool-input').placeholder=p?.inputLabel||'Input'
  $('#input-label').textContent=p?.inputLabel||'Input'
  $('#result').textContent='—'; $('#timing').textContent=''
  $('.output').classList.remove('error')
}
function closeActions() { if($('#actions').matches(':popover-open')) $('#actions').hidePopover() }
function showActions(id,node) {
  if(!online) return notify('Harness is disconnected.')
  closeActions(); actionId=id
  const zone=locationOf(id)
  const p=plugins().find(p=>p.id===id)
  for(const button of $('#actions').querySelectorAll('[data-move]')) {
    button.hidden=button.dataset.move===zone || (p.external&&(button.dataset.move==='quick'||!p.manageable))
    if(button.dataset.move==='available') button.textContent=zone==='equipped'?'Unload':'Return'
  }
  $('#plugin-details').hidden=!p.external
  $('#plugin-restart').hidden=!p.external||!p.restartRequired
  $('#plugin-restart').disabled=!p.restartSupported
  const r=node.getBoundingClientRect()
  $('#actions').style.left=`${Math.min(innerWidth-150,Math.max(12,r.left+r.width/2-65))}px`
  $('#actions').style.top=`${Math.min(innerHeight-145,r.bottom+8)}px`
  $('#actions').showPopover()
  $('#actions').querySelector('button:not([hidden])').focus({preventScroll:true})
}
for(const [id,label,handler] of [['plugin-details','Details',()=>externalActions.details?.(actionId)],['plugin-restart','Restart',()=>externalActions.restart?.()]]) {
  const button=document.createElement('button');button.id=id;button.textContent=label;button.hidden=true;button.addEventListener('click',()=>{closeActions();handler()});$('#actions').append(button)
}
$('#actions').addEventListener('click',event=>{
  const button=event.target.closest('[data-move]')
  if(button) {closeActions(); movePlugin(actionId,button.dataset.move)}
})
// Continue from the released screen position while the original node takes its tray slot.
function settleDrop(node, from) {
  if(!node) return
  node.getAnimations().forEach(animation=>animation.cancel())
  if(from && !reduced.matches) {
    const to=node.getBoundingClientRect()
    node.animate([
      {transformOrigin:'0 0',transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},
      {transformOrigin:'0 0',transform:'translate(0,0) scale(1)'},
    ],{duration:300,easing:'cubic-bezier(.16,1,.3,1)'})
  }
  bounce(node.querySelector('.icon-art'))
}
async function movePlugin(id,destination, releasedRect) {
  if(busy||!online||!state) return
  const p=plugins().find(p=>p.id===id)
  if(p?.external && (destination==='quick'||!p.manageable)) settleDrop(nodes.get(id),releasedRect)
  if(p?.external && destination==='quick') return notify('This plugin does not support Quick Output.')
  if(p?.external && !p.manageable) return notify(typeof p.manageable!=='boolean'
    ? 'This preview is running an older Plugin Hub backend. Open the updated preview to use plugin controls.'
    : 'This bundle has no controllable runtime entry yet. Open Details to check its loading status.')
  const origin=locationOf(id)
  if(origin===destination) {settleDrop(nodes.get(id),releasedRect);return}
  const node=nodes.get(id), from=releasedRect||node.getBoundingClientRect()
  closeActions(); busy=true
  mutationVersion++
  pendingMove={id,destination}
  sync()
  settleDrop(node,from)
  try {
    if(p.external) await externalActions.change(id,destination==='equipped'?'equip':'unequip')
    else if(destination==='equipped') state=await api('change',{id,action:'equip'})
    else if(origin==='equipped') state=await api('change',{id,action:'unequip'})
    if(destination==='quick') setQuick(id)
    else if(quickId===id) setQuick(null)
    sync()
    const name=plugins().find(p=>p.id===id).name
    $('#connection').setAttribute('aria-label',`${name} moved to ${destination==='quick'?'Quick Output':destination}. Connected to Harness.`)
  } catch(error) {
    const from=node.getBoundingClientRect()
    pendingMove=null;sync();settleDrop(node,from)
    notify(error.message)
  } finally {pendingMove=null;busy=false;sync();nodes.get(id)?.focus({preventScroll:true})}
}
$('#try-form').addEventListener('submit',async event=>{
  event.preventDefault()
  if(busy||!quickId||!online) return
  const id=quickId
  busy=true; sync(); closeActions()
  $('#result').textContent='…'; $('#timing').textContent=''; $('.output').classList.remove('error')
  bounce(nodes.get(id).querySelector('.icon-art'))
  try {
    const response=await api('tryout',{id,input:$('#tool-input').value})
    $('#result').textContent=response.result.content.map(c=>c.text||'').join('\n')
    $('#timing').textContent=`${response.elapsedMs} ms`
    $('.output').classList.toggle('error',Boolean(response.result.isError))
  } catch(error) {$('#result').textContent=error.message; $('.output').classList.add('error')}
  finally {busy=false; await refresh(); sync()}
})

// Move the original node: there is never a duplicate icon or a drag clone.
document.addEventListener('pointerdown',event=>{
  const node=event.target.closest('.plugin')
  if(!node||busy||!online||event.button!==0) return
  closeActions()
  const r=node.getBoundingClientRect()
  delete node.dataset.ignoreClick
  drag={id:node.dataset.id,node,startX:event.clientX,startY:event.clientY,rect:r,active:false,pointerId:event.pointerId}
  node.setPointerCapture(event.pointerId)
})
document.addEventListener('pointermove',event=>{
  if(!drag) return
  const dx=event.clientX-drag.startX, dy=event.clientY-drag.startY
  if(!drag.active&&Math.hypot(dx,dy)<7) return
  if(!drag.active) {
    drag.active=true; drag.node.classList.add('dragging'); document.body.classList.add('is-dragging')
    Object.assign(drag.node.style,{position:'fixed',left:`${drag.rect.left}px`,top:`${drag.rect.top}px`,width:`${drag.rect.width}px`,margin:'0',pointerEvents:'none'})
    bounce(drag.node.querySelector('.icon-art'),'hover')
  }
  drag.node.style.transform=`translate3d(${dx}px,${dy}px,0) rotate(${Math.max(-7,Math.min(7,dx*.022))}deg) scale(1.08)`
  jellies.get(drag.id).tilt(Math.max(-1,Math.min(1,dx/160)),Math.max(-1,Math.min(1,dy/160)))
  const destination=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-zone]')
  for(const zone of document.querySelectorAll('[data-zone]')) zone.classList.toggle('drop-over',zone===destination)
})
function endDrag(event,cancel=false) {
  if(!drag) return
  const d=drag, destination=cancel ? null : document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-zone]')?.dataset.zone
  const releasedRect=d.active ? d.node.getBoundingClientRect() : null
  if(d.node.hasPointerCapture(d.pointerId)) d.node.releasePointerCapture(d.pointerId)
  drag=null
  d.node.removeAttribute('style'); d.node.classList.remove('dragging'); document.body.classList.remove('is-dragging')
  for(const zone of document.querySelectorAll('[data-zone]')) zone.classList.remove('drop-over')
  jellies.get(d.id).reset()
  if(d.active) {
    d.node.dataset.ignoreClick='true'
    if(destination) movePlugin(d.id,destination,releasedRect)
    else settleDrop(d.node,releasedRect)
  }
}
document.addEventListener('pointerup',event=>endDrag(event))
document.addEventListener('pointercancel',event=>endDrag(event,true))
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag) endDrag(event,true)})
window.addEventListener('blur',event=>endDrag(event,true))
document.addEventListener('dragstart',event=>{if(event.target.closest('.plugin')) event.preventDefault()})

async function refresh() {
  const version=mutationVersion
  try {
    const next=await api('state')
    if(version!==mutationVersion||pendingMove) return
    const signature=JSON.stringify(next.plugins.map(p=>[p.id,p.state,p.registered]))
    const changed=signature!==lastState||!online
    online=true; state=next; lastState=signature
    $('#connection').setAttribute('aria-label','Connected to Harness')
    if(changed) sync()
  } catch {
    online=false; $('#connection').setAttribute('aria-label','Harness disconnected')
    sync()
  }
}
await refresh()
setInterval(()=>{if(!busy&&!drag&&!document.hidden) refresh()},2500)
window.addEventListener('pagehide',()=>{for(const jelly of jellies.values()) jelly.dispose()})
