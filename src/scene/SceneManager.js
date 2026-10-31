import * as THREE from 'three';

export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // 1. Scene & Cool Blue-Grey Muted Charcoal Atmospheric Mist
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x33424a); // Cool blue-grey misty sky background
    this.scene.fog = new THREE.FogExp2(0x384852, 0.024); // Atmospheric depth fog

    // 2. Camera (First person initial setup)
    this.camera = new THREE.PerspectiveCamera(65, this.width / this.height, 0.1, 160);
    this.camera.position.set(0, 1.7, 0);

    // 3. Renderer with balanced cinematic tone mapping (avoids crushing shadows to black)
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05; // Balanced exposure to preserve shadow details
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    // 4. Diffused natural woodland lighting
    this.setupLights();
    this.createVolumetricLightRays();

    // 5. Window resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLights() {
    // 1. Soft diffused natural hemisphere light (cool misty sky overhead + muted dark ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0x7c96a3, 0x222c30, 2.1);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // 2. Diffused sun/skylight filtering through the canopy gaps
    this.sunLight = new THREE.DirectionalLight(0xa5bed0, 2.4);
    this.sunLight.position.set(-18, 40, -12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 90;
    this.sunLight.shadow.camera.left = -28;
    this.sunLight.shadow.camera.right = 28;
    this.sunLight.shadow.camera.top = 28;
    this.sunLight.shadow.camera.bottom = -28;
    this.sunLight.shadow.bias = -0.0006;
    this.scene.add(this.sunLight);

    // 3. Cool atmospheric fill light from the forest flank
    this.fillLight = new THREE.DirectionalLight(0x455b66, 1.2);
    this.fillLight.position.set(20, 25, 20);
    this.scene.add(this.fillLight);
  }

  createVolumetricLightRays() {
    // Subtle diagonal volumetric light shafts filtering through canopy gaps
    this.godRaysGroup = new THREE.Group();

    // Procedural light ray texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, 'rgba(195, 220, 235, 0.28)');
    grad.addColorStop(0.35, 'rgba(170, 200, 218, 0.16)');
    grad.addColorStop(0.8, 'rgba(140, 175, 195, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 512);

    const rayTex = new THREE.CanvasTexture(canvas);
    const rayMat = new THREE.MeshBasicMaterial({
      map: rayTex,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const rayGeo = new THREE.CylinderGeometry(0.3, 3.2, 28, 12, 1, true);
    rayGeo.rotateZ(Math.PI / 8); // Slanted beam

    const rayPositions = [
      [-4.0, 14, 12],
      [3.5, 15, 2],
      [-2.8, 14, -10],
      [4.2, 16, -18],
    ];

    rayPositions.forEach((pos) => {
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(...pos);
      this.godRaysGroup.add(ray);
    });

    this.scene.add(this.godRaysGroup);
  }

  setInteriorFog(isInterior) {
    if (isInterior) {
      // Warm amber shadowed cabin interior fog
      this.scene.background = new THREE.Color(0x120a05);
      this.scene.fog = new THREE.FogExp2(0x140c06, 0.05);
      this.renderer.toneMappingExposure = 1.15;
      if (this.godRaysGroup) this.godRaysGroup.visible = false;
    } else {
      // Cool blue-grey misty woodland fog
      this.scene.background = new THREE.Color(0x33424a);
      this.scene.fog = new THREE.FogExp2(0x384852, 0.024);
      this.renderer.toneMappingExposure = 1.05;
      if (this.godRaysGroup) this.godRaysGroup.visible = true;
    }
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
