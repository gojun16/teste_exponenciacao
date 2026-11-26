import * as THREE from 'three';
import { MASTER_SIZE } from '../js/mathEngine.js';

/**
 * Módulo Isolado: Física Sandbox (F = ma), Onda de Choque Radial e Rebobinar Tempo
 */
export class SandboxPhysics {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.rewinding = false;
    this.bodies = [];

    this.gravity = 24.0;
    this.restitution = 0.62;
    this.floorY = -MASTER_SIZE * 0.72;
    this.onRewindComplete = null;

    this.floorGroup = null;
    this._initFloorMesh();
  }

  _initFloorMesh() {
    this.floorGroup = new THREE.Group();

    const grid = new THREE.GridHelper(36, 18, 0xf59e0b, 0x1e293b);
    grid.position.y = this.floorY;
    grid.material.transparent = true;
    grid.material.opacity = 0.45;

    const planeGeo = new THREE.PlaneGeometry(36, 36);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = this.floorY - 0.02;

    this.floorGroup.add(grid);
    this.floorGroup.add(plane);
    this.floorGroup.visible = false;
    this.scene.add(this.floorGroup);
  }

  isRunning() {
    return this.active || this.rewinding;
  }

  enable(blocksData, radialBoost = 1) {
    if (!blocksData || blocksData.length === 0) return false;

    this.bodies = blocksData.map((b) => {
      const hx = b.x * radialBoost;
      const hy = b.y * radialBoost;
      const hz = b.z * radialBoost;

      // Pequeno impulso inicial para a estrutura desmoronar de forma orgânica
      const dist = Math.hypot(hx, hz) || 0.1;
      return {
        x: hx,
        y: hy,
        z: hz,
        homeX: hx,
        homeY: hy,
        homeZ: hz,
        vx: (hx / dist) * (0.6 + Math.random() * 1.4) + (Math.random() - 0.5) * 0.8,
        vy: Math.random() * 1.8,
        vz: (hz / dist) * (0.6 + Math.random() * 1.4) + (Math.random() - 0.5) * 0.8,
        rx: 0,
        ry: 0,
        rz: 0,
        avx: (Math.random() - 0.5) * 2.5,
        avy: (Math.random() - 0.5) * 2.5,
        avz: (Math.random() - 0.5) * 2.5,
        sx: b.sx,
        sy: b.sy,
        sz: b.sz
      };
    });

    this.active = true;
    this.rewinding = false;
    this.floorGroup.visible = true;
    return true;
  }

  startRewind() {
    if (!this.active) return false;
    this.rewinding = true;
    return true;
  }

  reset() {
    this.active = false;
    this.rewinding = false;
    this.bodies = [];
    if (this.floorGroup) {
      this.floorGroup.visible = false;
    }
  }

  /**
   * Dispara uma onda de choque radial a partir do ponto clicado no espaço 3D
   */
  applyShockwave(origin, strength = 24) {
    if (!this.active || this.rewinding || this.bodies.length === 0) return;

    const ox = origin ? origin.x : 0;
    const oy = origin ? origin.y : this.floorY;
    const oz = origin ? origin.z : 0;

    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const dx = b.x - ox;
      const dy = b.y - oy + 0.8; // leve viés para cima para arremessar os blocos
      const dz = b.z - oz;
      const dist = Math.hypot(dx, dy, dz) || 0.25;

      const falloff = strength / (1 + dist * 0.28);
      b.vx += (dx / dist) * falloff;
      b.vy += (dy / dist) * falloff + 4.5;
      b.vz += (dz / dist) * falloff;

      b.avx += (Math.random() - 0.5) * 9;
      b.avy += (Math.random() - 0.5) * 9;
      b.avz += (Math.random() - 0.5) * 9;
    }
  }

  update(dt) {
    if (!this.isRunning() || this.bodies.length === 0) return false;

    // Modo Rebobinar Tempo: retorno suave até a posição original
    if (this.rewinding) {
      const blend = 1 - Math.exp(-6.5 * dt);
      let maxRemaining = 0;

      for (let i = 0; i < this.bodies.length; i++) {
        const b = this.bodies[i];
        b.x += (b.homeX - b.x) * blend;
        b.y += (b.homeY - b.y) * blend;
        b.z += (b.homeZ - b.z) * blend;

        b.rx += (0 - b.rx) * blend;
        b.ry += (0 - b.ry) * blend;
        b.rz += (0 - b.rz) * blend;

        const dist = Math.hypot(b.homeX - b.x, b.homeY - b.y, b.homeZ - b.z);
        if (dist > maxRemaining) maxRemaining = dist;
      }

      if (maxRemaining < 0.015) {
        this.reset();
        if (this.onRewindComplete) this.onRewindComplete();
      }
      return true;
    }

    // Simulação F = ma com colisão no chão e paredes da arena
    const arenaLimit = 22;
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];

      b.vy -= this.gravity * dt;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;

      b.rx += b.avx * dt;
      b.ry += b.avy * dt;
      b.rz += b.avz * dt;

      // Colisão com o chão
      const minY = this.floorY + b.sy * 0.5;
      if (b.y < minY) {
        b.y = minY;
        if (Math.abs(b.vy) > 0.4) {
          b.vy = -b.vy * this.restitution;
        } else {
          b.vy = 0;
        }

        // Atrito no piso
        b.vx *= 0.91;
        b.vz *= 0.91;
        b.avx *= 0.84;
        b.avy *= 0.84;
        b.avz *= 0.84;
      }

      // Paredes invisíveis para manter os blocos dentro da câmera
      if (b.x > arenaLimit) { b.x = arenaLimit; b.vx *= -0.6; }
      if (b.x < -arenaLimit) { b.x = -arenaLimit; b.vx *= -0.6; }
      if (b.z > arenaLimit) { b.z = arenaLimit; b.vz *= -0.6; }
      if (b.z < -arenaLimit) { b.z = -arenaLimit; b.vz *= -0.6; }
    }

    return true;
  }
}