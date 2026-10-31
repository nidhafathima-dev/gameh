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

    // Player walking state on spline path
    this.pathT = 0.02; // 0.0 to 1.0 along CatmullRom spline
    this.walkSpeed = 0.045; // path units per second
    this.keys = { forward: false, backward: false };
    this.isMoving = false;
    this.walkCycle = 0;

    // First person mouse look
    this.yaw = 0;
    this.pitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;

    // Camera shake
    this.shakeAmount = 0;

    // Smooth cinematic transitions
    this.cinematicCamPos = new THREE.Vector3();
    this.cinematicCamTarget = new THREE.Vector3();
    this.startCamPos = new THREE.Vector3();
    this.startCamTarget = new THREE.Vector3();

    this.setupControls();
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      if (this.phase !== PHASES.FOREST_WALK) return;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.keys.forward = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.keys.backward = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.keys.forward = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.keys.backward = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.phase === PHASES.FOREST_WALK) {
        const factor = 0.0018;
        this.targetYaw -= e.movementX * factor;
        this.targetPitch -= e.movementY * factor;
        // Clamp pitch so player cannot flip upside down
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
    this.scene.camera.position.set(0, 2.28, -28.65);
    this.scene.camera.lookAt(0, 0.88, -29.05);
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

    // Apply camera shake if active
    if (this.shakeAmount > 0.001) {
      this.scene.camera.position.x += (Math.random() - 0.5) * this.shakeAmount;
      this.scene.camera.position.y += (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= Math.pow(0.05, delta);
    }
  }

  updatePreAwaken() {
    // Lie on the forest floor at path origin, head resting on damp moss, looking high into the overhead branches
    const pt = this.forest.pathCurve.getPointAt(0.01);
    this.scene.camera.position.set(pt.x, 0.42, pt.z);
    this.scene.camera.lookAt(pt.x, 22.0, pt.z - 0.2);
    this.scene.camera.rotation.z = 0.08;
  }

  updateAwakening(delta) {
    const pt = this.forest.pathCurve.getPointAt(this.pathT);
    const lookPt = this.forest.pathCurve.getPointAt(this.pathT + 0.06);

    // High overhead canopy look target (looking up through the tall pine branches and moonlit sky)
    const canopyTarget = new THREE.Vector3(pt.x, 22.0, pt.z - 0.2);
    // Forward horizon look target when standing upright facing down the winding forest path
    const horizonTarget = new THREE.Vector3(lookPt.x, 1.7, lookPt.z);

    if (this.phaseTime <= 4.5) {
      // Stage 1: Lying on cold damp ground, breathing and groggy head sway looking UP at tall trees & leaves
      const breathe = Math.sin(this.phaseTime * 2.2) * 0.035;
      const headRoll = Math.sin(this.phaseTime * 1.4) * 0.06;

      this.scene.camera.position.set(pt.x + headRoll * 0.2, 0.42 + breathe, pt.z);

      // Subtle look perturbation as eyes search the dark canopy
      const perturbedTarget = canopyTarget.clone().add(new THREE.Vector3(headRoll * 3.0, 0, headRoll * 2.0));
      this.scene.camera.lookAt(perturbedTarget);
      this.scene.camera.rotation.z = 0.08 + headRoll;
    } else if (this.phaseTime < 8.5) {
      // Stage 2: Physically propping up and rising from the forest floor to standing height
      const standProgress = Math.min(1.0, (this.phaseTime - 4.5) / 4.0);
      const ease = this.easeInOutCubic(standProgress);

      // Smooth rise from 0.42m ground height to 1.7m standing eye height
      const currentY = THREE.MathUtils.lerp(0.42, 1.7, ease);
      this.scene.camera.position.set(pt.x, currentY, pt.z);

      // Smooth pan down from high overhead canopy to the forest path ahead
      const currentLook = new THREE.Vector3().lerpVectors(canopyTarget, horizonTarget, ease);
      this.scene.camera.lookAt(currentLook);

      // Settle head roll to 0
      this.scene.camera.rotation.z = THREE.MathUtils.lerp(0.08, 0.0, ease);
    } else {
      // Stage 3: Fully standing upright facing down the path! Exploration unlocks.
      this.scene.camera.position.set(pt.x, 1.7, pt.z);
      this.scene.camera.lookAt(horizonTarget);
      this.scene.camera.rotation.z = 0;
      this.yaw = 0;
      this.pitch = 0;
      this.targetYaw = 0;
      this.targetPitch = 0;

      this.phase = PHASES.FOREST_WALK;
      this.phaseTime = 0;
      this.onPhaseChange(this.phase);
    }
  }

  updateForestWalk(delta) {
    let moveDir = 0;
    if (this.keys.forward) moveDir += 1;
    if (this.keys.backward) moveDir -= 1;

    this.isMoving = moveDir !== 0;

    if (this.isMoving) {
      this.pathT += moveDir * this.walkSpeed * delta;
      // Clamp path progress
      this.pathT = Math.max(0.01, Math.min(0.95, this.pathT));

      // Head bobbing and footstep sync
      const prevBob = Math.sin(this.walkCycle);
      this.walkCycle += delta * 7.5;
      const currBob = Math.sin(this.walkCycle);

      // Footstep sound when foot hits bottom
      if (prevBob > 0 && currBob <= 0) {
        this.audio.playFootstep('dirt');
      }

      // Check if reached cabin porch (pathT >= 0.88)
      if (this.pathT >= 0.88) {
        this.keys.forward = false;
        this.keys.backward = false;
        this.startDoorApproachSequence();
        return;
      }
    }

    // Get position along spline
    const pos = this.forest.pathCurve.getPointAt(this.pathT);
    const lookAheadT = Math.min(1.0, this.pathT + 0.06);
    const aheadPos = this.forest.pathCurve.getPointAt(lookAheadT);

    // Path tangent orientation
    const forwardVec = new THREE.Vector3().subVectors(aheadPos, pos).normalize();
    const baseAngle = Math.atan2(-forwardVec.x, -forwardVec.z);

    // Smooth mouse look interpolation
    this.yaw += (this.targetYaw - this.yaw) * 6.0 * delta;
    this.pitch += (this.targetPitch - this.pitch) * 6.0 * delta;

    // Apply head bob
    const bobY = this.isMoving ? Math.sin(this.walkCycle) * 0.045 : Math.sin(clockNow() * 1.5) * 0.01;
    const bobX = this.isMoving ? Math.cos(this.walkCycle * 0.5) * 0.03 : 0;

    this.scene.camera.position.set(pos.x + bobX, 1.7 + bobY, pos.z);

    // Camera look direction combining path forward + user yaw/pitch
    const lookTarget = new THREE.Vector3(
      pos.x + Math.sin(baseAngle + this.yaw) * 10,
      1.7 + Math.sin(this.pitch) * 10,
      pos.z - Math.cos(baseAngle + this.yaw) * 10
    );

    this.scene.camera.lookAt(lookTarget);
  }

  startDoorApproachSequence() {
    this.phase = PHASES.DOOR_APPROACH;
    this.phaseTime = 0;
    this.startCamPos.copy(this.scene.camera.position);
    this.hasSlammedDoor = false;
    this.onPhaseChange(this.phase);
  }

  updateDoorApproach(delta) {
    const t = Math.min(1.0, this.phaseTime / 3.4);
    const ease = this.easeInOutCubic(t);

    // Glide smoothly onto the porch directly in front of the door (0, 1.72, -23.7)
    const targetDoorCam = new THREE.Vector3(0, 1.72, -23.7);
    this.scene.camera.position.lerpVectors(this.startCamPos, targetDoorCam, ease);

    // Look straight at door handle/center (0, 1.75, -25.2)
    this.scene.camera.lookAt(0, 1.75, -25.2);

    if (t >= 1.0) {
      // Transition to DOOR_SLAM_BATS with dramatic suspense pause
      this.phase = PHASES.DOOR_SLAM_BATS;
      this.phaseTime = 0;
      this.hasSlammedDoor = false;
      this.onPhaseChange(this.phase);
    }
  }

  updateDoorSlamBats(delta) {
    // Keep camera focused on door/doorway
    this.scene.camera.lookAt(0, 1.75, -26.5);

    // Suspense pause: 0.8 seconds of eerie stillness before sudden violent slam
    if (this.phaseTime >= 0.8 && !this.hasSlammedDoor) {
      this.hasSlammedDoor = true;
      // Violent explosive door slam with rebound bounce!
      this.cabin.slamDoorOpen();
      this.audio.playDoorCreakAndSlam();
      this.audio.playBatSwarm();
      this.bats.trigger(new THREE.Vector3(0, 1.8, -25.2), this.scene.camera.position);
      this.shakeAmount = 0.22; // Startled flinch & camera recoil
    }

    // Allow bats to swarm past and dramatic tension to settle (~4.2 seconds total)
    if (this.phaseTime > 4.2) {
      this.phase = PHASES.ENTERING_CABIN;
      this.phaseTime = 0;
      this.startCamPos.copy(this.scene.camera.position);
      this.scene.setInteriorFog(true);
      this.onPhaseChange(this.phase);
    }
  }

  updateEnteringCabin(delta) {
    const t = Math.min(1.0, this.phaseTime / 3.5);
    const ease = this.easeInOutCubic(t);

    // Move from porch through open door into cabin hallway: Z = -23.8 to -27.2
    const insidePos = new THREE.Vector3(0, 1.65, -27.2);
    this.scene.camera.position.lerpVectors(this.startCamPos, insidePos, ease);

    // Look towards the wooden table in center
    const tableTarget = this.cabin.getTableWorldPosition();
    this.scene.camera.lookAt(tableTarget.x, tableTarget.y + 0.3, tableTarget.z);

    if (t >= 1.0) {
      this.phase = PHASES.TABLE_REVEAL;
      this.phaseTime = 0;
      this.startCamPos.copy(this.scene.camera.position);
      this.onPhaseChange(this.phase);
    }
  }

  updateTableReveal(delta) {
    // Subtle pause to admire the candlelit room and antique Ouija board
    const tableTarget = this.cabin.getTableWorldPosition();
    this.scene.camera.lookAt(tableTarget.x, tableTarget.y + 0.1, tableTarget.z);

    if (this.phaseTime > 2.0) {
      this.phase = PHASES.BOARD_APPROACH;
      this.phaseTime = 0;
      this.startCamPos.copy(this.scene.camera.position);
      this.onPhaseChange(this.phase);
    }
  }

  updateBoardApproach(delta) {
    const t = Math.min(1.0, this.phaseTime / 4.0);
    const ease = this.easeInOutCubic(t);

    // Camera cranes directly above the Ouija board on the table
    // Table is at Z = -29.05, board surface at Y = 0.88
    // End camera at (0, 2.28, -28.65) looking down at the board center
    const finalCamPos = new THREE.Vector3(0, 2.28, -28.65);
    this.scene.camera.position.lerpVectors(this.startCamPos, finalCamPos, ease);

    // Smoothly tilt rotation down towards board center (0, 0.88, -29.05)
    const boardCenter = new THREE.Vector3(0, 0.88, -29.05);
    this.scene.camera.lookAt(boardCenter);

    if (t >= 1.0) {
      this.phase = PHASES.TRANSITION_INTERACTIVE;
      this.phaseTime = 0;
      this.onPhaseChange(this.phase);
    }
  }

  updateTransitionInteractive(delta) {
    // Smooth final fade/lock into interactive view
    if (this.phaseTime > 0.8) {
      this.phase = PHASES.INTERACTIVE;
      this.phaseTime = 0;
      this.onPhaseChange(this.phase);
    }
  }

  updateInteractive(delta) {
    // In interactive mode, camera stays locked comfortably looking down at the board
    this.scene.camera.position.set(0, 2.28, -28.65);
    this.scene.camera.lookAt(0, 0.88, -29.05);
  }

  easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
}

function clockNow() {
  return performance.now() * 0.001;
}
