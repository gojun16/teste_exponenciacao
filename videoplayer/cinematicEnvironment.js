import * as THREE from 'three';

/** Lightweight atmospheric layer. Kept deliberately cheap for integrated GPUs. */
export class CinematicEnvironment {
  constructor(stageGroup, count = 112) {
    this.group = new THREE.Group();
    this.group.name = 'CinematicAtmosphere';
    stageGroup.add(this.group);
    this.count = count;
    this._base = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      const spread = layer === 0 ? 20 : layer === 1 ? 32 : 44;
      const depth = layer === 0 ? 5 : layer === 1 ? 18 : 34;
      const x = (Math.sin(i * 12.9898) * 0.5 + 0.5) * spread - spread * 0.5;
      const y = (Math.sin(i * 78.233 + 1.4) * 0.5 + 0.5) * spread * 0.65 - spread * 0.325;
      const z = -depth - (Math.sin(i * 39.425) * 0.5 + 0.5) * 12;
      this._base.set([x, y, z], i * 3);
      positions.set([x, y, z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.material = new THREE.PointsMaterial({
      color: 0x8bd9ff, size: 0.055, transparent: true, opacity: 0.22,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    // Sparse, low-contrast orbital arcs create environmental scale without competing with the video.
    this.arcs = [];
    for (let i = 0; i < 3; i++) {
      const curve = new THREE.EllipseCurve(0, 0, 15 + i * 5.2, 8.5 + i * 3.1, 0, Math.PI * 1.72, false, i * 0.35);
      const pts = curve.getPoints(96).map(p => new THREE.Vector3(p.x, p.y, -11 - i * 8));
      const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const arcMat = new THREE.LineBasicMaterial({ color: 0x6cb9ee, transparent: true, opacity: 0.045 + i * 0.012, depthWrite: false });
      const line = new THREE.Line(arcGeo, arcMat);
      this.group.add(line);
      this.arcs.push(line);
    }
  }

  update(dt, timeSec, telemetry = {}, energy = {}, idle = false, stageCenter = null) {
    if (stageCenter?.isVector3) this.group.position.copy(stageCenter);
    const motion = THREE.MathUtils.clamp(telemetry.motionEnergy ?? 0, 0, 1);
    const bass = THREE.MathUtils.clamp(energy.bass ?? 0, 0, 1);
    const beat = THREE.MathUtils.clamp(energy.beatPulse ?? 0, 0, 1);
    const driftScale = idle ? 0.15 : 0.35 + motion * 0.35 + bass * 0.18;
    const positions = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      const phase = i * 0.21;
      positions[o] = this._base[o] + Math.sin(timeSec * 0.08 + phase) * driftScale;
      positions[o + 1] = this._base[o + 1] + Math.cos(timeSec * 0.065 + phase * 1.3) * driftScale * 0.7;
      positions[o + 2] = this._base[o + 2] + Math.sin(timeSec * 0.04 + phase) * driftScale * 1.2;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.material.opacity = idle ? 0.10 : 0.14 + motion * 0.08 + beat * 0.035;
    this.material.size = 0.05 + bass * 0.012;
    const dom = telemetry.dominantColor;
    if (dom?.isColor) this.material.color.copy(dom).lerp(new THREE.Color(0x82d9ff), 0.48);
    for (let i = 0; i < this.arcs.length; i++) {
      this.arcs[i].rotation.z = Math.sin(timeSec * 0.025 + i) * (idle ? 0.004 : 0.012 + motion * 0.01);
      this.arcs[i].material.opacity = idle ? 0.025 : 0.035 + bass * 0.025;
    }
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
    for (const arc of this.arcs) {
      arc.geometry.dispose();
      arc.material.dispose();
    }
    this.group.parent?.remove(this.group);
  }
}
