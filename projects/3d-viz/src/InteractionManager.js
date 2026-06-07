import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * InteractionManager
 * ------------------
 * Wraps Three.js OrbitControls and provides a clean API for managing
 * camera behaviours: orbiting, panning, zooming, and target following.
 *
 * The controls always look at the active model – call setTarget() to
 * update the point of interest.
 */
export class InteractionManager {

  /**
   * @param {THREE.Camera}      camera
   * @param {HTMLElement}       domElement  The renderer canvas.
   */
  constructor(camera, domElement) {
    /** @type {OrbitControls} */
    this.controls = new OrbitControls(camera, domElement);

    // ── Behaviour tweaks ──
    this.controls.enableDamping = true;       // smooth, weighted motion
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 22;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 0, 0);

    // Prevent the camera from going below ground level.
    this.controls.maxPolarAngle = Math.PI / 2.05;

    // Store a reference to the camera so other classes can query it.
    this.camera = camera;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Moves the orbit target to a new world-space position.
   * The camera orbits around this point.
   * @param {THREE.Vector3} position
   */
  setTarget(position) {
    this.controls.target.copy(position);
  }

  /**
   * Called every frame from the main render loop.
   * Must be called before rendering so damping is applied.
   */
  update() {
    this.controls.update();
  }

  /**
   * Enables or disables all user interaction with the scene.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.controls.enabled = enabled;
  }

  /**
   * Resets the camera to a default position looking at the origin.
   */
  resetCamera() {
    this.camera.position.set(0, 3, 10);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Cleans up the controls (removes event listeners).
   */
  dispose() {
    this.controls.dispose();
  }
}
