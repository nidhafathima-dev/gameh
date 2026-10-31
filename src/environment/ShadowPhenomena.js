import * as THREE from 'three';

export class ShadowPhenomena {
  constructor(scene, audio, pathCurve) {
    this.scene = scene;
    this.audio = audio;
    this.pathCurve = pathCurve;

    this.timer = 0;
    this.nextEventTime = 8.0 + Math.random() * 10.0; // First event triggers after ~12s
    this.activePhenomenon = null;

    this.initMeshes();
  }

  initMeshes() {
    // 1. Distant Fog Silhouette Mesh (Tall, slender, indistinct dark humanoid/phantom shape)
    const silGeo = new THREE.CylinderGeometry(0.12, 0.28, 2.3, 8);
    silGeo.translate(0, 1.15, 0);

    // Dark misty ethereal material that blends naturally into the fog
    this.silhouetteMat = new THREE.MeshBasicMaterial({
      color: 0x141a1e,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });

    this.silhouetteMesh = new THREE.Mesh(silGeo, this.silhouetteMat);
    this.silhouetteMesh.visible = false;
    this.scene.add(this.silhouetteMesh);

    // 2. Peripheral Darting Phantom Shape
    const dartGeo = new THREE.SphereGeometry(0.35, 6, 6);
    dartGeo.scale(0.8, 1.8, 0.8);
    this.dartMat = new THREE.MeshBasicMaterial({
      color: 0x0f1316,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.dartMesh = new THREE.Mesh(dartGeo, this.dartMat);
    this.dartMesh.visible = false;
    this.scene.add(this.dartMesh);

    // 3. Reacting nearby bushes array (references to bushes that can be shaken)
    this.reactiveBushes = [];
  }

  registerBush(bushMesh) {
    this.reactiveBushes.push(bushMesh);
  }

  triggerRandomEvent(camera, playerT) {
    const types = ['distant_silhouette', 'peripheral_dart', 'bush_rustle'];
    const type = types[Math.floor(Math.random() * types.length)];

    const playerPos = camera.position;
    const playerDir = new THREE.Vector3();
    camera.getWorldDirection(playerDir);

    if (type === 'distant_silhouette') {
      this.triggerDistantSilhouette(playerPos, playerDir);
    } else if (type === 'peripheral_dart') {
      this.triggerPeripheralDart(camera, playerPos, playerDir);
    } else if (type === 'bush_rustle') {
      this.triggerBushRustle(playerPos);
    }

    // Schedule next random event
    this.nextEventTime = 14.0 + Math.random() * 18.0;
    this.timer = 0;
  }

  triggerDistantSilhouette(playerPos, playerDir) {
    // Place 22m - 30m ahead in the mist, slightly to left or right between distant trees
    const side = Math.random() > 0.5 ? 1 : -1;
    const distance = 22 + Math.random() * 10;
    const lateralOffset = side * (5 + Math.random() * 6);

    const startX = playerPos.x + playerDir.x * distance + lateralOffset;
    const startZ = playerPos.z + playerDir.z * distance;
    const endX = startX + (side > 0 ? 3.5 : -3.5);

    this.silhouetteMesh.position.set(startX, 0.1, startZ);
    this.silhouetteMesh.visible = true;
    this.silhouetteMat.opacity = 0;

    this.activePhenomenon = {
      type: 'silhouette',
      duration: 1.4,
      elapsed: 0,
      startX,
      endX,
      y: 0.1,
      z: startZ,
    };
  }

  triggerPeripheralDart(camera, playerPos, playerDir) {
    // Moves across the edge of the screen (in peripheral vision)
    const side = Math.random() > 0.5 ? 1 : -1;
    const distance = 10 + Math.random() * 6;

    // Right vector relative to camera look
    const rightVec = new THREE.Vector3().crossVectors(playerDir, new THREE.Vector3(0, 1, 0)).normalize();

    const startPos = playerPos.clone()
      .add(playerDir.clone().multiplyScalar(distance))
      .add(rightVec.clone().multiplyScalar(side * 8));

    const endPos = startPos.clone().add(rightVec.clone().multiplyScalar(side * 6));

    this.dartMesh.position.copy(startPos);
    this.dartMesh.visible = true;
    this.dartMat.opacity = 0;

    this.activePhenomenon = {
      type: 'dart',
      duration: 0.75, // Very fast fleeting blur
      elapsed: 0,
      startPos,
      endPos,
    };
  }

  triggerBushRustle(playerPos) {
    // Find a nearby bush within 4-10m of the player
    let nearestBush = null;
    let minDist = Infinity;

    for (const bush of this.reactiveBushes) {
      const d = bush.position.distanceTo(playerPos);
      if (d > 3.0 && d < 12.0 && d < minDist) {
        minDist = d;
        nearestBush = bush;
      }
    }

    if (nearestBush) {
      this.activePhenomenon = {
        type: 'bush_rustle',
        bush: nearestBush,
        duration: 1.2,
        elapsed: 0,
        originalRotZ: nearestBush.rotation.z,
      };

      // Play subtle branch crack / rustle sound
      if (this.audio) {
        this.audio.playFootstep('wood'); // Subtle twig snap
      }
    }
  }

  update(delta, camera, playerT) {
    this.timer += delta;

    // Trigger next event when timer elapses
    if (!this.activePhenomenon && this.timer >= this.nextEventTime) {
      this.triggerRandomEvent(camera, playerT);
    }

    // Animate active phenomenon
    if (this.activePhenomenon) {
      const p = this.activePhenomenon;
      p.elapsed += delta;
      const progress = p.elapsed / p.duration;

      if (p.type === 'silhouette') {
        if (progress <= 1.0) {
          // Glide behind distant trees
          this.silhouetteMesh.position.x = THREE.MathUtils.lerp(p.startX, p.endX, progress);

          // Fade in then fade out into mist
          if (progress < 0.3) {
            this.silhouetteMat.opacity = (progress / 0.3) * 0.45;
          } else if (progress > 0.7) {
            this.silhouetteMat.opacity = ((1.0 - progress) / 0.3) * 0.45;
          } else {
            this.silhouetteMat.opacity = 0.45;
          }
        } else {
          this.silhouetteMesh.visible = false;
          this.silhouetteMat.opacity = 0;
          this.activePhenomenon = null;
        }
      } else if (p.type === 'dart') {
        if (progress <= 1.0) {
          this.dartMesh.position.lerpVectors(p.startPos, p.endPos, progress);
          // Quick subtle flicker
          this.dartMat.opacity = Math.sin(progress * Math.PI) * 0.55;
        } else {
          this.dartMesh.visible = false;
          this.dartMat.opacity = 0;
          this.activePhenomenon = null;
        }
      } else if (p.type === 'bush_rustle') {
        if (progress <= 1.0) {
          // Sudden vigorous shudder then dampening out
          const decay = Math.exp(-progress * 4.0);
          const shake = Math.sin(progress * 35.0) * 0.28 * decay;
          p.bush.rotation.z = p.originalRotZ + shake;
        } else {
          p.bush.rotation.z = p.originalRotZ;
          this.activePhenomenon = null;
        }
      }
    }
  }
}
