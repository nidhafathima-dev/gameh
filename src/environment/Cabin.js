import * as THREE from 'three';

export class Cabin {
  constructor(scene) {
    this.scene = scene;
    this.cabinGroup = new THREE.Group();
    this.cabinGroup.position.set(0, 0, -28.5);

    this.candleLights = [];
    this.candleFlames = [];
    this.doorPivot = null;
    this.dustParticles = null;
    this.tablePosition = new THREE.Vector3(0, 0.85, -29.0);

    // Weathered Exterior Lights & Door Slam Animation
    this.windowLight = null;
    this.sideWindowLight = null;
    this.porchLight = null;
    this.isDoorSlamming = false;
    this.doorSlamTime = 0;
    this.currentDoorAngle = 0;
    this.targetDoorAngle = 0;
    this.cabinMistSprites = [];

    this.init();
  }

  init() {
    this.createMaterials();
    this.createExterior();
    this.createInterior();
    this.createDoor();
    this.createTableAndCandelabra();
    this.createDustMotes();
    this.createCabinMist();

    this.scene.add(this.cabinGroup);
  }

  createMaterials() {
    // Weathered dark wood texture for exterior
    const extCanvas = document.createElement('canvas');
    extCanvas.width = 512;
    extCanvas.height = 512;
    const ctx = extCanvas.getContext('2d');
    ctx.fillStyle = '#1c1611';
    ctx.fillRect(0, 0, 512, 512);
    // Planks
    for (let y = 0; y < 512; y += 32) {
      ctx.fillStyle = '#0f0a07';
      ctx.fillRect(0, y, 512, 3);
      for (let x = 0; x < 512; x += 4) {
        ctx.fillStyle = Math.random() > 0.5 ? '#241d17' : '#18130e';
        ctx.fillRect(x, y + 3, 4, 29);
      }
    }
    const extTex = new THREE.CanvasTexture(extCanvas);
    extTex.wrapS = THREE.RepeatWrapping;
    extTex.wrapT = THREE.RepeatWrapping;

    this.extWoodMat = new THREE.MeshStandardMaterial({
      map: extTex,
      roughness: 0.92,
      metalness: 0.05,
    });

    // Aged warm walnut wood for interior
    const intCanvas = document.createElement('canvas');
    intCanvas.width = 512;
    intCanvas.height = 512;
    const intCtx = intCanvas.getContext('2d');
    intCtx.fillStyle = '#26170e';
    intCtx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 24) {
      intCtx.fillStyle = '#150a04';
      intCtx.fillRect(0, y, 512, 2);
      for (let x = 0; x < 512; x += 4) {
        intCtx.fillStyle = Math.random() > 0.5 ? '#301c10' : '#22140b';
        intCtx.fillRect(x, y + 2, 4, 22);
      }
    }
    const intTex = new THREE.CanvasTexture(intCanvas);
    intTex.wrapS = THREE.RepeatWrapping;
    intTex.wrapT = THREE.RepeatWrapping;

    this.intWoodMat = new THREE.MeshStandardMaterial({
      map: intTex,
      roughness: 0.82,
      metalness: 0.08,
    });

    // Dark shingle roof
    this.roofMat = new THREE.MeshStandardMaterial({
      color: 0x141615,
      roughness: 0.95,
      metalness: 0.02,
    });

    // Brass/iron
    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0x8a703b,
      roughness: 0.45,
      metalness: 0.7,
    });
  }

  createExterior() {
    // Cabin dimensions: width 7m, height 3.8m, depth 7m
    const w = 7.2;
    const h = 3.6;
    const d = 7.0;

    // Outer Back wall
    const backWallGeo = new THREE.BoxGeometry(w, h, 0.3);
    const backWall = new THREE.Mesh(backWallGeo, this.extWoodMat);
    backWall.position.set(0, h / 2, -d / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.cabinGroup.add(backWall);

    // Left wall
    const sideWallGeo = new THREE.BoxGeometry(0.3, h, d);
    const leftWall = new THREE.Mesh(sideWallGeo, this.extWoodMat);
    leftWall.position.set(-w / 2, h / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.cabinGroup.add(leftWall);

    // Right wall with window
    const rightWall = new THREE.Mesh(sideWallGeo, this.extWoodMat);
    rightWall.position.set(w / 2, h / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.cabinGroup.add(rightWall);

    // Front Wall with door opening in center (door is 1.6m wide, 2.6m high)
    // Left front piece
    const frontSideGeo = new THREE.BoxGeometry((w - 1.8) / 2, h, 0.3);
    const frontLeft = new THREE.Mesh(frontSideGeo, this.extWoodMat);
    frontLeft.position.set(-(w / 2 - (w - 1.8) / 4), h / 2, d / 2);
    frontLeft.castShadow = true;
    this.cabinGroup.add(frontLeft);

    // Right front piece
    const frontRight = new THREE.Mesh(frontSideGeo, this.extWoodMat);
    frontRight.position.set(w / 2 - (w - 1.8) / 4, h / 2, d / 2);
    frontRight.castShadow = true;
    this.cabinGroup.add(frontRight);

    // Lintel above door
    const lintelGeo = new THREE.BoxGeometry(1.8, h - 2.5, 0.3);
    const lintel = new THREE.Mesh(lintelGeo, this.extWoodMat);
    lintel.position.set(0, 2.5 + (h - 2.5) / 2, d / 2);
    lintel.castShadow = true;
    this.cabinGroup.add(lintel);

    // Pitched Roof
    const roofLeftGeo = new THREE.BoxGeometry(w * 0.65, 0.2, d + 1.2);
    roofLeftGeo.rotateZ(Math.PI / 6);
    const roofLeft = new THREE.Mesh(roofLeftGeo, this.roofMat);
    roofLeft.position.set(-1.8, h + 0.9, 0);
    roofLeft.castShadow = true;
    roofLeft.receiveShadow = true;
    this.cabinGroup.add(roofLeft);

    const roofRightGeo = new THREE.BoxGeometry(w * 0.65, 0.2, d + 1.2);
    roofRightGeo.rotateZ(-Math.PI / 6);
    const roofRight = new THREE.Mesh(roofRightGeo, this.roofMat);
    roofRight.position.set(1.8, h + 0.9, 0);
    roofRight.castShadow = true;
    roofRight.receiveShadow = true;
    this.cabinGroup.add(roofRight);

    // Gable triangular ends
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-w / 2, 0);
    gableShape.lineTo(0, 1.8);
    gableShape.lineTo(w / 2, 0);
    gableShape.closePath();
    const gableGeo = new THREE.ShapeGeometry(gableShape);
    const frontGable = new THREE.Mesh(gableGeo, this.extWoodMat);
    frontGable.position.set(0, h, d / 2 + 0.05);
    this.cabinGroup.add(frontGable);

    // Front Porch Deck & Steps
    const porchGeo = new THREE.BoxGeometry(w + 0.6, 0.3, 2.4);
    const porch = new THREE.Mesh(porchGeo, this.extWoodMat);
    porch.position.set(0, 0.15, d / 2 + 1.2);
    porch.receiveShadow = true;
    this.cabinGroup.add(porch);

    // Weathered lower porch step with slight uneven wear
    const stepGeo = new THREE.BoxGeometry(w * 0.58, 0.16, 0.75);
    const step = new THREE.Mesh(stepGeo, this.extWoodMat);
    step.position.set(0, 0.08, d / 2 + 2.5);
    step.rotation.y = 0.025;
    step.receiveShadow = true;
    this.cabinGroup.add(step);

    // Porch posts (crooked and weathered with natural structural settling)
    const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.8, 8);
    const post1 = new THREE.Mesh(postGeo, this.extWoodMat);
    post1.position.set(-w / 2 + 0.2, 1.4, d / 2 + 2.2);
    post1.rotation.z = -0.055;
    post1.rotation.x = 0.04;
    post1.castShadow = true;
    this.cabinGroup.add(post1);

    const post2 = new THREE.Mesh(postGeo, this.extWoodMat);
    post2.position.set(w / 2 - 0.2, 1.4, d / 2 + 2.2);
    post2.rotation.z = 0.048;
    post2.rotation.x = -0.045;
    post2.castShadow = true;
    this.cabinGroup.add(post2);

    // Faint warm porch lantern hanging from porch eave
    const lanternGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.35, 6);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffaa44,
      emissive: 0x553311,
      roughness: 0.3,
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(post1.position.x + 0.25, 2.1, post1.position.z);
    this.cabinGroup.add(lantern);

    this.porchLight = new THREE.PointLight(0xff9944, 1.2, 18, 1.5);
    this.porchLight.position.copy(lantern.position);
    this.cabinGroup.add(this.porchLight);

    // Warm glowing window on front right
    const windowGeo = new THREE.PlaneGeometry(0.9, 1.1);
    const windowMat = new THREE.MeshBasicMaterial({
      color: 0xffa044,
      transparent: true,
      opacity: 0.85,
    });
    const frontWindow = new THREE.Mesh(windowGeo, windowMat);
    frontWindow.position.set(2.2, 1.8, d / 2 + 0.16);
    this.cabinGroup.add(frontWindow);

    // Window muntin grid
    const gridGeo = new THREE.BoxGeometry(0.92, 0.04, 0.05);
    const gridMat = this.extWoodMat;
    const hBar = new THREE.Mesh(gridGeo, gridMat);
    hBar.position.copy(frontWindow.position);
    this.cabinGroup.add(hBar);

    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.12, 0.05), gridMat);
    vBar.position.copy(frontWindow.position);
    this.cabinGroup.add(vBar);

    // Warm beacon light shining from front window down path
    this.windowLight = new THREE.PointLight(0xff8833, 1.6, 25, 1.4);
    this.windowLight.position.set(2.2, 1.8, d / 2 + 0.4);
    this.cabinGroup.add(this.windowLight);

    // Side window on left wall with subtle interior amber glow
    const sideWindow = new THREE.Mesh(windowGeo, windowMat);
    sideWindow.position.set(-w / 2 - 0.02, 1.8, 0);
    sideWindow.rotateY(-Math.PI / 2);
    this.cabinGroup.add(sideWindow);

    this.sideWindowLight = new THREE.PointLight(0xff7722, 1.0, 15, 1.6);
    this.sideWindowLight.position.set(-w / 2 - 0.3, 1.8, 0);
    this.cabinGroup.add(this.sideWindowLight);

    // Moss clumps clinging to foundation corners and porch edges
    const mossGeo = new THREE.SphereGeometry(0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x1d2c20, roughness: 0.95 });
    const mossPositions = [
      [-w / 2 + 0.15, 0, d / 2 + 0.15],
      [w / 2 - 0.15, 0, d / 2 + 0.15],
      [-w / 2 + 0.15, 0, -d / 2 + 0.15],
      [w / 2 - 0.15, 0, -d / 2 + 0.15],
      [-1.3, 0, d / 2 + 1.2],
      [1.4, 0, d / 2 + 1.2],
    ];
    mossPositions.forEach(([mx, my, mz]) => {
      const m = new THREE.Mesh(mossGeo, mossMat);
      m.position.set(mx, my, mz);
      m.scale.set(1.4, 0.55, 1.4);
      this.cabinGroup.add(m);
    });
  }

  createInterior() {
    const w = 6.8;
    const h = 3.4;
    const d = 6.6;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(w, d);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, this.intWoodMat);
    floor.position.set(0, 0.02, 0);
    floor.receiveShadow = true;
    this.cabinGroup.add(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(w, d);
    ceilGeo.rotateX(Math.PI / 2);
    const ceil = new THREE.Mesh(ceilGeo, this.intWoodMat);
    ceil.position.set(0, h, 0);
    this.cabinGroup.add(ceil);

    // Interior walls
    const intWallMat = this.intWoodMat;
    const backInt = new THREE.Mesh(new THREE.PlaneGeometry(w, h), intWallMat);
    backInt.position.set(0, h / 2, -d / 2 + 0.02);
    this.cabinGroup.add(backInt);

    const leftInt = new THREE.Mesh(new THREE.PlaneGeometry(d, h), intWallMat);
    leftInt.rotateY(Math.PI / 2);
    leftInt.position.set(-w / 2 + 0.02, h / 2, 0);
    this.cabinGroup.add(leftInt);

    const rightInt = new THREE.Mesh(new THREE.PlaneGeometry(d, h), intWallMat);
    rightInt.rotateY(-Math.PI / 2);
    rightInt.position.set(w / 2 - 0.02, h / 2, 0);
    this.cabinGroup.add(rightInt);
  }

  createDoor() {
    // Door opening is width 1.6m, height 2.5m at front wall Z = 3.5m
    const doorW = 1.6;
    const doorH = 2.45;
    const doorD = 0.12;

    // We create a hinge pivot at the left edge of the doorway
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(-doorW / 2, 0, 3.5);

    const doorGeo = new THREE.BoxGeometry(doorW, doorH, doorD);
    doorGeo.translate(doorW / 2, doorH / 2, 0); // Offset geometry so pivot is at hinge edge

    const doorMesh = new THREE.Mesh(doorGeo, this.extWoodMat);
    doorMesh.castShadow = true;
    doorMesh.receiveShadow = true;

    // Iron handle and cross braces
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
    const handle = new THREE.Mesh(handleGeo, this.brassMat);
    handle.position.set(doorW - 0.18, 1.1, 0.1);
    doorMesh.add(handle);

    // Iron latch ring
    const ringGeo = new THREE.TorusGeometry(0.06, 0.015, 6, 12);
    const ring = new THREE.Mesh(ringGeo, this.brassMat);
    ring.position.set(doorW - 0.18, 1.1, 0.13);
    doorMesh.add(ring);

    this.doorPivot.add(doorMesh);
    this.cabinGroup.add(this.doorPivot);
  }

  setDoorOpen(angle) {
    if (this.doorPivot) {
      // Swings inward into the cabin
      this.currentDoorAngle = angle;
      this.doorPivot.rotation.y = -angle;
    }
  }

  // Explosive door slam with dynamic wooden rebound bounce
  slamDoorOpen() {
    this.isDoorSlamming = true;
    this.doorSlamTime = 0;
    this.targetDoorAngle = Math.PI * 0.64; // ~115 degrees inward
  }

  createTableAndCandelabra() {
    // Rustic heavy wooden table in cabin center
    this.tableGroup = new THREE.Group();
    this.tableGroup.position.set(0, 0, -0.6); // relative to cabinGroup

    const tableTopGeo = new THREE.BoxGeometry(2.4, 0.1, 1.5);
    const tableTop = new THREE.Mesh(tableTopGeo, this.intWoodMat);
    tableTop.position.set(0, 0.8, 0);
    tableTop.receiveShadow = true;
    tableTop.castShadow = true;
    this.tableGroup.add(tableTop);

    // Table legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.8, 6);
    const legPositions = [
      [-1.0, 0.4, -0.6],
      [1.0, 0.4, -0.6],
      [-1.0, 0.4, 0.6],
      [1.0, 0.4, 0.6],
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, this.intWoodMat);
      leg.position.set(...pos);
      leg.castShadow = true;
      this.tableGroup.add(leg);
    });

    // Antique Candelabra behind the Ouija board
    const candelabraGroup = new THREE.Group();
    candelabraGroup.position.set(0, 0.85, -0.45);

    // Stand base and stem
    const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.05, 12);
    const base = new THREE.Mesh(baseGeo, this.brassMat);
    candelabraGroup.add(base);

    const stemGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.35, 8);
    const stem = new THREE.Mesh(stemGeo, this.brassMat);
    stem.position.y = 0.2;
    candelabraGroup.add(stem);

    // 3 Candle branches
    const candlePositions = [
      new THREE.Vector3(-0.25, 0.35, 0),
      new THREE.Vector3(0, 0.42, 0),
      new THREE.Vector3(0.25, 0.35, 0),
    ];

    const candleWaxGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.22, 8);
    const candleWaxMat = new THREE.MeshStandardMaterial({
      color: 0xeadbb8,
      roughness: 0.6,
    });

    const flameGeo = new THREE.ConeGeometry(0.02, 0.07, 8);
    flameGeo.translate(0, 0.035, 0);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44,
    });

    candlePositions.forEach((pos, idx) => {
      const wax = new THREE.Mesh(candleWaxGeo, candleWaxMat);
      wax.position.copy(pos);
      wax.castShadow = true;
      candelabraGroup.add(wax);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(pos.x, pos.y + 0.12, pos.z);
      candelabraGroup.add(flame);
      this.candleFlames.push(flame);

      // Flickering point light
      const candleLight = new THREE.PointLight(0xffa238, 0.9 + idx * 0.2, 7.5, 1.8);
      candleLight.position.set(pos.x, pos.y + 0.18, pos.z);
      candleLight.castShadow = true;
      candleLight.shadow.bias = -0.002;
      candleLight.shadow.mapSize.width = 1024;
      candleLight.shadow.mapSize.height = 1024;
      candelabraGroup.add(candleLight);
      this.candleLights.push(candleLight);
    });

    this.tableGroup.add(candelabraGroup);
    this.cabinGroup.add(this.tableGroup);
  }

  createDustMotes() {
    // Illuminated golden dust motes swirling over the table in the candlelight
    const dustCount = 85;
    const dustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);
    const phases = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2.2;
      positions[i * 3 + 1] = 0.9 + Math.random() * 1.5;
      positions[i * 3 + 2] = -0.6 + (Math.random() - 0.5) * 1.8;
      phases[i] = Math.random() * Math.PI * 2;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Circular soft glowing dust texture
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 64;
    dustCanvas.height = 64;
    const dctx = dustCanvas.getContext('2d');
    const dgrad = dctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    dgrad.addColorStop(0, 'rgba(255, 230, 160, 1)');
    dgrad.addColorStop(0.4, 'rgba(235, 180, 80, 0.6)');
    dgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dctx.fillStyle = dgrad;
    dctx.fillRect(0, 0, 64, 64);
    const dustTex = new THREE.CanvasTexture(dustCanvas);

    const dustMat = new THREE.PointsMaterial({
      size: 0.05,
      map: dustTex,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.dustParticles = new THREE.Points(dustGeo, dustMat);
    this.dustPhases = phases;
    this.tableGroup.add(this.dustParticles);
  }

  createCabinMist() {
    // Low mist hovering around cabin foundation and porch steps
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(190, 215, 225, 0.35)');
    grad.addColorStop(0.5, 'rgba(160, 190, 205, 0.18)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    for (let i = 0; i < 8; i++) {
      const sprite = new THREE.Sprite(mat);
      const angle = (i / 8) * Math.PI * 2;
      sprite.position.set(
        Math.cos(angle) * 4.2 + (Math.random() - 0.5) * 1.5,
        0.35 + Math.random() * 0.6,
        Math.sin(angle) * 4.2 + (Math.random() - 0.5) * 1.5
      );
      sprite.scale.set(6 + Math.random() * 4, 2.2, 1);
      this.cabinGroup.add(sprite);
      this.cabinMistSprites.push({
        sprite,
        baseX: sprite.position.x,
        speed: 0.008 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // Get world position of table center for camera targeting
  getTableWorldPosition() {
    const target = new THREE.Vector3();
    this.tableGroup.getWorldPosition(target);
    target.y += 0.85; // On table surface
    return target;
  }

  update(delta, clockTime) {
    // 1. Explosive Door Slam with Dynamic Rebound Physics
    if (this.isDoorSlamming && this.doorPivot) {
      this.doorSlamTime += delta;
      const dur = 0.35; // Fast violent slam
      if (this.doorSlamTime < dur) {
        const p = this.doorSlamTime / dur;
        const ease = Math.sin(p * Math.PI * 0.5);
        // High frequency dampening bounce as door strikes interior stop
        const bounce = Math.sin(p * Math.PI * 4.0) * 0.08 * Math.exp(-p * 6.0);
        this.currentDoorAngle = (ease * this.targetDoorAngle) + bounce;
      } else {
        this.currentDoorAngle = this.targetDoorAngle;
        this.isDoorSlamming = false;
      }
      this.doorPivot.rotation.y = -this.currentDoorAngle;
    }

    // 2. Weathered Window & Porch Lights Eerie Amber Glow & Flicker
    if (this.windowLight) {
      const flicker = Math.sin(clockTime * 14.0) * 0.18 + Math.cos(clockTime * 7.5) * 0.12 + (Math.random() - 0.5) * 0.08;
      this.windowLight.intensity = Math.max(0.9, 1.6 + flicker);
    }
    if (this.sideWindowLight) {
      const sflicker = Math.sin(clockTime * 11.5 + 1.2) * 0.15 + (Math.random() - 0.5) * 0.06;
      this.sideWindowLight.intensity = Math.max(0.6, 1.0 + sflicker);
    }
    if (this.porchLight) {
      const pflicker = Math.sin(clockTime * 9.0 + 2.4) * 0.12 + (Math.random() - 0.5) * 0.05;
      this.porchLight.intensity = Math.max(0.7, 1.2 + pflicker);
    }

    // 3. Realistic candle flame flickering and light intensity jitter inside cabin
    for (let i = 0; i < this.candleLights.length; i++) {
      const light = this.candleLights[i];
      const flame = this.candleFlames[i];
      const noise = Math.sin(clockTime * 12 + i * 2.8) * Math.cos(clockTime * 19 + i * 1.7);
      light.intensity = 0.85 + noise * 0.22 + Math.random() * 0.08;

      if (flame) {
        flame.scale.set(
          1 + noise * 0.15,
          1 + Math.sin(clockTime * 15 + i) * 0.25,
          1 + noise * 0.15
        );
      }
    }

    // 4. Swirling interior dust motes
    if (this.dustParticles) {
      const pos = this.dustParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        let x = pos.getX(i);
        let z = pos.getZ(i);

        const phase = this.dustPhases[i];
        x += Math.sin(clockTime * 0.8 + phase) * 0.002;
        y += Math.cos(clockTime * 0.6 + phase) * 0.0015;
        z += Math.sin(clockTime * 0.5 + phase * 2) * 0.002;

        if (y > 2.4) y = 0.9;
        if (y < 0.85) y = 2.3;

        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }

    // 5. Low-lying cabin perimeter mist drift
    for (let i = 0; i < this.cabinMistSprites.length; i++) {
      const item = this.cabinMistSprites[i];
      item.sprite.position.x = item.baseX + Math.sin(clockTime * 0.5 + item.phase) * 0.6;
    }
  }
}
