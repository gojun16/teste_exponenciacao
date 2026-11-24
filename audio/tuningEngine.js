/**
 * Módulo Isolado: Motor de Afinação Matemática & Síntese FM para Primos
 * Converte coordenadas, índices e primalidade em frequências e timbres.
 */
export class TuningEngine {
  constructor() {
    this.mode = 'nedo';        // 'nedo' | 'harmonic' | 'pythagorean'
    this.rootFreq = 130.81;    // Dó 3 (C3) como fundamental
    this.base = 3;
    this.primeFM = true;
    this.lastNote = null;
  }

  setMode(mode) {
    this.mode = mode;
  }

  setBase(base) {
    this.base = Math.max(2, parseInt(base, 10) || 2);
  }

  setRootFreq(hz) {
    this.rootFreq = Math.max(40, Math.min(440, Number(hz) || 130.81));
  }

  /**
   * Calcula frequência, razão matemática e consonância a partir de um bloco
   */
  computeNote(block) {
    const idx = block && typeof block.id === 'number'
      ? block.id
      : (block && typeof block.index === 'number' ? block.index : 0);

    const coords = (block && Array.isArray(block.coords)) ? block.coords : [];
    const coordSum = coords.reduce((acc, v) => acc + v, 0);
    const isPrime = Boolean(block && block.isPrime);

    let freq = this.rootFreq;
    let ratioLabel = '1:1';
    let consonance = 0.7;

    if (this.mode === 'harmonic') {
      // Série harmônica pura (1f0 .. 16f0) dobrada em 3 oitavas úteis
      const harmonic = (idx % 16) + 1;
      let raw = this.rootFreq * harmonic;
      while (raw > this.rootFreq * 8) raw *= 0.5;
      freq = raw;
      ratioLabel = `${harmonic}:1`;
      consonance = 1 / Math.sqrt(harmonic);
    } else if (this.mode === 'pythagorean') {
      // Empilhamento de quintas justas (3/2)^k reduzidas à oitava
      const step = idx % 12;
      const octaveBoost = Math.floor((idx % 24) / 12) + 1;
      let ratio = Math.pow(1.5, step);
      while (ratio >= 2) ratio *= 0.5;
      freq = this.rootFreq * ratio * octaveBoost;
      ratioLabel = `(3/2)^${step}`;
      consonance = Math.max(0.2, 1 - step * 0.06);
    } else {
      // Temperamento Igual por Base n (n-EDO): f = f0 * 2^(k / base)
      const n = Math.max(2, this.base);
      const step = (idx + coordSum) % (n * 2);
      freq = this.rootFreq * Math.pow(2, step / n);
      ratioLabel = `2^(${step}/${n})`;
      consonance = (step % n === 0) ? 1.0 : 0.65;
    }

    // Limite de segurança audível
    freq = Math.max(55, Math.min(2200, freq));

    this.lastNote = {
      freq,
      ratioLabel,
      isPrime,
      consonance,
      pan: block && typeof block.x === 'number' ? Math.max(-0.9, Math.min(0.9, block.x / 7)) : 0
    };

    return this.lastNote;
  }

  /**
   * Sintetiza a nota na Web Audio API (com modulação FM automática para primos)
   */
  playTone(ctx, destination, noteData, { duration = 0.42, volume = 0.15 } = {}) {
    if (!ctx || !destination || !noteData) return;

    const now = ctx.currentTime;
    const carrier = ctx.createOscillator();
    const env = ctx.createGain();
    const panner = ctx.createStereoPanner();

    panner.pan.setValueAtTime(noteData.pan || 0, now);

    // Envelope exponencial sem cliques
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(volume, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (this.primeFM && noteData.isPrime) {
      // Timbre cristalino FM exclusivo para números primos
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(noteData.freq, now);

      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      mod.type = 'sine';
      mod.frequency.setValueAtTime(noteData.freq * 2.5, now);

      modGain.gain.setValueAtTime(noteData.freq * 1.4, now);
      modGain.gain.exponentialRampToValueAtTime(1.0, now + duration * 0.75);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      mod.start(now);
      mod.stop(now + duration + 0.02);
    } else {
      // Timbre harmônico suave para números compostos
      carrier.type = noteData.consonance > 0.75 ? 'triangle' : 'sine';
      carrier.frequency.setValueAtTime(noteData.freq, now);
    }

    carrier.connect(env);
    env.connect(panner);
    panner.connect(destination);

    carrier.start(now);
    carrier.stop(now + duration + 0.02);
  }
}