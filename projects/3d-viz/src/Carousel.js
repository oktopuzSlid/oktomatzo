import * as THREE from 'three';

/**
 * Carousel
 * --------
 * Arranges loaded models in a circular layout (the "carousel") and
 * manages which model is currently "active" (centred, fully visible,
 * and interactive). Inactive models are dimmed and scaled down.
 *
 * Switching the active model triggers a smooth rotational animation
 * of the entire carousel group.
 */
export class Carousel {

  /**
   * @param {Object}   config
   * @param {number}   [config.radius=6]         Radius of the carousel circle.
   * @param {number}   [config.inactiveScale=0.55] Scale multiplier for non-active models.
   * @param {number}   [config.rotationSpeed=0.07] Lerp factor (0–1) per frame.
   */
  constructor(config = {}) {
    this.radius = config.radius ?? 6;
    this.inactiveScale = config.inactiveScale ?? 0.55;
    this.rotationSpeed = config.rotationSpeed ?? 0.07;

    /** @type {import('./ModelLoader.js').ModelItem[]} */
    this.models = [];

    /** The container group rotates to animate model switching. */
    this.group = new THREE.Group();

    // ── Internal animation state ──
    this._currentAngle = 0;
    this._targetAngle = 0;
    this._activeIndex = 0;

    /**
     * Callback invoked whenever the active model changes.
     * Receives the new active ModelItem.
     * @type {function(import('./ModelLoader.js').ModelItem): void|null}
     */
    this.onActiveChange = null;

    // Whenever the carousel group's transform changes we need to
    // recompute world matrices so OrbitControls can track positions.
    this.group.matrixAutoUpdate = true;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Adds a loaded model to the carousel and repositions all models
   * around the circle. The first model added is automatically active.
   * @param {import('./ModelLoader.js').ModelItem} modelItem
   */
  addModel(modelItem) {
    this.models.push(modelItem);
    this.group.add(modelItem.scene);

    // Place each model at its correct angle on the circle.
    this._layoutModels();

    // The carousel layout sets the model's position; store that as the
    // "original" so the GUI's Reset Transform restores the carousel pose.
    modelItem.originalPosition.copy(modelItem.scene.position);

    // First model becomes the active one; dim the rest.
    if (this.models.length === 1) {
      modelItem.isActive = true;
      modelItem.scene.scale.setScalar(1);
    } else {
      modelItem.isActive = false;
      this._setDimmed(modelItem.scene, true);
      modelItem.scene.scale.setScalar(this.inactiveScale);
    }

    // Update the model name display on first addition.
    if (this.models.length === 1) {
      this._updateNameLabel(modelItem);
    }

    console.log(`[Carousel] Added "${modelItem.name}" (total: ${this.models.length})`);
  }

  /**
   * Rotates the carousel so the next model (clockwise) becomes active.
   */
  switchNext() {
    if (this.models.length < 2) return;
    const step = (2 * Math.PI) / this.models.length;
    this._activeIndex = (this._activeIndex + 1) % this.models.length;
    this._targetAngle = this._currentAngle - step;
    this._onActiveChanged();
  }

  /**
   * Rotates the carousel so the previous model (counter-clockwise) becomes active.
   */
  switchPrev() {
    if (this.models.length < 2) return;
    const step = (2 * Math.PI) / this.models.length;
    this._activeIndex = (this._activeIndex - 1 + this.models.length) % this.models.length;
    this._targetAngle = this._currentAngle + step;
    this._onActiveChanged();
  }

  /**
   * Directly switches to a specific model by index.
   * @param {number} index
   */
  switchTo(index) {
    if (index < 0 || index >= this.models.length || index === this._activeIndex) return;
    const diff = index - this._activeIndex;
    const step = (2 * Math.PI) / this.models.length;
    this._activeIndex = index;
    this._targetAngle = this._currentAngle - (diff * step);
    this._onActiveChanged();
  }

  /**
   * Returns the currently active ModelItem (or null if empty).
   * @returns {import('./ModelLoader.js').ModelItem|null}
   */
  getActiveModel() {
    return this.models[this._activeIndex] ?? null;
  }

  /**
   * Returns the index of the currently active model.
   * @returns {number}
   */
  getActiveIndex() {
    return this._activeIndex;
  }

  /**
   * Called every frame from the main render loop.
   * Smoothly interpolates (lerps) the carousel rotation angle towards
   * the target angle, and updates each model's visibility / mixer.
   *
   * @param {number} delta  Seconds elapsed since the last frame.
   */
  update(delta) {
    if (this.models.length === 0) return;

    // ── Smooth rotation ──
    if (Math.abs(this._targetAngle - this._currentAngle) > 0.0005) {
      this._currentAngle += (this._targetAngle - this._currentAngle) * this.rotationSpeed;
    } else {
      this._currentAngle = this._targetAngle;
    }
    this.group.rotation.y = this._currentAngle;

    // ── Update animation mixers ──
    for (const model of this.models) {
      if (model.mixer) {
        model.mixer.update(delta);
      }
    }
  }

  /**
   * Cleans up – removes all models from the group and disposes GPU resources.
   */
  dispose() {
    for (const model of this.models) {
      this.group.remove(model.scene);
      model.scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) m.dispose();
        }
      });
      if (model.mixer) {
        model.mixer.stopAllAction();
      }
    }
    this.models = [];
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Evenly distributes all models around the circle.
   * @private
   */
  _layoutModels() {
    const count = this.models.length;
    if (count === 0) return;
    const angleStep = (2 * Math.PI) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const model = this.models[i];
      model.scene.position.set(
        Math.sin(angle) * this.radius,
        0,
        Math.cos(angle) * this.radius,
      );
    }
  }

  /**
   * Fires the onActiveChange callback and updates dimming + the name label.
   * @private
   */
  _onActiveChanged() {
    // Update active / dimmed state for every model.
    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[i];
      const isActive = (i === this._activeIndex);
      model.isActive = isActive;
      this._setDimmed(model.scene, !isActive);
      model.scene.scale.setScalar(isActive ? 1 : this.inactiveScale);
    }

    const active = this.getActiveModel();
    if (active) {
      this._updateNameLabel(active);
      if (this.onActiveChange) {
        this.onActiveChange(active);
      }
    }
  }

  /**
   * Dims or restores a model's materials.
   * Inactive models are made semi-transparent so they visually recede.
   * @private
   * @param {THREE.Object3D} scene
   * @param {boolean}        dimmed
   */
  _setDimmed(scene, dimmed) {
    scene.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const mat of materials) {
        if (dimmed) {
          // Store the original transparent flag so we can restore it later.
          if (mat.userData._origTransparent === undefined) {
            mat.userData._origTransparent = mat.transparent;
          }
          mat.transparent = true;
          mat.opacity = 0.25;
        } else {
          // Restore the original transparent flag.
          if (mat.userData._origTransparent !== undefined) {
            mat.transparent = mat.userData._origTransparent;
          } else {
            mat.transparent = false;
          }
          mat.opacity = 1.0;
        }
        mat.needsUpdate = true;
      }
    });
  }

  /**
   * Updates the model-name badge in the UI overlay.
   * @private
   * @param {import('./ModelLoader.js').ModelItem} model
   */
  _updateNameLabel(model) {
    const el = document.getElementById('model-name');
    if (el) el.textContent = model.name || 'Untitled';
  }
}
