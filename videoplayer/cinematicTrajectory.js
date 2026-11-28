import * as THREE from 'three';

const easeCinematic = (t) => {
  // smootherstep with a gentle middle acceleration; avoids linear camera motion.
  const s = THREE.MathUtils.clamp(t, 0, 1);
  const smoother = s * s * s * (s * (s * 6 - 15) + 10);
  // Blend with linear time so the shot visibly starts moving instead of lingering.
  return s * 0.46 + smoother * 0.54;
};


/** Generates a fresh, content-dependent spatial path per shot (no pose catalog). */
export class CinematicTrajectoryGenerator {
  constructor() {
    this.positionCurve = null;
    this.targetCurve = null;
    this.startTime = 0;
    this.duration = 14;
    this.intent = 'reveal';
    this.startFov = 42;
    this.endFov = 42;
    this.startRoll = 0;
    this.endRoll = 0;
    this.phase = 'idle';
    this._pos = new THREE.Vector3();
    this._target = new THREE.Vector3();
  }

  plan({ intent, timeSec, cameraPosition, lookTarget, cameraFov = 42, cameraRoll = 0, stageCenter, composition, telemetry = {}, energy = {} }) {
    this.intent = intent;
    this.startTime = timeSec;
    this.duration = 9.5 + Math.max(0, (Math.sin(timeSec * 0.19 + intent.length) + 1) * 0.5) * 5.0;
    const focus = composition?.focus ?? new THREE.Vector3();
    const bias = composition?.frameBias ?? new THREE.Vector2();
    const spread = THREE.MathUtils.clamp((telemetry.depthSpread ?? 0) * 2.4, 0, 1);
    const motionX = THREE.MathUtils.clamp(telemetry.velocityX ?? 0, -1, 1);
    const motionY = THREE.MathUtils.clamp(telemetry.velocityY ?? 0, -1, 1);
    const colorX = THREE.MathUtils.clamp(telemetry.colorFocusX ?? 0, -1, 1);
    const colorY = THREE.MathUtils.clamp(telemetry.colorFocusY ?? 0, -1, 1);
    const colorConfidence = THREE.MathUtils.clamp((telemetry.dominantHueRatio ?? 0) * (telemetry.dominantHueStrength ?? 0), 0, 0.65);
    const beat = THREE.MathUtils.clamp(energy.beatPulse ?? 0, 0, 1);
    const intensity = THREE.MathUtils.clamp((energy.bass ?? 0) * 0.42 + (energy.mid ?? 0) * 0.25 + (energy.high ?? 0) * 0.14 + beat * 0.19, 0, 1);
    const center = stageCenter.clone();
    const focusTarget = center.clone().add(focus).add(new THREE.Vector3(colorX * colorConfidence * 1.5, colorY * colorConfidence, 0));
    const posStart = cameraPosition.clone();
    const targetStart = lookTarget.clone();
    const lateral = 4.0 + spread * 2.4 + Math.abs(colorX) * colorConfidence * 1.6;
    const vertical = 1.2 + spread * 2.8;
    const near = 8.5 + (1 - (telemetry.subjectScale ?? 0.5)) * 2.2;
    const far = 15.5 + spread * 2.2;
    const side = motionX >= 0 ? -1 : 1;
    let end = center.clone();
    let p1 = posStart.clone();
    let p2 = posStart.clone();
    let target1 = targetStart.clone();
    let target2 = focusTarget.clone();
    this.startFov = cameraFov;
    this.endFov = cameraFov;
    this.startRoll = cameraRoll;
    this.endRoll = cameraRoll;

    switch (intent) {
      case 'pushIn':
        end.copy(focusTarget).add(new THREE.Vector3(-motionX * 1.2 + bias.x * 2, vertical * 0.22 + motionY, near));
        p1.copy(posStart).add(new THREE.Vector3(bias.x * 1.2, 0.5 + motionY, -2.2));
        p2.copy(end).add(new THREE.Vector3(-side * 1.0, 0.7, 2.0));
        this.endFov = 35 - intensity * 2.0;
        this.endRoll = motionX * 0.018;
        break;
      case 'pullOut':
        end.copy(center).add(new THREE.Vector3(bias.x * 3.5 - motionX, vertical * 0.65 + 1.1, far));
        p1.copy(posStart).add(new THREE.Vector3(-bias.x * 1.6, 1.1, 1.4));
        p2.copy(end).add(new THREE.Vector3(side * 1.4, 1.0, -2.0));
        this.endFov = 48 + spread * 2;
        break;
      case 'arc':
        end.copy(center).add(new THREE.Vector3(side * lateral + bias.x * 2.0, vertical * 0.5, 11.8 - spread * 1.6));
        p1.copy(posStart).add(new THREE.Vector3(side * 2.0, 0.8 + vertical * 0.3, -1.4));
        p2.copy(end).add(new THREE.Vector3(-side * 2.6, 0.9, 1.8));
        this.endFov = 39 + spread * 3;
        this.endRoll = side * 0.025;
        break;
      case 'lateralTrack':
        end.copy(center).add(new THREE.Vector3(side * lateral + motionX * 2.0, vertical * 0.3 + motionY, 10.4 - spread * 1.2));
        p1.copy(posStart).add(new THREE.Vector3(side * 2.0, motionY * 0.6, -1.0));
        p2.copy(end).add(new THREE.Vector3(-side * 2.0, 0.4, 1.0));
        this.endFov = 41 + intensity * 3;
        break;
      case 'craneReveal':
        end.copy(center).add(new THREE.Vector3(bias.x * 2.2 - motionX, 4.8 + vertical + spread * 2.0, 10.2));
        p1.copy(posStart).add(new THREE.Vector3(-1.2, -1.2, -1.0));
        p2.copy(end).add(new THREE.Vector3(1.2, -1.8, 1.4));
        this.endFov = 40;
        break;
      case 'reveal':
        end.copy(center).add(new THREE.Vector3(side * lateral * 0.85 + bias.x * 3.0, vertical * 0.7, 12.0 - spread * 1.5));
        p1.copy(posStart).add(new THREE.Vector3(side * 2.4, -0.2, -1.8));
        p2.copy(end).add(new THREE.Vector3(-side * 1.8, 1.4, 1.2));
        this.endFov = 46 - colorConfidence * 3;
        break;
      case 'hold':
      default:
        end.copy(center).add(new THREE.Vector3(bias.x * 1.4, 0.7 + bias.y * 1.4, 13.2 - intensity * 0.5));
        p1.copy(posStart).add(new THREE.Vector3(bias.x * 0.6, 0.2, -0.2));
        p2.copy(end).add(new THREE.Vector3(-bias.x * 0.7, 0.3, 0.3));
        this.endFov = 42 + Math.sin(timeSec * 0.2) * 0.7;
        break;
    }
    // Curves use world-space waypoints derived from the actual current camera and telemetry.
    this.positionCurve = new THREE.CatmullRomCurve3([posStart, p1, p2, end], false, 'centripetal', 0.35);
    this.targetCurve = new THREE.CatmullRomCurve3([targetStart, targetStart.clone().lerp(focusTarget, 0.38), target1.clone().lerp(target2, 0.75), focusTarget], false, 'centripetal', 0.35);
    this.phase = 'planned';
    return this;
  }

  sample(timeSec, outPosition = this._pos, outTarget = this._target) {
    const raw = (timeSec - this.startTime) / Math.max(0.1, this.duration);
    const t = easeCinematic(raw);
    this.positionCurve?.getPoint(t, outPosition);
    this.targetCurve?.getPoint(t, outTarget);
    this.phase = raw < 0.22 ? 'entry' : raw < 0.78 ? 'development' : 'resolve';
    const lensBlend = t;
    const fov = THREE.MathUtils.lerp(this.startFov, this.endFov, lensBlend);
    const roll = THREE.MathUtils.lerp(this.startRoll, this.endRoll, lensBlend) + Math.sin(t * Math.PI) * this.endRoll * 0.5;
    return { position: outPosition, target: outTarget, fov, roll, progress: raw, phase: this.phase };
  }
}
