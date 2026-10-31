import * as THREE from 'three';

export class BatSwarm {
  constructor(scene) {
    this.scene = scene;
    this.bats = [];
    this.isActive = false;
    this.swarmGroup = new THREE.Group();
    this.scene.add(this.swarmGroup);

    this.createBats(38);
  }

  // Create an articulated 3D bat with flapping wings
  createBatMesh() {
    const bat = new THREE.Group();

    const batMat = new THREE.MeshStandardMaterial({
      color: 0x0e0e12,
      roughness: 0.88,
      metalness: 0.12,
      side: THREE.DoubleSide,
    });

    // 1. Torso & Head
    const bodyGeo = new THREE.ConeGeometry(0.045, 0.24, 6);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, batMat);
    bat.add(body);

    const headGeo = new THREE.SphereGeometry(0.048, 6, 6);
    const head = new THREE.Mesh(headGeo, batMat);
    head.position.set(0, 0.02, 0.13);
    bat.add(head);

    // Subtle glowing red/amber eyes for horror presence
    const eyeGeo = new THREE.SphereGeometry(0.008, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xdd2211 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.02, 0.035, 0.16);
    bat.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.02, 0.035, 0.16);
    bat.add(eyeR);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.016, 0.055, 4);
    earGeo.rotateX(-Math.PI / 4);
    const earL = new THREE.Mesh(earGeo, batMat);
    earL.position.set(-0.025, 0.055, 0.14);
    bat.add(earL);

    const earR = new THREE.Mesh(earGeo, batMat);
    earR.position.set(0.025, 0.055, 0.14);
    bat.add(earR);

    // 2. Left Wing with hinge pivot
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-0.25, 0.09);
    wingShape.lineTo(-0.48, -0.01);
    wingShape.lineTo(-0.36, -0.16);
    wingShape.lineTo(-0.19, -0.19);
    wingShape.lineTo(0, -0.09);
    wingShape.closePath();

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.computeVertexNormals();

    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.03, 0.01, 0);
    const leftWingMesh = new THREE.Mesh(wingGeo, batMat);
    leftWingPivot.add(leftWingMesh);
    bat.add(leftWingPivot);

    // 3. Right Wing with hinge pivot
    const rightWingShape = new THREE.Shape();
    rightWingShape.moveTo(0, 0);
    rightWingShape.lineTo(0.25, 0.09);
    rightWingShape.lineTo(0.48, -0.01);
    rightWingShape.lineTo(0.36, -0.16);
    rightWingShape.lineTo(0.19, -0.19);
    rightWingShape.lineTo(0, -0.09);
    rightWingShape.closePath();

    const rightWingGeo = new THREE.ShapeGeometry(rightWingShape);
    rightWingGeo.computeVertexNormals();

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
      flapSpeed: 28 + Math.random() * 16,
      flapPhase: Math.random() * Math.PI * 2,
      progress: 0,
      curve: null,
      scale: 0.6 + Math.random() * 0.75,
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

      // 10 bats fly directly past the visitor's face; others scatter in 3D arcs
      const flyPastClose = idx < 10;
      let midPt, endPt;

      if (flyPastClose) {
        // Fly directly past player's eyes and ears
        const sideOffset = (Math.random() - 0.5) * 1.1;
        midPt = new THREE.Vector3(
          cameraPos.x + sideOffset,
          cameraPos.y + (Math.random() - 0.5) * 0.6,
          cameraPos.z - 1.5 - Math.random() * 1.5
        );
        endPt = new THREE.Vector3(
          cameraPos.x + sideOffset * 2.5,
          cameraPos.y + 1.5 + Math.random() * 3.5,
          cameraPos.z + 8 + Math.random() * 14
        );
      } else {
        // Scatter outward into canopy, past porch posts, and into the dark woods
        const angle = (idx / this.bats.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 3.5 + Math.random() * 5.0;
        midPt = new THREE.Vector3(
          doorOrigin.x + Math.sin(angle) * dist,
          doorOrigin.y + 1.2 + Math.random() * 3.0,
          doorOrigin.z + 3.0 + Math.random() * 6.0
        );
        endPt = new THREE.Vector3(
          doorOrigin.x + Math.sin(angle) * (14 + Math.random() * 16),
          7 + Math.random() * 10,
          doorOrigin.z + 12 + Math.random() * 20
        );
      }

      // Start clustered inside dark doorway with slight forward stagger
      const startPt = new THREE.Vector3(
        doorOrigin.x + (Math.random() - 0.5) * 0.7,
        doorOrigin.y + (Math.random() - 0.5) * 0.7,
        doorOrigin.z - 0.2 - Math.random() * 0.9
      );

      bat.curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt]);
      bat.speed = 0.38 + Math.random() * 0.42; // Burst duration ~ 2.4s
      bat.delay = Math.random() * 0.38; // Immediate explosive eruption
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

        // Orient bat facing forward along flight path
        const lookAhead = Math.min(1.0, bat.progress + 0.04);
        const forwardPt = bat.curve.getPointAt(lookAhead);
        bat.group.lookAt(forwardPt);

        // Rapid flapping wings
        const flapAngle = Math.sin(clockTime * bat.flapSpeed + bat.flapPhase) * 0.85;
        bat.leftWing.rotation.z = flapAngle;
        bat.rightWing.rotation.z = -flapAngle;

        // Dynamic banking roll
        bat.group.rotation.z = flapAngle * 0.22;
      } else {
        bat.group.visible = false;
      }
    }

    if (!anyAlive && this.bats[0].elapsed > 2.8) {
      this.isActive = false;
    }
  }
}
