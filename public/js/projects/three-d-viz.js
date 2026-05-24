import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

var container = document.getElementById('three-container')
if (!container) throw new Error('Container not found')

var scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0f)

var camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
camera.position.set(0, 0, 6)

var renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(container.clientWidth, container.clientHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
container.appendChild(renderer.domElement)

var controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minDistance = 2
controls.maxDistance = 20

var ambient = new THREE.AmbientLight(0x404060, 0.6)
scene.add(ambient)
var dirLight = new THREE.DirectionalLight(0xffffff, 2.5)
dirLight.position.set(5, 5, 5)
scene.add(dirLight)
var rimLight = new THREE.DirectionalLight(0x3b82f6, 1.2)
rimLight.position.set(-3, 1, -5)
scene.add(rimLight)

var gridHelper = new THREE.GridHelper(8, 20, 0x3b82f6, 0x1a1a2a)
gridHelper.position.y = -1.8
scene.add(gridHelper)

// Main mesh
var geometry = new THREE.TorusKnotGeometry(1.2, 0.4, 128, 32)
var material = new THREE.MeshStandardMaterial({
  color: 0x3b82f6,
  metalness: 0.3,
  roughness: 0.4,
  wireframe: false,
  emissive: 0x1a3a6a,
  emissiveIntensity: 0.15,
})
var mesh = new THREE.Mesh(geometry, material)
mesh.castShadow = true
scene.add(mesh)

// State
var rotating = true
var loadedModel = null
var currentSceneName = 'Default Knot'

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  if (rotating && !loadedModel) {
    mesh.rotation.x += 0.005
    mesh.rotation.y += 0.01
  }
  controls.update()
  renderer.render(scene, camera)
}
animate()

function onResize() {
  var w = container.clientWidth, h = container.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}
window.addEventListener('resize', onResize)

// Helper: safe addEventListener
function onId(id, fn) {
  var el = document.getElementById(id)
  if (el) el.addEventListener('click', fn)
}

// Wireframe toggle
onId('toggle-wireframe', function () {
  material.wireframe = !material.wireframe
  this.textContent = material.wireframe ? 'Show Solid' : 'Wireframe'
})

// Rotation toggle
onId('toggle-rotation', function () {
  rotating = !rotating
  this.textContent = rotating ? 'Pause' : 'Resume'
})

// Click canvas → random color
renderer.domElement.addEventListener('click', function () {
  var colors = [0x3b82f6, 0x06b6d4, 0x10b981, 0xf59e0b, 0xef4444, 0xec4899]
  material.color.setHex(colors[Math.floor(Math.random() * colors.length)])
})

// ── SAVE SCENE ──
onId('save-scene', async function () {
  var token = localStorage.getItem('token')
  if (!token) { return alert('Log in to save scenes.') }

  var colorHex = '#' + material.color.getHexString()
  var label = prompt('Scene name:', currentSceneName)
  if (!label) return
  currentSceneName = label

  var state = {
    color: colorHex,
    wireframe: material.wireframe,
    rotation: { x: mesh.rotation.x, y: mesh.rotation.y },
    camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
  }

  try {
    await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ project_slug: '3d-viz', label: label, state: state })
    })
    loadSavesList()
  } catch (e) { alert('Save failed.') }
})

// ── LOAD SAVES ──
var savesBar = document.getElementById('saves-bar')
async function loadSavesList() {
  var token = localStorage.getItem('token')
  if (!token || !savesBar) return

  try {
    var res = await fetch('/api/saves/3d-viz', { headers: { 'Authorization': 'Bearer ' + token } })
    var saves = await res.json()
    if (!Array.isArray(saves) || saves.length === 0) { savesBar.style.display = 'none'; return }
    savesBar.style.display = 'flex'
    savesBar.innerHTML = ''

    saves.forEach(function (s) {
      var btn = document.createElement('button')
      btn.className = 'btn btn-outline'
      btn.style.padding = '6px 14px'
      btn.style.fontSize = '0.8rem'
      btn.textContent = s.label || 'Untitled'

      btn.addEventListener('click', function () {
        if (s.state && s.state.color) {
          material.color.set(s.state.color)
          currentSceneName = s.label || ''
        }
        if (s.state && typeof s.state.wireframe === 'boolean') {
          material.wireframe = s.state.wireframe
          document.getElementById('toggle-wireframe').textContent = s.state.wireframe ? 'Show Solid' : 'Wireframe'
        }
        if (s.state && s.state.camera) {
          camera.position.set(s.state.camera.x, s.state.camera.y, s.state.camera.z)
          controls.target.set(0, 0, 0)
        }
      })
      savesBar.appendChild(btn)
    })
  } catch (e) {}
}
loadSavesList()

// ── UPLOAD MODEL ──
var fileInput = document.getElementById('file-input')
onId('upload-model', function () {
  var token = localStorage.getItem('token')
  if (!token) { return alert('Log in to upload models.') }
  if (fileInput) fileInput.click()
})

fileInput.addEventListener('change', async function () {
  var file = fileInput.files[0]
  if (!file) return
  fileInput.value = ''

  var ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!['.glb', '.gltf', '.obj', '.stl'].includes(ext)) {
    return alert('Supported formats: .glb, .gltf, .obj, .stl')
  }

  uploadBtn.textContent = 'Uploading...'
  uploadBtn.disabled = true

  var token = localStorage.getItem('token')
  try {
    var form = new FormData()
    form.append('project_slug', '3d-viz')
    form.append('file', file)

    var res = await fetch('/api/models/upload', {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: form
    })
    var data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Upload failed')

    loadModelIntoScene(data.url, ext)
  } catch (e) { alert('Upload error: ' + e.message) }

  uploadBtn.textContent = 'Upload Model'
  uploadBtn.disabled = false
})

function loadModelIntoScene(url, ext) {
  // Remove previous loaded model
  if (loadedModel) { scene.remove(loadedModel); loadedModel = null }
  mesh.visible = false // hide the default torus knot
  rotating = false
  document.getElementById('toggle-rotation').textContent = 'Resume'

  var loader
  if (ext === '.glb' || ext === '.gltf') {
    loader = new GLTFLoader()
    loader.load(url, function (gltf) {
      loadedModel = gltf.scene
      scene.add(loadedModel)
      var box = new THREE.Box3().setFromObject(loadedModel)
      var center = box.getCenter(new THREE.Vector3())
      var size = box.getSize(new THREE.Vector3())
      var maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 0) {
        var scale = 2.5 / maxDim
        loadedModel.scale.setScalar(scale)
      }
      loadedModel.position.sub(center.clone().multiplyScalar(scale || 1))
      camera.position.set(0, 0, 5)
      controls.target.set(0, 0, 0)
    }, undefined, function (err) { alert('Model load failed'); mesh.visible = true })
  } else if (ext === '.obj') {
    loader = new OBJLoader()
    loader.load(url, function (obj) {
      loadedModel = obj
      scene.add(loadedModel)
      var box = new THREE.Box3().setFromObject(loadedModel)
      var size = box.getSize(new THREE.Vector3())
      var maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 0) { var s = 2.5 / maxDim; loadedModel.scale.setScalar(s) }
      camera.position.set(0, 0, 5)
      controls.target.set(0, 0, 0)
    }, undefined, function () { alert('OBJ load failed'); mesh.visible = true })
  } else if (ext === '.stl') {
    loader = new STLLoader()
    loader.load(url, function (stlGeom) {
      var mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.3, roughness: 0.4 })
      loadedModel = new THREE.Mesh(stlGeom, mat)
      scene.add(loadedModel)
      var box = new THREE.Box3().setFromObject(loadedModel)
      var size = box.getSize(new THREE.Vector3())
      var maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 0) { var s = 2.5 / maxDim; loadedModel.scale.setScalar(s) }
      camera.position.set(0, 0, 5)
      controls.target.set(0, 0, 0)
    }, undefined, function () { alert('STL load failed'); mesh.visible = true })
  }
}
