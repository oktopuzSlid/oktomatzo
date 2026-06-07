import * as THREE from 'three';
import GUI from 'lil-gui';
import { SkeletonController } from './SkeletonController.js';

/**
 * GUIManager
 * ----------
 * Creates and manages the lil-gui control panel on the right side of
 * the screen. When the active model changes, the entire GUI is rebuilt
 * to reflect the new model's transform values and (if applicable) its
 * skeleton bones and animation clips.
 *
 * Folders:
 *   • Transform  – position (clamped ±8) / rotation (degrees) / scale sliders
 *                  + "Reset Transform" button
 *   • Skeleton   – only present when the model has a skinned mesh; bones are
 *                  organised by parent/child hierarchy, plus animation buttons
 */
export class GUIManager {

  /**
   * @param {import('./InteractionManager.js').InteractionManager} interactionManager
   * @param {import('./Carousel.js').Carousel} carousel
   */
  constructor(interactionManager, carousel) {
    /** @private */
    this._interaction = interactionManager;
    this._carousel = carousel;

    /** @private @type {GUI|null} */
    this._gui = null;

    /** @private @type {Object|null} */
    this._transformFolder = null;

    /** @private @type {Object|null} */
    this._skeletonFolder = null;

    /** @private @type {SkeletonController|null} */
    this._skeletonCtrl = null;

    /**
     * The currently active model – used by _resetTransform().
     * @private @type {import('./ModelLoader.js').ModelItem|null}
     */
    this._currentModel = null;

    /**
     * lil-gui binds to plain JS objects. We keep a reference to those
     * objects so we can mutate them and update the controllers.
     * @private
     */
    this._state = { pos: null, rot: null, scl: null };

    /**
     * Direct references to the individual lil-gui controllers so we
     * can call .setValue() after a programmatic transform reset.
     * @private
     */
    this._ctrls = { pX: null, pY: null, pZ: null, rX: null, rY: null, rZ: null, sX: null, sY: null, sZ: null };

    // Build the initial (empty) GUI panel.
    this._createGUI();
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Rebuilds the control panel to match the given model.
   * Called every time the carousel switches to a new active model.
   *
   * @param {import('./ModelLoader.js').ModelItem} modelItem
   */
  setActiveModel(modelItem) {
    this._currentModel = modelItem;
    this._clearGUI();
    this._buildTransformFolder(modelItem);

    if (modelItem.skeletonBones && modelItem.skeletonBones.length > 0) {
      this._skeletonFolder = this._gui.addFolder('Skeleton');
      this._skeletonCtrl = new SkeletonController(
        modelItem.skeletonBones,
        modelItem.mixer,
        this._skeletonFolder,
        modelItem.animations,            // pass animation clips for playback UI
      );
    }
  }

  /**
   * Resets the skeleton pose (if a SkeletonController exists).
   * Called from the UI "Reset Pose" button outside the GUI.
   */
  resetSkeletonPose() {
    if (this._skeletonCtrl) {
      this._skeletonCtrl.resetPose();
    }
  }

  /**
   * Tears down the GUI completely. Call when disposing the application.
   */
  dispose() {
    this._clearGUI();
    if (this._gui) {
      this._gui.destroy();
      this._gui = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  /** @private */
  _createGUI() {
    this._gui = new GUI({ title: 'Controls', width: 280 });
  }

  /**
   * Destroys the Transform and Skeleton folders so the panel can be
   * rebuilt for a new model.
   * @private
   */
  _clearGUI() {
    if (this._transformFolder) {
      this._transformFolder.destroy();
      this._transformFolder = null;
    }
    if (this._skeletonFolder) {
      this._skeletonFolder.destroy();
      this._skeletonFolder = null;
    }
    if (this._skeletonCtrl) {
      this._skeletonCtrl.dispose();
      this._skeletonCtrl = null;
    }
    this._state = { pos: null, rot: null, scl: null };
    this._ctrls = { pX: null, pY: null, pZ: null, rX: null, rY: null, rZ: null, sX: null, sY: null, sZ: null };
  }

  /**
   * Populates the Transform folder with Position / Rotation / Scale
   * sliders plus a "Reset Transform" button.
   *
   * Each slider is bound to a temporary state object that the onChange
   * callback writes through to the actual THREE.Object3D.
   *
   * @private
   * @param {import('./ModelLoader.js').ModelItem} model
   */
  _buildTransformFolder(model) {
    this._transformFolder = this._gui.addFolder('Transform');
    const obj = model.scene;

    // ── Position (clamped to ±8 so models don't drift too far) ──
    const pos = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
    const pX = this._transformFolder.add(pos, 'x', -8, 8, 0.01).name('Pos X')
      .onChange((v) => { obj.position.x = v; });
    const pY = this._transformFolder.add(pos, 'y', -8, 8, 0.01).name('Pos Y')
      .onChange((v) => { obj.position.y = v; });
    const pZ = this._transformFolder.add(pos, 'z', -8, 8, 0.01).name('Pos Z')
      .onChange((v) => { obj.position.z = v; });

    // ── Rotation (Euler angles, displayed in degrees) ──
    const rot = {
      x: THREE.MathUtils.radToDeg(obj.rotation.x),
      y: THREE.MathUtils.radToDeg(obj.rotation.y),
      z: THREE.MathUtils.radToDeg(obj.rotation.z),
    };
    const rX = this._transformFolder.add(rot, 'x', -180, 180, 0.1).name('Rot X')
      .onChange((v) => { obj.rotation.x = THREE.MathUtils.degToRad(v); });
    const rY = this._transformFolder.add(rot, 'y', -180, 180, 0.1).name('Rot Y')
      .onChange((v) => { obj.rotation.y = THREE.MathUtils.degToRad(v); });
    const rZ = this._transformFolder.add(rot, 'z', -180, 180, 0.1).name('Rot Z')
      .onChange((v) => { obj.rotation.z = THREE.MathUtils.degToRad(v); });

    // ── Scale ──
    const scl = { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z };
    const sX = this._transformFolder.add(scl, 'x', 0.01, 10, 0.01).name('Scl X')
      .onChange((v) => { obj.scale.x = v; });
    const sY = this._transformFolder.add(scl, 'y', 0.01, 10, 0.01).name('Scl Y')
      .onChange((v) => { obj.scale.y = v; });
    const sZ = this._transformFolder.add(scl, 'z', 0.01, 10, 0.01).name('Scl Z')
      .onChange((v) => { obj.scale.z = v; });

    // Store refs so _resetTransform() can update the display values.
    this._state = { pos, rot, scl };
    this._ctrls = { pX, pY, pZ, rX, rY, rZ, sX, sY, sZ };

    // ── Reset Transform button ──
    this._transformFolder.add(this, '_resetTransform').name('↺ Reset Transform');
  }

  /**
   * Restores the active model to its original (carousel-placed) transform
   * and updates every slider in the GUI to reflect the new values.
   *
   * Guard clauses ensure the method is safe to call even if the GUI folder
   * was recently destroyed/rebuilt (e.g. during a model switch).
   * @private
   */
  _resetTransform() {
    const model = this._currentModel;
    if (!model) return;

    // Reset the actual Three.js transform.
    model.scene.position.copy(model.originalPosition);
    model.scene.rotation.copy(model.originalRotation);
    model.scene.scale.copy(model.originalScale);

    // Guard: state/controllers may have been cleared if a model switch
    // happened concurrently.  In that case, rebuild the folder.
    if (!this._state.pos || !this._ctrls.pX) {
      this._rebuildActiveModel();
      return;
    }

    // ── Update position sliders ──
    this._state.pos.x = model.originalPosition.x;
    this._state.pos.y = model.originalPosition.y;
    this._state.pos.z = model.originalPosition.z;
    this._ctrls.pX.setValue(this._state.pos.x);
    this._ctrls.pY.setValue(this._state.pos.y);
    this._ctrls.pZ.setValue(this._state.pos.z);

    // ── Update rotation sliders ──
    this._state.rot.x = THREE.MathUtils.radToDeg(model.originalRotation.x);
    this._state.rot.y = THREE.MathUtils.radToDeg(model.originalRotation.y);
    this._state.rot.z = THREE.MathUtils.radToDeg(model.originalRotation.z);
    this._ctrls.rX.setValue(this._state.rot.x);
    this._ctrls.rY.setValue(this._state.rot.y);
    this._ctrls.rZ.setValue(this._state.rot.z);

    // ── Update scale sliders ──
    this._state.scl.x = model.originalScale.x;
    this._state.scl.y = model.originalScale.y;
    this._state.scl.z = model.originalScale.z;
    this._ctrls.sX.setValue(this._state.scl.x);
    this._ctrls.sY.setValue(this._state.scl.y);
    this._ctrls.sZ.setValue(this._state.scl.z);
  }

  /**
   * Fallback: rebuild the full Transform folder for the current model.
   * Called when _resetTransform detects stale state/controller refs.
   * @private
   */
  _rebuildActiveModel() {
    if (!this._currentModel) return;
    if (this._transformFolder) {
      this._transformFolder.destroy();
      this._transformFolder = null;
    }
    this._buildTransformFolder(this._currentModel);
  }
}
