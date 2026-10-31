import * as THREE from 'three';

export class Forest {
  constructor(scene) {
    this.scene = scene;
    this.trees = [];
    this.branchMeshes = [];
    this.foliageMeshes = [];
    this.grassClumps = [];
    this.windTime = 0;
    this.windIntensity = 0.5;

    // Define the winding exploration path spline from awakening (Z=22) to cabin porch (Z=-24)
    this.pathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 24),
      new THREE.Vector3(-1.2, 0.1, 16),
      new THREE.Vector3(1.5, 0.15, 8),
      new THREE.Vector3(0.3, 0.2, 0),
      new THREE.Vector3(-1.0, 0.25, -8),
      new THREE.Vector3(0.8, 0.3, -16),
      new THREE.Vector3(0.0, 0.35, -23.5), // In front of cabin porch door
    ]);

    this.init();
  }

  init() {
    this.createTerrain();
    this.createTrees();
    this.createUndergrowthAndFerns();
    this.createDriftingLeaves();
    this.createDriftingFog();
  }

  // Generate procedural organic dark damp earth & moss texture
  createGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base dark forest soil
    ctx.fillStyle = '#0e1411';
    ctx.fillRect(0, 0, 1024, 1024);

    // Moss and dark dirt mottling
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const radius = 2 + Math.random() * 9;
      const greenTones = ['#152019', '#1a2b1f', '#0f1712', '#223826', '#121814'];
      ctx.fillStyle = greenTones[Math.floor(Math.random() * greenTones.length)];
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pine needles and twigs
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      ctx.strokeStyle = Math.random() > 0.4 ? '#251b14' : '#1d271e';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() * 14 - 7), y + (Math.random() * 14 - 7));
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    return texture;
  }

  createTerrain() {
    const geo = new THREE.PlaneGeometry(100, 100, 80, 80);
    geo.rotateX(-Math.PI / 2);

    // Deform terrain with subtle rolling forest floor undulations
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Distance from the path center
      const pt = this.pathCurve.getPointAt(Math.max(0, Math.min(1, (24 - z) / 48)));
      const distToPath = Math.sqrt((x - pt.x) ** 2 + (z - pt.z) ** 2);

      // Slight depression along the path, rolling bumps in outer forest
      let y = Math.sin(x * 0.15) * Math.cos(z * 0.12) * 0.6 + Math.sin(x * 0.4) * 0.2;
      if (distToPath < 2.5) {
        y *= 0.2; // Smooth path walking track
      } else {
        y += (distToPath - 2.5) * 0.08;
      }
      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      map: this.createGroundTexture(),
      roughness: 0.95,
      metalness: 0.05,
      color: 0x8a998e,
    });

    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);

    // Add path stone borders and ancient mossy rocks
    this.createRocks();
  }

  createRocks() {
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    // Perturb vertices for jagged realistic rock shape
    const pos = rockGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const scale = 0.8 + Math.random() * 0.4;
      pos.setXYZ(i, vx * scale, vy * scale * 0.7, vz * scale);
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x242e2a,
      roughness: 0.9,
      metalness: 0.1,
    });

    for (let i = 0; i < 45; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const side = Math.random() > 0.5 ? 1 : -1;
      const pathT = Math.random();
      const pt = this.pathCurve.getPointAt(pathT);
      const offsetDist = 2.2 + Math.random() * 12;

      rock.position.set(
        pt.x + side * offsetDist,
        0.1 + Math.random() * 0.2,
        pt.z + (Math.random() * 4 - 2)
      );
      const s = 0.4 + Math.random() * 0.9;
      rock.scale.set(s, s * (0.6 + Math.random() * 0.4), s);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  // Create bark texture for detailed realistic trunks
  createBarkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1b1612';
    ctx.fillRect(0, 0, 512, 1024);

    // Vertical bark ridges
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 1024;
      const len = 40 + Math.random() * 120;
      ctx.strokeStyle = Math.random() > 0.5 ? '#2d221b' : '#140f0c';
      ctx.lineWidth = 2 + Math.random() * 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() * 6 - 3), y + len);
      ctx.stroke();
    }

    // Moss patches on bark
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = 'rgba(28, 48, 32, 0.45)';
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 1024, 15 + Math.random() * 35, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    return tex;
  }

  createTrees() {
    const barkTex = this.createBarkTexture();
    const trunkMat = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.92,
      metalness: 0.05,
    });

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x182c21, // Deep eerie forest pine needle green
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    // Create a forest of 75 trees distributed along and around the path
    for (let i = 0; i < 75; i++) {
      const t = Math.random();
      const pt = this.pathCurve.getPointAt(t);

      // Keep trees off the direct path center (at least 2.5m away)
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 2.8 + Math.random() * 22;
      const x = pt.x + side * dist;
      const z = pt.z + (Math.random() * 6 - 3);

      // Cabin area is around Z = -24, avoid placing trees inside the cabin footprint
      if (Math.abs(x) < 4.5 && z < -19 && z > -32) continue;

      const treeHeight = 12 + Math.random() * 9;
      const trunkRadius = 0.35 + Math.random() * 0.25;

      const treeGroup = new THREE.Group();
      treeGroup.position.set(x, 0, z);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.65, trunkRadius, treeHeight, 9);
      trunkGeo.translate(0, treeHeight / 2, 0);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      treeGroup.add(trunk);

      // Multi-tier pine/fir branches with foliage cones
      const tiers = 6 + Math.floor(Math.random() * 4);
      const foliageGroup = new THREE.Group();

      for (let j = 0; j < tiers; j++) {
        const tierRatio = j / tiers;
        const tierY = treeHeight * (0.35 + tierRatio * 0.65);
        const coneRadius = (1 - tierRatio * 0.8) * (2.8 + Math.random() * 0.9);
        const coneHeight = (treeHeight / tiers) * 1.5;

        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 8);
        coneGeo.translate(0, coneHeight / 2, 0);
        const foliage = new THREE.Mesh(coneGeo, foliageMat);
        foliage.position.y = tierY;
        foliage.rotation.y = Math.random() * Math.PI;
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        foliageGroup.add(foliage);

        // Add irregular horizontal dead branches sticking out
        if (j < 3) {
          const branchGeo = new THREE.CylinderGeometry(0.04, 0.08, coneRadius * 1.2, 5);
          branchGeo.rotateZ(Math.PI / 2.3);
          const branch = new THREE.Mesh(branchGeo, trunkMat);
          branch.position.set(0, tierY * 0.9, 0);
          branch.rotation.y = Math.random() * Math.PI * 2;
          treeGroup.add(branch);
          this.branchMeshes.push(branch);
        }
      }

      treeGroup.add(foliageGroup);
      this.foliageMeshes.push(foliageGroup);

      // Subtle natural tilt
      treeGroup.rotation.z = (Math.random() - 0.5) * 0.08;
      treeGroup.rotation.x = (Math.random() - 0.5) * 0.08;

      this.scene.add(treeGroup);
      this.trees.push(treeGroup);
    }

    // Explicitly add tall framing trees with arching branches directly over the Awakening spot
    const awakeningTreesConfig = [
      { x: 2.1, z: 24.5, height: 16, tiltZ: -0.18, tiltX: 0.08 },
      { x: -2.3, z: 23.8, height: 17, tiltZ: 0.20, tiltX: -0.06 },
      { x: 0.4, z: 27.0, height: 18, tiltZ: 0.05, tiltX: 0.16 },
    ];

    awakeningTreesConfig.forEach((cfg) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(cfg.x, 0, cfg.z);

      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, cfg.height, 9);
      trunkGeo.translate(0, cfg.height / 2, 0);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Branch tiers that reach out across overhead
      const tiers = 8;
      const foliageGroup = new THREE.Group();
      for (let j = 0; j < tiers; j++) {
        const tierRatio = j / tiers;
        const tierY = cfg.height * (0.3 + tierRatio * 0.7);
        const coneRadius = (1 - tierRatio * 0.7) * 3.6;
        const coneHeight = (cfg.height / tiers) * 1.6;

        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 8);
        coneGeo.translate(0, coneHeight / 2, 0);
        const foliage = new THREE.Mesh(coneGeo, foliageMat);
        foliage.position.y = tierY;
        foliage.rotation.y = Math.random() * Math.PI;
        foliageGroup.add(foliage);

        // Extended crooked overhead branches
        const branchGeo = new THREE.CylinderGeometry(0.05, 0.09, coneRadius * 1.3, 5);
        branchGeo.rotateZ(Math.PI / 2.2);
        const branch = new THREE.Mesh(branchGeo, trunkMat);
        branch.position.set(0, tierY * 0.95, 0);
        branch.rotation.y = (j % 2 === 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.5;
        treeGroup.add(branch);
        this.branchMeshes.push(branch);
      }

      treeGroup.add(foliageGroup);
      this.foliageMeshes.push(foliageGroup);

      treeGroup.rotation.z = cfg.tiltZ;
      treeGroup.rotation.x = cfg.tiltX;

      this.scene.add(treeGroup);
      this.trees.push(treeGroup);
    });
  }

  createUndergrowthAndFerns() {
    // Fern frond geometry
    const fernGeo = new THREE.PlaneGeometry(0.8, 1.4);
    fernGeo.rotateX(Math.PI / 3);
    const fernMat = new THREE.MeshStandardMaterial({
      color: 0x1e3627,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 90; i++) {
      const pathT = Math.random();
      const pt = this.pathCurve.getPointAt(pathT);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 1.8 + Math.random() * 6;

      const clump = new THREE.Group();
      clump.position.set(pt.x + side * dist, 0.1, pt.z + (Math.random() * 3 - 1.5));

      const fronds = 5;
      for (let f = 0; f < fronds; f++) {
        const frond = new THREE.Mesh(fernGeo, fernMat);
        frond.rotation.y = (f / fronds) * Math.PI * 2 + Math.random() * 0.4;
        frond.rotation.z = 0.2 + Math.random() * 0.3;
        clump.add(frond);
      }
      this.scene.add(clump);
      this.grassClumps.push(clump);
    }
  }

  createDriftingLeaves() {
    // 3D Fluttering dead leaves particle system
    const leafCount = 120;
    const leafGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(leafCount * 3);
    const speeds = new Float32Array(leafCount);
    const rotations = new Float32Array(leafCount * 3);

    for (let i = 0; i < leafCount; i++) {
      if (i < 35) {
        // Fall directly over the Awakening spot
        positions[i * 3 + 0] = (Math.random() - 0.5) * 4.5;
        positions[i * 3 + 1] = 1.0 + Math.random() * 8;
        positions[i * 3 + 2] = 22 + Math.random() * 4.5;
      } else {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 35;
        positions[i * 3 + 1] = 1.5 + Math.random() * 8;
        positions[i * 3 + 2] = -25 + Math.random() * 52;
      }

      speeds[i] = 0.015 + Math.random() * 0.035;
      rotations[i * 3 + 0] = Math.random() * Math.PI;
      rotations[i * 3 + 1] = Math.random() * Math.PI;
      rotations[i * 3 + 2] = Math.random() * Math.PI;
    }

    leafGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom textured leaf point
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#422a18'; // Dry autumn brown
    ctx.beginPath();
    ctx.ellipse(32, 32, 22, 12, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    const leafTex = new THREE.CanvasTexture(canvas);
    const leafMat = new THREE.PointsMaterial({
      size: 0.35,
      map: leafTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.leavesParticles = new THREE.Points(leafGeo, leafMat);
    this.leavesSpeeds = speeds;
    this.scene.add(this.leavesParticles);
  }

  createDriftingFog() {
    // Layered drifting volumetric mist sprites
    const fogCount = 40;
    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = 256;
    fogCanvas.height = 256;
    const ctx = fogCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(180, 205, 200, 0.22)');
    grad.addColorStop(0.5, 'rgba(140, 165, 160, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const fogTex = new THREE.CanvasTexture(fogCanvas);
    const fogMat = new THREE.SpriteMaterial({
      map: fogTex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.fogSprites = [];
    for (let i = 0; i < fogCount; i++) {
      const sprite = new THREE.Sprite(fogMat);
      sprite.position.set(
        (Math.random() - 0.5) * 40,
        0.8 + Math.random() * 2.5,
        -28 + Math.random() * 56
      );
      const s = 10 + Math.random() * 14;
      sprite.scale.set(s, s * 0.6, 1);
      this.scene.add(sprite);
      this.fogSprites.push({
        sprite,
        baseX: sprite.position.x,
        driftSpeed: 0.008 + Math.random() * 0.015,
      });
    }
  }

  update(delta, clockTime) {
    this.windTime += delta * this.windIntensity;

    // 1. Sway trees and branch tiers realistically
    const sway = Math.sin(this.windTime * 1.8) * 0.028 * this.windIntensity;
    const swaySecondary = Math.cos(this.windTime * 2.4) * 0.018 * this.windIntensity;

    for (let i = 0; i < this.foliageMeshes.length; i++) {
      const group = this.foliageMeshes[i];
      const phase = i * 0.25;
      group.rotation.z = Math.sin(this.windTime * 1.5 + phase) * 0.035 * this.windIntensity;
      group.rotation.x = Math.cos(this.windTime * 1.2 + phase) * 0.025 * this.windIntensity;
    }

    // 2. Sway undergrowth and ferns
    for (let i = 0; i < this.grassClumps.length; i++) {
      const clump = this.grassClumps[i];
      clump.rotation.z = Math.sin(this.windTime * 3.0 + i) * 0.12 * this.windIntensity;
    }

    // 3. Animate drifting leaves
    if (this.leavesParticles) {
      const pos = this.leavesParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Wind drift + gravity fall + flutter
        x += Math.sin(this.windTime * 2.0 + i) * 0.03 + 0.02 * this.windIntensity;
        y -= this.leavesSpeeds[i];
        z += Math.cos(this.windTime * 1.5 + i) * 0.02;

        if (y < 0.2) {
          y = 7 + Math.random() * 3;
          x = (Math.random() - 0.5) * 30;
          z = -25 + Math.random() * 52;
        }

        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }

    // 4. Animate drifting fog sprites
    for (let i = 0; i < this.fogSprites.length; i++) {
      const item = this.fogSprites[i];
      item.sprite.position.x += item.driftSpeed * this.windIntensity;
      if (item.sprite.position.x > 25) {
        item.sprite.position.x = -25;
      }
    }
  }
}
