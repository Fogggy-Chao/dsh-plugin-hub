window.__ModuleLoader__.load({id:'dsh-plugin-hub',factory:require=>{
  const React=require('react'), h=React.createElement
  const {useState,useEffect,useLayoutEffect,useRef}=React
  const glyphs={wave:'M8 12V5a1.5 1.5 0 0 1 3 0v6V3a1.5 1.5 0 0 1 3 0v8V5a1.5 1.5 0 0 1 3 0v7V9a1.5 1.5 0 0 1 3 0v6c0 5-3 7-7 7-2 0-4-1-5-3l-4-6c-1-2 1-3 2-2l2 2',text:'M5 5h14M12 5v14M8 19h8M5 8V5m14 3V5',clock:'M12 7v5l3 2',module:'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM17 14v6m-3-3h6'}
  const svg=(name)=>h('svg',{viewBox:'0 0 24 24','aria-hidden':true},name==='clock'?h('circle',{cx:12,cy:12,r:8}):null,h('path',{d:glyphs[name]||glyphs.module}))
  let jellyModule
  const jellyReady=import('/plugin-hub/jelly.js').then(module=>{jellyModule=module;return module})
  async function api(path,data) {
    const res=await fetch('/plugin-hub/api/'+path,data?{method:'POST',headers:{'Content-Type':'application/json','X-Plugin-Hub':'1'},body:JSON.stringify(data)}:{cache:'no-store'})
    const value=await res.json();if(!res.ok)throw new Error(value.error||'Plugin Hub is unavailable.');return value
  }
  function Icon({plugin,onClick,pending,expanded,onPointerDown}) {
    const ref=useRef(null),jelly=useRef(null)
    useEffect(()=>{let alive=true;jellyReady.then(module=>{if(alive)jelly.current=module.createJelly(ref.current,plugin.key)}).catch(()=>{});return()=>{alive=false;jelly.current?.dispose()}},[plugin.key])
    useEffect(()=>{if(expanded)jellyReady.then(module=>{if(ref.current)module.bounce(ref.current,'land')}).catch(()=>{})},[expanded])
    return h('button',{className:'hub-rail-icon',type:'button','data-equipped':plugin.registered||undefined,'aria-label':`${plugin.name}, ${plugin.registered?'equipped':'available'}`,'aria-busy':pending||undefined,'aria-haspopup':'dialog',title:plugin.name,tabIndex:expanded?0:-1,disabled:pending,onClick,onPointerDown,onPointerEnter:()=>jellyModule?.bounce(ref.current,'hover'),onPointerMove:event=>{const r=ref.current.getBoundingClientRect();jelly.current?.tilt((event.clientX-r.left)/r.width-.5,(event.clientY-r.top)/r.height-.5)},onPointerLeave:()=>jelly.current?.reset()},h('span',{ref,className:'hub-rail-art'},h('span',{className:'hub-rail-fallback'}),h('span',{className:'hub-rail-glyph'},svg(plugin.icon))),h('span',{className:'hub-rail-dot','aria-hidden':true}))
  }
  function Rail() {
    const host=useRef(null),menu=useRef(null),buttons=useRef(null),busyRef=useRef(false),generation=useRef(0),collapseTimer=useRef(null),drag=useRef(null),suppressClick=useRef(0)
    const [expanded,setExpanded]=useState(false),[dragPoint,setDragPoint]=useState(null),[dropZone,setDropZone]=useState(null)
    const [plugins,setPlugins]=useState([]),[selected,setSelected]=useState(null),[pending,setPending]=useState(null),[error,setError]=useState(''),[left,setLeft]=useState(56),[menuTop,setMenuTop]=useState(80)
    const refresh=async()=>{
      const version=generation.current
      const [state,market]=await Promise.all([api('state'),api('marketplace')])
      if(version!==generation.current||busyRef.current)return
      const external=new Map(market.plugins.filter(p=>p.installed).map(p=>[p.package,{...p,key:'market:'+p.package,external:true,registered:p.loaded,icon:'module'}]))
      setPlugins([...state.plugins.map(p=>({...p,key:p.id,manageable:true})),...external.values()])
    }
    useEffect(()=>{let alive=true;const update=()=>{if(alive&&!document.hidden&&!busyRef.current)refresh().catch(e=>alive&&setError(e.message))};update();const timer=setInterval(update,3000);return()=>{alive=false;clearInterval(timer);generation.current++}},[])
    useLayoutEffect(()=>{
      const frame=host.current.closest('[data-shell-overlay]')?.parentElement
      if(!frame)return
      const sidebar=frame.firstElementChild,center=sidebar.nextElementSibling
      center.setAttribute('data-hub-rail-offset','')
      const position=()=>setLeft(sidebar.getBoundingClientRect().right-frame.getBoundingClientRect().left)
      position();const observer=new ResizeObserver(position);observer.observe(sidebar);observer.observe(frame)
      return()=>{observer.disconnect();center.removeAttribute('data-hub-rail-offset')}
    },[])
    useEffect(()=>{
      if(!selected)return
      menu.current?.querySelector('button:not(:disabled),a')?.focus()
      const dismiss=event=>{if(event.type==='keydown'&&event.key!=='Escape')return;if(event.type==='pointerdown'&&host.current?.contains(event.target))return;setSelected(null);if(event.type==='keydown')buttons.current?.querySelector(`[data-key="${CSS.escape(selected)}"] button`)?.focus()}
      document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',dismiss)
      return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',dismiss)}
    },[selected])
    const change=async (p,equip=!p.registered)=>{
      if(busyRef.current)return
      if(equip===p.registered)return
      const action=equip?'equip':'unequip';busyRef.current=true;generation.current++;setPending(p.key);setError('');setSelected(null);setPlugins(items=>items.map(item=>item.key===p.key?{...item,registered:equip}:item))
      let failure
      try {await api(p.external?'market-change':'change',{id:p.id,action});setSelected(null)}
      catch(e){failure=e.message;setPlugins(items=>items.map(item=>item.key===p.key?{...item,registered:p.registered}:item))}
      finally {busyRef.current=false;setPending(null);await refresh().catch(e=>{failure=e.message});if(failure)setError(failure);buttons.current?.querySelector(`[data-key="${CSS.escape(p.key)}"] button`)?.focus()}
    }
    const reveal=()=>{clearTimeout(collapseTimer.current);setExpanded(true)}
    const collapse=()=>{clearTimeout(collapseTimer.current);setSelected(null);setExpanded(false)}
    useEffect(()=>()=>clearTimeout(collapseTimer.current),[])
    useEffect(()=>{
      if(!expanded)return
      const dismiss=e=>{if(!host.current?.contains(e.target))collapse()}
      document.addEventListener('pointerdown',dismiss)
      return()=>document.removeEventListener('pointerdown',dismiss)
    },[expanded])
    const chosen=plugins.find(p=>p.key===selected)
    const equipped=plugins.filter(p=>p.registered),available=plugins.filter(p=>!p.registered)
    const topHeight=Math.max(1,equipped.length)*104+38
    const bottomY=topHeight+18,bottomHeight=Math.max(1,available.length)*104+38
    const contentHeight=bottomY+bottomHeight
    const positions=new Map([...equipped.map((p,i)=>[p.key,{x:14,y:32+i*104}]),...available.map((p,i)=>[p.key,{x:14,y:bottomY+32+i*104}])])
    const beginDrag=(event,p)=>{
      if(!expanded||busyRef.current||!p.manageable||event.button!==0)return
      const rect=event.currentTarget.getBoundingClientRect()
      drag.current={plugin:p,startX:event.clientX,startY:event.clientY,grabX:event.clientX-rect.left,grabY:event.clientY-rect.top,active:false,button:event.currentTarget}
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const moveDrag=event=>{
      const current=drag.current;if(!current)return
      if(!current.active&&Math.hypot(event.clientX-current.startX,event.clientY-current.startY)<5)return
      current.active=true;setSelected(null);clearTimeout(collapseTimer.current)
      const scroll=host.current.querySelector('.hub-rail-scroll'),bounds=scroll.getBoundingClientRect()
      if(event.clientY<bounds.top+35)scroll.scrollTop-=14
      else if(event.clientY>bounds.bottom-35)scroll.scrollTop+=14
      const rect=buttons.current.getBoundingClientRect()
      setDragPoint({key:current.plugin.key,x:event.clientX-rect.left-current.grabX,y:event.clientY-rect.top-current.grabY})
      const target=[...host.current.querySelectorAll('.hub-rail-zone')].find(zone=>{const r=zone.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=Math.max(r.top,bounds.top)&&event.clientY<=Math.min(r.bottom,bounds.bottom)})
      setDropZone(target?.dataset.zone||null)
      event.preventDefault()
    }
    const finishDrag=(event,cancel=false)=>{
      const current=drag.current;if(!current)return
      drag.current=null
      if(current.button.hasPointerCapture(event.pointerId))current.button.releasePointerCapture(event.pointerId)
      setDragPoint(null);setDropZone(null)
      if(!current.active)return
      suppressClick.current=Date.now()+400
      if(!cancel){
        const bounds=host.current.querySelector('.hub-rail-scroll').getBoundingClientRect()
        const target=[...host.current.querySelectorAll('.hub-rail-zone')].find(zone=>{const r=zone.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=Math.max(r.top,bounds.top)&&event.clientY<=Math.min(r.bottom,bounds.bottom)})
        if(target)change(current.plugin,target.dataset.zone==='Equipped')
      }
      jellyModule?.bounce(current.button.querySelector('.hub-rail-art'),'land')
    }
    return h('div',{ref:host,id:'hub-sidebar-extension','data-expanded':expanded||undefined,'data-dragging':dragPoint?true:undefined,style:{left:expanded?Math.min(left,Math.max(8,innerWidth-154)):left},onPointerMove:moveDrag,onPointerUp:event=>finishDrag(event),onPointerCancel:event=>finishDrag(event,true),onLostPointerCapture:event=>finishDrag(event,true),onPointerEnter:e=>{if(e.pointerType!=='touch')reveal()},onPointerLeave:()=>{collapseTimer.current=setTimeout(()=>{if(!drag.current&&!selected&&!busyRef.current&&!host.current?.contains(document.activeElement))setExpanded(false)},380)},onKeyDown:e=>{if(e.key==='Escape'&&drag.current){const current=drag.current;drag.current=null;setDragPoint(null);setDropZone(null);suppressClick.current=Date.now()+400;return}if(e.key==='Escape'&&!selected){collapse();host.current?.querySelector('.hub-stack-trigger')?.focus()}},onBlur:e=>{if(!drag.current&&!busyRef.current&&!e.currentTarget.contains(e.relatedTarget)&&!e.currentTarget.matches(':hover'))collapse()}},
      h('nav',{id:'hub-rail','aria-label':'Plugin Hub'},
        h('div',{className:'hub-rail-heading','aria-hidden':!expanded},h('a',{href:'/plugin-hub',tabIndex:expanded?0:-1},'Plugin Hub',svg('module')),h('button',{type:'button','aria-label':'Collapse plugins',tabIndex:expanded?0:-1,onClick:collapse},'×')),
        h('div',{className:'hub-rail-scroll',style:{height:expanded?contentHeight:Math.min(plugins.length,7)*15+108}},
          h('div',{ref:buttons,className:'hub-rail-list',style:{height:contentHeight}},
            ...[{name:'Equipped',top:0,height:topHeight,empty:!equipped.length},{name:'Available',top:bottomY,height:bottomHeight,empty:!available.length}].map(zone=>h('section',{key:zone.name,className:'hub-rail-zone','data-zone':zone.name,'data-drop':dropZone===zone.name||undefined,'aria-label':zone.name+' Plugins','aria-hidden':!expanded,style:{top:zone.top,height:zone.height}},h('h2',null,zone.name),zone.empty?h('span',{className:'hub-zone-empty'},'—'):null)),
            ...plugins.map((p,i)=>{const pos=positions.get(p.key);return h('div',{key:p.key,'data-key':p.key,className:'hub-rail-card','data-dragged':dragPoint?.key===p.key||undefined,'aria-hidden':!expanded,style:{'--stack-color':['#dce7ee','#e8e0ee','#ece6d1','#e0e8dc'][i%4],transform:dragPoint?.key===p.key?`translate(${dragPoint.x}px,${dragPoint.y}px) rotate(4deg) scale(1.05)`:expanded?`translate(${pos.x}px,${pos.y}px) rotate(0deg)`:`translate(${-52+(i%3)*5}px,${Math.min(i,7)*13}px) rotate(${[-8,5,-3,8,-5][i%5]}deg)`,zIndex:dragPoint?.key===p.key?20:expanded?2:plugins.length-i,transitionDelay:pending||dragPoint?'0ms':expanded?Math.min(i*38,190)+'ms':'0ms'}},h(Icon,{plugin:p,expanded,pending:pending!==null,onPointerDown:event=>beginDrag(event,p),onClick:()=>{if(Date.now()<suppressClick.current)return;setSelected(selected===p.key?null:p.key);setMenuTop(Math.min(pos.y+74,contentHeight-100))}}))}))),
        h('button',{className:'hub-stack-trigger',type:'button','aria-label':'Expand plugins','aria-expanded':expanded,tabIndex:expanded?-1:0,onClick:()=>{reveal();requestAnimationFrame(()=>host.current?.querySelector('.hub-rail-heading a')?.focus())}}),
        h('a',{className:'hub-market-entry',href:'/plugin-hub?marketplace=1',tabIndex:expanded?0:-1,'aria-hidden':!expanded},'Awesome Plugins',h('span',{'aria-hidden':true},'↗')),
        error?h('p',{className:'hub-rail-status',role:'status'},error):null),
      chosen&&expanded?h('section',{ref:menu,className:'hub-rail-menu',role:'dialog','aria-label':chosen.name,style:{top:Math.min(menuTop+50,innerHeight-240)}},h('div',{className:'hub-rail-menu-head'},h('strong',null,chosen.name),h('button',{type:'button','aria-label':'Close plugin actions',onClick:()=>{setSelected(null);buttons.current?.querySelector(`[data-key="${CSS.escape(chosen.key)}"] button`)?.focus()}},'×')),chosen.manageable?h('button',{className:'hub-rail-toggle',disabled:pending!==null,onClick:()=>change(chosen)},pending?'Working…':chosen.registered?'Unload':'Equip'):h('p',null,chosen.restartRequired?'Restart Harness to load this bundle.':'No controllable runtime entry.'),h('a',{href:'/plugin-hub'},'Open in Hub ↗'),error?h('p',{role:'alert'},error):null):null)

  }
  return {inject:['slots'],apply(ctx){ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:'plugin-hub-rail',order:20},Rail))}}
}})
