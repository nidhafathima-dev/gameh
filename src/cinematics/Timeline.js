import * as THREE from 'three';

export const PHASES = {
  PRE_AWAKEN: 0,
  AWAKENING: 1,
  FOREST_WALK: 2,
  DOOR_APPROACH: 3,
  DOOR_SLAM_BATS: 4,
  ENTERING_CABIN: 5,
  TABLE_REVEAL: 6,
  BOARD_APPROACH: 7,
  TRANSITION_INTERACTIVE: 8,
  INTERACTIVE: 9,
};

export class Timeline {
  constructor({ sceneManager, forest, cabin, bats, ouija, audio, onPhaseChange }) {
    this.scene = sceneManager;
    this.forest = forest;
    this.cabin = cabin;
    this.bats = bats;
    this.ouija = ouija;
    this.audio = audio;
    this.onPhaseChange = onPhaseChange || (() => {});

    this.phase = PHASES.PRE_AWAKEN;
    this.phaseTime = 0;

    // Movement state on guided CatmullRom spline
    this.pathT = 0.02; // 0.0 to 1.0 along CatmullRom spline
    this.walkSpeed = 0.066; // 46.7% increase from 0.045 for responsive exploration
    this.backwardSpeed = 0.048;
    this.currentSpeed = 0; // Current velocity for smooth acceleration/deceleration
    this.targetSpeed = 0;
    this.pathAngle = 0; // Smooth body orientation along path spline

    this.keys = { forward: false, backward: false };
    this.isMoving = false;
    this.walkCycle = 0;
    this.idleTime = 0;

    // First person mouse look with smooth damping
    this.yaw = 0;
    this.pitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;

    // Camera shake
    this.shakeAmount = 0;

    // Smooth cinematic transitions
    this.startCamPos = new THREE.Vector3();
    this.startCamTarget = new THREE.Vector3();

    // Reusable scratch vectors to prevent per-frame garbage collection
    this._tangent = new THREE.Vector3();
    this._lookDir = new THREE.Vector3();
    this._camLookTarget = new THREE.Vector3();
    this._doorLookTarget = new THREE.Vector3(0, 1.75, -15.0);
    this._porchDoorCam = new THREE.Vector3(0, 1.72, -13.5);
    this._boardCamPos = new THREE.Vector3(0, 2.28, -18.65);
    this._boardCenter = new THREE.Vector3(0, 0.88, -19.05);

    this.setupControls();
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      if (this.phase !== PHASES.FOREST_WALK) return;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        if (e.key === 'ArrowUp') e.preventDefault();
        this.keys.forward = true;
      }
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        if (e.key === 'ArrowDown') e.preventDefault();
        this.keys.backward = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.keys.forward = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.keys.backward = false;
    });

    // Clear key states if window loses focus to avoid stuck movement
    window.addEventListener('blur', () => {
      this.keys.forward = false;
      this.keys.backward = false;
      this.targetSpeed = 0;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.phase === PHASES.FOREST_WALK) {
        const factor = 0.0018;
        this.targetYaw -= e.movementX * factor;
        this.targetPitch -= e.movementY * factor;
        // Clamp pitch to prevent disorienting flip
        this.targetPitch = Math.max(-0.45, Math.min(0.45, this.targetPitch));
        // Clamp yaw relative to path corridor
        this.targetYaw = Math.max(-1.1, Math.min(1.1, this.targetYaw));
      }
    });
  }

  startAwakening() {
    this.audio.init();
    this.audio.resume();
    this.phase = PHASES.AWAKENING;
    this.phaseTime = 0;
    this.audio.playHeartbeat();
    setTimeout(() => {
      this.audio.playAwakeningBreath();
    }, 1800);
    this.onPhaseChange(this.phase);
  }

  skipToInteractive() {
    this.phase = PHASES.INTERACTIVE;
    this.scene.setInteriorFog(true);
    this.cabin.setDoorOpen(Math.PI * 0.6);
    this.scene.camera.position.copy(this._boardCamPos);
    this.scene.camera.lookAt(this._boardCenter);
    this.onPhaseChange(this.phase);
  }

  update(delta, clockTime) {
    this.phaseTime += delta;

    switch (this.phase) {
      case PHASES.PRE_AWAKEN:
        this.updatePreAwaken();
        break;

      case PHASES.AWAKENING:
        this.updateAwakening(delta);
        break;

      case PHASES.FOREST_WALK:
        this.updateForestWalk(delta);
        break;

      case PHASES.DOOR_APPROACH:
        this.updateDoorApproach(delta);
        break;

      case PHASES.DOOR_SLAM_BATS:
        this.updateDoorSlamBats(delta);
        break;

      case PHASES.ENTERING_CABIN:
        this.updateEnteringCabin(delta);
        break;

      case PHASES.TABLE_REVEAL:
        this.updateTableReveal(delta);
        break;

      case PHASES.BOARD_APPROACH:
        this.updateBoardApproach(delta);
        break;

      case PHASES.TRANSITION_INTERACTIVE:
        this.updateTransitionInteractive(delta);
        break;

      case PHASES.INTERACTIVE:
        this.updateInteractive(delta);
        break;
    }

    // Apply camera recoil / shake if active
    if (this.shakeAmount > 0.001) {
      this.scene.camera.position.x += (Math.random() - 0.5) * this.shakeAmount;
      this.scene.camera.position.y += (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= Math.pow(0.05, delta);
    }
  }

  updatePreAwaken() {
    // Lie on the forest floor at path origin, looking up into tall overhead pine boughs
    const pt = this.forest.pathCurve.getPointAt(0.01);
    this.scene.camera.position.set(pt.x, 0.42, pt.z);
    this.scene.camera.lookAt(pt.x, 22.0, pt.z - 0.2);
    this.scene.camera.rotation.z = 0.08;
  }

  updateAwakening(delta) {
    const pt = this.forest.pathCurve.getPointAt(this.pathT);
    const lookPt = this.forest.pathCurve.getPointAt(this.pathT + 0.05);

    const canopyTarget = new THREE.Vector3(pt.x, 22.0, pt.z - 0.2);
    const horizonTarget = new THREE.Vector3(lookPt.x, 1.7, lookPt.z);

    if (this.phaseTime <= 4.5) {
      // Stage 1: Lying on damp ground, breathing and groggy head roll
      const breathe = Math.sin(this.phaseTime * 2.2) * 0.035;
      const headRoll = Math.sin(this.phaseTime * 1.4) * 0.06;

      this.scene.camera.position.set(pt.x + headRoll * 0.2, 0.42 + breathe, pt.z);
      const perturbedTarget = canopyTarget.clone().add(new THREE.Vector3(headRoll * 3.0, 0, headRoll * 2.0));
      this.scene.camera.lookAt(perturbedTarget);
      this.scene.camera.rotation.z = 0.08 + headRoll;
    } else if (this.phaseTime < 8.5) {
      // Stage 2: Smoothly propping up and rising to standing eye height
      const standProgress = Math.min(1.0, (this.phaseTime - 4.5) / 4.0);
      const ease = this.easeInOutCubic(standProgress);

      const currentY = THREE.MathUtils.lerp(0.42, 1.70, ease);
      this.scene.camera.position.set(pt.x, currentY, pt.z);

      const currentLook = new THREE.Vector3().lerpVectors(canopyTarget, horizonTarget, ease);
      this.scene.camera.lookAt(currentLook);
      this.scene.camera.rotation.z = THREE.MathUtils.lerp(0.08, 0.0, ease);
    } else {
      // Stage 3: Fully standing upright facing down the forest path!
      this.scene.camera.position.set(pt.x, 1.70, pt.z);
      this.scene.camera.lookAt(horizonTarget);
      this.scene.camera.rotation.z = 0;

      // Initialize path orientation seamlessly to prevent any initial camera twitch
      const p0 = this.forest.pathCurve.getPointAt(this.pathT);
      const pAhead = this.forest.pathCurve.getPointAt(this.pathT + 0.04);
      this._tangent.subVectors(pAhead, p0).normalize();
      this.pathAngle = Math.atan2(-this._tangent.x, -this._tangent.z);

      this.yaw = 0;
      this.pitch = 0;
      this.targetYaw = 0;
      this.targetPitch = 0;
      this.currentSpeed = 0;
      this.targetSpeed = 0;

      this.phase = PHASES.FOREST_WALK;
      this.phaseTime = 0;
      this.onPhaseChange(this.phase);
    }
  }

  updateForestWalk(delta) {
    let moveDir = 0;
    if (this.keys.forward) moveDir += 1;
    if (this.keys.backward) moveDir -= 1;

    // Target velocity with responsive forward / backward speeds
    if (moveDir > 0) {
      this.targetSpeed = this.walkSpeed;
    } else if (moveDir < 0) {
      this.targetSpeed = -this.backwardSpeed;
    } else {
      this.targetSpeed = 0;
    }

    // Frame-rate independent exponential acceleration and deceleration
    const accel = this.targetSpeed !== 0 ? 6.5 : 9.0;
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, this.targetSpeed, accel, delta);
    if (Math.abs(this.currentSpeed) < 0.0001 && this.targetSpeed === 0) {
      this.currentSpeed = 0;
    }

    // Move along spline
    if (this.currentSpeed !== 0) {
      this.pathT += this.currentSpeed * delta;
      this.pathT = Math.max(0.01, Math.min(0.96, this.pathT));

      // Check if reached cabin porch (pathT >= 0.88)
      if (this.pathT >= 0.88) {
        this.keys.forward = false;
        this.keys.backward = false;
        this.targetSpeed = 0;
        this.currentSpeed = 0;
        this.startDoorApproachSequence();
        return;
      }
    }

    // Spline curve sample points for smooth forward tangent
    const aheadT = Math.min(1.0, this.pathT + 0.04);
    const behindT = Math.max(0.0, this.pathT - 0.04);
    const pos = this.forest.pathCurve.getPointAt(this.pathT);
    const pAhead = this.forest.pathCurve.getPointAt(aheadT);
    const pBehind = this.forest.pathCurve.getPointAt(behindT);

    this._tangent.subVectors(pAhead, pBehind).normalize();
    const targetPathAngle = Math.atan2(-this._tangent.x, -this._tangent.z);

    // Smooth shortest angle interpolation for body rotation
    let angleDiff = targetPathAngle - this.pathAngle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.pathAngle += angleDiff * Math.min(1.0, 10.0 * delta);

    // Smooth mouse look interpolation
    this.yaw = THREE.MathUtils.damp(this.yaw, this.targetYaw, 12.0, delta);
    this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 12.0, delta);

    // Synchronized head bobbing & smooth blend to stationary idle breathing
    const speedRatio = Math.abs(this.currentSpeed) / this.walkSpeed;
    const movingWeight = Math.min(1.0, speedRatio);

    if (movingWeight > 0.01) {
      const prevBob = Math.sin(this.walkCycle);
      this.walkCycle += delta * (8.5 * movingWeight);
      const currBob = Math.sin(this.walkCycle);

      // Footstep sound synchronized with bottom of stride
      if (prevBob > 0 && currBob <= 0) {
        this.audio.playFootstep('dirt');
      }
    }

    this.idleTime += delta;
    const walkBobY = Math.sin(this.walkCycle) * 0.032 * movingWeight;
    const walkBobX = Math.cos(this.walkCycle * 0.5) * 0.018 * movingWeight;
    const idleBreatheY = Math.sin(this.idleTime * 1.5) * 0.008 * (1.0 - movingWeight);

    const finalBobY = walkBobY + idleBreatheY;
    const finalBobX = walkBobX;

    // Maintain consistent eye height (1.70m) above undulating terrain
    const eyeHeight = 1.70;
    this.scene.camera.position.set(pos.x + finalBobX, pos.y + eyeHeight + finalBobY, pos.z);

    // Calculate view direction combining smoothed body pathAngle + yaw + pitch
    const totalYaw = this.pathAngle + this.yaw;
    const cosPitch = Math.cos(this.pitch);
    this._lookDir.set(
      Math.sin(totalYaw) * cosPitch,
      Math.sin(this.pitch),
      -Math.cos(totalYaw) * cosPitch
    ).normalize();

    // Look target anchored directly to camera position to prevent translational wobble
    this._camLookTarget.copy(this.scene.camera.position).addScaledVector(this._lookDir, 10);
    this.scene.camera.lookAt(this._camLookTarget);
  }

  startDoorApproachSequence() {
    this.phase = PHASES.DOOR_APPROACH;
    this.phaseTime = 0;
    this.startCamPos.copy(this.scene.camera.position);
    this.startCamTarget.copy(this._camLookTarget);
    this.hasSlammedDoor = false;
    this.onPhaseChange(this.phase);
  }

  updateDoorApproach(delta) {
    const t = Math.min(1.0, this.phaseTime / 3.4);
    const ease = this.easeInOutCubic(t);

    // Smoothly glide onto porch directly in front of weathered door
    this.scene.camera.position.lerpVectors(this.startCamPos, this._porchDoorCam, ease);

    // Smoothly pan gaze from player's previous look direction towards the door center
    this._camLookTarget.lerpVectors(this.startCamTarget, this._doorLookTarget, ease);
    this.scene.camera.lookAt(this._camLookTarget);

    if (t >= 1.0) {
      this.phase = PHASES.DOOR_SLAM_BATS;
      this.phaseTime = 0;
      this.hasSlammedDoor = false;
      this.onPhaseChange(this.phase);
    }
  }

  updateDoorSlamBats(delta) {
    // Keep camera focused on door opening
    this.scene.camera.lookAt(this._doorLookTarget);

    // Suspense pause: 0.8 seconds of eerie stillness before sudden violent slam
    if (this.phaseTime >= 0.8 && !this.hasSlammedDoor) {
      this.hasSlammedDoor = true;
      this.cabin.slamDoorOpen();
      this.audio.playDoorCreakAndSlam();
      this.audio.playBatSwarm();
      this.bats.trigger(new THREE.Vector3(0, 1.8, -15.0), this.scene.camera.position);
      this.shakeAmount = 0.22; // Startled flinch & camera recoil
    }

    // Allow bats to swarm past and dramatic tension to settle (~4.2 seconds)
    if (this.phaseTime > 4.2) {
      this.phase = PHASES.ENTERING_CABIN;
      this.phaseTime = 0;
      this.startCamPos.copy(this.scene.camera.position);
      this.startCamTarget.copy(this._doorLookTarget);
      this.scene.setInteriorFog(true);
      this.onPhaseChange(this.phase);
    }
  }

  updateEnteringCabin(delta) {
    const t = Math.min(1.0, this.phaseTime / 3.5);
    const ease = this.easeInOutCubic(t);

    // Move smoothly from porch through doorway into cabin interior
    const insidePos = new THREE.Vector3(0, 1.65, -17.2);
    this.scene.camera.position.lerpVectors(this.startCamPos, insidePos, ease);

    // Look towards the candlelit table
    const tableTarget = this.cabin.getTableWorldPosition();
    const targetLook = new THREE.Vector3(tableTarget.x, tableTarget.y + 0.3, tableTarget.z);
    this._camLookTarget.lerpVectors(this.startCamTarget, targetLook, ease);
    this.scene.camera.lookAt(this._camLookTarget);

    if (t >= 1.0) {
      this.phase = PHASES.TABLE_REVEAL;
      this.phaseTime = 0;
      this.startCamPos.copy(this.scene.camera.position);
      this.startCamTarget.copy(this._camLookTarget);
      this.onPhaseChange(this.phase);
    }
  }

  updateTableReveal(delta) {
    // Dramatic pause admiring the antique Ouija board under candlelight
    const tableTarget = this.cabin.getTableWorldPosition();
    this.scene.camera.lookAt(tableTarget.x, tableTarget.y + 0.1, tableTarget.z);

    if (this.phaseTime > 2.0) {
      this.phase = PHASES.BOARD_APPROACH;
      this.phaseTime = 0;
      this.startCamPos.copy(this.scene.camera.position);
      this.startCamTarget.set(tableTarget.x, tableTarget.y + 0.1, tableTarget.z);
      this.onPhaseChange(this.phase);
    }
  }

  updateBoardApproach(delta) {
    const t = Math.min(1.0, this.phaseTime / 4.0);
    const ease = this.easeInOutCubic(t);

    // Crane camera smoothly above the Ouija board on the table
    this.scene.camera.position.lerpVectors(this.startCamPos, this._boardCamPos, ease);
    this._camLookTarget.lerpVectors(this.startCamTarget, this._boardCenter, ease);
    this.scene.camera.lookAt(this._camLookTarget);

    if (t >= 1.0) {
      this.phase = PHASES.TRANSITION_INTERACTIVE;
      this.phaseTime = 0;
      this.onPhaseChange(this.phase);
    }
  }

  updateTransitionInteractive(delta) {
    if (this.phaseTime > 0.8) {
      this.phase = PHASES.INTERACTIVE;
      this.phaseTime = 0;
      this.onPhaseChange(this.phase);
    }
  }

  updateInteractive(delta) {
    // In interactive mode, camera stays locked comfortably looking down at the board
    this.scene.camera.position.copy(this._boardCamPos);
    this.scene.camera.lookAt(this._boardCenter);
  }

  easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
}
