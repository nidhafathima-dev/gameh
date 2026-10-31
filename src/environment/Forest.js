import * as THREE from 'three';

export const WIND_STATES = {
  CALM: { name: 'Calm', intensity: 0.22, gustFreq: 0.8, leafSpeedMult: 0.65, branchMult: 0.5 },
  MODERATE: { name: 'Moderate', intensity: 0.58, gustFreq: 1.4, leafSpeedMult: 1.15, branchMult: 1.0 },
  STRONG: { name: 'Strong', intensity: 1.18, gustFreq: 2.2, leafSpeedMult: 2.2, branchMult: 2.3 },
};

export class Forest {
  constructor(scene, shadowPhenomena = null) {
    this.scene = scene;
    this.shadows = shadowPhenomena;

    this.trees = [];
    this.largeBranches = [];
    this.foliageClusters = []; // Individual needle clusters for unsynchronized subtle movement
    this.bushes = [];
    this.ferns = [];
    this.grassTufts = [];
    this.leavesParticles = null;
    this.sporesParticles = null;

    // Real-time Environmental Wind System
    this.windState = 'CALM';
    this.targetWindIntensity = WIND_STATES.CALM.intensity;
    this.currentWindIntensity = WIND_STATES.CALM.intensity;
    this.windIntensity = WIND_STATES.CALM.intensity;
    this.windDirection = new THREE.Vector2(-0.82, 0.57).normalize(); // Blowing across the path
    this.windTime = 0;
    this.gustTime = 0;
    this.stateTimer = 0;
    this.stateDuration = 14.0 + Math.random() * 8.0;

    // The winding guided path spline from awakening (Z=19.5) to cabin porch (Z=-12.0)
    this.pathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 19.5),
      new THREE.Vector3(-1.3, 0.08, 14.2),
      new THREE.Vector3(1.5, 0.14, 8.8),
      new THREE.Vector3(0.2, 0.18, 3.5),
      new THREE.Vector3(-1.2, 0.22, -1.8),
      new THREE.Vector3(0.9, 0.28, -7.0),
      new THREE.Vector3(0.0, 0.35, -12.0),
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
    this.createGrassTufts();
    this.createDriftingLeaves();
    this.createAtmosphericSpores();
    this.createLowLyingMist();
  }

  setWindState(stateKey) {
    if (WIND_STATES[stateKey]) {
      this.windState = stateKey;
      this.targetWindIntensity = WIND_STATES[stateKey].intensity;
    }
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

    // 3. Dense Pine Needle Cluster Material (Deep forest conifer green, smooth normals)
    this.needleMat = new THREE.MeshStandardMaterial({
      color: 0x182c23,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: false,
    });

    // Foreground silhouetted needle material (darker for framing against background mist)
    this.foregroundNeedleMat = new THREE.MeshStandardMaterial({
      color: 0x111c18,
      roughness: 0.9,
      metalness: 0.03,
      flatShading: false,
    });

    // 4. Woodland Fern & Bush Leaf Material with organic feathered alpha texture
    const fernCanvas = document.createElement('canvas');
    fernCanvas.width = 256;
    fernCanvas.height = 512;
    const fctx = fernCanvas.getContext('2d');
    fctx.clearRect(0, 0, 256, 512);

    // Spine / rachis
    fctx.strokeStyle = '#273c2e';
    fctx.lineWidth = 4;
    fctx.beginPath();
    fctx.moveTo(128, 512);
    fctx.quadraticCurveTo(127, 260, 128, 15);
    fctx.stroke();

    // Leaflets (pinnae) with natural feathered tapering
    const pinnaeCount = 20;
    for (let p = 0; p < pinnaeCount; p++) {
      const t = p / pinnaeCount;
      const y = 490 - t * 460;
      const maxW = Math.sin(Math.pow(t, 0.45) * Math.PI) * 92 * (1.0 - t * 0.7);

      // Left pinna
      fctx.fillStyle = t > 0.4 ? '#253d2d' : '#1c3124';
      fctx.beginPath();
      fctx.moveTo(128, y);
      fctx.bezierCurveTo(128 - maxW * 0.4, y - 8, 128 - maxW, y - 12, 128 - maxW, y);
      fctx.bezierCurveTo(128 - maxW * 0.7, y + 8, 128 - maxW * 0.3, y + 6, 128, y + 2);
      fctx.fill();

      // Right pinna
      fctx.fillStyle = t > 0.4 ? '#213728' : '#192b1f';
      fctx.beginPath();
      fctx.moveTo(128, y);
      fctx.bezierCurveTo(128 + maxW * 0.4, y - 8, 128 + maxW, y - 12, 128 + maxW, y);
      fctx.bezierCurveTo(128 + maxW * 0.7, y + 8, 128 + maxW * 0.3, y + 6, 128, y + 2);
      fctx.fill();
    }

    const fernTex = new THREE.CanvasTexture(fernCanvas);
    this.fernMat = new THREE.MeshStandardMaterial({
      map: fernTex,
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    // 5. Moss Mound Material (for organic plant base grounding)
    this.mossMat = new THREE.MeshStandardMaterial({
      color: 0x1f3025,
      roughness: 0.95,
      metalness: 0.02,
    });

    // 6. Granite / Moss Boulder Material
    const rockCanvas = document.createElement('canvas');
    rockCanvas.width = 256;
    rockCanvas.height = 256;
    const rctx = rockCanvas.getContext('2d');
    rctx.fillStyle = '#222c2a'; // Dark slate grey base
    rctx.fillRect(0, 0, 256, 256);
    // Mossy patches
    for (let i = 0; i < 500; i++) {
      const rx = Math.random() * 256;
      const ry = Math.random() * 256;
      rctx.fillStyle = Math.random() > 0.5 ? '#1a2920' : '#2b3d32';
      rctx.beginPath();
      rctx.arc(rx, ry, 3 + Math.random() * 9, 0, Math.PI * 2);
      rctx.fill();
    }
    const rockTex = new THREE.CanvasTexture(rockCanvas);
    this.rockMat = new THREE.MeshStandardMaterial({
      map: rockTex,
      roughness: 0.92,
      metalness: 0.04,
    });

    // 7. Wild Woodland Grass / Sedge Material
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 128;
    grassCanvas.height = 256;
    const gctx2 = grassCanvas.getContext('2d');
    gctx2.clearRect(0, 0, 128, 256);
    // Tapering grass blade
    gctx2.fillStyle = '#233828';
    gctx2.beginPath();
    gctx2.moveTo(56, 256);
    gctx2.lineTo(72, 256);
    gctx2.quadraticCurveTo(76, 110, 64, 8);
    gctx2.quadraticCurveTo(52, 110, 56, 256);
    gctx2.fill();
    // Subtle central highlight
    gctx2.strokeStyle = '#324e3a';
    gctx2.lineWidth = 1.5;
    gctx2.beginPath();
    gctx2.moveTo(64, 256);
    gctx2.lineTo(64, 15);
    gctx2.stroke();

    const grassTex = new THREE.CanvasTexture(grassCanvas);
    this.grassMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      transparent: true,
      alphaTest: 0.32,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
  }

  // Calculate terrain elevation at any (x, z) to guarantee objects clamp directly to the ground
  getTerrainHeight(x, z) {
    const clampedT = Math.max(0, Math.min(1, (19.5 - z) / 31.5));
    const pt = this.pathCurve.getPointAt(clampedT);
    const distToPath = Math.sqrt((x - pt.x) ** 2 + (z - pt.z) ** 2);
    let y = Math.sin(x * 0.12) * Math.cos(z * 0.1) * 0.55 + Math.sin(x * 0.3) * 0.18;
    if (distToPath < 2.2) {
      y *= 0.15;
    } else {
      y += (distToPath - 2.2) * 0.07;
    }
    return y;
  }

  createTerrain() {
    const geo = new THREE.PlaneGeometry(120, 120, 80, 80);
    geo.rotateX(-Math.PI / 2);

    // Natural undulating forest terrain with gentle hollows and dips
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();

    this.terrain = new THREE.Mesh(geo, this.groundMat);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  createFallenLogs() {
    // Scattered rotting tree trunks and dead fallen branches on the ground
    const logGeo = new THREE.CylinderGeometry(0.2, 0.26, 4.5, 10);
    logGeo.rotateZ(Math.PI / 2);
    logGeo.computeVertexNormals();

    for (let i = 0; i < 18; i++) {
      const t = Math.random();
      const pt = this.pathCurve.getPointAt(t);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 2.4 + Math.random() * 8.0;
      const lx = pt.x + side * dist;
      const lz = pt.z + (Math.random() * 4 - 2);
      const ly = this.getTerrainHeight(lx, lz);

      const log = new THREE.Mesh(logGeo, this.barkMat);
      log.position.set(lx, ly + 0.18, lz);
      log.rotation.y = Math.random() * Math.PI;
      log.rotation.z = (Math.random() - 0.5) * 0.12;
      log.castShadow = true;
      log.receiveShadow = true;
      this.scene.add(log);
    }
  }

  createMossyRocks() {
    // Smooth rounded glacial erratic boulders (no sharp or spiky triangular facets)
    const rockGeo = new THREE.SphereGeometry(1.0, 16, 12);
    rockGeo.scale(1.25, 0.62, 0.95);
    rockGeo.computeVertexNormals();

    for (let i = 0; i < 30; i++) {
      const rock = new THREE.Mesh(rockGeo, this.rockMat);
      const pathT = Math.random();
      const pt = this.pathCurve.getPointAt(pathT);
      const side = Math.random() > 0.5 ? 1 : -1;
      const offsetDist = 2.5 + Math.random() * 12;
      const rx = pt.x + side * offsetDist;
      const rz = pt.z + (Math.random() * 5 - 2.5);
      const ry = this.getTerrainHeight(rx, rz);

      rock.position.set(rx, ry + 0.12, rz);
      const s = 0.55 + Math.random() * 0.9;
      rock.scale.set(s * 1.2, s * 0.65, s);
      rock.rotation.y = Math.random() * Math.PI * 2;
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  createForegroundFramingTrees() {
    // Massive conifer trees flanking the path with long overlapping branches
    // extending across the upper foreground, naturally framing the canopy above the visitor
    const framingConfigs = [
      { x: 3.2, z: 17.0, height: 22, reachDir: -1, branchY: 4.5, branchLen: 4.8 },
      { x: -3.4, z: 12.0, height: 24, reachDir: 1, branchY: 4.7, branchLen: 5.2 },
      { x: 3.5, z: 6.0, height: 23, reachDir: -1, branchY: 4.4, branchLen: 4.9 },
      { x: -3.2, z: 0.0, height: 25, reachDir: 1, branchY: 4.8, branchLen: 5.4 },
      { x: 3.6, z: -5.5, height: 24, reachDir: -1, branchY: 4.6, branchLen: 5.0 },
      { x: -3.5, z: -10.5, height: 26, reachDir: 1, branchY: 4.7, branchLen: 5.2 },
    ];

    framingConfigs.forEach((cfg) => {
      const tree = this.buildMatureConiferTree(cfg.height, 0.65, true);
      const groundY = this.getTerrainHeight(cfg.x, cfg.z);
      tree.group.position.set(cfg.x, groundY, cfg.z);

      // Add prominent overhead foreground branch extending across upper canopy
      const framingBranchGroup = new THREE.Group();
      framingBranchGroup.position.set(0, cfg.branchY, 0);

      const branchGeo = new THREE.CylinderGeometry(0.08, 0.16, cfg.branchLen, 8);
      branchGeo.translate(0, cfg.branchLen / 2, 0);
      branchGeo.rotateZ(cfg.reachDir * (Math.PI / 2.35));
      branchGeo.computeVertexNormals();
      const branchMesh = new THREE.Mesh(branchGeo, this.barkMat);
      branchMesh.castShadow = true;
      framingBranchGroup.add(branchMesh);

      // Natural gnarled sub-twigs physically branching off the main bough
      for (let f = 1; f <= 3; f++) {
        const twigLen = 1.1 - f * 0.22;
        const twigGeo = new THREE.CylinderGeometry(0.03, 0.05, twigLen, 6);
        twigGeo.translate(0, twigLen / 2, 0);
        twigGeo.rotateZ(cfg.reachDir * (Math.PI / 1.7));
        twigGeo.computeVertexNormals();
        const twigMesh = new THREE.Mesh(twigGeo, this.barkMat);

        const distAlong = f * (cfg.branchLen / 3.4);
        const bx = Math.sin(Math.PI / 2.35) * distAlong * cfg.reachDir;
        const by = Math.cos(Math.PI / 2.35) * distAlong;
        twigMesh.position.set(bx, by, (f % 2 === 0 ? 0.08 : -0.08));
        framingBranchGroup.add(twigMesh);
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

      // Clear cabin footprint at Z ≈ -18.5
      if (Math.abs(x) < 5.0 && z < -10.0 && z > -23.5) continue;

      const height = 14 + Math.random() * 10;
      const trunkRadius = 0.38 + Math.random() * 0.28;

      const tree = this.buildMatureConiferTree(height, trunkRadius, false);
      const groundY = this.getTerrainHeight(x, z);
      tree.group.position.set(x, groundY, z);

      // Natural subtle tilt (trunks remain stationary during runtime)
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

      if (Math.abs(x) < 5.0 && z < -10.0 && z > -23.5) continue;

      const height = 18 + Math.random() * 9;
      const trunkRadius = 0.4 + Math.random() * 0.25;

      const tree = this.buildMatureConiferTree(height, trunkRadius, false);
      const groundY = this.getTerrainHeight(x, z);
      tree.group.position.set(x, groundY, z);

      this.scene.add(tree.group);
      this.trees.push(tree.group);
    }
  }

  buildMatureConiferTree(height, trunkRadius, isForeground) {
    const treeGroup = new THREE.Group();

    // 1. Irregular Tapering Trunk (100% stationary)
    const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.45, trunkRadius, height, 10);
    trunkGeo.translate(0, height / 2, 0);
    trunkGeo.computeVertexNormals();
    const trunk = new THREE.Mesh(trunkGeo, this.barkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // 2. Multi-tier Drooping Pine Needle Clusters (16 segments, smooth normals)
    const tiers = 7 + Math.floor(Math.random() * 4);
    const mat = isForeground ? this.foregroundNeedleMat : this.needleMat;

    for (let t = 0; t < tiers; t++) {
      const tierRatio = t / tiers;
      const tierY = height * (0.32 + tierRatio * 0.68);
      const tierRadius = (1 - tierRatio * 0.75) * (3.0 + Math.random() * 1.0);
      const tierHeight = (height / tiers) * 1.5;

      const coneGeo = new THREE.ConeGeometry(tierRadius, tierHeight, 16);
      coneGeo.translate(0, tierHeight / 2, 0);
      coneGeo.computeVertexNormals();
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
        amplitude: 0.016 * (1.0 - tierRatio * 0.35),
      });

      // Irregular dead lower horizontal branches
      if (t < 3) {
        const branchGeo = new THREE.CylinderGeometry(0.04, 0.07, tierRadius * 1.0, 6);
        branchGeo.rotateZ(Math.PI / 2.3);
        branchGeo.computeVertexNormals();
        const branch = new THREE.Mesh(branchGeo, this.barkMat);
        branch.position.set(0, tierY * 0.94, 0);
        branch.rotation.y = Math.random() * Math.PI * 2;
        treeGroup.add(branch);
      }
    }

    return { group: treeGroup };
  }

  createUndergrowthAndFerns() {
    // Realistic woodland ferns with arched fronds and organic moss base
    const frondGeo = new THREE.PlaneGeometry(0.68, 1.35, 2, 4);
    frondGeo.translate(0, 0.675, 0);
    const pos = frondGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      const curl = (py / 1.35) ** 2 * 0.22;
      pos.setZ(i, pos.getZ(i) - curl);
    }
    frondGeo.computeVertexNormals();

    const mossGeo = new THREE.SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);

    for (let i = 0; i < 95; i++) {
      const pathT = Math.random();
      const pt = this.pathCurve.getPointAt(pathT);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 1.8 + Math.random() * 7.5;

      const clumpX = pt.x + side * dist;
      const clumpZ = pt.z + (Math.random() * 4 - 2);
      const clumpY = this.getTerrainHeight(clumpX, clumpZ);

      const clump = new THREE.Group();
      clump.position.set(clumpX, clumpY, clumpZ);

      // Organic moss mound anchor
      const mossMound = new THREE.Mesh(mossGeo, this.mossMat);
      mossMound.scale.set(1.0 + Math.random() * 0.4, 0.45, 1.0 + Math.random() * 0.4);
      clump.add(mossMound);

      // Circular arrangement of arching fern fronds
      const frondCount = 5 + Math.floor(Math.random() * 3);
      for (let f = 0; f < frondCount; f++) {
        const frond = new THREE.Mesh(frondGeo, this.fernMat);
        const angle = (f / frondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        frond.rotation.y = angle;
        frond.rotation.x = 0.32 + Math.random() * 0.22;
        const frondScale = 0.75 + Math.random() * 0.45;
        frond.scale.set(frondScale, frondScale, frondScale);
        clump.add(frond);
      }

      this.scene.add(clump);
      this.ferns.push({
        group: clump,
        freq: 1.8 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      });

      // Register nearby bushes with the ShadowPhenomena system for random rustle events
      if (this.shadows && dist < 8.0) {
        this.shadows.registerBush(clump);
      }
    }
  }

  createGrassTufts() {
    // Dense woodland grass blades along the path edges that bend with the wind
    const bladeGeo = new THREE.PlaneGeometry(0.12, 0.75, 1, 3);
    bladeGeo.translate(0, 0.375, 0); // Root at (0,0,0)
    // Curvature in blade
    const pos = bladeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      const c = (py / 0.75) ** 2 * 0.14;
      pos.setZ(i, pos.getZ(i) - c);
    }
    bladeGeo.computeVertexNormals();

    for (let i = 0; i < 125; i++) {
      const pathT = Math.random();
      const pt = this.pathCurve.getPointAt(pathT);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 1.2 + Math.random() * 6.5;

      const gx = pt.x + side * dist;
      const gz = pt.z + (Math.random() * 3 - 1.5);
      const gy = this.getTerrainHeight(gx, gz);

      const tuftGroup = new THREE.Group();
      tuftGroup.position.set(gx, gy, gz);

      const bladeCount = 5 + Math.floor(Math.random() * 4);
      for (let b = 0; b < bladeCount; b++) {
        const blade = new THREE.Mesh(bladeGeo, this.grassMat);
        blade.rotation.y = (b / bladeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        blade.rotation.x = 0.2 + Math.random() * 0.25;
        const s = 0.7 + Math.random() * 0.55;
        blade.scale.set(s, s * (0.85 + Math.random() * 0.3), s);
        tuftGroup.add(blade);
      }

      this.scene.add(tuftGroup);
      this.grassTufts.push({
        group: tuftGroup,
        freq: 2.2 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        baseRotX: 0,
        baseRotZ: 0,
      });
    }
  }

  createDriftingLeaves() {
    // 3D Fluttering loose leaves drifting through the mist
    const leafCount = 80;
    const leafGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(leafCount * 3);
    const speeds = new Float32Array(leafCount);
    const lateralPhases = new Float32Array(leafCount);

    for (let i = 0; i < leafCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = 0.6 + Math.random() * 7;
      positions[i * 3 + 2] = -24 + Math.random() * 52;
      speeds[i] = 0.012 + Math.random() * 0.022;
      lateralPhases[i] = Math.random() * Math.PI * 2;
    }

    leafGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom textured leaf point with soft feathered edges
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);

    // Soft organic oval leaf
    ctx.fillStyle = '#3e2c1e'; // Warm damp fallen leaf brown
    ctx.beginPath();
    ctx.ellipse(32, 32, 16, 9, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Central vein
    ctx.strokeStyle = '#553c2a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(44, 44);
    ctx.stroke();

    const leafTex = new THREE.CanvasTexture(canvas);
    const leafMat = new THREE.PointsMaterial({
      size: 0.14,
      map: leafTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    this.leavesParticles = new THREE.Points(leafGeo, leafMat);
    this.leavesSpeeds = speeds;
    this.leavesLateralPhases = lateralPhases;
    this.scene.add(this.leavesParticles);
  }

  createAtmosphericSpores() {
    // Luminous ethereal forest spores drifting in the moonlit fog
    const count = 140;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 1] = 0.6 + Math.random() * 5.5;
      pos[i * 3 + 2] = -26 + Math.random() * 54;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const sCanvas = document.createElement('canvas');
    sCanvas.width = 32;
    sCanvas.height = 32;
    const sctx = sCanvas.getContext('2d');
    const grad = sctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    grad.addColorStop(0, 'rgba(215, 235, 245, 0.95)');
    grad.addColorStop(0.35, 'rgba(170, 205, 220, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 32);

    const sTex = new THREE.CanvasTexture(sCanvas);
    const mat = new THREE.PointsMaterial({
      size: 0.08,
      map: sTex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.sporesParticles = new THREE.Points(geo, mat);
    this.scene.add(this.sporesParticles);
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
        0.4 + Math.random() * 2.2,
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

  updateWindStateMachine(delta) {
    this.stateTimer += delta;
    if (this.stateTimer >= this.stateDuration) {
      this.stateTimer = 0;
      // Cycle: CALM -> MODERATE -> (occasionally STRONG) -> MODERATE -> CALM
      if (this.windState === 'CALM') {
        this.setWindState('MODERATE');
        this.stateDuration = 14.0 + Math.random() * 8.0;
      } else if (this.windState === 'MODERATE') {
        const toStrong = Math.random() > 0.45;
        this.setWindState(toStrong ? 'STRONG' : 'CALM');
        this.stateDuration = toStrong ? 7.0 + Math.random() * 5.0 : 12.0 + Math.random() * 8.0;
      } else {
        this.setWindState('MODERATE');
        this.stateDuration = 10.0 + Math.random() * 6.0;
      }
    }

    // Smooth exponential blend to target intensity
    this.currentWindIntensity += (this.targetWindIntensity - this.currentWindIntensity) * 0.85 * delta;

    // Organic gust pulse
    this.gustTime += delta * (1.2 + this.currentWindIntensity * 0.8);
    const gustNoise = Math.sin(this.gustTime * 0.75) * Math.cos(this.gustTime * 1.35) * 0.2;
    this.windIntensity = Math.max(0.12, this.currentWindIntensity + gustNoise);
  }

  update(delta, clockTime) {
    this.updateWindStateMachine(delta);
    this.windTime += delta * (this.windIntensity * 1.3);

    const stateConfig = WIND_STATES[this.windState] || WIND_STATES.CALM;

    // 1. Unsynchronized Branch & Foliage Swaing (Trunks stationary, branches flex)
    for (let i = 0; i < this.foliageClusters.length; i++) {
      const item = this.foliageClusters[i];
      const intensityMult = 1.0 + this.windIntensity * 1.4;
      const swayZ = Math.sin(this.windTime * item.freq + item.phase) * item.amplitude * intensityMult;
      const swayX = Math.cos(this.windTime * (item.freq * 0.85) + item.phase) * (item.amplitude * 0.8) * intensityMult;

      // Add directional lean matching the wind vector
      const windPushZ = this.windDirection.y * (this.windIntensity * 0.025);
      const windPushX = this.windDirection.x * (this.windIntensity * 0.025);

      item.mesh.rotation.z = swayZ + windPushX;
      item.mesh.rotation.x = swayX + windPushZ;
    }

    // Large foreground framing branches
    for (let i = 0; i < this.largeBranches.length; i++) {
      const b = this.largeBranches[i];
      const bAmp = 0.007 * (1.0 + this.windIntensity * 1.6);
      b.group.rotation.z = Math.sin(this.windTime * b.freq + b.phase) * bAmp + this.windDirection.x * (this.windIntensity * 0.012);
      b.group.rotation.x = Math.cos(this.windTime * (b.freq * 0.8) + b.phase) * (bAmp * 0.6) + this.windDirection.y * (this.windIntensity * 0.012);
    }

    // 2. Grass Bending According to Wind Direction (Requirement #4)
    for (let i = 0; i < this.grassTufts.length; i++) {
      const g = this.grassTufts[i];
      // Wave motion rolling across the terrain
      const wave = Math.sin(this.windTime * g.freq + g.phase) * 0.12 + 0.18;
      const bend = wave * (this.windIntensity * 1.6);

      g.group.rotation.z = g.baseRotZ + this.windDirection.x * bend;
      g.group.rotation.x = g.baseRotX + this.windDirection.y * bend;
    }

    // 3. Ferns & Bushes Bending with Wind
    for (let i = 0; i < this.ferns.length; i++) {
      const fern = this.ferns[i];
      const fernOsc = Math.sin(this.windTime * fern.freq + fern.phase) * 0.06;
      const fernBend = (0.08 + fernOsc) * (this.windIntensity * 1.3);

      fern.group.rotation.z = this.windDirection.x * fernBend;
      fern.group.rotation.x = this.windDirection.y * fernBend;
    }

    // 4. Detached Leaves Drifting & Fluttering (Requirements #2, #3)
    if (this.leavesParticles) {
      const pos = this.leavesParticles.geometry.attributes.position;
      const speedMult = stateConfig.leafSpeedMult;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Turbulence and horizontal drift in wind direction
        const flutter = Math.sin(this.windTime * 2.2 + this.leavesLateralPhases[i]) * 0.03;
        x += this.windDirection.x * (0.025 * this.windIntensity * speedMult) + flutter;
        z += this.windDirection.y * (0.025 * this.windIntensity * speedMult) + flutter * 0.5;
        y -= this.leavesSpeeds[i] * (0.8 + this.windIntensity * 0.6);

        if (y < 0.25) {
          // Detach new leaf from canopy
          y = 5.5 + Math.random() * 2.5;
          x = (Math.random() - 0.5) * 32;
          z = -24 + Math.random() * 52;
        }
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }

    // 5. Atmospheric Spores Moving through Forest (Requirement #7)
    if (this.sporesParticles) {
      const spos = this.sporesParticles.geometry.attributes.position;
      for (let i = 0; i < spos.count; i++) {
        let sx = spos.getX(i);
        let sy = spos.getY(i);
        let sz = spos.getZ(i);

        sx += this.windDirection.x * (0.008 * this.windIntensity) + Math.sin(this.windTime + i) * 0.004;
        sz += this.windDirection.y * (0.008 * this.windIntensity) + Math.cos(this.windTime + i) * 0.004;
        sy += Math.sin(this.windTime * 0.8 + i) * 0.003;

        if (sx < -16) sx = 16;
        if (sz > 28) sz = -28;
        spos.setXYZ(i, sx, sy, sz);
      }
      spos.needsUpdate = true;
    }

    // 6. Natural Low-Lying Fog Drift (Requirement #6)
    for (let i = 0; i < this.mistSprites.length; i++) {
      const item = this.mistSprites[i];
      item.sprite.position.x += item.driftSpeed * this.windIntensity * 1.5;
      if (item.sprite.position.x > 28) {
        item.sprite.position.x = -28;
      }
    }
  }
}
