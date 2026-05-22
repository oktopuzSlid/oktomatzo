import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const container = document.getElementById('three-container')
if (!container) throw new Error('Container not found')

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0f)

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  100
)
camera.position.set(0, 0, 6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(container.clientWidth, container.clientHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
container.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

const rimLight = new THREE.DirectionalLight(0x8b5cf6, 1)
rimLight.position.set(-3, 1, -5)
scene.add(rimLight)

const geometry = new THREE.TorusKnotGeometry(1.2, 0.4, 128, 32)

const material = new THREE.MeshStandardMaterial({
  color: 0x8b5cf6,
  metalness: 0.3,
  roughness: 0.4,
  wireframe: false,
  emissive: 0x2d1b69,
  emissiveIntensity: 0.15,
})

const mesh = new THREE.Mesh(geometry, material)
mesh.castShadow = true
scene.add(mesh)

const gridHelper = new THREE.GridHelper(8, 20, 0x8b5cf6, 0x27272a)
gridHelper.position.y = -1.8
scene.add(gridHelper)

let rotating = true

function animate() {
  requestAnimationFrame(animate)

  if (rotating) {
    mesh.rotation.x += 0.005
    mesh.rotation.y += 0.01
  }

  controls.update()
  renderer.render(scene, camera)
}
animate()

function onResize() {
  const width = container.clientWidth
  const height = container.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
window.addEventListener('resize', onResize)

document.getElementById('toggle-wireframe').addEventListener('click', function () {
  material.wireframe = !material.wireframe
  this.textContent = material.wireframe ? 'Show Solid' : 'Toggle Wireframe'
})

document.getElementById('toggle-rotation').addEventListener('click', function () {
  rotating = !rotating
  this.textContent = rotating ? 'Pause Rotation' : 'Resume Rotation'
})

renderer.domElement.addEventListener('click', function () {
  const colors = [0x8b5cf6, 0x06b6d4, 0x10b981, 0xf59e0b, 0xef4444, 0xec4899]
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  material.color.setHex(randomColor)
})
