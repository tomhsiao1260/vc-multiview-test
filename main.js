import './style.css'
import * as THREE from 'three'
import Loader from './Loader'
import { ViewMaterial } from './ViewMaterial'
import ViewerCore from './core/ViewerCore'
import { MOUSE, TOUCH } from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

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
camera.position.y = 3
scene.add(camera)

const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 'gray' }))
scene.add(ground)
ground.position.set(0, -0.2, 0)
ground.rotateX(-Math.PI / 2)

// Test
const mm = new ViewMaterial()
const buffer = new THREE.WebGLRenderTarget(200, 200)
mm.uniforms.uTexture.value = buffer.texture
const cube = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mm)
// const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 0.01, 1), new THREE.MeshNormalMaterial())
scene.add(cube)
cube.rotateX(-Math.PI / 2)

const meshes = [ ground, cube ]

// Renderer
const canvas = document.querySelector('.webgl')
const renderer = new THREE.WebGLRenderer({ canvas })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(sizes.width, sizes.height)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target = new THREE.Vector3(0,0,0)
controls.enableDamping = true

controls.screenSpacePanning = false // pan orthogonal to world-space direction camera.up
controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }
controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }

const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
window.addEventListener('mousedown', (event) => {
    mouse.x = event.clientX / sizes.width * 2 - 1
    mouse.y = - (event.clientY / sizes.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects( meshes )
    if (intersects.length) {
        const pos = intersects[0].point
        const cube = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshNormalMaterial())
        scene.add(cube)
        cube.rotateX(-Math.PI / 2)
        cube.position.set(pos.x, 0, pos.z)
    }
})

init()

async function init() {
  const volumeMeta = await Loader.getVolumeMeta()
  const segmentMeta = await Loader.getSegmentMeta()

  const viewer = new ViewerCore({ volumeMeta, segmentMeta })

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
    gui.add(viewer.params, 'surface', 0.001, 0.5).onChange(viewer.render)
  }
  if (mode === 'layer') {
    const id = viewer.params.layers.select
    const clip = viewer.volumeMeta.nrrd[id].clip

    viewer.params.layer = clip.z
    gui.add(viewer.params, 'inverse').onChange(viewer.render)
    gui.add(viewer.params, 'surface', 0.001, 0.5).onChange(viewer.render)
    gui.add(viewer.params, 'layer', clip.z, clip.z + clip.d, 1).onChange(viewer.render)
  }
  if (mode === 'grid layer') {
    gui.add(viewer.params, 'inverse').onChange(viewer.render)
    gui.add(viewer.params, 'surface', 0.001, 0.5).onChange(viewer.render)
  }
}

// segment mode
async function modeA(viewer) {
  viewer.clear()
  const segment = viewer.updateSegment()

  await segment.then(() => viewer.render())
    .then(() => { console.log(`segment ${viewer.params.layers.select} is loaded`) })
}

// volume mode
async function modeB(viewer) {
  viewer.clear()
  const volume = viewer.updateVolume()

  await volume.then(() => viewer.render())
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
        viewer.renderer.setRenderTarget(buffer)
        viewer.renderer.clear()
        viewer.render()
        viewer.renderer.setRenderTarget(null)
        // Tick
        const tick = () =>
        {
            // Update
            // cube.rotation.y += 0.01

            // Controls
            controls.update()

            // Render
            viewer.renderer.render(scene, camera)

            // Keep looping
            window.requestAnimationFrame(tick)
        }
        tick()
    })
    .then(() => { console.log(`volume-segment ${viewer.params.layers.select} is loaded`) })
}
