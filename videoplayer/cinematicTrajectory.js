import * as THREE from 'three';

const easeCinematic = (t) => {
  const s = THREE.MathUtils.clamp(t, 0, 1);
  // Less dead time at the beginning: clear movement early, then graceful settle.
  const smoother = s * s * s * (s * (s * 6 - 15) + 10);
  return s * 0.68 + smoother * 0.32;
};

/** Builds moving camera paths around the current MP4 saliency point, not around a fixed stage origin. */
export class CinematicTrajectoryGenerator {
  constructor() {
    this.positionCurve = null;
    this.targetCurve = null;
    this.startTime = 0;
    this.duration = 8;
    this.intent = 'reveal';
    this.startFov = 42;
    this.endFov = 42;
    this.startRoll = 0;
    this.endRoll = 0;
    this.phase = 'idle';
    this._pos = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this.focusAnchor = new THREE.Vector3();
    this.trackWeight = 0.65;
  }

  plan({ intent, timeSec, cameraPosition, lookTarget, cameraFov = 42, cameraRoll = 0, stageCenter, composition, telemetry = {}, energy = {} }) {
    this.intent = intent;
    this.startTime = timeSec;
    this.duration = 6.8 + Math.max(0, (Math.sin(timeSec * 0.19 + intent.length) + 1) * 0.5) * 3.6;
    const focus = composition?.focus ?? new THREE.Vector3();
    const bias = composition?.frameBias ?? new THREE.Vector2();
    const spread = THREE.MathUtils.clamp((telemetry.depthSpread ?? 0) * 2.4, 0, 1);
    const motionX = THREE.MathUtils.clamp(telemetry.velocityX ?? 0, -1, 1);
    const motionY = THREE.MathUtils.clamp(telemetry.velocityY ?? 0, -1, 1);
    const focusX = THREE.MathUtils.clamp(telemetry.focusX ?? 0, -1, 1);
    const focusY = THREE.MathUtils.clamp(telemetry.focusY ?? 0, -1, 1);
    const colorX = THREE.MathUtils.clamp(telemetry.colorFocusX ?? 0, -1, 1);
    const colorY = THREE.MathUtils.clamp(telemetry.colorFocusY ?? 0, -1, 1);
    const colorConfidence = THREE.MathUtils.clamp((telemetry.dominantHueRatio ?? 0) * (telemetry.dominantHueStrength ?? 0), 0, 0.65);
    const beat = THREE.MathUtils.clamp(energy.beatPulse ?? 0, 0, 1);
    const intensity = THREE.MathUtils.clamp((energy.bass ?? 0) * 0.42 + (energy.mid ?? 0) * 0.25 + (energy.high ?? 0.14) * 0.14 + beat * 0.19, 0, 1);
    const center = stageCenter.clone();
    const focusAnchor = center.clone().add(new THREE.Vector3(focusX * 5.4, focusY * 3.8, 0));
    focusAnchor.add(new THREE.Vector3(colorX * colorConfidence * 1.0, colorY * colorConfidence * 0.7, 0));
    this.focusAnchor.copy(focusAnchor);
    const posStart = cameraPosition.clone();
    const targetStart = lookTarget.clone();
    const lateral = 5.2 + spread * 3.2 + Math.abs(colorX) * colorConfidence * 2.0;
    const vertical = 1.8 + spread * 3.4;
    const near = 7.0 + (1 - (telemetry.subjectScale ?? 0.5)) * 3.0;
    const far = 16.8 + spread * 3.2;
    const side = motionX >= 0 ? -1 : 1;
    let end = focusAnchor.clone();
    let p1 = posStart.clone();
    let p2 = posStart.clone();
    let target1 = targetStart.clone();
    let target2 = focusAnchor.clone();
    this.startFov = cameraFov;
    this.endFov = cameraFov;
    this.startRoll = cameraRoll;
    this.endRoll = cameraRoll;
    this.trackWeight = intent === 'trackFocus' ? 0.9 : intent === 'pushIn' || intent === 'reveal' ? 0.76 : intent === 'lateralTrack' ? 0.68 : intent === 'hold' ? 0.28 : 0.52;

    switch (intent) {
      case 'pushIn':
        end.copy(focusAnchor).add(new THREE.Vector3(-motionX * 2.0 + bias.x * 2.8, vertical * 0.35 + motionY * 1.5, near));
        p1.copy(posStart).add(new THREE.Vector3(bias.x * 2.0 + motionX * 1.2, 0.8 + motionY, -3.8));
        p2.copy(end).add(new THREE.Vector3(-side * 2.2, 1.2, 3.0));
        this.endFov = 33 - intensity * 3.0;
        this.endRoll = motionX * 0.024;
        break;
      case 'pullOut':
        end.copy(focusAnchor).add(new THREE.Vector3(bias.x * 4.0 - motionX * 1.5, vertical * 0.8 + 1.5, far));
        p1.copy(posStart).add(new THREE.Vector3(-bias.x * 2.0, 1.4, 2.2));
        p2.copy(end).add(new THREE.Vector3(side * 2.0, 1.3, -3.0));
        this.endFov = 49 + spread * 3;
        break;
      case 'arc':
        end.copy(focusAnchor).add(new THREE.Vector3(side * lateral + bias.x * 2.8, vertical * 0.65, 12.2 - spread * 2.0));
        p1.copy(posStart).add(new THREE.Vector3(side * 3.2, 1.2 + vertical * 0.4, -2.6));
        p2.copy(end).add(new THREE.Vector3(-side * 3.8, 1.3, 2.8));
        this.endFov = 37 + spread * 3;
        this.endRoll = side * 0.032;
        break;
      case 'lateralTrack':
        end.copy(focusAnchor).add(new THREE.Vector3(side * lateral + motionX * 3.0, vertical * 0.42 + motionY * 1.4, 10.0 - spread * 1.6));
        p1.copy(posStart).add(new THREE.Vector3(side * 3.6, motionY * 0.9, -1.8));
        p2.copy(end).add(new THREE.Vector3(-side * 3.0, 0.6, 1.8));
        this.endFov = 39 + intensity * 4;
        break;
      case 'craneReveal':
        end.copy(focusAnchor).add(new THREE.Vector3(bias.x * 3.0 - motionX * 1.6, 6.0 + vertical + spread * 2.4, 10.6));
        p1.copy(posStart).add(new THREE.Vector3(-1.8, -2.0, -2.0));
        p2.copy(end).add(new THREE.Vector3(2.0, -2.6, 2.2));
        this.endFov = 38;
        break;
      case 'reveal':
        end.copy(focusAnchor).add(new THREE.Vector3(side * lateral * 0.9 + bias.x * 3.8, vertical * 0.85, 12.8 - spread * 2.0));
        p1.copy(posStart).add(new THREE.Vector3(side * 3.2, -0.6, -3.0));
        p2.copy(end).add(new THREE.Vector3(-side * 2.8, 1.8, 2.4));
        this.endFov = 45 - colorConfidence * 4;
        break;
      case 'trackFocus':
        // Active follow: orbit/track around the detected salient mass, with velocity lead.
        end.copy(focusAnchor).add(new THREE.Vector3(-motionX * 4.0 + side * (3.4 + spread * 2.0), 1.0 + motionY * 2.5, 8.0 + (1 - intensity) * 2.4));
        p1.copy(posStart).add(new THREE.Vector3(-motionX * 2.2, motionY * 1.8, -2.6 - beat * 1.8));
        p2.copy(end).add(new THREE.Vector3(side * 2.0 + motionX * 2.0, -0.4, 2.0));
        this.endFov = 34 + (1 - intensity) * 5;
        this.endRoll = -motionX * 0.03;
        break;
      case 'hold':
      default:
        end.copy(focusAnchor).add(new THREE.Vector3(bias.x * 1.8, 0.9 + bias.y * 1.6, 13.0 - intensity * 0.8));
        p1.copy(posStart).add(new THREE.Vector3(bias.x * 0.9, 0.3, -0.5));
        p2.copy(end).add(new THREE.Vector3(-bias.x * 1.0, 0.5, 0.6));
        this.endFov = 42 + Math.sin(timeSec * 0.2) * 0.7;
        break;
    }
    this.positionCurve = new THREE.CatmullRomCurve3([posStart, p1, p2, end], false, 'centripetal', 0.35);
    this.targetCurve = new THREE.CatmullRomCurve3([targetStart, targetStart.clone().lerp(focusAnchor, 0.35), target1.clone().lerp(target2, 0.72), focusAnchor], false, 'centripetal', 0.35);
    this.phase = 'planned';
    return this;
  }

  sample(timeSec, outPosition = this._pos, outTarget = this._target) {
    const raw = (timeSec - this.startTime) / Math.max(0.1, this.duration);
    const t = easeCinematic(raw);
    this.positionCurve?.getPoint(t, outPosition);
    this.targetCurve?.getPoint(t, outTarget);
    this.phase = raw < 0.2 ? 'entry' : raw < 0.78 ? 'development' : 'resolve';
    const fov = THREE.MathUtils.lerp(this.startFov, this.endFov, t);
    const roll = THREE.MathUtils.lerp(this.startRoll, this.endRoll, t) + Math.sin(t * Math.PI) * this.endRoll * 0.5;
    return { position: outPosition, target: outTarget, fov, roll, progress: raw, phase: this.phase };
  }
}
