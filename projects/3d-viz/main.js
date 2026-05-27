import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

// ── Build DOM elements inside #project-root ──
var root = document.getElementById('project-root')
if (!root) {
  root = document.createElement('div')
  root.id = 'project-root'
  root.style.cssText = 'width:100%;max-width:1000px;margin:0 auto;padding:40px 24px;'
  document.body.appendChild(root)
} else {
  root.innerHTML = ''
}

var controlsBar = document.createElement('div')
controlsBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;'

var wfBtn = document.createElement('button')
wfBtn.id = 'toggle-wireframe'
wfBtn.className = 'btn btn-outline'
wfBtn.style.padding = '8px 18px'
wfBtn.textContent = 'Wireframe'

var rotBtn = document.createElement('button')
rotBtn.id = 'toggle-rotation'
rotBtn.className = 'btn btn-outline'
rotBtn.style.padding = '8px 18px'
rotBtn.textContent = 'Pause'

var saveBtn = document.createElement('button')
saveBtn.id = 'save-scene'
saveBtn.className = 'btn btn-outline'
saveBtn.style.padding = '8px 18px'
saveBtn.textContent = 'Save Scene'

var uploadBtn = document.createElement('button')
uploadBtn.id = 'upload-model'
uploadBtn.className = 'btn btn-outline'
uploadBtn.style.padding = '8px 18px'
uploadBtn.textContent = 'Upload Model'

var fileInput = document.createElement('input')
fileInput.id = 'file-input'
fileInput.type = 'file'
fileInput.accept = '.glb,.gltf,.obj,.stl'
fileInput.style.display = 'none'

controlsBar.appendChild(wfBtn)
controlsBar.appendChild(rotBtn)
controlsBar.appendChild(saveBtn)
controlsBar.appendChild(uploadBtn)
controlsBar.appendChild(fileInput)

var savesBar = document.createElement('div')
savesBar.id = 'saves-bar'
savesBar.style.cssText = 'display:none;margin-bottom:12px;gap:8px;flex-wrap:wrap;'

var container = document.createElement('div')
container.id = 'three-container'
container.style.cssText = 'width:100%;height:480px;border-radius:12px;overflow:hidden;border:1px solid rgba(59,130,246,0.15);'

root.appendChild(controlsBar)
root.appendChild(savesBar)
root.appendChild(container)

// ── Three.js scene setup ──
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

var rotating = true
var loadedModel = null
var currentSceneName = 'Default Knot'

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

// ── Wireframe toggle ──
wfBtn.addEventListener('click', function () {
  material.wireframe = !material.wireframe
  this.textContent = material.wireframe ? 'Show Solid' : 'Wireframe'
})

// ── Rotation toggle ──
rotBtn.addEventListener('click', function () {
  rotating = !rotating
  this.textContent = rotating ? 'Pause' : 'Resume'
})

// ── Click canvas → random color ──
renderer.domElement.addEventListener('click', function () {
  var colors = [0x3b82f6, 0x06b6d4, 0x10b981, 0xf59e0b, 0xef4444, 0xec4899]
  material.color.setHex(colors[Math.floor(Math.random() * colors.length)])
})

// ── SAVE SCENE ──
saveBtn.addEventListener('click', async function () {
  var p = window.Platform
  if (!p || !p.auth.isLoggedIn()) { return alert('Log in to save scenes.') }

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
    await p.saves.save('3d-viz', label, state)
    loadSavesList()
  } catch (e) { alert('Save failed.') }
})

// ── LOAD SAVES ──
async function loadSavesList() {
  var p = window.Platform
  if (!p || !p.auth.isLoggedIn() || !savesBar) return

  try {
    var saves = await p.saves.load('3d-viz')
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
          wfBtn.textContent = s.state.wireframe ? 'Show Solid' : 'Wireframe'
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
uploadBtn.addEventListener('click', function () {
  var p = window.Platform
  if (!p || !p.auth.isLoggedIn()) { return alert('Log in to upload models.') }
  fileInput.click()
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

  var p = window.Platform
  try {
    var data = await p.models.upload('3d-viz', file)
    loadModelIntoScene(data.url, ext)
  } catch (e) { alert('Upload error: ' + e.message) }

  uploadBtn.textContent = 'Upload Model'
  uploadBtn.disabled = false
})

function loadModelIntoScene(url, ext) {
  if (loadedModel) { scene.remove(loadedModel); loadedModel = null }
  mesh.visible = false
  rotating = false
  rotBtn.textContent = 'Resume'

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
        loadedModel.position.sub(center.clone().multiplyScalar(scale))
      }
      camera.position.set(0, 0, 5)
      controls.target.set(0, 0, 0)
    }, undefined, function () { alert('Model load failed'); mesh.visible = true })
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
