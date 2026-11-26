export const AUDIO_PRESETS = [
  { id: 'flat', label: '🔊 Original (Puro)' },
  { id: 'cinema', label: '🏛️ Cinema Hall 3D' },
  { id: 'bass', label: '🔥 Sub-Bass Boost' },
  { id: 'cyber', label: '🎧 Espacial Stereo' },
  { id: 'lofi', label: '📻 Vinil / Lo-Fi' }
];

export class VideoAudioEngine {
  constructor() {
    this.ctx = null;
    this.mediaSource = null;
    this.connectedVideoEl = null;

    this.lowShelf = null;
    this.midPeak = null;
    this.highShelf = null;
    this.delayNode = null;
    this.delayFeedback = null;
    this.delayWet = null;
    this.delayFilter = null;
    this.panner = null;
    this.analyser = null;
    this.compressor = null;
    this.masterGain = null;

    this.freqData = null;
    this.volume = 0.78;
    this.muted = false;
    this.preset = 'flat';

    this.energy = {
      bass: 0,
      mid: 0,
      high: 0,
      rms: 0,
      beatPulse: 0
    };
    this._bassAvg = 0;
    this._demoPhase = 0;
  }

  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.lowShelf = this.ctx.createBiquadFilter();
      this.lowShelf.type = 'lowshelf';
      this.lowShelf.frequency.value = 115;

      this.midPeak = this.ctx.createBiquadFilter();
      this.midPeak.type = 'peaking';
      this.midPeak.frequency.value = 1250;
      this.midPeak.Q.value = 1.1;

      this.highShelf = this.ctx.createBiquadFilter();
      this.highShelf.type = 'highshelf';
      this.highShelf.frequency.value = 6200;

      // Stereo spatial reflection branch
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.16;

      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.24;

      this.delayFilter = this.ctx.createBiquadFilter();
      this.delayFilter.type = 'lowpass';
      this.delayFilter.frequency.value = 2800;

      this.delayWet = this.ctx.createGain();
      this.delayWet.gain.value = 0.0;

      this.panner = this.ctx.createStereoPanner();
      this.panner.pan.value = 0.0;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.76;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 5;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.18;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      // Wiring: EQ chain -> Dry + Wet Delay -> Analyser -> Compressor -> MasterGain -> Destination
      this.lowShelf.connect(this.midPeak);
      this.midPeak.connect(this.highShelf);

      // Dry path
      this.highShelf.connect(this.analyser);

      // Wet spatial echo path
      this.highShelf.connect(this.delayNode);
      this.delayNode.connect(this.delayFilter);
      this.delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayFilter.connect(this.panner);
      this.panner.connect(this.delayWet);
      this.delayWet.connect(this.analyser);

      this.analyser.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.setPreset(this.preset);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  attachVideoElement(videoEl) {
    if (!videoEl) return;
    this._ensureContext();

    // Unmute native element because audio is routed through Web Audio API
    videoEl.muted = false;
    videoEl.volume = 1.0;

    if (this.connectedVideoEl !== videoEl) {
      if (this.mediaSource) {
        try {
          this.mediaSource.disconnect();
        } catch (_) {}
      }
      this.mediaSource = this.ctx.createMediaElementSource(videoEl);
      this.mediaSource.connect(this.lowShelf);
      this.connectedVideoEl = videoEl;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  setPreset(presetId) {
    this.preset = presetId;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    if (presetId === 'cinema') {
      this.lowShelf.gain.setTargetAtTime(4.5, t, 0.04);
      this.midPeak.gain.setTargetAtTime(-1.2, t, 0.04);
      this.highShelf.gain.setTargetAtTime(3.2, t, 0.04);
      this.delayNode.delayTime.setTargetAtTime(0.14, t, 0.04);
      this.delayFeedback.gain.setTargetAtTime(0.22, t, 0.04);
      this.delayWet.gain.setTargetAtTime(0.24, t, 0.04);
    } else if (presetId === 'bass') {
      this.lowShelf.gain.setTargetAtTime(9.5, t, 0.04);
      this.midPeak.gain.setTargetAtTime(-1.5, t, 0.04);
      this.highShelf.gain.setTargetAtTime(1.5, t, 0.04);
      this.delayWet.gain.setTargetAtTime(0.06, t, 0.04);
    } else if (presetId === 'cyber') {
      this.lowShelf.gain.setTargetAtTime(3.0, t, 0.04);
      this.midPeak.gain.setTargetAtTime(2.5, t, 0.04);
      this.highShelf.gain.setTargetAtTime(5.5, t, 0.04);
      this.delayNode.delayTime.setTargetAtTime(0.21, t, 0.04);
      this.delayFeedback.gain.setTargetAtTime(0.36, t, 0.04);
      this.delayWet.gain.setTargetAtTime(0.34, t, 0.04);
    } else if (presetId === 'lofi') {
      this.lowShelf.gain.setTargetAtTime(2.5, t, 0.04);
      this.midPeak.gain.setTargetAtTime(4.0, t, 0.04);
      this.highShelf.gain.setTargetAtTime(-8.5, t, 0.04);
      this.delayNode.delayTime.setTargetAtTime(0.09, t, 0.04);
      this.delayFeedback.gain.setTargetAtTime(0.15, t, 0.04);
      this.delayWet.gain.setTargetAtTime(0.16, t, 0.04);
    } else {
      // flat / original
      this.lowShelf.gain.setTargetAtTime(0.0, t, 0.04);
      this.midPeak.gain.setTargetAtTime(0.0, t, 0.04);
      this.highShelf.gain.setTargetAtTime(0.0, t, 0.04);
      this.delayWet.gain.setTargetAtTime(0.0, t, 0.04);
    }
  }

  setStereoPan(panValue) {
    if (this.panner && this.ctx) {
      const clamped = Math.max(-0.85, Math.min(0.85, panValue));
      this.panner.pan.setTargetAtTime(clamped, this.ctx.currentTime, 0.06);
    }
  }

  updateEnergy(dt, hasActiveVideo = false, isPlaying = false) {
    const smooth = 1 - Math.exp(-dt * 14);

    if (hasActiveVideo && this.analyser && this.freqData && isPlaying) {
      this.analyser.getByteFrequencyData(this.freqData);
      const binCount = this.freqData.length;

      // Sample rate ~48kHz -> bin ~93.75Hz
      let bassSum = 0;
      const bassEnd = Math.min(binCount, 5);
      for (let i = 0; i < bassEnd; i++) bassSum += this.freqData[i];
      const rawBass = bassSum / (bassEnd * 255);

      let midSum = 0;
      const midEnd = Math.min(binCount, 32);
      for (let i = bassEnd; i < midEnd; i++) midSum += this.freqData[i];
      const rawMid = midSum / ((midEnd - bassEnd) * 255);

      let highSum = 0;
      const highEnd = Math.min(binCount, 128);
      for (let i = midEnd; i < highEnd; i++) highSum += this.freqData[i];
      const rawHigh = highSum / ((highEnd - midEnd) * 255);

      const rawRms = rawBass * 0.5 + rawMid * 0.35 + rawHigh * 0.15;

      this.energy.bass += (rawBass - this.energy.bass) * smooth;
      this.energy.mid += (rawMid - this.energy.mid) * smooth;
      this.energy.high += (rawHigh - this.energy.high) * smooth;
      this.energy.rms += (rawRms - this.energy.rms) * smooth;

      // Transient beat onset detector
      this._bassAvg += (rawBass - this._bassAvg) * (1 - Math.exp(-dt * 3.2));
      const onset = Math.max(0, rawBass - this._bassAvg - 0.045) * 4.2;
      this.energy.beatPulse = Math.max(
        this.energy.beatPulse * Math.exp(-dt * 7.5),
        Math.min(1.0, onset)
      );
    } else if (!hasActiveVideo && isPlaying) {
      // Gentle rhythmic pulse for built-in demo canvas before user loads an MP4
      this._demoPhase += dt * 2.15;
      const beatFrac = this._demoPhase % 1;
      const kick = Math.pow(Math.max(0, 1 - beatFrac * 2.6), 2.2);
      const synth = 0.28 + 0.22 * Math.sin(this._demoPhase * Math.PI * 0.5);
      const shimmer = 0.2 + 0.18 * Math.abs(Math.sin(this._demoPhase * Math.PI * 2.0));

      this.energy.bass += (kick * 0.72 - this.energy.bass) * smooth;
      this.energy.mid += (synth - this.energy.mid) * smooth;
      this.energy.high += (shimmer - this.energy.high) * smooth;
      this.energy.rms = this.energy.bass * 0.5 + this.energy.mid * 0.35 + this.energy.high * 0.15;
      this.energy.beatPulse = kick;
    } else {
      const decay = Math.exp(-dt * 6);
      this.energy.bass *= decay;
      this.energy.mid *= decay;
      this.energy.high *= decay;
      this.energy.rms *= decay;
      this.energy.beatPulse *= decay;
    }

    return this.energy;
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.mediaSource = null;
      this.connectedVideoEl = null;
    }
  }
}
