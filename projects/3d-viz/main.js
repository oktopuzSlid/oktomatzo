import * as THREE from 'three';
import { SceneManager } from './src/SceneManager.js';
import { ModelLoader } from './src/ModelLoader.js';
import { Carousel } from './src/Carousel.js';
import { InteractionManager } from './src/InteractionManager.js';
import { GUIManager } from './src/GUIManager.js';

/* ================================================================== */
/*  CONFIG                                                             */
/*  Central configuration – edit this object to add / remove models    */
/*  and tweak the carousel layout parameters.                          */
/* ================================================================== */

const CONFIG = {
  /**
   * The 3D models to display in the carousel.
   *
   * Three types are supported:
   *   • { name, url }                     – loads a .gltf / .glb from a URL.
   *   • { name, type:'procedural', color } – generates a Three.js geometry
   *                                          (torusKnot / icosahedron / octahedron).
   *
   * Procedural models always load instantly.  URL-based models that fail
   * (server down, CORS, etc.) produce a wireframe fallback cube so the
   * carousel never has empty slots.
   *
   * The "Robot Expressive" model below has a full skeleton + animations.
   * It is served from the Three.js GitHub repo via the jsdelivr CDN.
   * When active, the Skeleton folder appears in the GUI with bones
   * organised by parent hierarchy and buttons to play each animation.
   */
  models: [
    {
      name: 'Damaged Helmet',
      url: 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
    },
    {
      name: 'Robot Expressive',
      url: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/RobotExpressive/glTF/RobotExpressive.gltf',
    },
    {
      name: 'Torus Knot',
      type: 'procedural',
      shape: 'torusKnot',
      color: 0x3b82f6,
    },
    {
      name: 'Icosahedron',
      type: 'procedural',
      shape: 'icosahedron',
      color: 0x10b981,
    },
  ],

  carousel: {
    radius: 6,           // Distance from centre to each model.
    inactiveScale: 0.55, // Scale factor for non-active models.
    rotationSpeed: 0.07, // Lerp speed (0–1) for the switch animation.
  },

  /** File upload settings. */
  upload: {
    maxFileSizeMB: 50,            // Reject files larger than this.
    allowedExtensions: ['.glb', '.gltf'],
  },
};

/* ================================================================== */
/*  BOOTSTRAP                                                          */
/* ================================================================== */

/**
 * Returns the DOM container that the Three.js canvas is appended to.
 * @returns {HTMLElement}
 */
function getContainer() {
  return document.getElementById('canvas-container');
}

// ── 1. Scene & renderer ──
const sceneManager = new SceneManager(getContainer());

// ── 2. Orbit controls ──
const interactionManager = new InteractionManager(
  sceneManager.camera,
  sceneManager.renderer.domElement,
);

// ── 3. Carousel ──
const carousel = new Carousel(CONFIG.carousel);
sceneManager.scene.add(carousel.group);

// ── 4. GUI panel ──
const guiManager = new GUIManager(interactionManager, carousel);

// ── 5. Model loader ──
const modelLoader = new ModelLoader();

/* ================================================================== */
/*  LOAD MODELS                                                        */
/* ================================================================== */

// Build an array of promises – one per model.
// URL-based models are loaded via GLTFLoader.
// Procedural models are generated immediately from geometry primitives.
const loadPromises = CONFIG.models.map((m) => {
  if (m.type === 'procedural') {
    return Promise.resolve(modelLoader.createProcedural(m.name, m.color, m.shape));
  }
  return modelLoader.load(m.url, m.name);
});

Promise.allSettled(loadPromises).then((results) => {
  for (const result of results) {
    if (result.status === 'fulfilled') {
      carousel.addModel(result.value);
    }
  }

  // The first model added is automatically the active one.
  // Populate the GUI and point the camera at it.
  const first = carousel.getActiveModel();
  if (first) {
    const worldPos = new THREE.Vector3();
    first.scene.getWorldPosition(worldPos);
    interactionManager.setTarget(worldPos);
    guiManager.setActiveModel(first);
  }

  setStatus('Ready — use ◀ ▶ or arrow keys to browse');
});

/* ================================================================== */
/*  CAROUSEL CALLBACK                                                  */
/*  When the active model changes, update GUI + camera target.         */
/* ================================================================== */

carousel.onActiveChange = (modelItem) => {
  guiManager.setActiveModel(modelItem);

  const worldPos = new THREE.Vector3();
  modelItem.scene.getWorldPosition(worldPos);
  interactionManager.setTarget(worldPos);
};

/* ================================================================== */
/*  RENDER LOOP                                                        */
/* ================================================================== */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update carousel rotation animation + animation mixers.
  carousel.update(delta);

  // Keep OrbitControls focused on the active model's current world position.
  // This matters during the carousel rotation animation when the model moves.
  const active = carousel.getActiveModel();
  if (active) {
    const worldPos = new THREE.Vector3();
    active.scene.getWorldPosition(worldPos);
    interactionManager.setTarget(worldPos);
  }

  // Update OrbitControls (applies damping).
  interactionManager.update();

  // Render the scene.
  sceneManager.render();
}

animate();

/* ================================================================== */
/*  UI HELPERS                                                         */
/* ================================================================== */

/**
 * Shows a brief status message at the top of the screen.
 * Fades out automatically after a few seconds.
 * @param {string} msg   The message text.
 * @param {boolean} [important=false]  Keep visible longer.
 */
function setStatus(msg, important) {
  const el = document.getElementById('status-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = 1;
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => {
    el.style.opacity = 0;
  }, important ? 6000 : 3000);
}

/**
 * Validates a file against the configured allowed extensions and size limit.
 * Returns an error string, or null if valid.
 * @param {File} file
 * @returns {string|null}
 */
function validateUploadFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!CONFIG.upload.allowedExtensions.includes(ext)) {
    return `Unsupported format "${ext}". Allowed: ${CONFIG.upload.allowedExtensions.join(', ')}`;
  }
  const maxBytes = CONFIG.upload.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: ${CONFIG.upload.maxFileSizeMB} MB`;
  }
  return null;   // valid
}

/* ================================================================== */
/*  FILE UPLOAD                                                        */
/* ================================================================== */

const fileInput   = document.getElementById('file-input');
const uploadBtn   = document.getElementById('btn-upload');

// Clicking the upload button opens the OS file picker.
uploadBtn.addEventListener('click', () => {
  fileInput.click();
});

// When the user selects a file, validate and load it.
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';   // reset so the same file can be re-selected
  if (!file) return;

  // ── Validate ──
  const error = validateUploadFile(file);
  if (error) {
    setStatus('⛔ ' + error, true);
    return;
  }

  // ── Load ──
  setStatus(`⏳ Loading "${file.name}"…`, true);
  uploadBtn.disabled = true;
  uploadBtn.textContent = '⏳ …';

  try {
    const item = await modelLoader.loadFromFile(file);
    carousel.addModel(item);

    // Switch to the newly uploaded model so the user can inspect it.
    const newIndex = carousel.models.length - 1;
    carousel.switchTo(newIndex);

    setStatus(`✅ Loaded "${item.name}" (${item.skeletonBones.length} bones)`);
  } catch (err) {
    console.error('[Upload]', err);
    setStatus(`⛔ Failed to load "${file.name}" – ${err.message}`, true);
  }

  uploadBtn.disabled = false;
  uploadBtn.textContent = '⬆  Upload';
});

/* ================================================================== */
/*  UI EVENT HANDLERS                                                  */
/* ================================================================== */

document.getElementById('btn-prev').addEventListener('click', () => {
  carousel.switchPrev();
});

document.getElementById('btn-next').addEventListener('click', () => {
  carousel.switchNext();
});

document.getElementById('btn-reset-pose').addEventListener('click', () => {
  guiManager.resetSkeletonPose();
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
      carousel.switchPrev();
      break;
    case 'ArrowRight':
      carousel.switchNext();
      break;
    case 'r':
    case 'R':
      interactionManager.resetCamera();
      break;
  }
});

/* ================================================================== */
/*  WINDOW RESIZE                                                      */
/*  Already handled inside SceneManager._onResize.                     */
/* ================================================================== */

console.log('[main] 3D Model Carousel initialised.');
