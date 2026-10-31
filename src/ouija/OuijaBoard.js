import * as THREE from 'three';

export class OuijaBoard {
  constructor(scene) {
    this.scene = scene;
    this.boardWidth = 1.6;
    this.boardHeight = 0.04;
    this.boardDepth = 1.0;

    this.boardGroup = new THREE.Group();
    this.planchetteGroup = new THREE.Group();

    // Map of letter & symbol coordinates in board-local space [-0.7 to +0.7 in X, -0.4 to +0.4 in Z]
    this.letterCoords = {};

    this.init();
  }

  init() {
    this.generateBoardTexture();
    this.createBoardMesh();
    this.createPlanchetteMesh();
    this.setupLetterCoordinateMap();

    this.scene.add(this.boardGroup);
  }

  generateBoardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1300;
    const ctx = canvas.getContext('2d');

    // 1. Base dark antique aged wood
    const woodGrad = ctx.createRadialGradient(1024, 650, 200, 1024, 650, 1100);
    woodGrad.addColorStop(0, '#2d1c12');
    woodGrad.addColorStop(0.65, '#20130b');
    woodGrad.addColorStop(1, '#0e0805');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, 0, 2048, 1300);

    // 2. Realistic wood grain lines
    ctx.save();
    for (let i = 0; i < 900; i++) {
      const y = Math.random() * 1300;
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(58, 38, 25, 0.3)' : 'rgba(18, 10, 6, 0.4)';
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        600, y + (Math.random() * 18 - 9),
        1400, y + (Math.random() * 18 - 9),
        2048, y + (Math.random() * 12 - 6)
      );
      ctx.stroke();
    }
    // Subtle wood knots
    for (let k = 0; k < 5; k++) {
      const kx = 300 + Math.random() * 1400;
      const ky = 200 + Math.random() * 900;
      const rad = 25 + Math.random() * 45;
      const knotGrad = ctx.createRadialGradient(kx, ky, 2, kx, ky, rad);
      knotGrad.addColorStop(0, 'rgba(15, 8, 4, 0.7)');
      knotGrad.addColorStop(0.7, 'rgba(35, 20, 12, 0.4)');
      knotGrad.addColorStop(1, 'rgba(45, 28, 18, 0)');
      ctx.fillStyle = knotGrad;
      ctx.beginPath();
      ctx.arc(kx, ky, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Ornate Double Border with corner scrollwork
    ctx.strokeStyle = 'rgba(215, 195, 155, 0.75)'; // Muted antique ivory/gold
    ctx.lineWidth = 6;
    ctx.strokeRect(60, 60, 2048 - 120, 1300 - 120);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(74, 74, 2048 - 148, 1300 - 148);

    // Corner decorative filigree
    this.drawCornerFiligree(ctx, 60, 60, 1, 1);
    this.drawCornerFiligree(ctx, 2048 - 60, 60, -1, 1);
    this.drawCornerFiligree(ctx, 60, 1300 - 60, 1, -1);
    this.drawCornerFiligree(ctx, 2048 - 60, 1300 - 60, -1, -1);

    // 4. Mystical Sun & Moon / YES & NO
    // YES + Sun on Left
    this.drawSun(ctx, 260, 200);
    ctx.font = 'bold 64px "Cinzel", "Times New Roman", serif';
    ctx.fillStyle = 'rgba(228, 212, 178, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YES', 260, 310);

    // NO + Crescent Moon on Right
    this.drawCrescentMoon(ctx, 1788, 200);
    ctx.fillText('NO', 1788, 310);

    // Center Occult Header (All Seeing Eye)
    this.drawAllSeeingEye(ctx, 1024, 180);

    // 5. Lettering: Alphabet Arcs (A-M and N-Z)
    ctx.fillStyle = 'rgba(235, 220, 185, 0.92)';

    // Arc 1: A through M (Radius 950px, center at (1024, 1350))
    const arc1Radius = 900;
    const arc1CenterY = 1320;
    const arc1Letters = 'A B C D E F G H I J K L M'.split(' ');
    const arc1AngleSpan = 1.05; // radians
    const arc1StartAngle = -Math.PI / 2 - arc1AngleSpan / 2;

    ctx.font = 'bold 74px "Cinzel", "Georgia", serif';
    arc1Letters.forEach((letter, idx) => {
      const angle = arc1StartAngle + (idx / (arc1Letters.length - 1)) * arc1AngleSpan;
      const lx = 1024 + Math.cos(angle) * arc1Radius;
      const ly = arc1CenterY + Math.sin(angle) * arc1Radius;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(letter, 0, 0);
      ctx.restore();
    });

    // Arc 2: N through Z (Radius 760px)
    const arc2Radius = 760;
    const arc2CenterY = 1300;
    const arc2Letters = 'N O P Q R S T U V W X Y Z'.split(' ');
    const arc2AngleSpan = 1.02;
    const arc2StartAngle = -Math.PI / 2 - arc2AngleSpan / 2;

    arc2Letters.forEach((letter, idx) => {
      const angle = arc2StartAngle + (idx / (arc2Letters.length - 1)) * arc2AngleSpan;
      const lx = 1024 + Math.cos(angle) * arc2Radius;
      const ly = arc2CenterY + Math.sin(angle) * arc2Radius;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(letter, 0, 0);
      ctx.restore();
    });

    // 6. Numbers Row: 1 2 3 4 5 6 7 8 9 0
    const numbers = '1 2 3 4 5 6 7 8 9 0'.split(' ');
    ctx.font = 'bold 56px "Cinzel", "Georgia", serif';
    const numStartX = 460;
    const numEndX = 1588;
    const numY = 880;
    numbers.forEach((num, idx) => {
      const nx = numStartX + (idx / (numbers.length - 1)) * (numEndX - numStartX);
      ctx.fillText(num, nx, numY);
    });

    // 7. GOODBYE at bottom
    ctx.font = 'bold 78px "Cinzel", "Georgia", serif';
    ctx.fillText('GOODBYE', 1024, 1110);

    // Decorative flourishes around GOODBYE
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(680, 1110);
    ctx.lineTo(520, 1110);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(1368, 1110);
    ctx.lineTo(1528, 1110);
    ctx.stroke();

    // 8. Surface Scratches and distressed age marks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1;
    for (let s = 0; s < 180; s++) {
      const sx = Math.random() * 2048;
      const sy = Math.random() * 1300;
      const slen = 15 + Math.random() * 60;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() * 30 - 15), sy + slen);
      ctx.stroke();
    }

    // Heavy vignette shadow around edges
    const vigGrad = ctx.createRadialGradient(1024, 650, 700, 1024, 650, 1250);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, 2048, 1300);

    this.boardTexture = new THREE.CanvasTexture(canvas);
    this.boardTexture.anisotropy = 16;
  }

  drawSun(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(230, 210, 170, 0.85)';
    ctx.fillStyle = 'rgba(230, 210, 170, 0.85)';
    ctx.lineWidth = 3;

    // Face circle
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();

    // Eyes and mouth
    ctx.beginPath();
    ctx.arc(-12, -4, 4, 0, Math.PI * 2);
    ctx.arc(12, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 8, 14, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Radiant wavy sun rays
    for (let r = 0; r < 12; r++) {
      const angle = (r / 12) * Math.PI * 2;
      const len = r % 2 === 0 ? 60 : 45;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 38, Math.sin(angle) * 38);
      ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCrescentMoon(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(230, 210, 170, 0.85)';
    ctx.fillStyle = 'rgba(230, 210, 170, 0.85)';
    ctx.lineWidth = 3;

    // Crescent outline
    ctx.beginPath();
    ctx.arc(0, 0, 38, -Math.PI / 2, Math.PI / 2, false);
    ctx.bezierCurveTo(15, 25, 15, -25, 0, -38);
    ctx.stroke();

    // Sleepy eye on the crescent profile
    ctx.beginPath();
    ctx.arc(6, -6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Small stars
    const starAngles = [-0.9, -0.2, 0.5, 1.2];
    starAngles.forEach((sa) => {
      const sx = Math.cos(sa) * 58;
      const sy = Math.sin(sa) * 58;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawAllSeeingEye(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(225, 205, 165, 0.85)';
    ctx.lineWidth = 3;

    // Radiant rays above
    for (let i = -5; i <= 5; i++) {
      const angle = -Math.PI / 2 + (i / 7) * 0.7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 45, Math.sin(angle) * 45);
      ctx.lineTo(Math.cos(angle) * 75, Math.sin(angle) * 75);
      ctx.stroke();
    }

    // Occult triangle
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(-65, 35);
    ctx.lineTo(65, 35);
    ctx.closePath();
    ctx.stroke();

    // Eye shape inside
    ctx.beginPath();
    ctx.ellipse(0, 8, 30, 16, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(225, 205, 165, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 8, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawCornerFiligree(ctx, x, y, sx, sy) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.strokeStyle = 'rgba(215, 195, 155, 0.7)';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.bezierCurveTo(80, 20, 100, 60, 120, 20);
    ctx.bezierCurveTo(60, 100, 20, 80, 20, 120);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(45, 45, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  createBoardMesh() {
    // 3D Wooden Ouija Board block with chamfered edges
    const boardGeo = new THREE.BoxGeometry(this.boardWidth, this.boardHeight, this.boardDepth);

    const darkWoodSideMat = new THREE.MeshStandardMaterial({
      color: 0x180e09,
      roughness: 0.8,
      metalness: 0.1,
    });

    const topMat = new THREE.MeshStandardMaterial({
      map: this.boardTexture,
      roughness: 0.65,
      metalness: 0.15,
    });

    // Materials array: [right, left, top, bottom, front, back]
    const materials = [
      darkWoodSideMat,
      darkWoodSideMat,
      topMat,
      darkWoodSideMat,
      darkWoodSideMat,
      darkWoodSideMat,
    ];

    this.boardMesh = new THREE.Mesh(boardGeo, materials);
    this.boardMesh.castShadow = true;
    this.boardMesh.receiveShadow = true;
    this.boardGroup.add(this.boardMesh);
  }

  createPlanchetteMesh() {
    // Teardrop / heart-shaped planchette with central glass viewing window
    const shape = new THREE.Shape();
    // Centered pointing upward (towards Z- in local space)
    shape.moveTo(0, -0.16); // Bottom tip/point
    shape.bezierCurveTo(-0.16, -0.06, -0.18, 0.12, 0, 0.19); // Left round lobe to top
    shape.bezierCurveTo(0.18, 0.12, 0.16, -0.06, 0, -0.16); // Right lobe back to tip

    // Extrude geometry for thickness
    const extrudeSettings = {
      depth: 0.018,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.006,
      bevelThickness: 0.006,
    };

    const planchetteGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    planchetteGeo.rotateX(Math.PI / 2); // Flat on X-Z plane

    const planchetteMat = new THREE.MeshStandardMaterial({
      color: 0x3d2417, // Antique polished walnut
      roughness: 0.45,
      metalness: 0.2,
    });

    const planchetteMesh = new THREE.Mesh(planchetteGeo, planchetteMat);
    planchetteMesh.castShadow = true;
    this.planchetteGroup.add(planchetteMesh);

    // Brass viewing hole frame
    const ringGeo = new THREE.TorusGeometry(0.045, 0.008, 12, 32);
    ringGeo.rotateX(Math.PI / 2);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc8a858,
      roughness: 0.35,
      metalness: 0.85,
    });
    const brassRing = new THREE.Mesh(ringGeo, brassMat);
    brassRing.position.set(0, 0.012, 0.02);
    this.planchetteGroup.add(brassRing);

    // Magnifying glass lens
    const lensGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.004, 32);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.92,
      opacity: 1.0,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0.012, 0.02);
    this.planchetteGroup.add(lens);

    // Planchette felt peg feet
    const pegGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8);
    const pegMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const peg1 = new THREE.Mesh(pegGeo, pegMat);
    peg1.position.set(-0.08, -0.005, 0.08);
    const peg2 = new THREE.Mesh(pegGeo, pegMat);
    peg2.position.set(0.08, -0.005, 0.08);
    const peg3 = new THREE.Mesh(pegGeo, pegMat);
    peg3.position.set(0, -0.005, -0.1);
    this.planchetteGroup.add(peg1, peg2, peg3);

    // Position planchette on top of the board surface
    this.planchetteGroup.position.set(0, this.boardHeight / 2 + 0.01, 0.15); // Resting at center-lower
    this.boardGroup.add(this.planchetteGroup);

    this.planchetteCurrentPos = this.planchetteGroup.position.clone();
    this.planchetteTargetPos = this.planchetteGroup.position.clone();
  }

  // Pre-calculate exact 3D coordinates for every letter and symbol on the board
  setupLetterCoordinateMap() {
    // Board dimensions: width 1.6m (-0.8 to +0.8), depth 1.0m (-0.5 to +0.5)
    // Board texture: 2048 x 1300 pixels
    const pxToX = (px) => (px / 2048 - 0.5) * this.boardWidth;
    const pyToZ = (py) => (py / 1300 - 0.5) * this.boardDepth;

    // YES & NO
    this.letterCoords['YES'] = new THREE.Vector3(pxToX(260), 0.03, pyToZ(310));
    this.letterCoords['NO'] = new THREE.Vector3(pxToX(1788), 0.03, pyToZ(310));

    // Arc 1: A-M
    const arc1Radius = 900;
    const arc1CenterY = 1320;
    const arc1Letters = 'A B C D E F G H I J K L M'.split(' ');
    const arc1AngleSpan = 1.05;
    const arc1StartAngle = -Math.PI / 2 - arc1AngleSpan / 2;

    arc1Letters.forEach((l, idx) => {
      const angle = arc1StartAngle + (idx / (arc1Letters.length - 1)) * arc1AngleSpan;
      const lx = 1024 + Math.cos(angle) * arc1Radius;
      const ly = arc1CenterY + Math.sin(angle) * arc1Radius;
      this.letterCoords[l] = new THREE.Vector3(pxToX(lx), 0.03, pyToZ(ly));
    });

    // Arc 2: N-Z
    const arc2Radius = 760;
    const arc2CenterY = 1300;
    const arc2Letters = 'N O P Q R S T U V W X Y Z'.split(' ');
    const arc2AngleSpan = 1.02;
    const arc2StartAngle = -Math.PI / 2 - arc2AngleSpan / 2;

    arc2Letters.forEach((l, idx) => {
      const angle = arc2StartAngle + (idx / (arc2Letters.length - 1)) * arc2AngleSpan;
      const lx = 1024 + Math.cos(angle) * arc2Radius;
      const ly = arc2CenterY + Math.sin(angle) * arc2Radius;
      this.letterCoords[l] = new THREE.Vector3(pxToX(lx), 0.03, pyToZ(ly));
    });

    // Numbers: 1 to 0
    const numbers = '1 2 3 4 5 6 7 8 9 0'.split(' ');
    const numStartX = 460;
    const numEndX = 1588;
    const numY = 880;
    numbers.forEach((n, idx) => {
      const nx = numStartX + (idx / (numbers.length - 1)) * (numEndX - numStartX);
      this.letterCoords[n] = new THREE.Vector3(pxToX(nx), 0.03, pyToZ(numY));
    });

    // GOODBYE
    this.letterCoords['GOODBYE'] = new THREE.Vector3(pxToX(1024), 0.03, pyToZ(1110));

    // REST (Neutral center position)
    this.letterCoords['REST'] = new THREE.Vector3(0, 0.03, 0.12);
  }

  // Smoothly set planchette target coordinate
  setTargetSymbol(symbol) {
    const sym = symbol.toUpperCase().trim();
    if (this.letterCoords[sym]) {
      this.planchetteTargetPos.copy(this.letterCoords[sym]);
      return true;
    }
    return false;
  }

  // Set manual dragging target from screen coordinates or raycasting
  setTargetPosition(x, z) {
    // Clamp to board surface bounds
    const clampedX = Math.max(-0.65, Math.min(0.65, x));
    const clampedZ = Math.max(-0.4, Math.min(0.4, z));
    this.planchetteTargetPos.set(clampedX, 0.03, clampedZ);
  }

  update(delta, clockTime) {
    // Smooth planchette interpolation with realistic damping
    const prevPos = this.planchetteGroup.position.clone();
    this.planchetteGroup.position.lerp(this.planchetteTargetPos, 4.5 * delta);

    // Subtle natural tilt/wobble while sliding
    const velX = (this.planchetteGroup.position.x - prevPos.x) / delta;
    const velZ = (this.planchetteGroup.position.z - prevPos.z) / delta;
    const speed = Math.sqrt(velX * velX + velZ * velZ);

    this.planchetteGroup.rotation.z = -velX * 0.03;
    this.planchetteGroup.rotation.x = velZ * 0.03;

    return speed;
  }
}
