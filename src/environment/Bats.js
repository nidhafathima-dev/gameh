import * as THREE from 'three';

export class BatSwarm {
  constructor(scene) {
    this.scene = scene;
    this.bats = [];
    this.isActive = false;
    this.swarmGroup = new THREE.Group();
    this.scene.add(this.swarmGroup);

    this.createBats(32);
  }

  // Create an articulated 3D bat with flapping wings
  createBatMesh() {
    const bat = new THREE.Group();

    const batMat = new THREE.MeshStandardMaterial({
      color: 0x111114,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    // 1. Torso & Head
    const bodyGeo = new THREE.ConeGeometry(0.04, 0.22, 5);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, batMat);
    bat.add(body);

    const headGeo = new THREE.SphereGeometry(0.045, 6, 6);
    const head = new THREE.Mesh(headGeo, batMat);
    head.position.set(0, 0.02, 0.12);
    bat.add(head);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.015, 0.05, 4);
    earGeo.rotateX(-Math.PI / 4);
    const earL = new THREE.Mesh(earGeo, batMat);
    earL.position.set(-0.025, 0.05, 0.13);
    bat.add(earL);

    const earR = new THREE.Mesh(earGeo, batMat);
    earR.position.set(0.025, 0.05, 0.13);
    bat.add(earR);

    // 2. Left Wing with hinge pivot
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-0.25, 0.08);
    wingShape.lineTo(-0.45, -0.02);
    wingShape.lineTo(-0.35, -0.15);
    wingShape.lineTo(-0.18, -0.18);
    wingShape.lineTo(0, -0.08);
    wingShape.closePath();

    const wingGeo = new THREE.ShapeGeometry(wingShape);

    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.03, 0.01, 0);
    const leftWingMesh = new THREE.Mesh(wingGeo, batMat);
    leftWingPivot.add(leftWingMesh);
    bat.add(leftWingPivot);

    // 3. Right Wing with hinge pivot
    const rightWingShape = new THREE.Shape();
    rightWingShape.moveTo(0, 0);
    rightWingShape.lineTo(0.25, 0.08);
    rightWingShape.lineTo(0.45, -0.02);
    rightWingShape.lineTo(0.35, -0.15);
    rightWingShape.lineTo(0.18, -0.18);
    rightWingShape.lineTo(0, -0.08);
    rightWingShape.closePath();

    const rightWingGeo = new THREE.ShapeGeometry(rightWingShape);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.03, 0.01, 0);
    const rightWingMesh = new THREE.Mesh(rightWingGeo, batMat);
    rightWingPivot.add(rightWingMesh);
    bat.add(rightWingPivot);

    bat.visible = false;
    this.swarmGroup.add(bat);

    return {
      group: bat,
      leftWing: leftWingPivot,
      rightWing: rightWingPivot,
      speed: 0,
      flapSpeed: 25 + Math.random() * 15,
      flapPhase: Math.random() * Math.PI * 2,
      progress: 0,
      curve: null,
      scale: 0.6 + Math.random() * 0.7,
    };
  }

  createBats(count) {
    for (let i = 0; i < count; i++) {
      this.bats.push(this.createBatMesh());
    }
  }

  // Trigger swarm explosion from cabin door towards and past player camera
  trigger(originPos, cameraPos) {
    this.isActive = true;

    // Door origin is roughly (0, 1.8, -25.2)
    const doorOrigin = originPos.clone();

    this.bats.forEach((bat, idx) => {
      bat.group.visible = true;
      bat.progress = 0;
      bat.group.scale.setScalar(bat.scale);

      // Create diverse 3D flight paths from doorway outwards
      // Some fly directly past the camera's face, others scatter left, right, and upwards
      const flyPastClose = idx < 8; // 8 bats do a close-up flyby
      const side = idx % 2 === 0 ? 1 : -1;

      let midPt, endPt;

      if (flyPastClose) {
        // Pass very close to camera at cameraPos
        const offset = (Math.random() - 0.5) * 1.4;
        midPt = new THREE.Vector3(
          cameraPos.x + offset,
          cameraPos.y + (Math.random() - 0.5) * 0.9,
          cameraPos.z - 2 - Math.random() * 2
        );
        endPt = new THREE.Vector3(
          cameraPos.x + offset * 3,
          cameraPos.y + 2 + Math.random() * 4,
          cameraPos.z + 8 + Math.random() * 12
        );
      } else {
        // Scatter outward into forest canopy
        const angle = (idx / this.bats.length) * Math.PI * 2;
        midPt = new THREE.Vector3(
          doorOrigin.x + Math.sin(angle) * (3 + Math.random() * 4),
          doorOrigin.y + 1 + Math.random() * 3,
          doorOrigin.z + 4 + Math.random() * 5
        );
        endPt = new THREE.Vector3(
          doorOrigin.x + Math.sin(angle) * (12 + Math.random() * 14),
          8 + Math.random() * 8,
          doorOrigin.z + 14 + Math.random() * 18
        );
      }

      // Small initial jitter inside the dark doorway
      const startPt = new THREE.Vector3(
        doorOrigin.x + (Math.random() - 0.5) * 0.8,
        doorOrigin.y + (Math.random() - 0.5) * 0.8,
        doorOrigin.z - 0.3 - Math.random() * 0.8
      );

      bat.curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt]);
      bat.speed = 0.35 + Math.random() * 0.45; // Flight duration ~ 2.5s
      bat.delay = Math.random() * 0.45; // Staggered burst
      bat.elapsed = 0;
    });
  }

  update(delta, clockTime) {
    if (!this.isActive) return;

    let anyAlive = false;

    for (let i = 0; i < this.bats.length; i++) {
      const bat = this.bats[i];
      bat.elapsed += delta;

      if (bat.elapsed < bat.delay) continue;

      bat.progress += delta * bat.speed;

      if (bat.progress <= 1.0 && bat.curve) {
        anyAlive = true;
        const currentPt = bat.curve.getPointAt(bat.progress);
        bat.group.position.copy(currentPt);

        // Orient bat facing forward along flight tangent
        const lookAhead = Math.min(1.0, bat.progress + 0.05);
        const forwardPt = bat.curve.getPointAt(lookAhead);
        bat.group.lookAt(forwardPt);

        // Flap wings rapidly
        const flapAngle = Math.sin(clockTime * bat.flapSpeed + bat.flapPhase) * 0.75;
        bat.leftWing.rotation.z = flapAngle;
        bat.rightWing.rotation.z = -flapAngle;

        // Subtle banking roll
        bat.group.rotation.z = flapAngle * 0.2;
      } else {
        bat.group.visible = false;
      }
    }

    if (!anyAlive && this.bats[0].elapsed > 2.5) {
      this.isActive = false;
    }
  }
}
