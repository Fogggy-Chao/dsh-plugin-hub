import { setExternalPlugins } from './app.js'
const $ = selector => document.querySelector(selector)
let catalog, limit = 24, timer, loading = false, loadFailed = false
const categories = { ui:'Interface', theme:'Appearance', model:'Models', tools:'Tools', tool:'Tools', memory:'Memory', session:'Sessions', workflow:'Workflow', market:'Marketplaces', usage:'Usage', identity:'Communication', agi:'Architecture', dev:'Development', notification:'Notifications', fun:'Play' }
let restarting=false
const restartButton=document.createElement('button')
restartButton.id='market-restart'; restartButton.textContent='Restart'; restartButton.hidden=true
restartButton.title='Restart Harness and reconnect. Running sessions will disconnect.'
restartButton.addEventListener('click', restart)
$('#market-close').before(restartButton)
const el = (tag, className, text) => { const node = document.createElement(tag); node.className = className; if (text) node.textContent = text; return node }
async function request(path, data) {
  const response = await fetch(`/plugin-hub/api/${path}`, data ? {method:'POST', headers:{'Content-Type':'application/json','X-Plugin-Hub':'1'},body:JSON.stringify(data)} : {cache:'no-store'})
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not load marketplace. Try again.')
  return result
}
function message(text) { $('#market-message').textContent = text }
async function load() {
  if (loading) return
  loading = true
  try {
    catalog = await request('marketplace'); loadFailed = false
    if ($('#market-category').options.length === 1) {
      for (const category of [...new Set(catalog.plugins.map(p => p.category))].sort()) {
        const option = el('option', '', categories[category] || category.charAt(0).toUpperCase()+category.slice(1)); option.value = category; $('#market-category').append(option)
      }
    }
    render(); renderInstalled()
    restartButton.hidden=!catalog.plugins.some(p=>p.restartRequired)
    restartButton.disabled=restarting||!catalog.restartSupported
    if (!catalog.restartSupported) restartButton.title='Run pnpm start to enable one-click restart.'
    clearTimeout(timer)
    if (catalog.plugins.some(p => p.job?.status === 'installing')) timer = setTimeout(load, 1800)
  } catch (error) { loadFailed = true; message(error.message); $('#market-more').hidden=false; $('#market-more').textContent='Retry' }
  finally { loading = false }
}
function open() {
  $('#marketplace').hidden = false; $('#browse').setAttribute('aria-expanded','true')
  $('#market-search').focus(); if (!catalog) message('Loading…'); load()
}
function close() { $('#marketplace').hidden=true; $('#browse').setAttribute('aria-expanded','false'); $('#browse').focus() }
$('#browse').addEventListener('click', () => $('#marketplace').hidden ? open() : close())
$('#market-close').addEventListener('click', close)
document.addEventListener('keydown', event => { if (event.key==='Escape' && !$('#marketplace').hidden) close() })
for (const selector of ['#market-search','#market-category']) $(selector).addEventListener('input', () => {limit=24;render()})
$('#market-more').addEventListener('click', () => {if (!catalog || loadFailed) return load(); limit+=24;render()})
function render() {
  if (!catalog) return
  const query = $('#market-search').value.trim().toLowerCase(), category = $('#market-category').value
  const items = catalog.plugins.filter(p => (!category || category === p.category) && `${p.name} ${p.package || ''} ${p.description}`.toLowerCase().includes(query))
  message(items.length ? '' : 'No plugins found.')
  const list = $('#market-list'), expanded = new Set([...list.querySelectorAll('details[open]')].map(n => n.dataset.id))
  // Keep focus during background installation updates.
  const focused = list.contains(document.activeElement) ? document.activeElement?.dataset.focus : null
  list.replaceChildren()
  for (const p of items.slice(0,limit)) {
    const row = el('details','market-item'); row.dataset.id=p.id; row.open=expanded.has(p.id)
    const summary = el('summary','')
    const icon = el('span','market-icon',p.name.replace(/^dsh[-_]/,'').slice(0,1).toUpperCase()); icon.setAttribute('aria-hidden','true')
    summary.append(icon,el('span','market-name',p.name),el('span','market-state', p.installed ? (p.loaded ? 'Loaded' : p.restartRequired ? 'Restart required' : 'Installed') : p.job?.status === 'installing' ? 'Installing…' : '+'))
    const body = el('div','market-detail'); body.append(el('p','',p.description))
    if (p.package) body.append(el('code','',p.package))
    const actions = el('div','market-row-actions')
    const source = el('a','', 'Source ↗'); source.href=p.url; source.target='_blank'; source.rel='noopener noreferrer'; actions.append(source)
    if (p.package) {
      const button = el('button','install',p.installed ? 'Installed' : p.job?.status === 'installing' ? 'Installing…' : p.job?.status === 'failed' ? 'Retry install' : 'Install')
      button.dataset.focus=`install-${p.id}`
      button.disabled=p.installed || !catalog.installEnabled || catalog.plugins.some(p => p.job?.status === 'installing')
      button.addEventListener('click', async () => {
        button.disabled=true; button.textContent='Installing…'
        try { const job=await request('install',{id:p.id}); p.job=job; await load() }
        catch(error) {message(error.message);button.disabled=false;button.textContent='Retry install'}
      }); actions.append(button)
    }
    body.append(actions)
    body.append(el('p','market-note',p.installed ? (p.loaded ? 'Loaded in Harness. Browser UI plugins appear in the main Harness app.' : p.restartRequired ? 'This bundle has not joined the running profile. Restart to load it.' : 'Installed in this profile. Quick Output is not supported.') : p.package ? (catalog.installEnabled ? 'Installs third-party code into the profile. New bundle layers may need a restart. Quick Output is not supported; build scripts stay disabled.' : 'Installation is unavailable for this profile. Open the source for setup instructions.') : 'Follow the source instructions to install this plugin.'))
    if (p.job?.status==='failed') body.append(el('p','market-error',p.job.error))
    row.append(summary,body); list.append(row)
  }
  $('#market-more').hidden=items.length<=limit; $('#market-more').textContent='Show more'
  if (focused) [...list.querySelectorAll('[data-focus]')].find(n=>n.dataset.focus===focused)?.focus({preventScroll:true})
}
async function restart() {
  if(restarting) return
  restarting=true; restartButton.disabled=true
  const notice=$('#notice')
  notice.hidden=false; notice.textContent='Restarting Harness…'
  try {
    const response=await request('restart',{})
    const deadline=Date.now()+45000
    while(Date.now()<deadline) {
      await new Promise(resolve=>setTimeout(resolve,750))
      try {
        const res=await fetch('/plugin-hub/api/state',{cache:'no-store',signal:AbortSignal.timeout(2000)})
        const state=await res.json()
        if(res.ok && state.pid!==response.pid) {location.reload();return}
      } catch {}
    }
    throw new Error('Harness has not reconnected. Check the launcher terminal, then refresh.')
  } catch(error) {
    notice.hidden=false; notice.textContent=error.message
    restarting=false; restartButton.disabled=!catalog?.restartSupported
  }
}
function renderInstalled() {
  const packages = new Map(catalog.plugins.filter(p=>p.installed).map(p=>[p.package,p]))
  setExternalPlugins([...packages.values()].map(p=>({...p,id:`market:${p.package}`,catalogId:p.id,icon:'module',external:true,registered:p.loaded,restartSupported:catalog.restartSupported})), {
    async change(id,action) {
      const p=[...packages.values()].find(p=>`market:${p.package}`===id)
      try { catalog=await request('market-change',{id:p.id,action});render();renderInstalled() }
      catch(error) { await load();throw error }
    },
    details(id) {$('#market-search').value=id.slice(7);$('#market-category').value='';open()},
    restart,
  })
}
load()

if (new URLSearchParams(location.search).has("marketplace")) open()
