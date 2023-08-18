import './style.css'
import * as THREE from 'three'
import { MOUSE, TOUCH } from 'three'
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
const cube = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshNormalMaterial())
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

// Tick
const tick = () =>
{
    // Update
    // cube.rotation.y += 0.01

    // Controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Keep looping
    window.requestAnimationFrame(tick)
}
tick()
