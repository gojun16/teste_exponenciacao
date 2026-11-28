import * as THREE from 'three';
import { CinematicCompositionSolver } from './cinematicComposition.js';
import { CinematicDirectorBrain } from './cinematicDirectorBrain.js';
import { CinematicTrajectoryGenerator } from './cinematicTrajectory.js';

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
    this._moveIntent = 'reveal';
    this.compositionSolver = new CinematicCompositionSolver();
    this.directorBrain = new CinematicDirectorBrain();
    this.trajectoryGenerator = new CinematicTrajectoryGenerator();
    this._plannedIntent = '';
    this._trajectorySample = null;

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
    this._autoBeatTrigger = 0;
    this._liveFocus = new THREE.Vector3();
    this._liveFocusVel = new THREE.Vector3();
    this._focusTrackingOffset = new THREE.Vector3();
    this._lastAutoFocusX = 0;
    this._lastAutoFocusY = 0;
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
    this._moveIntent = 'reveal';
    this._decisionReason = 'direção procedural inicializada';
    this.compositionSolver = new CinematicCompositionSolver();
    this.directorBrain.reset();
    this.trajectoryGenerator = new CinematicTrajectoryGenerator();
    this._plannedIntent = '';
    this._trajectorySample = null;
    this._autoBeatTrigger = 0;
    this._liveFocus.set(0, 0, 0);
    this._liveFocusVel.set(0, 0, 0);
    this._focusTrackingOffset.set(0, 0, 0);
    this._lastAutoFocusX = 0;
    this._lastAutoFocusY = 0;
    this.activeShot = this.mode === 'auto' ? 'procedural' : this.mode;
  }

  setMode(modeId) {
    this.mode = modeId;
    if (modeId !== 'auto' && modeId !== 'free') {
      this.activeShot = modeId;
    }
    if (modeId === 'auto') {
      this.directorBrain.reset();
      this._plannedIntent = '';
      this._trajectorySample = null;
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
      hold: 'Plano contemplativo', trackFocus: 'Acompanhamento de foco visual'
    };
    return labels[intent] || 'Movimento procedural';
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
    if (this.mode !== 'idle' && this.mode !== 'auto' && energy.beatPulse > 0.58 && timeSec - this._lastBeatTrigger > 0.42) {
      this._lastBeatTrigger = timeSec;
      const impulse = (energy.beatPulse - 0.5) * 4.5 * sculptWeight;
      this.camVel.z -= impulse;
      this.rollSpring.vel += (Math.sin(timeSec * 3.7) >= 0 ? 1 : -1) * impulse * 0.04;
    }

    // Auto director stack: composition solver -> cinematic intent brain -> fresh trajectory.
    // Intents are verbs, not stored camera positions. The path is generated from the live camera,
    // stage center, current focus/color/depth cues, and musical context at every shot transition.
    const composition = this.compositionSolver.update(telemetry, dt);
    if (this.mode === 'auto') {
      this.activeShot = 'procedural';
      this.shotTimer += dt;
      this.directorBrain.update(dt, telemetry, energy, composition, timeSec);
      this._moveIntent = this.directorBrain.intent;
      if (!this._trajectorySample || this._plannedIntent !== this.directorBrain.intent || this.directorBrain.elapsed < dt * 1.1) {
        this.trajectoryGenerator.plan({
          intent: this.directorBrain.intent,
          timeSec,
          cameraPosition: this.camPos,
          lookTarget: this.targetPos,
          cameraFov: camera?.fov ?? this.fovSpring.pos,
          cameraRoll: this.rollSpring.pos,
          stageCenter,
          composition,
          telemetry,
          energy
        });
        this.trajectoryGenerator.duration = THREE.MathUtils.clamp(this.directorBrain.duration, 6.4, 10.8);
        this._plannedIntent = this.directorBrain.intent;
      }
      this._trajectorySample = this.trajectoryGenerator.sample(timeSec);
      this._decisionReason = `${this.directorBrain.reason} · ${this.trajectoryGenerator.phase} · ${Math.max(0, this.directorBrain.duration - this.directorBrain.elapsed).toFixed(0)}s`;
      this._reasonTimer = 0;
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
      const sample = this._trajectorySample || this.trajectoryGenerator.sample(timeSec);
      this._desiredPos.copy(sample.position);
      this._desiredTarget.copy(sample.target);

      // LIVE MP4 SUBJECT TRACKING: update the point of interest every frame, not only
      // when a 6-10 second trajectory is planned. Saliency centroid is the analyzer's
      // best available subject estimate; color location contributes only when reliable.
      const cx = THREE.MathUtils.clamp(telemetry.centroidX ?? 0.5, 0, 1);
      const cy = THREE.MathUtils.clamp(telemetry.centroidY ?? 0.5, 0, 1);
      const liveX = (cx - 0.5) * 8.4 + (telemetry.colorFocusX ?? 0) * colorProminence * 1.25;
      const liveY = (0.5 - cy) * 5.4 + (telemetry.colorFocusY ?? 0) * colorProminence * 0.9;
      const liveConfidence = THREE.MathUtils.clamp(0.28 + (telemetry.motionEnergy ?? 0) * 0.34 + (telemetry.subjectScale ?? 0.5) * 0.28 + (telemetry.depthCoverage ?? 0) * 0.1, 0.28, 0.95);
      this._liveFocus.set(stageCenter.x + liveX, stageCenter.y + liveY, stageCenter.z);
      const trackingGain = this.trajectoryGenerator.trackWeight ?? 0.62;
      this._desiredTarget.lerp(this._liveFocus, liveConfidence * trackingGain);
      // Keep the camera path moving relative to the newly tracked subject. This is
      // the missing follow behavior: both camera and look target respond to content.
      this._focusTrackingOffset.set(liveX - composition.focus.x, liveY - composition.focus.y, 0).multiplyScalar(trackingGain * 0.34);
      this._desiredPos.add(this._focusTrackingOffset);
      this._desiredTarget.x += composition.frameBias.x * 1.15;
      this._desiredTarget.y += composition.frameBias.y * 0.85;

      // Audio affects camera action, not just a decorative zoom: transient accents
      // create a restrained forward impulse; sustained energy changes push distance.
      const beatPulse = THREE.MathUtils.clamp(energy.beatPulse ?? 0, 0, 1);
      if (beatPulse > 0.86 && timeSec - this._autoBeatTrigger > 0.62) {
        this._autoBeatTrigger = timeSec;
        const accent = (beatPulse - 0.72) * 1.35;
        this.camVel.z -= accent * (0.65 + (energy.bass ?? 0) * 0.55);
        this.camVel.x += (telemetry.velocityX ?? 0) * accent * 0.12;
      }
      const actionEnergy = THREE.MathUtils.clamp(energyMix * 0.68 + (telemetry.motionEnergy ?? 0) * 0.32, 0, 1);
      const focusChange = Math.hypot((telemetry.focusX ?? 0) - this._lastAutoFocusX, (telemetry.focusY ?? 0) - this._lastAutoFocusY);
      this._lastAutoFocusX = telemetry.focusX ?? 0;
      this._lastAutoFocusY = telemetry.focusY ?? 0;
      const visualAccent = THREE.MathUtils.clamp((telemetry.flashDelta ?? 0) * 0.28 + (telemetry.visualChange ?? 0) * 0.48 + focusChange * 1.2, 0, 1);
      const push = actionEnergy * 1.45 + beatPulse * 0.7 + visualAccent * 0.35;
      this._desiredPos.z -= push * 0.7;
      desiredFov = THREE.MathUtils.clamp(sample.fov - actionEnergy * 2.2 + beatPulse * 1.6 + visualAccent * 1.0, 29, 58);
      desiredRoll = THREE.MathUtils.clamp(sample.roll + (telemetry.velocityX ?? 0) * 0.018 * (0.35 + actionEnergy) + beatPulse * 0.012, -0.055, 0.055);
      omegaPos = 3.1 + (telemetry.motionEnergy ?? 0) * 0.7 + energyMix * 0.5 + focusChange * 0.25;
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
    stepCriticalSpringVec3(this.targetPos, this.targetVel, this._desiredTarget, shot === 'procedural' ? 5.2 : 4.4, dt);
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
