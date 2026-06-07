import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ================================================================== */
/*  ModelItem                                                         */
/*  A lightweight data wrapper that bundles a loaded 3D model with    */
/*  its metadata (skeleton bones, animations, animation mixer, and    */
/*  the original transform for reset).                                */
/* ================================================================== */

export class ModelItem {

  /**
   * @param {string}           name          Human-readable label.
   * @param {THREE.Group}      scene         The model's root group.
   * @param {THREE.Bone[]}     skeletonBones Array of bones (empty if none).
   * @param {THREE.AnimationClip[]} animations Animation clips from the GLTF.
   * @param {THREE.AnimationMixer|null} mixer  Mixer if animations exist.
   */
  constructor(name, scene, skeletonBones, animations, mixer) {
    this.name = name;
    this.scene = scene;
    this.skeletonBones = skeletonBones || [];
    this.animations = animations || [];
    this.mixer = mixer || null;

    // Whether this model is currently the carousel "active" one.
    this.isActive = false;

    // Snapshot of the original transform so we can restore later.
    this.originalPosition = scene.position.clone();
    this.originalRotation = scene.rotation.clone();
    this.originalScale = scene.scale.clone();
  }

  /**
   * Plays the first animation clip (if any) on the mixer.
   * Each subsequent call restarts from the beginning.
   */
  playFirstAnimation() {
    if (this.mixer && this.animations.length > 0) {
      // Stop any existing action first.
      this.mixer.stopAllAction();
      const action = this.mixer.clipAction(this.animations[0]);
      action.reset().play();
    }
  }
}

/* ================================================================== */
/*  ModelLoader                                                       */
/*  Loads GLTF/GLB models asynchronously via the Three.js GLTFLoader.  *
/*  On failure it returns a fallback wireframe cube so the carousel    *
/*  is never missing a slot.                                          */
/* ================================================================== */

export class ModelLoader {

  constructor() {
    /** @private @type {GLTFLoader} */
    this._loader = new GLTFLoader();
  }

  /**
   * Loads a model from the given URL and wraps it in a ModelItem.
   *
   * @param {string} url   The .gltf / .glb URL.
   * @param {string} name  Human-readable label.
   * @returns {Promise<ModelItem>}
   */
  load(url, name) {
    return new Promise((resolve) => {
      this._loader.load(

        url,

        // ── Success callback ──
        (gltf) => {
          const scene = gltf.scene;

          // Normalise size: scale the model so its largest dimension ≈ 2 units.
          this._normaliseScale(scene);

          // Check for a skinned mesh (skeleton) in the loaded model.
          const bones = this._extractSkeleton(scene);

          // Extract animation clips and set up a mixer if animations exist.
          const animations = gltf.animations || [];
          let mixer = null;
          if (animations.length > 0) {
            mixer = new THREE.AnimationMixer(scene);
          }

          const item = new ModelItem(name, scene, bones, animations, mixer);

          // Auto-play the first animation if available.
          item.playFirstAnimation();

          console.log(`[ModelLoader] Loaded "${name}" (${bones.length} bones, ${animations.length} animations)`);
          resolve(item);
        },

        // ── Progress callback (optional) ──
        undefined,

        // ── Error callback → fallback ──
        (err) => {
          console.warn(`[ModelLoader] Failed to load "${name}" – using fallback cube.`, err);
          resolve(this._createFallback(name));
        }
      );
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Scales the model so that its bounding-box diagonal fits ≈ 2 units.
   * This keeps all models roughly the same size regardless of source scale.
   * @private
   * @param {THREE.Group} scene
   */
  _normaliseScale(scene) {
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim < 0.001) return;

    const target = 2.0;
    const scale = target / maxDim;
    scene.scale.setScalar(scale);

    // Centre the model's geometry (shift pivot so bounding-box centre is at origin).
    const centre = box.getCenter(new THREE.Vector3());
    scene.position.sub(centre.clone().multiplyScalar(scale));
  }

  /**
   * Walks the model's scene tree and collects all bones belonging to
   * any SkinnedMesh. Returns an empty array if no skeleton is present.
   * @private
   * @param {THREE.Group} scene
   * @returns {THREE.Bone[]}
   */
  _extractSkeleton(scene) {
    const boneSet = new Set();

    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.skeleton) {
        for (const bone of child.skeleton.bones) {
          boneSet.add(bone);
        }
      }
    });

    return [...boneSet];
  }

  /**
   * loadFromFile
   * ------------
   * Loads a model from a local File object (obtained via an <input type='file'>).
   * Creates a temporary object URL, delegates to load(), then revokes the URL
   * so memory is not leaked.
   *
   * Usage:
   *   const item = await modelLoader.loadFromFile(file);
   *   carousel.addModel(item);
   *
   * @param {File} file  A .glb or .gltf File from the user's machine.
   * @returns {Promise<ModelItem>}
   */
  loadFromFile(file) {
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, '');   // strip extension

    return this.load(url, name).finally(() => {
      // Revoke the blob URL so the browser can free the memory.
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Creates a simple wireframe cube as a visual fallback when a model
   * fails to load. The cube is wrapped in the same ModelItem interface
   * so the rest of the application does not need special-case handling.
   * @private
   * @param {string} name
   * @returns {ModelItem}
   */
  _createFallback(name) {
    const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff6644,
      wireframe: true,
      emissive: 0xff4422,
      emissiveIntensity: 0.15,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const group = new THREE.Group();
    group.add(mesh);

    // Tag the fallback so we know it's a placeholder.
    group.userData.isFallback = true;

    return new ModelItem(name, group, [], [], null);
  }

  /**
   * createProcedural
   * ----------------
   * Generates a nice-looking ModelItem from a basic Three.js geometry
   * primitive. Used for carousel slots that don't have a URL model,
   * so every slot shows something visually interesting rather than a
   * plain fallback cube.
   *
   * Supported shapes: 'torusKnot', 'icosahedron', 'octahedron', 'torus'.
   *
   * @param {string} name         Display label.
   * @param {number} color        Hex colour for the material.
   * @param {string} [shape='torusKnot']  Geometry type.
   * @returns {ModelItem}
   */
  createProcedural(name, color, shape) {
    let geometry;

    switch (shape) {
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(1.0, 0);
        break;
      case 'octahedron':
        geometry = new THREE.OctahedronGeometry(1.0, 0);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(0.8, 0.3, 24, 48);
        break;
      case 'torusKnot':
      default:
        geometry = new THREE.TorusKnotGeometry(0.9, 0.3, 128, 32);
        break;
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.35,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.08,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const group = new THREE.Group();
    group.add(mesh);

    return new ModelItem(name, group, [], [], null);
  }
}
