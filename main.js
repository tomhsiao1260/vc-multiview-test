import './style.css'
import * as THREE from 'three'
import Loader from './Loader'
import { ViewMaterial } from './ViewMaterial'
import ViewerCore from './core/ViewerCore'
import { MOUSE, TOUCH } from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let viewer

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Save sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
})

// Scene
const scene = new THREE.Scene()

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.z = 3
scene.add(camera)

const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 'gray' }))
scene.add(ground)
ground.position.set(0, 0, -0.2)

const buffer0 = new THREE.WebGLRenderTarget(500, 500)
const buffer1 = new THREE.WebGLRenderTarget(500, 500)
const buffer2 = new THREE.WebGLRenderTarget(500, 500)
const bufferArray = [ buffer0, buffer1, buffer2 ]

const meshes = [ ground ]

// Renderer
const canvas = document.querySelector('.webgl')
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(sizes.width, sizes.height)
renderer.setClearColor(0, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace

const tick = () => {
  renderer.setRenderTarget(null)
  renderer.render(scene, camera)
}

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target = new THREE.Vector3(0,0,0)
controls.enableDamping = false

controls.addEventListener('change', tick)
controls.screenSpacePanning = true // pan orthogonal to world-space direction camera.up
controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }
controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }

let spacePress = false
window.addEventListener('keydown', (e) => {
  if (e.code == 'Space') { spacePress = true }
})
window.addEventListener('keyup', (e) => {
  if (e.code == 'Space') { spacePress = false }
})

let mousePress = false
window.addEventListener('mousedown', (e) => {
  mousePress = true
})
window.addEventListener('mouseup', (e) => {
  mousePress = false
})

const div = document.createElement('div')
div.style.backgroundColor = 'rgba(0, 0, 0, 0.0)'
// div.style.backgroundColor = 'rgba(255, 0, 0, 1)'
div.style.border = '1px solid white';
div.style.display = 'inline'
div.style.position = 'absolute'
document.body.appendChild(div)

const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
window.addEventListener('mousedown', (event) => {
    mouse.x = event.clientX / sizes.width * 2 - 1
    mouse.y = - (event.clientY / sizes.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects( meshes )
    if (!intersects.length) return
    if (spacePress) {
      const pos = intersects[0].point
      const mm = new ViewMaterial()
      const { mode } = viewer.params
      if (mode === 'segment') { mm.uniforms.uTexture.value = bufferArray[0].texture }
      if (mode === 'volume') { mm.uniforms.uTexture.value = bufferArray[1].texture }
      if (mode === 'volume-segment') { mm.uniforms.uTexture.value = bufferArray[1].texture }
      if (mode === 'layer') { mm.uniforms.uTexture.value = bufferArray[2].texture }
      if (mode === 'grid layer') { mm.uniforms.uTexture.value = bufferArray[2].texture }

      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mm)

      scene.add(plane)
      plane.position.set(pos.x, pos.y, 0)
      plane.userData.mode = mode
      plane.userData.info = { center: plane.position.clone(), w: 1, h: 1 }
      meshes.push(plane)

      tick()
      return
    }
    if (!intersects[0].object.userData.mode) {
      div.style.display = 'none'
      return
    }
})
window.addEventListener('mousemove', (event) => {
  mouse.x = event.clientX / sizes.width * 2 - 1
  mouse.y = - (event.clientY / sizes.height) * 2 + 1

  controls.enablePan = true
  document.body.style.cursor = 'auto'

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects( meshes )
  if (intersects.length && intersects[0].object.userData.mode) {
    controls.enablePan = false
    document.body.style.cursor = 'pointer'

    const { center, w, h } = intersects[0].object.userData.info
    const bl = new THREE.Vector3(center.x - w / 2, center.y - h / 2, 0)
    const tr = new THREE.Vector3(center.x + w / 2, center.y + h / 2, 0)
    // bottom-left (-1, -1) top-right (1, 1)
    const pbl = bl.clone().project(camera)
    const ptr = tr.clone().project(camera)
    div.style.left = `${ (pbl.x + 1) * sizes.width * 0.5 }px`
    div.style.bottom = `${ (pbl.y + 1) * sizes.height * 0.5 }px`
    div.style.width = `${ (ptr.x - pbl.x) * sizes.width * 0.5 }px`
    div.style.height = `${ (ptr.y - pbl.y) * sizes.height * 0.5 }px`
    div.style.display = 'inline'

    if (mousePress) { updateBuffer() }
  }
})

function updateBuffer() {
  const modeOrigin = viewer.params.mode

  viewer.params.mode = 'segment'
  renderer.setRenderTarget(bufferArray[0])
  renderer.clear()
  viewer.render()
  viewer.params.mode = 'volume-segment'
  renderer.setRenderTarget(bufferArray[1])
  renderer.clear()
  viewer.render()
  viewer.params.mode = 'layer'
  renderer.setRenderTarget(bufferArray[2])
  renderer.clear()
  viewer.render()
  renderer.setRenderTarget(null)

  viewer.params.mode = modeOrigin
  tick()
}

init()

async function init() {
  const volumeMeta = await Loader.getVolumeMeta()
  const segmentMeta = await Loader.getSegmentMeta()

  viewer = new ViewerCore({ volumeMeta, segmentMeta, renderer, div })

  viewer.controls.addEventListener('change', () => {
    console.log('render')
    updateBuffer()
  })

  update(viewer)
}

function update(viewer) {
  updateViewer(viewer)
  updateGUI(viewer)
}

async function updateViewer(viewer) {
  const { mode } = viewer.params
  if (mode === 'segment') { await modeA(viewer) }
  if (mode === 'volume') { await modeB(viewer) }
  if (mode === 'volume-segment') { await modeC(viewer) }
  if (mode === 'layer') { await modeC(viewer) }
  if (mode === 'grid layer') { await modeC(viewer) }
}

let gui

function updateGUI(viewer) {
  const { mode } = viewer.params

  if (gui) { gui.destroy() }
  gui = new GUI()
  gui.add(viewer.params, 'mode', ['segment', 'layer', 'grid layer', 'volume', 'volume-segment']).onChange(() => update(viewer))
  gui.add(viewer.params.layers, 'select', viewer.params.layers.options).name('layers').onChange(() => update(viewer))

  if (mode === 'segment') { return }
  if (mode === 'volume') { return }
  if (mode === 'volume-segment') {
    gui.add(viewer.params, 'surface', 0.001, 0.5).onChange(updateBuffer)
  }
  if (mode === 'layer') {
    const id = viewer.params.layers.select
    const clip = viewer.volumeMeta.nrrd[id].clip

    viewer.params.layer = clip.z
    gui.add(viewer.params, 'inverse').onChange(updateBuffer)
    gui.add(viewer.params, 'surface', 0.001, 0.5).onChange(updateBuffer)
    gui.add(viewer.params, 'layer', clip.z, clip.z + clip.d, 1).onChange(updateBuffer)
  }
  if (mode === 'grid layer') {
    gui.add(viewer.params, 'inverse').onChange(updateBuffer)
    gui.add(viewer.params, 'surface', 0.001, 0.5).onChange(updateBuffer)
  }
}

// segment mode
async function modeA(viewer) {
  viewer.clear()
  const segment = viewer.updateSegment()

  await segment.then(() => {
      renderer.setRenderTarget(bufferArray[0])
      renderer.clear()
      viewer.render()
      renderer.setRenderTarget(null)
    })
    .then(() => { console.log(`segment ${viewer.params.layers.select} is loaded`) })
}

// volume mode
async function modeB(viewer) {
  viewer.clear()
  const volume = viewer.updateVolume()

  await volume.then(() => {
      renderer.setRenderTarget(bufferArray[1])
      renderer.clear()
      viewer.render()
      renderer.setRenderTarget(null)
    })
    .then(() => { console.log(`volume ${viewer.params.layers.select} is loaded`) })
}

// should use only one renderer

// volume-segment mode
async function modeC(viewer) {
  viewer.clear()
  const volume = viewer.updateVolume()
  const segment = viewer.updateSegment()

  await Promise.all([volume, segment])
    .then(() => viewer.clipSegment())
    .then(() => viewer.updateSegmentSDF())
    .then(() => {
        renderer.setRenderTarget(bufferArray[2])
        renderer.clear()
        viewer.render()
        renderer.setRenderTarget(null)
    })
    .then(() => { console.log(`volume-segment ${viewer.params.layers.select} is loaded`) })
}

renderer.render(scene, camera)

