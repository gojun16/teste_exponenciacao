import * as THREE from 'three';

export const CAMERA_MODES = [
  { id: 'auto', label: '🎥 Auto-Diretor (6 Planos)' },
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
    this._shotCycle = ['orbit', 'grazing', 'vertigo', 'pendulum', 'tunnel'];
    this._shotIdx = 0;

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
    this._shotIdx = 0;
    this.activeShot = this.mode === 'auto' ? 'orbit' : this.mode;
  }

  setMode(modeId) {
    this.mode = modeId;
    if (modeId !== 'auto' && modeId !== 'free') {
      this.activeShot = modeId;
    }
    this.shotTimer = 0;
  }

  getCurrentShotLabel() {
    if (this.mode === 'free') return 'Câmera Livre';
    const map = {
      orbit: 'Plano: Órbita Espacial',
      grazing: 'Plano: Rasante Macro 3D',
      vertigo: 'Plano: Contra-Zoom Vertigo',
      pendulum: 'Plano: Pêndulo Lissajous',
      tunnel: 'Plano: Imersão Frontal'
    };
    return map[this.activeShot] || 'Plano: Órbita Espacial';
  }

  update(dt, timeSec, stageCenter, energy, telemetry, stageMode = 'sculpt', camera, controls) {
    if (this.mode === 'free') return false;

    const isFlatCinema = stageMode === 'flat';
    const sculptWeight = stageMode === 'sculpt' ? 1.0 : stageMode === 'curved' ? 0.55 : 0.15;

    // Beat-triggered physical spring impulse
    if (energy.beatPulse > 0.58 && timeSec - this._lastBeatTrigger > 0.42) {
      this._lastBeatTrigger = timeSec;
      const impulse = (energy.beatPulse - 0.5) * 4.5 * sculptWeight;
      this.camVel.z -= impulse;
      this.rollSpring.vel += (Math.sin(timeSec * 3.7) >= 0 ? 1 : -1) * impulse * 0.04;
    }

    // Auto-Director shot switching on scene cuts or musical phrase boundaries
    if (this.mode === 'auto') {
      this.shotTimer += dt;
      const cutReady = this.shotTimer > 4.2 && (telemetry.flashDelta > 0.55 || energy.beatPulse > 0.78);
      if (this.shotTimer >= this.shotDuration || cutReady) {
        this.shotTimer = 0;
        this._shotIdx = (this._shotIdx + 1) % this._shotCycle.length;
        this.activeShot = this._shotCycle[this._shotIdx];
      }
    } else {
      this.activeShot = this.mode;
    }

    const shot = isFlatCinema ? 'orbit' : this.activeShot;
    const intensity = THREE.MathUtils.clamp(
      energy.bass * 0.55 + energy.mid * 0.25 + energy.high * 0.2 + telemetry.motionEnergy * 0.25,
      0,
      1
    );

    const focusOffsetX = telemetry.focusX * 5.8 + telemetry.velocityX * 0.42;
    const focusOffsetY = telemetry.focusY * 4.2 - telemetry.velocityY * 0.32;

    this._desiredTarget.set(
      stageCenter.x + focusOffsetX,
      stageCenter.y + focusOffsetY,
      stageCenter.z
    );

    let desiredFov = 42;
    let desiredRoll = 0;
    let omegaPos = 3.2;

    if (shot === 'grazing') {
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
