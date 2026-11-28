import * as THREE from 'three';

export const CAMERA_MODES = [
  { id: 'auto', label: '🎥 Auto-Diretor Cinematográfico' },
  { id: 'idle', label: '🫧 Modo Ocioso (câmera tranquila)' },
  { id: 'orbit', label: '🪐 Órbita Espacial Hero' },
  { id: 'grazing', label: '🔭 Rasante Macro 3D' },
  { id: 'vertigo', label: '🌀 Contra-Zoom Vertigo' },
  { id: 'pendulum', label: '🎭 Pêndulo Lissajous' },
  { id: 'tunnel', label: '🚀 Imersão Frontal' },
  { id: 'free', label: '🖱️ Câmera Livre' }
];

// Analytical critically damped spring step: x'' + 2*omega*x' + omega^2*(x - target) = 0
function stepCriticalSpringScalar(state, target, omega, dt) {
  const disp = state.pos - target;
  const c = state.vel + omega * disp;
  const decay = Math.exp(-omega * dt);
  state.pos = target + (disp + c * dt) * decay;
  state.vel = (state.vel - omega * c * dt) * decay;
}

function stepCriticalSpringVec3(posVec, velVec, targetVec, omega, dt) {
  const decay = Math.exp(-omega * dt);

  const dx = posVec.x - targetVec.x;
  const cx = velVec.x + omega * dx;
  posVec.x = targetVec.x + (dx + cx * dt) * decay;
  velVec.x = (velVec.x - omega * cx * dt) * decay;

  const dy = posVec.y - targetVec.y;
  const cy = velVec.y + omega * dy;
  posVec.y = targetVec.y + (dy + cy * dt) * decay;
  velVec.y = (velVec.y - omega * cy * dt) * decay;

  const dz = posVec.z - targetVec.z;
  const cz = velVec.z + omega * dz;
  posVec.z = targetVec.z + (dz + cz * dt) * decay;
  velVec.z = (velVec.z - omega * cz * dt) * decay;
}

export class CinematicCameraRig {
  constructor() {
    this.mode = 'auto';
    this.activeShot = 'orbit';
    this.shotTimer = 0;
    this.shotDuration = 8.5;
    // Auto mode is now continuous/procedural: it solves camera parameters each frame.
    this._decisionReason = 'direção procedural inicializada';
    this._reasonTimer = 0;
    this._proceduralPhase = 0;
    this._moveIntent = 'reveal';
    this._moveElapsed = 0;
    this._moveDuration = 0;
    this._moveCycle = 0;
    this._lastMoveIntent = '';

    // Critically damped spring states
    this.camPos = new THREE.Vector3(0, 0.4, 12.2);
    this.camVel = new THREE.Vector3();
    this.targetPos = new THREE.Vector3(0, 0, -4.5);
    this.targetVel = new THREE.Vector3();

    this.fovSpring = { pos: 42, vel: 0 };
    this.rollSpring = { pos: 0, vel: 0 };

    this._desiredPos = new THREE.Vector3();
    this._desiredTarget = new THREE.Vector3();
    this._lastBeatTrigger = 0;
  }

  reset(stageCenter = new THREE.Vector3(0, 0, -4.5)) {
    this.camPos.set(stageCenter.x, stageCenter.y + 0.4, stageCenter.z + 16.5);
    this.camVel.set(0, 0, 0);
    this.targetPos.copy(stageCenter);
    this.targetVel.set(0, 0, 0);
    this.fovSpring.pos = 42;
    this.fovSpring.vel = 0;
    this.rollSpring.pos = 0;
    this.rollSpring.vel = 0;
    this.shotTimer = 0;
    this._reasonTimer = 0;
    this._proceduralPhase = 0;
    this._moveIntent = 'reveal';
    this._moveElapsed = 0;
    this._moveDuration = 0;
    this._moveCycle = 0;
    this._lastMoveIntent = '';
    this._decisionReason = 'direção procedural inicializada';
    this.activeShot = this.mode === 'auto' ? 'procedural' : this.mode;
  }

  setMode(modeId) {
    this.mode = modeId;
    if (modeId !== 'auto' && modeId !== 'free') {
      this.activeShot = modeId;
    }
    if (modeId === 'auto') {
      this._moveElapsed = 0;
      this._moveDuration = 0;
    }
    this.shotTimer = 0;
  }

  getCurrentShotLabel() {
    if (this.mode === 'free') return 'Câmera Livre';
    if (this.mode === 'idle') return 'Modo Ocioso · enquadramento estável';
    const map = {
      procedural: 'Direção: ' + this._moveLabel(this._moveIntent),
      orbit: 'Plano: Órbita Espacial',
      grazing: 'Plano: Rasante Macro 3D',
      vertigo: 'Plano: Contra-Zoom Vertigo',
      pendulum: 'Plano: Pêndulo Lissajous',
      tunnel: 'Plano: Imersão Frontal',
      topdown: 'Plano: Top-Down / Mapa',
      sideSweep: 'Plano: Travelling Lateral',
      closeFocus: 'Plano: Close de Relevo',
      portalPass: 'Plano: Passagem pelo Portal'
    };
    return map[this.activeShot] || 'Plano: Órbita Espacial';
  }



  _moveLabel(intent) {
    const labels = {
      pushIn: 'Dolly-In · aproximação', pullOut: 'Dolly-Out · expansão',
      arc: 'Arco cinematográfico', lateralTrack: 'Travelling lateral',
      craneReveal: 'Crane · revelação vertical', reveal: 'Revelação em arco',
      hold: 'Plano contemplativo'
    };
    return labels[intent] || 'Movimento procedural';
  }

  _chooseMove(energy, telemetry, depthSpread, morph, timeSec) {
    const motion = THREE.MathUtils.clamp(telemetry.motionEnergy ?? 0, 0, 1);
    const beat = THREE.MathUtils.clamp(energy.beatPulse ?? 0, 0, 1);
    const bass = THREE.MathUtils.clamp(energy.bass ?? 0, 0, 1);
    const scale = THREE.MathUtils.clamp(telemetry.subjectScale ?? 0.5, 0, 1);
    const hueArea = THREE.MathUtils.clamp(telemetry.dominantHueRatio ?? 0, 0, 1);
    const hueStrength = THREE.MathUtils.clamp(telemetry.dominantHueStrength ?? 0, 0, 1);
    const colorFocus = Math.hypot(telemetry.colorFocusX ?? 0, telemetry.colorFocusY ?? 0);
    const coverage = THREE.MathUtils.clamp(telemetry.depthCoverage ?? 0, 0, 1);
    const flash = THREE.MathUtils.clamp(telemetry.flashDelta ?? 0, 0, 1);
    const horizontal = Math.abs(telemetry.velocityX ?? 0);
    const calm = 1 - THREE.MathUtils.clamp(motion * 0.7 + bass * 0.3, 0, 1);
    const scores = {
      pushIn: 0.24 + motion * 0.35 + beat * 0.30 + bass * 0.22 + scale * 0.08,
      pullOut: 0.25 + calm * 0.38 + coverage * 0.22 + (1 - scale) * 0.14,
      arc: 0.26 + depthSpread * 0.28 + hueArea * hueStrength * 0.28 + colorFocus * 0.18,
      lateralTrack: 0.22 + horizontal * 0.48 + motion * 0.24 + Math.abs(telemetry.focusX ?? 0) * 0.12,
      craneReveal: 0.22 + coverage * 0.42 + morph * 0.25 + flash * 0.16,
      reveal: 0.28 + flash * 0.38 + depthSpread * 0.22 + beat * 0.12,
      hold: 0.18 + calm * 0.55 + (1 - hueStrength) * 0.08
    };
    // Avoid repeating the same move. Deterministic micro-variation breaks ties without random jitter.
    if (this._lastMoveIntent) scores[this._lastMoveIntent] *= 0.42;
    for (const key of Object.keys(scores)) scores[key] += (Math.sin(timeSec * 0.17 + this._moveCycle * 2.31 + key.length) + 1) * 0.025;
    const selected = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
    this._lastMoveIntent = this._moveIntent;
    this._moveIntent = selected;
    this._moveCycle++;
    this._moveElapsed = 0;
    // Shot duration is deliberately long enough for a movement to read as intentional.
    this._moveDuration = 10.5 + ((Math.sin(timeSec * 0.19 + this._moveCycle) + 1) * 0.5) * 8.0;
    this._proceduralPhase = timeSec * 0.13 + this._moveCycle * 0.71;
    return selected;
  }


  update(dt, timeSec, stageCenter, energy, telemetry, stageMode = 'sculpt', camera, controls) {
    if (this.mode === 'free') return false;

    const isFlatCinema = stageMode === 'flat';
    const sculptWeight = stageMode === 'sculpt' ? 1.0 : stageMode === 'curved' ? 0.55 : 0.15;

    // Video morphology signals are calculated before shot evaluation so the director can score plans.
    const morph = THREE.MathUtils.clamp((telemetry.depthMorph ?? 0) * 2.1, 0, 1);
    const depthSpread = THREE.MathUtils.clamp((telemetry.depthSpread ?? 0) * 2.4, 0, 1);
    const depthCoverage = THREE.MathUtils.clamp(telemetry.depthCoverage ?? 0, 0, 1);

    // Combined audio energy used by procedural distance, lens and camera response.
    // Missing analyzer fields safely default to zero.
    const energyMix = THREE.MathUtils.clamp(
      (energy?.bass ?? 0) * 0.38 + (energy?.mid ?? 0) * 0.28 +
      (energy?.high ?? 0) * 0.16 + (energy?.beatPulse ?? 0) * 0.18,
      0, 1
    );

    // Beat-triggered physical spring impulse
    if (this.mode !== 'idle' && energy.beatPulse > 0.58 && timeSec - this._lastBeatTrigger > 0.42) {
      this._lastBeatTrigger = timeSec;
      const impulse = (energy.beatPulse - 0.5) * 4.5 * sculptWeight;
      this.camVel.z -= impulse;
      this.rollSpring.vel += (Math.sin(timeSec * 3.7) >= 0 ? 1 : -1) * impulse * 0.04;
    }

    // Auto Director: no shot presets. Recompute a continuous camera solution from
    // composition, depth, color, motion and audio cues every frame.
    if (this.mode === 'auto') {
      this.activeShot = 'procedural';
      this.shotTimer += dt;
      this._moveElapsed += dt;
      this._reasonTimer += dt;
      if (this._moveElapsed >= this._moveDuration) {
        this._chooseMove(energy, telemetry, depthSpread, morph, timeSec);
      }
      if (this._reasonTimer >= 1.6) {
        const cues = {
          pushIn: 'movimento/energia pedem aproximação',
          pullOut: 'respiração visual e expansão do quadro',
          arc: 'massa cromática e relevo pedem arco',
          lateralTrack: 'deslocamento lateral conduz o travelling',
          craneReveal: 'profundidade pede revelação vertical',
          reveal: 'mudança visual pede nova perspectiva',
          hold: 'baixa energia pede contemplação'
        };
        this._decisionReason = `${cues[this._moveIntent] || 'composição adaptativa'} · ${Math.max(0, this._moveDuration - this._moveElapsed).toFixed(0)}s`;
        this._reasonTimer = 0;
      }
    } else {
      this.activeShot = this.mode;
      this.shotTimer = 0;
    }


    const shot = this.mode === 'idle' ? 'idle' : (this.mode === 'auto' ? 'procedural' : (isFlatCinema ? 'orbit' : this.activeShot));
    const intensity = THREE.MathUtils.clamp(
      energy.bass * 0.55 + energy.mid * 0.25 + energy.high * 0.2 + telemetry.motionEnergy * 0.25,
      0,
      1
    );
    // Morphology-derived steering terms.
    const morphSide = (telemetry.focusX * 0.65 + Math.sin(timeSec * 0.24) * 0.35) * (1.2 + morph * 2.0 + depthSpread);
    const morphHeight = (telemetry.focusY * 0.6 + Math.cos(timeSec * 0.31) * 0.4) * (0.45 + depthSpread * 1.25);
    const morphDistance = morph * 1.35 + depthSpread * 0.65 - depthCoverage * 0.35;
    // Music drives restrained dolly, FOV and roll rather than shaking the camera.
    const bassDolly = energy.bass * 0.8 + energy.beatPulse * 0.5;
    const musicRoll = (energy.mid - energy.high) * 0.025 + energy.beatPulse * 0.012;

    const focusOffsetX = telemetry.focusX * 5.8 + telemetry.velocityX * 0.42;
    const focusOffsetY = telemetry.focusY * 4.2 - telemetry.velocityY * 0.32;
    // Color-aware composition: only steer toward a hue region when it occupies
    // meaningful screen area and has chroma strength, preventing tiny accents from hijacking framing.
    const colorProminence = THREE.MathUtils.clamp((telemetry.dominantHueRatio ?? 0) * 2.8
      * (telemetry.dominantHueStrength ?? 0), 0, 0.65);
    const colorOffsetX = (telemetry.colorFocusX ?? 0) * 2.6 * colorProminence;
    const colorOffsetY = (telemetry.colorFocusY ?? 0) * 1.8 * colorProminence;

    this._desiredTarget.set(
      stageCenter.x + focusOffsetX + colorOffsetX,
      stageCenter.y + focusOffsetY + colorOffsetY,
      stageCenter.z
    );

    let desiredFov = 42;
    let desiredRoll = 0;
    let omegaPos = 3.2;

    if (shot === 'procedural') {
      // Intent-based cinematography: a single dominant move is selected for a shot,
      // then its trajectory is synthesized continuously. No fixed camera poses.
      const p = THREE.MathUtils.clamp(this._moveElapsed / Math.max(1, this._moveDuration), 0, 1);
      const eased = p * p * (3 - 2 * p);
      const motionX = THREE.MathUtils.clamp(telemetry.velocityX ?? 0, -1, 1);
      const motionY = THREE.MathUtils.clamp(telemetry.velocityY ?? 0, -1, 1);
      const motionEnergy = THREE.MathUtils.clamp(telemetry.motionEnergy ?? 0, 0, 1);
      const colorX = THREE.MathUtils.clamp(telemetry.colorFocusX ?? 0, -1, 1);
      const colorY = THREE.MathUtils.clamp(telemetry.colorFocusY ?? 0, -1, 1);
      const colorArea = THREE.MathUtils.clamp((telemetry.dominantHueRatio ?? 0) * 2.0, 0, 0.72);
      const colorStrength = THREE.MathUtils.clamp(telemetry.dominantHueStrength ?? 0, 0, 1);
      const colorConfidence = colorArea * colorStrength;
      const spread = depthSpread;
      const scale = THREE.MathUtils.clamp(telemetry.subjectScale ?? 0.5, 0.18, 1);
      const beat = energy.beatPulse ?? 0;
      const phase = this._proceduralPhase;
      const ambient = timeSec * 0.09 + phase;
      const targetX = focusOffsetX * 0.48 + colorX * colorConfidence * 3.2;
      const targetY = focusOffsetY * 0.48 + colorY * colorConfidence * 2.1;
      this._desiredTarget.set(stageCenter.x + targetX, stageCenter.y + targetY, stageCenter.z);

      let radius = 12.5;
      let azimuth = 0.0;
      let elevation = 0.22;
      let lateral = 0.0;
      let vertical = 0.0;
      let lookLift = 0.0;
      let lens = 42.0;
      let roll = 0.0;
      let moveRate = 1.0;

      // Each trajectory has one primary cinematic verb. Signals modulate its scale,
      // but don't stack unrelated moves (e.g. orbit + zoom + crane + shake).
      switch (this._moveIntent) {
        case 'pushIn':
          radius = THREE.MathUtils.lerp(16.2, 8.1, eased) - beat * 0.45;
          azimuth = -0.22 + eased * 0.42 + Math.sin(ambient) * 0.09;
          elevation = 0.16 + Math.sin(ambient * 0.72) * 0.08 + spread * 0.10;
          lens = THREE.MathUtils.lerp(43, 35, eased) + beat * 1.6;
          lookLift = -0.25 * eased;
          moveRate = 1.15;
          break;
        case 'pullOut':
          radius = THREE.MathUtils.lerp(8.6, 16.3, eased);
          azimuth = 0.30 + eased * 0.32 + Math.sin(ambient * 0.7) * 0.06;
          elevation = 0.23 + eased * 0.16 + Math.sin(ambient) * 0.06;
          lens = THREE.MathUtils.lerp(35, 48, eased);
          lookLift = 0.55 * eased;
          moveRate = 0.95;
          break;
        case 'arc':
          radius = 11.8 - spread * 1.4 - morph * 0.6 + Math.sin(ambient) * 0.35;
          azimuth = THREE.MathUtils.lerp(-1.05, 1.05, eased) + motionX * 0.10;
          elevation = 0.24 + Math.sin(eased * Math.PI) * 0.24 + colorY * colorConfidence * 0.12;
          lens = 39 + spread * 4.0 + beat * 1.4;
          roll = Math.sin(eased * Math.PI) * 0.035;
          moveRate = 1.0;
          break;
        case 'lateralTrack':
          lateral = THREE.MathUtils.lerp(-6.8, 6.8, eased) + motionX * 1.25;
          radius = 10.8 - motionEnergy * 1.1;
          azimuth = -0.16 + Math.sin(ambient) * 0.06;
          elevation = 0.17 + motionY * 0.08 + spread * 0.12;
          lens = 40 + motionEnergy * 5;
          moveRate = 1.08;
          break;
        case 'craneReveal':
          vertical = THREE.MathUtils.lerp(-2.8, 7.6 + spread * 2.0, eased);
          radius = THREE.MathUtils.lerp(13.8, 10.6, eased);
          azimuth = -0.35 + eased * 0.58;
          elevation = 0.10 + eased * 0.28;
          lens = THREE.MathUtils.lerp(47, 39, eased);
          lookLift = eased * 0.65;
          moveRate = 1.05;
          break;
        case 'reveal':
          radius = THREE.MathUtils.lerp(15.1, 11.2, eased) + Math.sin(ambient) * 0.3;
          azimuth = THREE.MathUtils.lerp(-1.18, 0.82, eased);
          elevation = THREE.MathUtils.lerp(0.06, 0.62, eased) + motionY * 0.06;
          lens = THREE.MathUtils.lerp(48, 39, eased) + colorConfidence * 2.0;
          lookLift = 0.8 * eased;
          moveRate = 1.0;
          break;
        case 'hold':
        default:
          radius = 12.4 + Math.sin(ambient * 0.6) * 0.45 - energyMix * 0.55;
          azimuth = 0.18 + Math.sin(ambient * 0.75) * 0.12;
          elevation = 0.24 + Math.sin(ambient * 0.6) * 0.05;
          lateral = Math.sin(ambient) * 0.5;
          lens = 42 + Math.sin(ambient * 0.55) * 1.2;
          moveRate = 0.7;
          break;
      }

      // Composition offset is constrained so a tiny color accent cannot pull the frame.
      const compositionX = THREE.MathUtils.clamp(targetX * 0.18, -1.25, 1.25);
      const compositionY = THREE.MathUtils.clamp(targetY * 0.16, -0.85, 0.85);
      const cosElev = Math.cos(elevation);
      const sinElev = Math.sin(elevation);
      const orbitX = Math.sin(azimuth) * cosElev * radius;
      const orbitY = sinElev * radius;
      const orbitZ = Math.cos(azimuth) * cosElev * radius;
      this._desiredPos.set(
        stageCenter.x + lateral + orbitX - compositionX,
        stageCenter.y + vertical + orbitY + lookLift - compositionY,
        stageCenter.z + orbitZ - morphDistance * (0.22 + spread * 0.20)
      );
      desiredFov = THREE.MathUtils.clamp(lens + energyMix * 2.8 + beat * 1.2, 30, 60);
      desiredRoll = THREE.MathUtils.clamp(roll + motionX * 0.018 + colorX * colorConfidence * 0.012, -0.055, 0.055);
      omegaPos = (2.15 + motionEnergy * 0.75 + energyMix * 0.35) * moveRate;
    } else if (shot === 'idle') {
      // Idle: stable editing/parameter-adjustment framing with only a very slow ambient drift.
      // Keep the video relief readable; suppress focus chasing, beat impulses and dramatic camera motion.
      const idleDrift = Math.sin(timeSec * 0.12) * 0.18;
      this._desiredPos.set(stageCenter.x + idleDrift, stageCenter.y + 0.28 + Math.sin(timeSec * 0.09) * 0.08,
        stageCenter.z + 15.2 - energy.bass * 0.12);
      this._desiredTarget.set(stageCenter.x, stageCenter.y, stageCenter.z);
      desiredFov = 42 + energy.bass * 0.65;
      desiredRoll = Math.sin(timeSec * 0.1) * 0.002;
      omegaPos = 2.25;
    } else if (shot === 'grazing') {
      // Low-angle dramatic perspective skimming across extruded voxel prisms
      const sideSign = Math.sin(timeSec * 0.22) >= 0 ? 1 : -1;
      const sweep = Math.sin(timeSec * 0.38) * 1.8;
      this._desiredPos.set(
        stageCenter.x + sideSign * (7.2 + Math.cos(timeSec * 0.3) * 1.4),
        stageCenter.y - 2.4 + sweep * 0.65,
        stageCenter.z + 7.8 - intensity * 1.2
      );
      this._desiredTarget.z += 0.65;
      desiredFov = 46 + intensity * 6;
      desiredRoll = -sideSign * 0.055;
      omegaPos = 2.6;
    } else if (shot === 'vertigo') {
      // Hitchcock Dolly-Zoom: distance and FOV move inversely so subject stays framed while background warps
      const zoomWave = 0.5 + 0.5 * Math.sin(timeSec * 0.85) + energy.beatPulse * 0.35;
      const clampedWave = THREE.MathUtils.clamp(zoomWave, 0, 1.15);
      const dist = 16.5 - clampedWave * 7.2;
      // Keep constant frustum height H = 2 * dist * tan(fov/2)
      const refHeight = 2 * 12.2 * Math.tan(THREE.MathUtils.degToRad(42 * 0.5));
      desiredFov = THREE.MathUtils.clamp(
        THREE.MathUtils.radToDeg(2 * Math.atan(refHeight / (2 * Math.max(5.5, dist)))),
        28,
        74
      );
      const orbit = Math.sin(timeSec * 0.35) * 0.35;
      this._desiredPos.set(
        stageCenter.x + Math.sin(orbit) * dist + telemetry.velocityX * 1.1,
        stageCenter.y + Math.cos(timeSec * 0.32) * 0.9 - telemetry.velocityY * 0.8,
        stageCenter.z + Math.cos(orbit) * dist
      );
      desiredRoll = Math.sin(timeSec * 0.5) * 0.035;
      omegaPos = 3.8;
    } else if (shot === 'pendulum') {
      // Lissajous figure-8 trajectory with rhythmic horizon roll
      const dist = 11.4 - intensity * 2.2;
      const lx = Math.sin(timeSec * 0.52) * 4.4;
      const ly = Math.sin(timeSec * 1.04) * 2.1;
      this._desiredPos.set(
        stageCenter.x + lx,
        stageCenter.y + ly,
        stageCenter.z + dist
      );
      desiredFov = 44 + energy.mid * 7;
      desiredRoll = -lx * 0.016 + energy.high * 0.03;
      omegaPos = 3.0;
    } else if (shot === 'tunnel') {
      // Close immersive frontal framing inside the curved voxel wall
      const dist = 8.4 - intensity * 1.35 + (telemetry.subjectScale - 0.5) * 2.2;
      this._desiredPos.set(
        stageCenter.x + focusOffsetX * 0.45 + Math.sin(timeSec * 0.4) * 0.9,
        stageCenter.y + focusOffsetY * 0.45 + Math.cos(timeSec * 0.35) * 0.6,
        stageCenter.z + THREE.MathUtils.clamp(dist, 6.8, 10.2)
      );
      desiredFov = 52 + intensity * 9;
      desiredRoll = Math.sin(timeSec * 0.3) * 0.025;
      omegaPos = 3.5;
    } else if (shot === 'topdown') {
      // Elevated oblique/top-down reveals the depth field as a spatial map.
      const height = 7.5 + depthSpread * 5.5 + energy.mid * 1.0;
      const lateral = (telemetry.focusX ?? 0) * 3.0 + Math.sin(timeSec * 0.16) * 1.2;
      this._desiredPos.set(stageCenter.x + lateral, stageCenter.y + height, stageCenter.z + 7.0 - depthCoverage * 2.2);
      desiredFov = 48 + depthCoverage * 4;
      desiredRoll = (telemetry.velocityX ?? 0) * -0.025;
      omegaPos = 2.5;
    } else if (shot === 'sideSweep') {
      // A broad lateral dolly makes asymmetric depth/saliency read as parallax.
      const direction = (telemetry.focusX ?? 0) >= 0 ? -1 : 1;
      const travel = Math.sin(timeSec * 0.42) * 2.8 + direction * (2.5 + depthSpread * 2.0);
      const height = Math.sin(timeSec * 0.25) * 1.2 + (telemetry.focusY ?? 0) * 2.0;
      this._desiredPos.set(stageCenter.x + travel, stageCenter.y + height, stageCenter.z + 10.0 - morph * 2.5);
      desiredFov = 43 + (telemetry.motionEnergy ?? 0) * 4;
      desiredRoll = Math.sin(timeSec * 0.35) * 0.04;
      omegaPos = 2.7;
    } else if (shot === 'closeFocus') {
      // A near shot with a strong focus-follow, useful when the salient region grows.
      const dist = 7.0 + (1 - (telemetry.subjectScale ?? 0.5)) * 4.0 - morph * 1.4;
      this._desiredPos.set(stageCenter.x + focusOffsetX * 0.8 + Math.sin(timeSec * 0.28) * 0.45,
        stageCenter.y + focusOffsetY * 0.8 + Math.cos(timeSec * 0.31) * 0.35,
        stageCenter.z + THREE.MathUtils.clamp(dist, 5.8, 11.0));
      desiredFov = 36 + energy.high * 4;
      desiredRoll = (telemetry.velocityX ?? 0) * 0.02;
      omegaPos = 3.7;
    } else if (shot === 'portalPass') {
      // Dramatic push through the portal plane; settles back to a forward three-quarter angle.
      const pass = 0.5 + 0.5 * Math.sin(timeSec * 0.52 + energy.beatPulse * 0.8);
      const dist = 13.5 - pass * (4.6 + energy.beatPulse * 1.4);
      const lateral = Math.sin(timeSec * 0.48) * 1.6 + (telemetry.focusX ?? 0) * 2.4;
      this._desiredPos.set(stageCenter.x + lateral, stageCenter.y + Math.sin(timeSec * 0.3) * 1.0 + focusOffsetY * 0.25,
        stageCenter.z + dist);
      desiredFov = 40 + pass * 10 + energy.beatPulse * 3;
      desiredRoll = Math.sin(timeSec * 0.46) * 0.045 + energy.beatPulse * 0.025;
      omegaPos = 3.2;
    } else {
      // 'orbit': Classic Hero Spatial Orbit with velocity lead & beat dolly
      const orbit = (Math.sin(timeSec * 0.34) * 0.58 + telemetry.velocityX * 0.25) * sculptWeight;
      const side = (Math.sin(timeSec * 0.23) * 1.6 + telemetry.velocityX * 1.4) * sculptWeight;
      const height = (Math.cos(timeSec * 0.29) * 0.95 - telemetry.velocityY * 0.95) * sculptWeight;
      const baseDist = isFlatCinema ? 12.6 : 12.2;
      const dist = THREE.MathUtils.clamp(
        baseDist - intensity * 2.6 - telemetry.motionEnergy * 0.7 + (telemetry.subjectScale - 0.45) * 3.2,
        7.8,
        15.4
      );
      this._desiredPos.set(
        stageCenter.x + side + Math.sin(orbit) * dist,
        stageCenter.y + height,
        stageCenter.z + Math.cos(orbit) * dist
      );
      desiredFov = 40 + intensity * 8.5 + telemetry.motionEnergy * 2.5;
      desiredRoll = (Math.sin(timeSec * 0.26) * 0.024 + energy.mid * 0.025) * sculptWeight;
      omegaPos = 3.1;
    }

    // Morphology is now a meaningful camera composition cue, not a tiny universal nudge.
    // Focus is offset from the screen center, so the camera counter-composes to keep the salient mass readable.
    if (shot !== 'idle' && shot !== 'procedural') {
      const compositionGain = shot === 'closeFocus' || shot === 'sideSweep' ? 1.25 : 0.62;
      this._desiredPos.x += -focusOffsetX * compositionGain + morphSide * 0.18 - colorOffsetX * 0.18;
      this._desiredPos.y += -focusOffsetY * compositionGain + morphHeight * 0.22 - colorOffsetY * 0.18;
      this._desiredPos.z += morphDistance * (shot === 'grazing' || shot === 'closeFocus' ? 1.35 : 0.55) - bassDolly * 0.75;
      desiredFov += energy.high * 2.2 + energy.beatPulse * 2.8;
      desiredRoll += musicRoll * 1.8;
      // Dynamic responsiveness: high-energy cuts become more assertive, calm passages breathe.
      omegaPos *= 0.88 + intensity * 0.48;
    }

    stepCriticalSpringVec3(this.camPos, this.camVel, this._desiredPos, omegaPos, dt);
    stepCriticalSpringVec3(this.targetPos, this.targetVel, this._desiredTarget, 4.4, dt);
    stepCriticalSpringScalar(this.fovSpring, desiredFov, 3.6, dt);
    stepCriticalSpringScalar(this.rollSpring, desiredRoll, 4.0, dt);

    camera.position.copy(this.camPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.targetPos);
    camera.rotateZ(this.rollSpring.pos);

    camera.fov = THREE.MathUtils.clamp(this.fovSpring.pos, 24, 80);
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(this.targetPos);
    }
    return true;
  }
}
