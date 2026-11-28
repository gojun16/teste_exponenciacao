import * as THREE from 'three';

const INTENTS = ['pushIn', 'pullOut', 'arc', 'lateralTrack', 'craneReveal', 'reveal', 'trackFocus', 'hold'];

/** Content-led director. Decisions react to video events and audio accents, not a preset loop. */
export class CinematicDirectorBrain {
  constructor() { this.reset(); }

  reset() {
    this.intent = 'reveal';
    this.previousIntent = '';
    this.elapsed = 0;
    this.duration = 0;
    this.cycle = 0;
    this.reason = 'composição inicial';
    this.scores = {};
    this.recentIntents = [];
    this.eventCooldown = 0;
    this._lastMotion = 0;
    this._lastFlash = 0;
    this._lastBeat = 0;
    this._lastFocusX = 0;
    this._lastFocusY = 0;
    this.eventStrength = 0;
    this.eventType = 'none';
  }

  update(dt, telemetry = {}, energy = {}, composition = {}, timeSec = 0) {
    dt = Math.max(0, dt);
    this.elapsed += dt;
    this.eventCooldown = Math.max(0, this.eventCooldown - dt);
    const motion = THREE.MathUtils.clamp(telemetry.motionEnergy ?? 0, 0, 1);
    const beat = THREE.MathUtils.clamp(energy.beatPulse ?? 0, 0, 1);
    const bass = THREE.MathUtils.clamp(energy.bass ?? 0, 0, 1);
    const mid = THREE.MathUtils.clamp(energy.mid ?? 0, 0, 1);
    const high = THREE.MathUtils.clamp(energy.high ?? 0, 0, 1);
    const scale = THREE.MathUtils.clamp(telemetry.subjectScale ?? 0.5, 0, 1);
    const spread = THREE.MathUtils.clamp((telemetry.depthSpread ?? 0) * 2.4, 0, 1);
    const coverage = THREE.MathUtils.clamp(telemetry.depthCoverage ?? 0, 0, 1);
    const colorRatio = THREE.MathUtils.clamp(telemetry.dominantHueRatio ?? 0, 0, 1);
    const colorStrength = THREE.MathUtils.clamp(telemetry.dominantHueStrength ?? 0, 0, 1);
    const colorConfidence = colorRatio * colorStrength;
    const flash = THREE.MathUtils.clamp(telemetry.flashDelta ?? 0, 0, 1);
    const visualChange = THREE.MathUtils.clamp(telemetry.visualChange ?? 0, 0, 1);
    const lateralMotion = Math.abs(telemetry.velocityX ?? 0);
    const flowMagnitude = THREE.MathUtils.clamp(telemetry.flowMagnitude ?? 0, 0, 1);
    const flowAcceleration = THREE.MathUtils.clamp(Math.max(0, telemetry.flowAcceleration ?? 0), 0, 1);
    const focusShift = Math.hypot((telemetry.focusX ?? 0) - this._lastFocusX, (telemetry.focusY ?? 0) - this._lastFocusY);
    const motionChange = Math.abs(motion - this._lastMotion);
    const flashRise = Math.max(0, flash - this._lastFlash);
    const beatRise = Math.max(0, beat - this._lastBeat);
    const visualEvent = THREE.MathUtils.clamp(flashRise * 1.2 + motionChange * 0.55 + focusShift * 0.55 + visualChange * 0.48, 0, 1);
    const audioEvent = THREE.MathUtils.clamp(beatRise * 1.5 + beat * 0.45 + bass * 0.18, 0, 1);
    this.eventStrength = Math.max(visualEvent, audioEvent);
    this.eventType = visualEvent > audioEvent ? 'visual' : audioEvent > 0.35 ? 'audio' : 'none';

    const calm = 1 - THREE.MathUtils.clamp(motion * 0.48 + flowMagnitude * 0.42 + bass * 0.10, 0, 1);
    const compConfidence = composition.confidence ?? 0.5;
    const crowding = composition.crowding ?? scale;
    const focusConfidence = THREE.MathUtils.clamp(0.25 + scale * 0.35 + motion * 0.25 + focusShift * 0.4, 0, 1);

    this.scores = {
      pushIn: 0.10 + motion * 0.18 + flowMagnitude * 0.30 + flowAcceleration * 0.16 + beat * 0.24 + bass * 0.16 + high * 0.08 + scale * 0.10 + visualEvent * 0.18,
      pullOut: 0.12 + calm * 0.22 + coverage * 0.18 + (1 - scale) * 0.18 + crowding * 0.12 + (1 - compConfidence) * 0.08,
      arc: 0.10 + spread * 0.22 + colorConfidence * 0.14 + compConfidence * 0.14 + (1 - lateralMotion) * 0.08 + high * 0.10,
      lateralTrack: 0.10 + lateralMotion * 0.24 + flowMagnitude * 0.34 + motion * 0.18 + Math.abs(telemetry.focusX ?? 0) * 0.12 + focusShift * 0.22,
      craneReveal: 0.10 + coverage * 0.30 + spread * 0.20 + visualEvent * 0.16 + colorConfidence * 0.08,
      reveal: 0.12 + visualEvent * 0.34 + spread * 0.16 + beat * 0.12 + (1 - compConfidence) * 0.12,
      trackFocus: 0.08 + focusConfidence * 0.26 + motion * 0.12 + flowMagnitude * 0.30 + flowAcceleration * 0.12 + focusShift * 0.24 + lateralMotion * 0.08,
      hold: 0.10 + calm * 0.38 + (1 - colorStrength) * 0.08 + (1 - motion) * 0.10
    };

    // A take can end either naturally or when a meaningful audio/video event arrives.
    const minHold = 5.6;
    const eventCut = this.elapsed >= minHold && this.eventCooldown <= 0 && (visualEvent > 0.72 || (beat > 0.90 && beatRise > 0.48));
    if (this.elapsed >= this.duration || eventCut) {
      for (let i = 0; i < this.recentIntents.length; i++) {
        const penalty = i === 0 ? 0.46 : i === 1 ? 0.62 : 0.78;
        this.scores[this.recentIntents[i]] *= penalty;
      }
      if (this.intent) this.scores[this.intent] *= 0.55;
      if (this.recentIntents.slice(0, 2).includes('hold')) this.scores.hold = Math.min(this.scores.hold, 0.28);
      // Tiny deterministic tie-breaker only; no random/cyclic shot pattern.
      for (const key of INTENTS) this.scores[key] += ((key.length * 0.013 + this.cycle * 0.007) % 0.021);
      const next = INTENTS.reduce((best, key) => this.scores[key] > this.scores[best] ? key : best, INTENTS[0]);
      this.previousIntent = this.intent;
      if (this.intent) this.recentIntents.unshift(this.intent);
      this.recentIntents = this.recentIntents.filter(Boolean).slice(0, 3);
      this.intent = next;
      this.elapsed = 0;
      this.duration = eventCut ? 6.6 + (1 - this.eventStrength) * 1.6 : 7.2 + calm * 2.8 + motion * 1.2;
      this.duration = THREE.MathUtils.clamp(this.duration, 6.4, 10.8);
      this.eventCooldown = eventCut ? 2.8 : 1.5;
      const why = {
        pushIn: 'movimento e acento musical pedem aproximação',
        pullOut: 'a composição pede escala e respiro',
        arc: 'profundidade e cor favorecem revelar perspectiva',
        lateralTrack: 'o movimento visual pede acompanhamento lateral',
        craneReveal: 'a distribuição de profundidade pede elevação',
        reveal: visualEvent > 0.4 ? 'evento visual detectado; revelar a mudança' : 'recompor para revelar o conteúdo',
        trackFocus: 'saliencia mudou; acompanhar o ponto de interesse',
        hold: 'o conteúdo pede estabilidade e contemplação'
      };
      this.reason = eventCut ? `${this.eventType === 'visual' ? 'evento visual' : 'acento musical'} · ${why[next]}` : why[next];
      this.cycle++;
    }
    this._lastMotion = motion;
    this._lastFlash = flash;
    this._lastBeat = beat;
    this._lastFocusX = telemetry.focusX ?? 0;
    this._lastFocusY = telemetry.focusY ?? 0;
    return this;
  }
}
