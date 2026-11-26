import * as THREE from 'three';

const UP_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Módulo Isolado: Curva de Preenchimento Espacial (Ordem Z / Morton)
 * Renderiza o feixe neon espesso em 3D do Bloco #1 ao #n^e com pulso viajante.
 */
export class SpaceFillingCurve {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);

    this.visible = false;
    this.segmentsMesh = null;
    this.points = [];
    this.progress = 0;
    this.thickness = 0.065; // Raio do feixe neon

    // Auxiliares reutilizáveis para atualização em 60fps sem alocar memória
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._mid = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._scale = new THREE.Vector3();
    this._matrix = new THREE.Matrix4();

    // Esfera luminosa que percorre o caminho
    const tracerGeo = new THREE.SphereGeometry(0.24, 14, 14);
    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.tracer = new THREE.Mesh(tracerGeo, tracerMat);
    this.tracer.visible = false;
    this.group.add(this.tracer);
  }

  toggle() {
    this.visible = !this.visible;
    this.group.visible = this.visible;
    if (this.visible) this.progress = 0;
    return this.visible;
  }

  reset() {
    this.visible = false;
    this.group.visible = false;
    this.progress = 0;
  }

  rebuild(blocksData, radialBoost = 1, hyper4D = null, base = 3) {
    if (this.segmentsMesh) {
      this.group.remove(this.segmentsMesh);
      this.segmentsMesh.geometry.dispose();
      this.segmentsMesh.material.dispose();
      this.segmentsMesh = null;
    }

    if (!blocksData || blocksData.length < 2) {
      this.points = [];
      this.tracer.visible = false;
      return;
    }

    const segCount = blocksData.length - 1;
    const geometry = new THREE.CylinderGeometry(this.thickness, this.thickness, 1, 5, 1, false);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.segmentsMesh = new THREE.InstancedMesh(geometry, material, segCount);
    this.segmentsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const colorHelper = new THREE.Color();
    for (let i = 0; i < segCount; i++) {
      const t = i / Math.max(1, segCount - 1);
      // Gradiente neon: Ciano -> Roxo -> Esmeralda
      const hue = (0.54 + t * 0.88) % 1;
      colorHelper.setHSL(hue, 0.95, 0.6);
      this.segmentsMesh.setColorAt(i, colorHelper);
    }
    if (this.segmentsMesh.instanceColor) {
      this.segmentsMesh.instanceColor.needsUpdate = true;
    }

    this.group.add(this.segmentsMesh);
    this.progress = 0;
    this.tracer.visible = true;
    this.syncPositions(blocksData, radialBoost, hyper4D, base, 1);
  }

  syncPositions(blocksData, radialBoost = 1, hyper4D = null, base = 3, ease = 1) {
    if (!this.visible || !this.segmentsMesh || !blocksData || blocksData.length < 2) return;

    const count = blocksData.length;
    this.points.length = count;
    const use4D = hyper4D && hyper4D.isActive();

    for (let i = 0; i < count; i++) {
      const b = blocksData[i];
      let x = (b.startX + (b.x - b.startX) * ease) * radialBoost;
      let y = (b.startY + (b.y - b.startY) * ease) * radialBoost;
      let z = (b.startZ + (b.z - b.startZ) * ease) * radialBoost;

      if (use4D) {
        const w = hyper4D.getWCoordinate(b.coords, base);
        const proj = hyper4D.projectPoint(x, y, z, w);
        x = proj.x;
        y = proj.y;
        z = proj.z;
      }

      if (!this.points[i]) {
        this.points[i] = { x, y, z };
      } else {
        this.points[i].x = x;
        this.points[i].y = y;
        this.points[i].z = z;
      }
    }

    // Posiciona cada cilindro entre o ponto i e o ponto i+1
    for (let i = 0; i < count - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];

      this._v1.set(p1.x, p1.y, p1.z);
      this._v2.set(p2.x, p2.y, p2.z);

      this._dir.subVectors(this._v2, this._v1);
      const len = this._dir.length();

      if (len > 0.0001) {
        this._dir.divideScalar(len);
        this._quat.setFromUnitVectors(UP_AXIS, this._dir);
      } else {
        this._quat.identity();
      }

      this._mid.addVectors(this._v1, this._v2).multiplyScalar(0.5);
      // Leve folga (+0.06) sela as quinas de 90 graus sem deixar frestas
      this._scale.set(1, len + 0.06, 1);

      this._matrix.compose(this._mid, this._quat, this._scale);
      this.segmentsMesh.setMatrixAt(i, this._matrix);
    }

    this.segmentsMesh.instanceMatrix.needsUpdate = true;
    this.segmentsMesh.computeBoundingSphere();
  }

  update(dt, hideTemporarily = false) {
    this.group.visible = this.visible && !hideTemporarily;
    if (!this.group.visible || this.points.length < 2) return;

    this.progress = (this.progress + dt * 0.15) % 1;

    const scaled = this.progress * (this.points.length - 1);
    const idx = Math.floor(scaled);
    const frac = scaled - idx;

    const p1 = this.points[idx];
    const p2 = this.points[Math.min(idx + 1, this.points.length - 1)];

    this.tracer.position.set(
      p1.x + (p2.x - p1.x) * frac,
      p1.y + (p2.y - p1.y) * frac,
      p1.z + (p2.z - p1.z) * frac
    );
  }
}