import * as THREE from 'three';

export class Forest {
  constructor(scene, shadowPhenomena = null) {
    this.scene = scene;
    this.shadows = shadowPhenomena;

    this.trees = [];
    this.largeBranches = [];
    this.foliageClusters = []; // Individual needle clusters for unsynchronized subtle movement
    this.bushes = [];
    this.ferns = [];
    this.windTime = 0;
    this.windIntensity = 0.4;

    // The winding guided path spline from awakening (Z=24) to cabin porch (Z=-23.5)
    this.pathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 24),
      new THREE.Vector3(-1.4, 0.08, 16),
      new THREE.Vector3(1.6, 0.14, 8),
      new THREE.Vector3(0.2, 0.18, 0),
      new THREE.Vector3(-1.2, 0.22, -8),
      new THREE.Vector3(0.9, 0.28, -16),
      new THREE.Vector3(0.0, 0.35, -23.5),
    ]);

    this.init();
  }

  init() {
    this.createMaterials();
    this.createTerrain();
    this.createFallenLogs();
    this.createMossyRocks();
    this.createForegroundFramingTrees();
    this.createMidgroundMatureConifers();
    this.createDistantBackgroundTrees();
    this.createUndergrowthAndFerns();
    this.createDriftingLeaves();
    this.createLowLyingMist();
  }

  createMaterials() {
    // 1. Organic Forest Floor: Damp earth, pine needles, trampled moss
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 1024;
    groundCanvas.height = 1024;
    const gctx = groundCanvas.getContext('2d');

    // Base charcoal earthy loam
    gctx.fillStyle = '#161d1f';
    gctx.fillRect(0, 0, 1024, 1024);

    // Muted grey-green moss patches
    const mossColors = ['#202c28', '#1a2422', '#26342d', '#17201c', '#2c3c33'];
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = 3 + Math.random() * 12;
      gctx.fillStyle = mossColors[Math.floor(Math.random() * mossColors.length)];
      gctx.beginPath();
      gctx.arc(x, y, r, 0, Math.PI * 2);
      gctx.fill();
    }

    // Scattered pine needles and dead twigs
    gctx.lineWidth = 1.6;
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      gctx.strokeStyle = Math.random() > 0.4 ? '#2c221a' : '#1a1f1d';
      gctx.beginPath();
      gctx.moveTo(x, y);
      gctx.lineTo(x + (Math.random() * 16 - 8), y + (Math.random() * 16 - 8));
      gctx.stroke();
    }

    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(10, 10);

    this.groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.94,
      metalness: 0.04,
      color: 0x90a09e, // Tinted for realistic natural brightness in mist
    });

    // 2. Realistic Mature Conifer Bark Texture
    const barkCanvas = document.createElement('canvas');
    barkCanvas.width = 512;
    barkCanvas.height = 1024;
    const bctx = barkCanvas.getContext('2d');

    bctx.fillStyle = '#1a1817'; // Charcoal-brown base
    bctx.fillRect(0, 0, 512, 1024);

    // Deep vertical bark fissures and plates
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 1024;
      const len = 50 + Math.random() * 180;
      bctx.strokeStyle = Math.random() > 0.5 ? '#2d2621' : '#100e0d';
      bctx.lineWidth = 2 + Math.random() * 5;
      bctx.beginPath();
      bctx.moveTo(x, y);
      bctx.lineTo(x + (Math.random() * 8 - 4), y + len);
      bctx.stroke();
    }

    // Lichen and moss patches on bark
    for (let i = 0; i < 90; i++) {
      bctx.fillStyle = 'rgba(40, 56, 48, 0.4)';
      bctx.beginPath();
      bctx.arc(Math.random() * 512, Math.random() * 1024, 18 + Math.random() * 32, 0, Math.PI * 2);
      bctx.fill();
    }

    const barkTex = new THREE.CanvasTexture(barkCanvas);
    barkTex.wrapS = THREE.RepeatWrapping;
    barkTex.wrapT = THREE.RepeatWrapping;
    barkTex.repeat.set(2, 6);

    this.barkMat = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.9,
      metalness: 0.05,
    });

    // 3. Dense Pine Needle Cluster Material (Deep forest conifer green)
    this.needleMat = new THREE.MeshStandardMaterial({
      color: 0x1a2e26, // Muted cool forest pine green
      roughness: 0.85,
      metalness: 0.08,
      flatShading: true,
    });

    // Foreground silhouetted needle material (darker for framing against background mist)
    this.foregroundNeedleMat = new THREE.MeshStandardMaterial({
      color: 0x121e1a,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });

    // 4. Woodland Fern & Bush Leaf Material
    this.fernMat = new THREE.MeshStandardMaterial({
      color: 0x223c2e,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });

    // 5. Granite Boulder Material
    this.rockMat = new THREE.MeshStandardMaterial({
      color: 0x2a3538,
      roughness: 0.92,
      metalness: 0.06,
    });
  }

  createTerrain() {
    const geo = new THREE.PlaneGeometry(120, 120, 80, 80);
    geo.rotateX(-Math.PI / 2);

    // Natural undulating forest terrain with gentle hollows and dips
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Distance from the guided path
      const clampedT = Math.max(0, Math.min(1, (24 - z) / 48));
      const pt = this.pathCurve.getPointAt(clampedT);
      const distToPath = Math.sqrt((x - pt.x) ** 2 + (z - pt.z) ** 2);

      // Natural rolling woodland ground undulations
      let y = Math.sin(x * 0.12) * Math.cos(z * 0.1) * 0.55 + Math.sin(x * 0.3) * 0.18;
      if (distToPath < 2.2) {
        y *= 0.15; // Flatten gently for the guided walking corridor
      } else {
        y += (distToPath - 2.2) * 0.07;
      }
      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    this.terrain = new THREE.Mesh(geo, this.groundMat);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  createFallenLogs() {
    // Scattered rotting tree trunks and dead fallen branches on the ground
    const logGeo = new THREE.CylinderGeometry(0.2, 0.26, 4.5, 7);
    logGeo.rotateZ(Math.PI / 2);

    for (let i = 0; i < 18; i++) {
      const t = Math.random();
      const pt = this.pathCurve.getPointAt(t);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 2.4 + Math.random() * 8.0;

      const log = new THREE.Mesh(logGeo, this.barkMat);
      log.position.set(pt.x + side * dist, 0.18, pt.z + (Math.random() * 4 - 2));
      log.rotation.y = Math.random() * Math.PI;
      log.rotation.z = (Math.random() - 0.5) * 0.12;
      log.castShadow = true;
      log.receiveShadow = true;
      this.scene.add(log);
    }
  }

  createMossyRocks() {
    const rockGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const pos = rockGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const scale = 0.75 + Math.random() * 0.45;
      pos.setXYZ(i, vx * scale, vy * scale * 0.65, vz * scale);
    }
    rockGeo.computeVertexNormals();

    for (let i = 0; i < 35; i++) {
      const rock = new THREE.Mesh(rockGeo, this.rockMat);
      const pathT = Math.random();
      const pt = this.pathCurve.getPointAt(pathT);
      const side = Math.random() > 0.5 ? 1 : -1;
      const offsetDist = 2.2 + Math.random() * 14;

      rock.position.set(
        pt.x + side * offsetDist,
        0.15 + Math.random() * 0.25,
        pt.z + (Math.random() * 5 - 2.5)
      );
      const s = 0.5 + Math.random() * 1.1;
      rock.scale.set(s, s * (0.6 + Math.random() * 0.4), s);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  createForegroundFramingTrees() {
    // Massive conifer trees flanking the path with long overlapping branches
    // extending across the upper foreground, framing the camera's view in dark silhouettes
    const framingConfigs = [
      { x: 3.2, z: 20.0, height: 22, reachDir: -1, branchY: 3.2, branchLen: 4.8 },
      { x: -3.4, z: 14.0, height: 24, reachDir: 1, branchY: 3.6, branchLen: 5.2 },
      { x: 3.5, z: 6.0, height: 23, reachDir: -1, branchY: 3.4, branchLen: 4.9 },
      { x: -3.2, z: -2.0, height: 25, reachDir: 1, branchY: 3.8, branchLen: 5.4 },
      { x: 3.6, z: -10.0, height: 24, reachDir: -1, branchY: 3.5, branchLen: 5.0 },
      { x: -3.5, z: -18.0, height: 26, reachDir: 1, branchY: 3.8, branchLen: 5.2 },
    ];

    framingConfigs.forEach((cfg) => {
      const tree = this.buildMatureConiferTree(cfg.height, 0.65, true);
      tree.group.position.set(cfg.x, 0, cfg.z);

      // Add prominent low-reaching foreground branch extending directly over the path
      const framingBranchGroup = new THREE.Group();
      framingBranchGroup.position.set(0, cfg.branchY, 0);

      const branchGeo = new THREE.CylinderGeometry(0.08, 0.16, cfg.branchLen, 6);
      branchGeo.translate(0, cfg.branchLen / 2, 0);
      branchGeo.rotateZ(cfg.reachDir * (Math.PI / 2.4)); // Reaching horizontally across path
      const branchMesh = new THREE.Mesh(branchGeo, this.barkMat);
      branchMesh.castShadow = true;
      framingBranchGroup.add(branchMesh);

      // Foliage clusters along this framing branch
      for (let f = 1; f <= 3; f++) {
        const clusterGeo = new THREE.ConeGeometry(1.6 - f * 0.3, 1.4, 7);
        clusterGeo.rotateZ(cfg.reachDir * (Math.PI / 6));
        const cluster = new THREE.Mesh(clusterGeo, this.foregroundNeedleMat);
        cluster.position.set(cfg.reachDir * (f * (cfg.branchLen / 3.4)), -0.2, 0);
        cluster.castShadow = true;
        framingBranchGroup.add(cluster);

        // Register for subtle wind sway
        this.foliageClusters.push({
          mesh: cluster,
          freq: 1.2 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
          amplitude: 0.022,
        });
      }

      tree.group.add(framingBranchGroup);
      this.largeBranches.push({
        group: framingBranchGroup,
        freq: 0.7 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      });

      this.scene.add(tree.group);
      this.trees.push(tree.group);
    });
  }

  createMidgroundMatureConifers() {
    // 75 mature conifer trees staggered irregularly on both sides of the path
    for (let i = 0; i < 75; i++) {
      const t = Math.random();
      const pt = this.pathCurve.getPointAt(t);

      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 3.2 + Math.random() * 16.0;
      const x = pt.x + side * dist;
      const z = pt.z + (Math.random() * 6 - 3);

      // Clear cabin footprint at Z ≈ -24
      if (Math.abs(x) < 4.8 && z < -18 && z > -33) continue;

      const height = 14 + Math.random() * 10;
      const trunkRadius = 0.38 + Math.random() * 0.28;

      const tree = this.buildMatureConiferTree(height, trunkRadius, false);
      tree.group.position.set(x, 0, z);

      // Natural subtle tilt (trunks remain stationary during runtime!)
      tree.group.rotation.z = (Math.random() - 0.5) * 0.08;
      tree.group.rotation.x = (Math.random() - 0.5) * 0.08;

      this.scene.add(tree.group);
      this.trees.push(tree.group);
    }
  }

  createDistantBackgroundTrees() {
    // 45 dense background trees disappearing into the lighter cool blue mist
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 22 + Math.random() * 26;
      const x = Math.cos(angle) * radius;
      const z = -4 + Math.sin(angle) * (radius * 0.9);

      if (Math.abs(x) < 4.8 && z < -18 && z > -33) continue;

      const height = 18 + Math.random() * 9;
      const trunkRadius = 0.4 + Math.random() * 0.25;

      const tree = this.buildMatureConiferTree(height, trunkRadius, false);
      tree.group.position.set(x, 0, z);

      this.scene.add(tree.group);
      this.trees.push(tree.group);
    }
  }

  buildMatureConiferTree(height, trunkRadius, isForeground) {
    const treeGroup = new THREE.Group();

    // 1. Irregular Tapering Trunk (100% stationary)
    const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.45, trunkRadius, height, 9);
    trunkGeo.translate(0, height / 2, 0);
    const trunk = new THREE.Mesh(trunkGeo, this.barkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // 2. Multi-tier Drooping Pine Needle Clusters
    const tiers = 7 + Math.floor(Math.random() * 4);
    const mat = isForeground ? this.foregroundNeedleMat : this.needleMat;

    for (let t = 0; t < tiers; t++) {
      const tierRatio = t / tiers;
      const tierY = height * (0.32 + tierRatio * 0.68);
      const tierRadius = (1 - tierRatio * 0.75) * (3.0 + Math.random() * 1.0);
      const tierHeight = (height / tiers) * 1.5;

      // Realistic cone cluster with slight random rotation
      const coneGeo = new THREE.ConeGeometry(tierRadius, tierHeight, 8);
      coneGeo.translate(0, tierHeight / 2, 0);
      const foliage = new THREE.Mesh(coneGeo, mat);
      foliage.position.y = tierY;
      foliage.rotation.y = Math.random() * Math.PI * 2;
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      treeGroup.add(foliage);

      // Register individual foliage tier for subtle unsynchronized gentle sway
      this.foliageClusters.push({
        mesh: foliage,
        freq: 1.0 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        amplitude: 0.018,
      });

      // Irregular dead lower horizontal branches
      if (t < 3) {
        const branchGeo = new THREE.CylinderGeometry(0.04, 0.07, tierRadius * 1.1, 5);
        branchGeo.rotateZ(Math.PI / 2.3);
        const branch = new THREE.Mesh(branchGeo, this.barkMat);
        branch.position.set(0, tierY * 0.94, 0);
        branch.rotation.y = Math.random() * Math.PI * 2;
        treeGroup.add(branch);
      }
    }

    return { group: treeGroup };
  }

  createUndergrowthAndFerns() {
    // Dense woodland ferns and wild undergrowth bushes
    const fernGeo = new THREE.PlaneGeometry(0.9, 1.5);
    fernGeo.rotateX(Math.PI / 3);

    for (let i = 0; i < 110; i++) {
      const pathT = Math.random();
      const pt = this.pathCurve.getPointAt(pathT);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 1.6 + Math.random() * 7.5;

      const clump = new THREE.Group();
      clump.position.set(pt.x + side * dist, 0.08, pt.z + (Math.random() * 4 - 2));

      // Circular arrangement of arching fern fronds
      const frondCount = 6;
      for (let f = 0; f < frondCount; f++) {
        const frond = new THREE.Mesh(fernGeo, this.fernMat);
        frond.rotation.y = (f / frondCount) * Math.PI * 2 + Math.random() * 0.3;
        frond.rotation.z = 0.25 + Math.random() * 0.25;
        clump.add(frond);
      }

      this.scene.add(clump);
      this.ferns.push({
        group: clump,
        freq: 2.0 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      });

      // Register nearby bushes with the ShadowPhenomena system for random rustle events
      if (this.shadows && dist < 8.0) {
        this.shadows.registerBush(clump);
      }
    }
  }

  createDriftingLeaves() {
    // 3D Fluttering loose leaves drifting through the mist
    const leafCount = 85;
    const leafGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(leafCount * 3);
    const speeds = new Float32Array(leafCount);

    for (let i = 0; i < leafCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = 0.8 + Math.random() * 7;
      positions[i * 3 + 2] = -24 + Math.random() * 52;
      speeds[i] = 0.015 + Math.random() * 0.03;
    }

    leafGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom textured leaf point
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4a3220'; // Dry autumn leaf brown
    ctx.beginPath();
    ctx.ellipse(32, 32, 20, 11, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    const leafTex = new THREE.CanvasTexture(canvas);
    const leafMat = new THREE.PointsMaterial({
      size: 0.32,
      map: leafTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.leavesParticles = new THREE.Points(leafGeo, leafMat);
    this.leavesSpeeds = speeds;
    this.scene.add(this.leavesParticles);
  }

  createLowLyingMist() {
    // Layered drifting volumetric mist hovering right above the forest floor
    const mistCount = 48;
    const mistCanvas = document.createElement('canvas');
    mistCanvas.width = 256;
    mistCanvas.height = 256;
    const ctx = mistCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 15, 128, 128, 120);
    grad.addColorStop(0, 'rgba(185, 205, 215, 0.28)'); // Cool blue-grey mist
    grad.addColorStop(0.5, 'rgba(150, 175, 185, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const mistTex = new THREE.CanvasTexture(mistCanvas);
    const mistMat = new THREE.SpriteMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.mistSprites = [];
    for (let i = 0; i < mistCount; i++) {
      const sprite = new THREE.Sprite(mistMat);
      sprite.position.set(
        (Math.random() - 0.5) * 44,
        0.4 + Math.random() * 2.2, // Hovering around forest floor
        -28 + Math.random() * 56
      );
      const s = 12 + Math.random() * 16;
      sprite.scale.set(s, s * 0.45, 1);
      this.scene.add(sprite);
      this.mistSprites.push({
        sprite,
        driftSpeed: 0.006 + Math.random() * 0.012,
      });
    }
  }

  update(delta, clockTime) {
    this.windTime += delta * this.windIntensity;

    // 1. Subtle, unsynchronized branch & foliage movement (TRUNKS STAY STATIONARY!)
    for (let i = 0; i < this.foliageClusters.length; i++) {
      const item = this.foliageClusters[i];
      const swayZ = Math.sin(this.windTime * item.freq + item.phase) * item.amplitude;
      const swayX = Math.cos(this.windTime * (item.freq * 0.8) + item.phase) * (item.amplitude * 0.7);
      item.mesh.rotation.z = swayZ;
      item.mesh.rotation.x = swayX;
    }

    // Large foreground framing branches have very slow, subtle movement
    for (let i = 0; i < this.largeBranches.length; i++) {
      const b = this.largeBranches[i];
      b.group.rotation.z = Math.sin(this.windTime * b.freq + b.phase) * 0.007;
    }

    // 2. Ferns & bushes gentle independent oscillation
    for (let i = 0; i < this.ferns.length; i++) {
      const fern = this.ferns[i];
      fern.group.rotation.z = Math.sin(this.windTime * fern.freq + fern.phase) * 0.06;
    }

    // 3. Falling leaves drift
    if (this.leavesParticles) {
      const pos = this.leavesParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        x += Math.sin(this.windTime * 1.8 + i) * 0.02 + 0.015 * this.windIntensity;
        y -= this.leavesSpeeds[i];
        z += Math.cos(this.windTime * 1.4 + i) * 0.015;

        if (y < 0.2) {
          y = 7 + Math.random() * 2;
          x = (Math.random() - 0.5) * 28;
          z = -24 + Math.random() * 52;
        }
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }

    // 4. Low-lying forest floor mist drift
    for (let i = 0; i < this.mistSprites.length; i++) {
      const item = this.mistSprites[i];
      item.sprite.position.x += item.driftSpeed * this.windIntensity;
      if (item.sprite.position.x > 26) {
        item.sprite.position.x = -26;
      }
    }
  }
}
