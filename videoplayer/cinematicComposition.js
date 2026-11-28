import * as THREE from 'three';

/** Continuously solves framing offsets from the analyzer's normalized telemetry. */
export class CinematicCompositionSolver {
  constructor() {
    this.focus = new THREE.Vector3();
    this.frameBias = new THREE.Vector2();
    this._smooth = new THREE.Vector2();
    this._last = new THREE.Vector2();
    this.crowding = 0;
    this.confidence = 0;
    this.negativeSpace = 0;
  }

  update(telemetry = {}, dt = 1 / 60) {
    const focusX = THREE.MathUtils.clamp(telemetry.focusX ?? 0, -1, 1);
    const focusY = THREE.MathUtils.clamp(telemetry.focusY ?? 0, -1, 1);
    const colorX = THREE.MathUtils.clamp(telemetry.colorFocusX ?? 0, -1, 1);
    const colorY = THREE.MathUtils.clamp(telemetry.colorFocusY ?? 0, -1, 1);
    const colorArea = THREE.MathUtils.clamp(telemetry.dominantHueRatio ?? 0, 0, 1);
    const colorSat = THREE.MathUtils.clamp(telemetry.dominantHueStrength ?? 0, 0, 1);
    const colorConfidence = colorArea * colorSat;
    const motionX = THREE.MathUtils.clamp(telemetry.velocityX ?? 0, -1, 1);
    const motionY = THREE.MathUtils.clamp(telemetry.velocityY ?? 0, -1, 1);
    const scale = THREE.MathUtils.clamp(telemetry.subjectScale ?? 0.5, 0.1, 1);
    const depthCoverage = THREE.MathUtils.clamp(telemetry.depthCoverage ?? 0, 0, 1);
    const depthSpread = THREE.MathUtils.clamp((telemetry.depthSpread ?? 0) * 2.4, 0, 1);
    const contrast = THREE.MathUtils.clamp(telemetry.colorContrast ?? 0, 0, 1);
    const clusterSpread = THREE.MathUtils.clamp(telemetry.colorClusterSpread ?? 0, 0, 1);

    // Saliency is weighted but never lets a small saturated accent dominate.
    const saliencyX = focusX * (0.64 + scale * 0.16) + colorX * colorConfidence * 0.2 + motionX * 0.08;
    const saliencyY = focusY * 0.62 + colorY * colorConfidence * 0.2 + motionY * 0.08;
    const offsetX = THREE.MathUtils.clamp(saliencyX, -0.8, 0.8);
    const offsetY = THREE.MathUtils.clamp(saliencyY, -0.6, 0.6);
    const alpha = 1 - Math.exp(-Math.max(0.001, dt) * 3.4);
    this._smooth.x += (offsetX - this._smooth.x) * alpha;
    this._smooth.y += (offsetY - this._smooth.y) * alpha;

    // Bias the framing away from the subject to preserve negative space.
    const negativeSpaceBiasX = -this._smooth.x * (0.16 + scale * 0.12);
    const negativeSpaceBiasY = -this._smooth.y * 0.10;
    this.frameBias.set(negativeSpaceBiasX, negativeSpaceBiasY);
    this.focus.set(this._smooth.x * 3.1, this._smooth.y * 2.25, 0);
    this.crowding = THREE.MathUtils.clamp(scale * 0.44 + depthCoverage * 0.28 + clusterSpread * 0.16 + contrast * 0.12, 0, 1);
    this.confidence = THREE.MathUtils.clamp(0.35 + scale * 0.25 + depthSpread * 0.2 + colorConfidence * 0.2, 0, 1);
    this.negativeSpace = THREE.MathUtils.clamp(1 - this.crowding + Math.abs(this._smooth.x) * 0.25, 0, 1);
    this._last.copy(this._smooth);
    return this;
  }
}
