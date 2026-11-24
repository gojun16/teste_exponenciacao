/**
 * Etapa Áudio 2/5: Motor de Áudio Espacial Binaural 3D (HRTF) & DSP Acústico
 * - Sincroniza AudioListener com a câmera Three.js em tempo real
 * - Posiciona cada bloco no espaço 3D via PannerNode (modelo HRTF)
 * - Sintetiza notas com modelagem física Karplus-Strong + sinos harmônicos para primos
 * - Roteia todas as vozes por uma sala reverberante estéreo e limitador quente
 */
export class SpatialAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.karplusCache = new Map();

    this.enabled = true;
    this.activeVoices = 0;
    this.maxVoices = 18;
    this.hyperBrightness = 0.65;
  }

  _initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Reverb de câmara acústica para dar profundidade espacial aos cubos
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this._createRoomImpulse(2.4, 2.8);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.36;

    // Compressor/Limitador para evitar saturação quando o laser varre camadas densas
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 16;
    limiter.ratio.value = 4.0;
    limiter.attack.value = 0.008;
    limiter.release.value = 0.22;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;

    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(limiter);
    limiter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this._limiterInput = limiter;
  }

  _createRoomImpulse(duration = 2.4, decay = 2.8) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const preDelay = Math.floor(rate * 0.012);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        if (i < preDelay) {
          data[i] = 0;
          continue;
        }
        const t = (i - preDelay) / (length - preDelay);
        const env = Math.pow(1 - t, decay);
        const white = Math.random() * 2 - 1;
        lp += (0.28 + 0.45 * (1 - t)) * (white - lp);
        data[i] = lp * env;
      }
    }
    return impulse;
  }

  /**
   * Modelagem física de corda dedilhada (Karplus-Strong) com interpolação fracionária
   */
  _getKarplusBuffer(freq, brightness = 0.65, decaySeconds = 1.6) {
    const safeFreq = Math.max(55, Math.min(2400, freq));
    const key = `${safeFreq.toFixed(1)}_${brightness.toFixed(2)}`;
    if (this.karplusCache.has(key)) {
      return this.karplusCache.get(key);
    }

    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * decaySeconds);
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);

    const period = rate / safeFreq;
    const N = Math.floor(period);
    const frac = period - N;

    const pickOffset = Math.max(1, Math.floor(N * 0.22));
    const noise = new Float32Array(N + 2);
    let lp = 0;
    for (let i = 0; i < noise.length; i++) {
      const w = Math.random() * 2 - 1;
      lp += 0.48 * (w - lp);
      noise[i] = lp;
    }

    for (let i = 0; i <= N; i++) {
      const delayedPick = i >= pickOffset ? noise[i - pickOffset] : 0;
      data[i] = (noise[i] - 0.6 * delayedPick) * 0.85;
    }

    const damping = Math.pow(0.0018, 1 / (safeFreq * decaySeconds));
    const b0 = 0.5 * brightness + 0.25;
    const b1 = 1 - b0;

    for (let i = N + 1; i < length; i++) {
      const delayed = data[i - N] * (1 - frac) + data[i - N - 1] * frac;
      data[i] = (b0 * delayed + b1 * data[i - 1]) * damping;
    }

    if (this.karplusCache.size > 180) {
      const oldest = this.karplusCache.keys().next().value;
      this.karplusCache.delete(oldest);
    }
    this.karplusCache.set(key, buffer);
    return buffer;
  }

  /**
   * Atualiza posição e orientação do ouvinte 3D com base na câmera do Three.js
   */
  updateListener(camera, forwardVec = null) {
    if (!this.ctx || !camera) return;

    const listener = this.ctx.listener;
    const now = this.ctx.currentTime;
    const pos = camera.position;

    // Escala espacial suavizada para sensação natural em fones e caixas
    const scale = 0.35;
    if (listener.positionX) {
      listener.positionX.setTargetAtTime(pos.x * scale, now, 0.03);
      listener.positionY.setTargetAtTime(pos.y * scale, now, 0.03);
      listener.positionZ.setTargetAtTime(pos.z * scale, now, 0.03);
    } else {
      listener.setPosition(pos.x * scale, pos.y * scale, pos.z * scale);
    }

    const fwd = forwardVec || {
      x: -pos.x,
      y: -pos.y,
      z: -pos.z
    };
    const len = Math.hypot(fwd.x, fwd.y, fwd.z) || 1;
    const fx = fwd.x / len;
    const fy = fwd.y / len;
    const fz = fwd.z / len;

    const up = camera.up || { x: 0, y: 1, z: 0 };

    if (listener.forwardX) {
      listener.forwardX.setTargetAtTime(fx, now, 0.03);
      listener.forwardY.setTargetAtTime(fy, now, 0.03);
      listener.forwardZ.setTargetAtTime(fz, now, 0.03);
      listener.upX.setTargetAtTime(up.x, now, 0.03);
      listener.upY.setTargetAtTime(up.y, now, 0.03);
      listener.upZ.setTargetAtTime(up.z, now, 0.03);
    } else {
      listener.setOrientation(fx, fy, fz, up.x, up.y, up.z);
    }
  }

  /**
   * Modula o brilho acústico conforme os ângulos da 4ª dimensão (XW / YW)
   */
  setHyperModulation(angleXW = 0, angleYW = 0) {
    const energy = Math.min(1, (Math.abs(Math.sin(angleXW)) + Math.abs(Math.sin(angleYW))) * 0.5);
    this.hyperBrightness = 0.50 + energy * 0.35;
  }

  _createSpatialPanner(block) {
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.8;
    panner.maxDistance = 40;
    panner.rolloffFactor = 1.15;

    const scale = 0.35;
    const x = (block?.x || 0) * scale;
    const y = (block?.y || 0) * scale;
    const z = (block?.z || 0) * scale;

    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x, y, z);
    }

    panner.connect(this._limiterInput);
    panner.connect(this.reverbNode);
    return panner;
  }

  /**
   * Toca uma nota espacializada na coordenada 3D do bloco com timbre sinfônico
   */
  playSpatialNote(note, block, { isScanner = false } = {}) {
    if (!this.enabled) return;
    if (this.activeVoices >= this.maxVoices) return;

    this._initContext();
    const now = this.ctx.currentTime;
    const freq = typeof note === 'number' ? note : (note?.freq || 261.63);
    const isPrime = Boolean(note?.isPrime || block?.isPrime);

    const panner = this._createSpatialPanner(block);
    const duration = isScanner ? 0.85 : 1.75;
    const volume = isScanner ? 0.14 : 0.28;

    this.activeVoices++;
    let released = false;
    const releaseVoice = () => {
      if (!released) {
        released = true;
        this.activeVoices = Math.max(0, this.activeVoices - 1);
      }
    };

    if (isPrime) {
      // Números primos soam como sinos harmônicos FM cristalinos no espaço 3D
      const carrier = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const env = this.ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, now);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(freq * 2.0, now);

      modGain.gain.setValueAtTime(freq * 1.25, now);
      modGain.gain.exponentialRampToValueAtTime(0.3, now + duration * 0.45);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(volume * 0.65, now + 0.014);
      env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(env);
      env.connect(panner);

      carrier.onended = releaseVoice;
      carrier.start(now);
      mod.start(now);
      carrier.stop(now + duration + 0.04);
      mod.stop(now + duration + 0.04);
      return;
    }

    // Blocos compostos soam como cordas dedilhadas (Harpa Karplus-Strong)
    const buf = this._getKarplusBuffer(freq, this.hyperBrightness, duration);
    const src = this.ctx.createBufferSource();
    const env = this.ctx.createGain();

    src.buffer = buf;
    env.gain.setValueAtTime(volume, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(env);
    env.connect(panner);

    src.onended = releaseVoice;
    src.start(now);
    src.stop(now + duration + 0.04);
  }
}