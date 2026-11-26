import * as THREE from 'three';
import { MASTER_SIZE } from '../js/mathEngine.js';

/**
 * Módulo Isolado: Rotação 4D e Projeção Perspectiva no Eixo W (Tesseract)
 */
export class Hyper4DProjector {
  constructor(scene) {
    this.scene = scene;
    this.angleXW = 0; // em radianos
    this.angleYW = 0; // em radianos
    this.autoSpin = false;
    this.cameraDistanceW = 14.0;

    this.tesseractWireframe = null;
    this.vertices4D = [];
    this.edges4D = [];

    this._initTesseractCage();
  }

  _initTesseractCage() {
    const half = MASTER_SIZE * 0.5;

    // Gera os 16 vértices de um hipercubo [-half, +half]^4
    for (let i = 0; i < 16; i++) {
      this.vertices4D.push([
        (i & 1 ? 1 : -1) * half,
        (i & 2 ? 1 : -1) * half,
        (i & 4 ? 1 : -1) * half,
        (i & 8 ? 1 : -1) * half
      ]);
    }

    // Conecta os 32 pares de vértices que diferem em exatamente 1 coordenada
    for (let i = 0; i < 16; i++) {
      for (let bit = 0; bit < 4; bit++) {
        const j = i ^ (1 << bit);
        if (i < j) {
          this.edges4D.push([i, j]);
        }
      }
    }

    const positions = new Float32Array(this.edges4D.length * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.45
    });

    this.tesseractWireframe = new THREE.LineSegments(geometry, material);
    this.tesseractWireframe.visible = false;
    this.scene.add(this.tesseractWireframe);
  }

  isActive() {
    return this.autoSpin || Math.abs(this.angleXW) > 0.001 || Math.abs(this.angleYW) > 0.001;
  }

  setAnglesDeg(degXW, degYW) {
    this.angleXW = THREE.MathUtils.degToRad(degXW);
    this.angleYW = THREE.MathUtils.degToRad(degYW);
    this._updateCageGeometry();
  }

  toggleAutoSpin() {
    this.autoSpin = !this.autoSpin;
    this._updateCageGeometry();
    return this.autoSpin;
  }

  reset() {
    this.angleXW = 0;
    this.angleYW = 0;
    this.autoSpin = false;
    if (this.tesseractWireframe) {
      this.tesseractWireframe.visible = false;
    }
  }

  /**
   * Avança a rotação automática no plano XW/YW e atualiza a gaiola 4D
   */
  update(dt) {
    if (!this.autoSpin) return false;

    this.angleXW = (this.angleXW + dt * 0.65) % (Math.PI * 2);
    this.angleYW = (this.angleYW + dt * 0.35) % (Math.PI * 2);
    this._updateCageGeometry();
    return true;
  }

  /**
   * Extrai a coordenada W real a partir da 4ª dimensão (coords[3]) quando exp >= 4
   */
  getWCoordinate(coords, base) {
    if (!coords || coords.length < 4 || base <= 1) return 0;
    const normW = coords[3] / (base - 1) - 0.5;
    return normW * MASTER_SIZE;
  }

  /**
   * Aplica rotação 4D (XW e YW) seguida de projeção em perspectiva para 3D
   */
  projectPoint(x, y, z, w) {
    if (!this.isActive()) {
      return { x, y, z, scaleFactor: 1 };
    }

    const cosXW = Math.cos(this.angleXW);
    const sinXW = Math.sin(this.angleXW);
    const cosYW = Math.cos(this.angleYW);
    const sinYW = Math.sin(this.angleYW);

    // 1. Rotação no plano XW
    const x1 = x * cosXW - w * sinXW;
    const w1 = x * sinXW + w * cosXW;

    // 2. Rotação no plano YW
    const y1 = y * cosYW - w1 * sinYW;
    const w2 = y * sinYW + w1 * cosYW;

    // 3. Projeção perspectiva 4D -> 3D
    const denom = Math.max(2.5, this.cameraDistanceW - w2);
    const factor = this.cameraDistanceW / denom;

    return {
      x: x1 * factor,
      y: y1 * factor,
      z: z * factor,
      scaleFactor: factor
    };
  }

  _updateCageGeometry() {
    if (!this.tesseractWireframe) return;

    const active = this.isActive();
    this.tesseractWireframe.visible = active;
    if (!active) return;

    const projected = this.vertices4D.map(([vx, vy, vz, vw]) =>
      this.projectPoint(vx, vy, vz, vw)
    );

    const posAttr = this.tesseractWireframe.geometry.attributes.position;
    let ptr = 0;

    for (const [a, b] of this.edges4D) {
      const pa = projected[a];
      const pb = projected[b];

      posAttr.array[ptr++] = pa.x;
      posAttr.array[ptr++] = pa.y;
      posAttr.array[ptr++] = pa.z;

      posAttr.array[ptr++] = pb.x;
      posAttr.array[ptr++] = pb.y;
      posAttr.array[ptr++] = pb.z;
    }

    posAttr.needsUpdate = true;
  }
}