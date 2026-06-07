import * as THREE from 'three';

/**
 * SceneManager
 * ------------
 * Responsible for creating and managing the Three.js scene, camera,
 * renderer, lights, and environment (grid / fog).
 *
 * All Three.js "global" objects that the other managers need references
 * to are exposed as public properties.
 */
export class SceneManager {

  /**
   * @param {HTMLElement} container  The DOM element the renderer canvas is appended to.
   */
  constructor(container) {
    // ── Scene ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    // Subtle fog helps blend background models into the distance.
    this.scene.fog = new THREE.Fog(0x0a0a0f, 10, 28);

    // ── Camera ──
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50);
    this.camera.position.set(0, 3, 10);

    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // ── Lights ──
    this._setupLights();

    // ── Ground / helpers ──
    this._setupEnvironment();

    // ── Resize ──
    this._onResize = this._onResize.bind(this, container);
    window.addEventListener('resize', this._onResize);
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Creates a simple but effective lighting rig:
   *   • Ambient – fills shadows
   *   • Key     – main directional light (warm-white)
   *   • Rim     – cool coloured back-light for edge definition
   */
  _setupLights() {
    // Soft ambient fills the base level
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    // Main key light from upper-right
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(5, 6, 4);
    this.scene.add(key);

    // Cool rim-light from behind-left for edge definition
    const rim = new THREE.DirectionalLight(0x4488ff, 0.9);
    rim.position.set(-4, 1, -6);
    this.scene.add(rim);

    // A dim fill from below to lift harsh shadows
    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(0, -3, 0);
    this.scene.add(fill);
  }

  /**
   * Adds a subtle grid helper and optionally a ground plane.
   */
  _setupEnvironment() {
    const grid = new THREE.GridHelper(14, 24, 0x2a2a4a, 0x1a1a2a);
    grid.position.y = -2.5;
    this.scene.add(grid);
  }

  /**
   * Handles window resize: updates camera aspect and renderer size.
   */
  _onResize(container) {
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /** Renders a single frame (called from the main loop). */
  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Cleans up the renderer, event listeners, and disposes GPU resources.
   */
  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
