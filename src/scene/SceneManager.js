import * as THREE from 'three';

export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060c0b, 0.038); // Deep misty forest fog

    // 2. Camera (First person initial setup)
    this.camera = new THREE.PerspectiveCamera(65, this.width / this.height, 0.1, 150);
    this.camera.position.set(0, 1.7, 0);

    // 3. Renderer
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
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    this.setupLights();

    // 5. Window resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLights() {
    // Ambient forest light - dark cold eerie green/blue
    this.ambientLight = new THREE.AmbientLight(0x101e1a, 1.8);
    this.scene.add(this.ambientLight);

    // Moonlight filtering through branches
    this.moonLight = new THREE.DirectionalLight(0x7ba6a3, 2.4);
    this.moonLight.position.set(-20, 35, -15);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 80;
    this.moonLight.shadow.camera.left = -25;
    this.moonLight.shadow.camera.right = 25;
    this.moonLight.shadow.camera.top = 25;
    this.moonLight.shadow.camera.bottom = -25;
    this.moonLight.shadow.bias = -0.0005;
    this.scene.add(this.moonLight);

    // Subtle blue-green fill light from the forest edge
    this.fillLight = new THREE.DirectionalLight(0x1f3b38, 0.9);
    this.fillLight.position.set(15, 20, 20);
    this.scene.add(this.fillLight);
  }

  setInteriorFog(isInterior) {
    if (isInterior) {
      // Warm amber shadowed cabin interior fog
      this.scene.fog = new THREE.FogExp2(0x140c06, 0.05);
      this.renderer.toneMappingExposure = 1.1;
    } else {
      // Cold mysterious misty forest fog
      this.scene.fog = new THREE.FogExp2(0x060c0b, 0.038);
      this.renderer.toneMappingExposure = 0.85;
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
