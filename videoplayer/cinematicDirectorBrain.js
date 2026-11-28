import * as THREE from 'three';

const INTENTS = ['pushIn', 'pullOut', 'arc', 'lateralTrack', 'craneReveal', 'reveal', 'hold'];

/** A small stateful decision layer: cinematic verbs, not camera pose presets. */
export class CinematicDirectorBrain {
  constructor() {
    this.intent = 'reveal';
    this.previousIntent = '';
    this.elapsed = 0;
    this.duration = 0;
    this.cycle = 0;
    this.reason = 'composição inicial';
    this.scores = {};
    this.recentIntents = [];
  }

  reset() {
    this.intent = 'reveal';
    this.previousIntent = '';
    this.elapsed = 0;
    this.duration = 0;
    this.cycle = 0;
    this.reason = 'composição inicial';
    this.scores = {};
    this.recentIntents = [];
  }

  update(dt, telemetry = {}, energy = {}, composition = {}, timeSec = 0) {
    this.elapsed += Math.max(0, dt);
    const motion = THREE.MathUtils.clamp(telemetry.motionEnergy ?? 0, 0, 1);
    const beat = THREE.MathUtils.clamp(energy.beatPulse ?? 0, 0, 1);
    const bass = THREE.MathUtils.clamp(energy.bass ?? 0, 0, 1);
    const scale = THREE.MathUtils.clamp(telemetry.subjectScale ?? 0.5, 0, 1);
    const spread = THREE.MathUtils.clamp((telemetry.depthSpread ?? 0) * 2.4, 0, 1);
    const coverage = THREE.MathUtils.clamp(telemetry.depthCoverage ?? 0, 0, 1);
    const colorRatio = THREE.MathUtils.clamp(telemetry.dominantHueRatio ?? 0, 0, 1);
    const colorStrength = THREE.MathUtils.clamp(telemetry.dominantHueStrength ?? 0, 0, 1);
    const colorConfidence = colorRatio * colorStrength;
    const flash = THREE.MathUtils.clamp(telemetry.flashDelta ?? 0, 0, 1);
    const lateralMotion = Math.abs(telemetry.velocityX ?? 0);
    const calm = 1 - THREE.MathUtils.clamp(motion * 0.7 + bass * 0.3, 0, 1);
    const compConfidence = composition.confidence ?? 0.5;
    const crowding = composition.crowding ?? scale;

    this.scores = {
      pushIn: 0.16 + motion * 0.25 + beat * 0.25 + bass * 0.22 + scale * 0.12 + flash * 0.06,
      pullOut: 0.18 + calm * 0.28 + coverage * 0.22 + (1 - scale) * 0.14 + crowding * 0.1,
      arc: 0.18 + spread * 0.27 + colorConfidence * 0.2 + compConfidence * 0.15 + (1 - lateralMotion) * 0.08,
      lateralTrack: 0.16 + lateralMotion * 0.42 + motion * 0.24 + Math.abs(telemetry.focusX ?? 0) * 0.1,
      craneReveal: 0.16 + coverage * 0.34 + spread * 0.22 + flash * 0.12 + colorConfidence * 0.1,
      reveal: 0.22 + flash * 0.25 + spread * 0.2 + beat * 0.12 + (1 - compConfidence) * 0.12,
      hold: 0.12 + calm * 0.45 + (1 - colorStrength) * 0.08 + (1 - motion) * 0.12
    };

    if (this.elapsed >= this.duration) {
      // Diversity memory prevents the director from settling into a calm-only loop.
      // It still follows contextual scores; recent verbs receive a diminishing penalty.
      for (let i = 0; i < this.recentIntents.length; i++) {
        const recent = this.recentIntents[i];
        const penalty = i === 0 ? 0.52 : i === 1 ? 0.36 : 0.24;
        this.scores[recent] *= penalty;
      }
      if (this.intent && !this.recentIntents.includes(this.intent)) this.scores[this.intent] *= 0.62;
      // Hold is a deliberate pause, not the default escape from every low-energy moment.
      if (this.recentIntents.slice(0, 2).includes('hold')) this.scores.hold = Math.min(this.scores.hold, 0.34);
      for (const intent of INTENTS) this.scores[intent] += (Math.sin(timeSec * 0.11 + this.cycle * 1.77 + intent.length) + 1) * 0.018;
      const next = INTENTS.reduce((best, key) => this.scores[key] > this.scores[best] ? key : best, INTENTS[0]);
      this.previousIntent = this.intent;
      this.recentIntents.unshift(this.intent);
      this.recentIntents = this.recentIntents.filter(Boolean).slice(0, 3);
      this.intent = next;
      this.elapsed = 0;
      this.duration = 9.5 + (Math.sin(timeSec * 0.13 + this.cycle * 1.9) + 1) * 0.5 * 5.0;
      this.cycle++;
      const why = {
        pushIn: 'energia e movimento aumentam a intensidade',
        pullOut: 'composição pede respiro e escala',
        arc: 'relevo e cor favorecem parallax',
        lateralTrack: 'movimento lateral conduz o acompanhamento',
        craneReveal: 'profundidade pede revelação espacial',
        reveal: 'mudança visual pede descoberta gradual',
        hold: 'cena calma pede estabilidade'
      };
      this.reason = why[next] || 'composição adaptativa';
    }
    return this;
  }
}
