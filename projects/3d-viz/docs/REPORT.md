# 3D Model Carousel — Technical Report

## 1. Project Overview

This application is an interactive **3D model viewer / carousel** built with
[Three.js](https://threejs.org/) (r170).  It loads multiple 3D models, arranges
them in a circular layout, and lets the user:

- Browse models with **Previous / Next** buttons or keyboard arrows.
- **Orbit, pan, zoom** around the active model via mouse / touch.
- Adjust the active model's **position, rotation, and scale** through a live GUI.
- Manipulate **individual bone rotations** when the model has a skeleton
  (e.g. characters with armatures).
- **Upload** their own `.glb` / `.gltf` files from disk.

The source is structured into **ES6 modules**, each with a single responsibility.
All classes are fully documented with JSDoc-style comments.

---

## 2. Architecture

```
3d-viz/
├── index.html              Entry point — fullscreen canvas, overlay UI, import map
├── main.js                 Bootstrap, CONFIG, render loop, event wiring
├── project.json            Oktomatzo platform metadata (unchanged)
├── src/
│   ├── SceneManager.js     Scene, camera, renderer, lights, fog, grid
│   ├── ModelLoader.js      GLTFLoader + ModelItem wrapper + procedural builder
│   ├── Carousel.js         Circular layout, active/inactive state, smooth rotation
│   ├── InteractionManager.js  OrbitControls wrapper
│   ├── GUIManager.js       lil-gui panel: Transform folder + skeleton delegation
│   └── SkeletonController.js  Per-bone rotation sliders, pose reset, mixer pause
└── docs/
    └── REPORT.md           This document
```

### Data flow

```
main.js CONFIG
    │
    ├── procedural ──→ ModelLoader.createProcedural() ──→ ModelItem
    │
    ├── url ──→ ModelLoader.load() ──[GLTFLoader]──→ ModelItem
    │
    └── file ──→ ModelLoader.loadFromFile() ──→ ModelItem
                         │
                         ▼
                    Carousel.addModel()
                         │
                         ├── Carousel.group (added to Scene)
                         ├── Carousel.onActiveChange
                         │       ├── GUIManager.setActiveModel()
                         │       │       ├── Transform   folder
                         │       │       └── Skeleton    folder (if bones exist)
                         │       └── InteractionManager.setTarget()
                         │
                         └── requestAnimationFrame loop
                                 ├── Carousel.update(delta)
                                 ├── InteractionManager.update()
                                 └── SceneManager.render()
```

---

## 3. Module Descriptions

### 3.1 `SceneManager.js`

| Responsibility | Key API |
|---|---|
| Create the Three.js `Scene`, `PerspectiveCamera`, `WebGLRenderer` | `scene`, `camera`, `renderer` (public) |
| Lighting (ambient + key + rim + fill) | `_setupLights()` |
| Environment (grid helper, fog) | `_setupEnvironment()` |
| Window resize handler | `_onResize(container)` |
| Render one frame | `render()` |

- Uses `ACESFilmicToneMapping` for modern, filmic colour rendering.
- Fog set at `(10, 28)` so background models in the carousel fade into the
  distance, reinforcing depth.

---

### 3.2 `ModelLoader.js`

| Responsibility | Key API |
|---|---|
| Load `.gltf`/`.glb` from a URL | `load(url, name)` → `Promise<ModelItem>` |
| Load from a user-selected File | `loadFromFile(file)` → `Promise<ModelItem>` |
| Generate procedural geometry | `createProcedural(name, color, shape)` → `ModelItem` |
| Normalise model size (largest dim ≈ 2u) | `_normaliseScale(scene)` |
| Extract skeleton bones from SkinnedMesh | `_extractSkeleton(scene)` → `Bone[]` |
| Error fallback (wireframe cube) | `_createFallback(name)` |

Also exports the **`ModelItem`** class, a lightweight wrapper that bundles:

- `name` – human-readable label
- `scene` – the actual `THREE.Group`
- `skeletonBones` – array of `THREE.Bone` (empty if no skeleton)
- `animations` – `AnimationClip[]` from the GLTF
- `mixer` – `AnimationMixer` (null if no animations)
- `originalPosition / Rotation / Scale` – snapshots for "Reset Transform"

---

### 3.3 `Carousel.js`

| Responsibility | Key API |
|---|---|
| Circular layout of models | `addModel(item)`, `_layoutModels()` |
| Active / inactive states | `switchNext()`, `switchPrev()`, `switchTo(index)` |
| Smooth lerp rotation | `update(delta)` |
| Dim inactive models (opacity + scale) | `_setDimmed(scene, bool)` |
| Notify listeners on active change | `onActiveChange` callback |

- Models are placed at equal angular intervals on a circle of `radius`.
- The carousel group rotates around Y; the active model is always at the
  "front" (angle 0 in local space).
- Inactive models are scaled to `inactiveScale` (default 0.55) and their
  materials are set to `opacity: 0.25` so they recede visually.
- The lerp speed (`rotationSpeed`, default 0.07) controls the animation
  smoothness — higher = snappier.

---

### 3.4 `InteractionManager.js`

| Responsibility | Key API |
|---|---|
| OrbitControls setup | `constructor(camera, domElement)` |
| Update orbit target | `setTarget(position)` |
| Enable / disable input | `setEnabled(bool)` |
| Reset camera to default | `resetCamera()` |

- Damping is enabled for a polished, inertia-like feel.
- `maxPolarAngle` is clamped just below horizontal to prevent the camera
  going underground.
- `minDistance` / `maxDistance` keep the user in a comfortable range.

---

### 3.5 `GUIManager.js`

| Responsibility | Key API |
|---|---|
| lil-gui panel lifecycle | `setActiveModel(modelItem)` |
| Transform sliders (pos/rot/scale) | `_buildTransformFolder(model)` |
| Skeleton folder + animation delegation | creates `SkeletonController` with `modelItem.animations` |
| Reset model transform | `_resetTransform()` (GUI button) |
| Reset skeleton pose (external) | `resetSkeletonPose()` |
| Guard against stale controller refs | `_rebuildActiveModel()` fallback |

- When the active model changes, the old **Transform** and **Skeleton**
  folders are destroyed via `.destroy()` and rebuilt from scratch.
- lil-gui controllers are stored so `_resetTransform()` can update the
  displayed slider values with `.setValue()`.
- A guard clause in `_resetTransform()` detects if the controller refs
  went stale (e.g. from a rapid model switch) and falls back to a full
  folder rebuild.
- Position range is clamped to `±8` to prevent models from drifting into
  each other.
- Passes `modelItem.animations` to `SkeletonController` so animation
  playback buttons can be created.

---

### 3.6 `SkeletonController.js`

| Responsibility | Key API |
|---|---|
| Snapshot original bone transforms | `constructor(bones, mixer, folder, animations)` |
| Organise bones by parent/child tree | `_addBoneWithChildren(bone, folder)` — recursive |
| Per-bone rotation sliders | `_addBoneControlsToFolder(bone, folder)` |
| Apply rotation (degrees → radians) | `_applyBoneRotation(bone, state)` |
| Restore default pose | `resetPose()` |
| Pause mixer while posing | `_wasPlaying` / `mixer.timeScale = 0` |
| Animation playback buttons | `_addAnimationControls()` |
| Play specific clip | `_playAnimation(index)` |
| Stop all playback | `_stopAll()` |
| Per-bone rotation sliders | `_addBoneControls(bone)` |
| Apply rotation (degrees → radians) | `_applyBoneRotation(bone, state)` |
| Restore default pose | `resetPose()` |
| Pause mixer while posing | `_wasPlaying` / `mixer.timeScale = 0` |

- Bones are **organised by their parent/child hierarchy** — root bones get
  top-level folders, and descendant bones are nested inside their parent's
  folder.  This mirrors the skeleton structure of the original model.
- Bones ending with `_end` or `_tip` are filtered out as they are usually
  IK/FK helper joints that should not be manually rotated.
- If the model has `AnimationClip` objects, an **"Animations"** section is
  added with one button per clip.  Clicking a button stops any current
  action and plays the selected one.  A "⏹ Stop" button pauses playback.
- The mixer is paused on the first bone adjustment and resumed when
  `resetPose()` is called (if it was playing before the user touched the
  sliders).

---

## 4. Skeleton & Animation Handling

### Detection

After a model is loaded, `ModelLoader._extractSkeleton()` walks the scene
graph looking for `isSkinnedMesh` children.  All bones from every
`SkinnedMesh.skeleton.bones` array are collected into a deduplicated set.

### GUI representation

If `model.skeletonBones.length > 0`, the GUIManager creates a **Skeleton**
folder with one sub-folder per meaningful bone.  Each sub-folder has three
sliders: **Rot X / Y / Z** in degrees (range ±180°).

### Mixer interaction

1. When the model is loaded and animations are found, the **first animation**
   plays automatically via `ModelItem.playFirstAnimation()`.
2. The first time the user adjusts any bone slider, `mixer.timeScale` is set
   to `0` — pausing playback so the manual pose stays visible.
3. Clicking **"↺ Reset Pose"** (either inside the Skeleton folder or via the
   overlay button) restores every bone's original quaternion and, if the
   mixer was playing before posing, sets `timeScale` back to `1`.

This ensures that skeleton manipulation and animation playback coexist
without fighting each other.

---

## 5. File Upload

### UI

An **"⬆ Upload"** button is positioned at the bottom-left corner of the
screen.  Clicking it opens the native file picker, filtered to `.glb` and
`.gltf` extensions.

### Validation

Before loading, the file is checked against two rules defined in CONFIG:

| Rule | Default | Purpose |
|---|---|---|
| Extension whitelist | `.glb`, `.gltf` | Reject unsupported formats (OBJ, STL, FBX, etc.) |
| Max file size | 50 MB | Prevent the browser from running out of memory |

If validation fails, a red error message is shown in the status bar and the
load is aborted.

### Loading flow

1. `URL.createObjectURL(file)` creates a temporary blob URL.
2. `ModelLoader.load(objectURL, name)` processes it identically to a remote
   URL — size normalisation, skeleton extraction, mixer creation, etc.
3. On success, `carousel.addModel(item)` inserts it into the carousel.
4. The carousel immediately switches to the new model so the user can inspect
   it.
5. `URL.revokeObjectURL(url)` releases the blob memory.
6. The **Upload** button is disabled during loading to prevent double-clicks.

### Error recovery

If the file is corrupt or the GLTFLoader rejects it, the error is caught
and displayed in the status bar.  The carousel is left unchanged.

---

## 6. Keyboard & UI Controls

| Control | Action |
|---|---|
| `←` / `→` | Previous / Next model |
| `R` | Reset camera to default position |
| GUI sliders | Adjust transform / bones (mouse drag) |
| GUI "Animations" buttons | Play a specific animation clip |
| GUI "↺ Reset Transform" | Restore model to carousel-placed transform |
| GUI "↺ Reset Pose" | Restore skeleton to original pose |
| **⬆ Upload** button | Load a `.glb` / `.gltf` from disk |

---

## 7. Performance Considerations

- **`renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`** — caps at 2×
  to avoid GPU overload on high-DPI displays.
- **`ACESFilmicToneMapping`** — modern tone‑mapping that looks good without
  heavy post‑processing.
- **Fog** (`THREE.Fog`) — cheap distance‑based fade that eliminates the need
  for expensive culling of background models.
- **Dispose on cleanup** — `Carousel.dispose()` and `SceneManager.dispose()`
  explicitly free geometries, materials, and texture memory.
- **Blob URL revocation** — uploaded file URLs are revoked as soon as the
  model is loaded, preventing memory leaks.
- **`requestAnimationFrame` + `THREE.Clock`** — smooth, vsync‑synced
  animation loop with frame‑rate‑independent delta time.

---

## 8. Extending the Application

### Adding a new model type

Edit the `CONFIG.models` array in `main.js`:

```js
{
  name: 'My Model',
  url: 'https://example.com/model.glb',
}
```

Or for a procedural shape:

```js
{
  name: 'My Shape',
  type: 'procedural',
  shape: 'torus',      // torusKnot | icosahedron | octahedron | torus
  color: 0xff6600,
}
```

### Supporting more file formats

1. Add the format's Three.js loader to the import map / `ModelLoader.js`.
2. Add the extension to `CONFIG.upload.allowedExtensions`.
3. Add a `loadFromFile` branch that uses the correct loader.

### Changing the carousel radius / behaviour

Tweak the `carousel` section of `CONFIG`:

```js
carousel: {
  radius: 8,           // wider circle
  inactiveScale: 0.7,  // less aggressive dimming
  rotationSpeed: 0.12, // snappier rotation
}
```

---

## 9. Dependencies

| Library | Version | CDN | Purpose |
|---|---|---|---|
| Three.js | 0.170.0 | jsdelivr | 3D rendering engine |
| OrbitControls | (bundled) | jsdelivr | Camera orbit / pan / zoom |
| GLTFLoader | (bundled) | jsdelivr | GLTF/GLB model loader |
| lil-gui | 0.19.2 | jsdelivr | On‑screen control panel |

All dependencies are loaded via **import map** — no bundler required.  Serve
the folder with any static HTTP server (`npx serve .`, `python -m http.server`,
etc.).

---

## 10. Known Limitations

- **Skeleton control** is limited to **rotation** sliders.  Position/scale
  are not exposed per bone (most skeletal animation rigs constrain these).
- **Animation blending** is not implemented — when the user adjusts a bone,
  the entire animation is paused.  A future improvement could cross‑fade
  between the animation and the manual pose.
- **Single texture set** — the dimming effect changes `opacity` on all
  materials uniformly.  Models that use alpha‑tested or already‑transparent
  materials may look different when dimmed.
- **CORS** — remote model URLs must have permissive CORS headers.  The
  threejs.org examples server does; custom servers may not.
- **Large files** (>50 MB) — loading very large models may cause a visible
  frame drop.  The current 50 MB limit is conservative.
