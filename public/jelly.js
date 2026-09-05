import * as THREE from './vendor/three.module.js'

const colors = { hello: '#81b4e9', text: '#bc99df', clock: '#e4b36d' }
const reduced = matchMedia('(prefers-reduced-motion: reduce)')

export function createJelly(host, id) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  } catch { return { tilt() {}, reset() {}, dispose() {} } }
  renderer.setSize(160, 160, false)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0xffffff, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.prepend(renderer.domElement)
  host.classList.add('has-webgl')

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 30)
  camera.position.set(0, 0, 3.9)
  const light = new THREE.DirectionalLight(0xffffff, 2.5)
  light.position.set(-3, 5, 6)
  scene.add(light, new THREE.HemisphereLight(0xffffff, 0x9ca9ca, 1.8))
  const fill = new THREE.DirectionalLight(0xffefdc, 2)
  fill.position.set(4, -2, 3)
  scene.add(fill)

  // A small studio environment creates real reflected highlights on the glass.
  const studio = new THREE.Scene()
  studio.background = new THREE.Color('#e6e9f0')
  for (const [x,y,z,w,h,intensity] of [[-3,3,4,3,6,4],[4,1,2,2,5,2],[0,5,-1,5,2,3]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(intensity), side: THREE.DoubleSide }))
    panel.position.set(x,y,z); panel.lookAt(0,0,0); studio.add(panel)
  }
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(studio, .02)
  scene.environment = environment.texture
  pmrem.dispose()
  studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose() })

  const shape = new THREE.Shape()
  const s=.62, r=.19
  shape.moveTo(-s+r,-s)
  shape.lineTo(s-r,-s); shape.quadraticCurveTo(s,-s,s,-s+r)
  shape.lineTo(s,s-r); shape.quadraticCurveTo(s,s,s-r,s)
  shape.lineTo(-s+r,s); shape.quadraticCurveTo(-s,s,-s,s-r)
  shape.lineTo(-s,-s+r); shape.quadraticCurveTo(-s,-s,-s+r,-s)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .19, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: .14, bevelThickness: .14, curveSegments: 18 })
  geometry.center()
  const material = new THREE.MeshPhysicalMaterial({ color: colors[id] || ['#81b4e9','#bc99df','#9ccbb7','#e4b36d'][[...id].reduce((sum,c)=>sum+c.charCodeAt(0),0)%4], transparent: true, opacity: .55, roughness: .17, metalness: .02, clearcoat: 1, clearcoatRoughness: .13, transmission: .15, thickness: .8, ior: 1.38, envMapIntensity: .7 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.set(.13,-.2,-.02)
  scene.add(mesh)
  renderer.render(scene,camera)
  let frame=0, targetX=.13, targetY=-.2, remaining=0
  const animate = () => {
    mesh.rotation.x += (targetX-mesh.rotation.x)*.16
    mesh.rotation.y += (targetY-mesh.rotation.y)*.16
    renderer.render(scene,camera)
    if (--remaining>0 && !document.hidden) frame=requestAnimationFrame(animate)
    else frame=0
  }
  const to = (x,y) => {
    if(reduced.matches) return
    targetX=x; targetY=y; remaining=32
    if(!frame) frame=requestAnimationFrame(animate)
  }
  return {
    tilt(x,y) { to(.13+y*.22,-.2+x*.26) },
    reset() { to(.13,-.2) },
    dispose() { cancelAnimationFrame(frame); geometry.dispose(); material.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove() },
  }
}

const bounces = new WeakMap()

export function bounce(element, mode='land') {
  if(reduced.matches) return
  // Animate scale independently so the Quick Output transform stays intact.
  // Capture before cancelling to keep a retrigger continuous mid-bounce.
  const currentScale=getComputedStyle(element).scale
  const start=currentScale==='none' ? '1' : currentScale
  bounces.get(element)?.cancel()
  const frames=mode==='hover'
    ? [{scale:start,offset:0},{scale:'1.07 .94',offset:.22},{scale:'.97 1.045',offset:.45},{scale:'1.018 .987',offset:.67},{scale:'.995 1.004',offset:.84},{scale:'1',offset:1}]
    : [{scale:start,offset:0},{scale:'.9 1.09',offset:.13},{scale:'1.09 .92',offset:.32},{scale:'.97 1.045',offset:.54},{scale:'1.012 .991',offset:.76},{scale:'1',offset:1}]
  const animation=element.animate(
    frames.map(frame=>({...frame,easing:'cubic-bezier(.4,0,.2,1)'})),
    {duration:mode==='hover'?620:680,fill:'none'},
  )
  bounces.set(element,animation)
  animation.onfinish=()=>{if(bounces.get(element)===animation) bounces.delete(element)}
}
