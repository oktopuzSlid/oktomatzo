import * as THREE from 'three';

/**
 * SkeletonController
 * ------------------
 * Provides a GUI panel for browsing a skinned model's bone hierarchy and
 * manipulating individual bone rotations.  Bones are organised by their
 * parent/child tree so the user can navigate the skeleton intuitively.
 *
 * When the user adjusts a bone slider:
 *   1. The animation mixer is paused (so the manual pose stays visible).
 *   2. The bone's local Euler rotation is updated in real-time.
 *
 * If the model has animation clips, a second "Animations" section shows
 * one button per clip – clicking one stops the current action and plays
 * the selected one.
 *
 * A "Reset Pose" button restores all bones to their original transform
 * and, if the mixer was playing before posing, resumes playback.
 */
export class SkeletonController {

  /**
   * @param {THREE.Bone[]}             bones       Array of skeleton bones.
   * @param {THREE.AnimationMixer|null} mixer       The model's mixer (may be null).
   * @param {Object}                   folder      A lil-gui folder to add controls to.
   * @param {THREE.AnimationClip[]}    [animations] Animation clips (default []).
   */
  constructor(bones, mixer, folder, animations) {
    /** @private */
    this._bones = bones;
    this._mixer = mixer;
    this._folder = folder;
    this._animations = animations || [];

    /** Whether the mixer was playing when the user first adjusted a bone. */
    this._wasPlaying = false;

    /**
     * Store each bone's original transform so we can restore it on reset.
     * @private @type {Map<THREE.Bone, { position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3 }>}
     */
    this._originalPose = new Map();

    /**
     * References to the GUI controllers for each bone, used to update
     * slider values when resetting the pose.
     * @private @type {Array<{ bone: THREE.Bone, ctrlX: Object, ctrlY: Object, ctrlZ: Object }>}
     */
    this._boneControllers = [];

    // Snapshot the original transforms.
    for (const bone of bones) {
      this._originalPose.set(bone, {
        position: bone.position.clone(),
        quaternion: bone.quaternion.clone(),
        scale: bone.scale.clone(),
      });
    }

    // Build the GUI.
    this._setupGUI();
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Builds the entire skeleton GUI:
   *   1. A tree of folders matching the bone parent/child hierarchy.
   *   2. A "Reset Pose" button.
   *   3. An "Animations" section (if clips exist).
   * @private
   */
  _setupGUI() {
    if (this._bones.length === 0) return;

    // ── Find root bones – those whose parent is not a bone in our set.
    const boneSet = new Set(this._bones);
    const roots = this._bones.filter((b) => {
      return !b.parent || !b.parent.isBone || !boneSet.has(b.parent);
    });

    // Recursively create folders from the root bones downward.
    for (const root of roots) {
      this._addBoneWithChildren(root, this._folder);
    }

    // ── Reset Pose button ──
    this._folder.add({ reset: () => this.resetPose() }, 'reset').name('↺ Reset Pose');

    // ── Animation section (only if the model has clips) ──
    if (this._animations.length > 0) {
      this._addAnimationControls();
    }
  }

  /**
   * Creates a folder for `bone`, adds rotation sliders to it, then
   * recurses into its children (bones whose parent === this bone).
   * @private
   * @param {THREE.Bone}  bone
   * @param {Object}      parentFolder  The lil-gui folder to add into.
   */
  _addBoneWithChildren(bone, parentFolder) {
    // Skip helper / end / tip bones – they are not useful to pose.
    if (!bone.name || /_(end|tip)$/i.test(bone.name)) return;

    const boneFolder = parentFolder.addFolder(bone.name);
    this._addBoneControlsToFolder(bone, boneFolder);

    // Find and recurse into children.
    const children = this._bones.filter((b) => {
      return b.parent && b.parent.isBone && b.parent === bone;
    });
    for (const child of children) {
      this._addBoneWithChildren(child, boneFolder);
    }
  }

  /**
   * Adds rotation-X / Y / Z sliders (in degrees) to a bone's folder.
   * @private
   * @param {THREE.Bone} bone
   * @param {Object}     folder  The bone's dedicated lil-gui folder.
   */
  _addBoneControlsToFolder(bone, folder) {
    // lil-gui binds to a plain JS object, so we convert radians ↔ degrees.
    const state = {
      x: THREE.MathUtils.radToDeg(bone.rotation.x),
      y: THREE.MathUtils.radToDeg(bone.rotation.y),
      z: THREE.MathUtils.radToDeg(bone.rotation.z),
    };

    // Shared change handler: updates the bone's local rotation and
    // pauses the animation mixer if it was running.
    const onChange = () => {
      this._applyBoneRotation(bone, state);
    };

    const ctrlX = folder.add(state, 'x', -180, 180, 0.1).name('Rot X').onChange(onChange);
    const ctrlY = folder.add(state, 'y', -180, 180, 0.1).name('Rot Y').onChange(onChange);
    const ctrlZ = folder.add(state, 'z', -180, 180, 0.1).name('Rot Z').onChange(onChange);

    this._boneControllers.push({ bone, state, ctrlX, ctrlY, ctrlZ });
  }

  /**
   * Adds an "Animations" sub-folder with one button per clip, plus a
   * "Stop All" button.  Clicking a button stops any current action and
   * starts the selected one.
   * @private
   */
  _addAnimationControls() {
    const animFolder = this._folder.addFolder('Animations');

    for (let i = 0; i < this._animations.length; i++) {
      const clip = this._animations[i];
      const label = clip.name || `Anim ${i + 1}`;
      // lil-gui needs a method on an object – create a wrapper.
      const wrapper = { play: () => this._playAnimation(i) };
      animFolder.add(wrapper, 'play').name(label);
    }

    // Stop button.
    const stopWrapper = { stop: () => this._stopAll() };
    animFolder.add(stopWrapper, 'stop').name('⏹ Stop');
  }

  /**
   * Converts the GUI state (degrees) into radians and applies it to
   * the bone's local Euler rotation.  Pauses the mixer on first use.
   * @private
   * @param {THREE.Bone}    bone
   * @param {{ x: number, y: number, z: number }} state  Degrees.
   */
  _applyBoneRotation(bone, state) {
    // Pause the animation mixer if it's currently playing.
    if (this._mixer && this._mixer.timeScale > 0) {
      this._wasPlaying = true;
      this._mixer.timeScale = 0;
    }

    // Convert degrees → radians and apply as a local Euler rotation.
    bone.rotation.set(
      THREE.MathUtils.degToRad(state.x),
      THREE.MathUtils.degToRad(state.y),
      THREE.MathUtils.degToRad(state.z),
      'XYZ',
    );
    bone.updateMatrixWorld(true);
  }

  /**
   * Stops all current mixer actions and plays the clip at `index`.
   * Resumes the mixer's time scale if it was paused.
   * @private
   * @param {number} index
   */
  _playAnimation(index) {
    if (!this._mixer || !this._animations[index]) return;

    // Resume playback (in case the mixer was paused by bone posing).
    this._mixer.timeScale = 1;
    this._wasPlaying = true;

    // Stop any existing action and play the selected one.
    this._mixer.stopAllAction();
    const action = this._mixer.clipAction(this._animations[index]);
    action.reset().play();
  }

  /**
   * Pauses all animation playback.
   * @private
   */
  _stopAll() {
    if (this._mixer) {
      this._mixer.timeScale = 0;
      this._wasPlaying = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Restores every bone to its original (pre-manipulation) transform.
   * Resumes the animation mixer if it was previously playing.
   */
  resetPose() {
    // Reset each bone to its original transform.
    for (const bone of this._bones) {
      const orig = this._originalPose.get(bone);
      if (!orig) continue;
      bone.position.copy(orig.position);
      bone.quaternion.copy(orig.quaternion);
      bone.scale.copy(orig.scale);
      bone.updateMatrixWorld(true);
    }

    // Update the GUI sliders to reflect the restored pose.
    for (const { bone, state, ctrlX, ctrlY, ctrlZ } of this._boneControllers) {
      const orig = this._originalPose.get(bone);
      if (!orig) continue;
      const euler = new THREE.Euler().setFromQuaternion(orig.quaternion, 'XYZ');
      state.x = THREE.MathUtils.radToDeg(euler.x);
      state.y = THREE.MathUtils.radToDeg(euler.y);
      state.z = THREE.MathUtils.radToDeg(euler.z);
      ctrlX.setValue(state.x);
      ctrlY.setValue(state.y);
      ctrlZ.setValue(state.z);
    }

    // Resume the mixer if it was playing before the user started posing.
    if (this._mixer && this._wasPlaying) {
      this._mixer.timeScale = 1;
      this._wasPlaying = false;
    }
  }

  /**
   * Releases internal references. Called when switching models.
   */
  dispose() {
    this._boneControllers = [];
    this._originalPose.clear();
  }
}
