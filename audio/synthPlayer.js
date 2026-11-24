/**
 * Motor de Síntese Sinfônica & Matemática v4 (Symphonic Studio DSP)
 * - Modelagem Física Karplus-Strong (Harpa / Pizzicato com interpolação fracionária)
 * - Banco de Formantes Acústicos (Madeira de Violino/Cello + Coral Vocal Source-Filter)
 * - Ensemble Chorus Triplo (Estilo ARP Solina) com Vibrato Assíncrono
 * - Reverb Catedral Convolucional + Ping-Pong Delay + Saturador Analógico
 * - 14 Movimentos Sinfônicos Generativos
 */
export class AmbientPlaylistPlayer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;

    // Barramentos orquestrais independentes
    this.subBus = null;
    this.stringsBus = null;
    this.choirBus = null;
    this.soloBus = null;

    // Efeitos master
    this.delayLeft = null;
    this.delayRight = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.analyser = null;
    this.freqData = null;

    // Cache de buffers Karplus-Strong (zero custo de CPU após gerar a nota)
    this.karplusCache = new Map();

    this.isPlaying = false;
    this.currentTrackIndex = 0;
    this.volume = 0.50;
    this.stepTimer = null;
    this.stepCount = 0;

    this.tracks = [
      {
        id: 'hypercube-drift',
        title: '01. Hypercube Drift',
        subtitle: 'Fá Maior 9 • Cordas de Câmara & Harpa Karplus-Strong',
        tempoMs: 420,
        padEngine: 'symphonic-strings',
        leadEngine: 'karplus-harp',
        cutoff: 1450,
        reverbMix: 0.48,
        delayTime: 0.315,
        chords: [
          [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
          [164.81, 196.00, 246.94, 293.66, 392.00], // Em7
          [146.83, 174.61, 220.00, 261.63, 329.63], // Dm9
          [130.81, 164.81, 196.00, 246.94, 293.66]  // Cmaj7
        ],
        pattern: [0, 2, 4, 3, 1, 2, 4, 2],
        counterMelody: [4, -1, 3, -1, 2, -1, 4, 3]
      },
      {
        id: 'mersenne-echo',
        title: '02. Mersenne Echoes',
        subtitle: 'Ré Dórico • Coral Catedral & Celesta FM',
        tempoMs: 350,
        padEngine: 'ethereal-choir',
        leadEngine: 'fm-celesta',
        cutoff: 1750,
        reverbMix: 0.56,
        delayTime: 0.262,
        chords: [
          [146.83, 220.00, 261.63, 329.63, 440.00], // Dm9
          [196.00, 246.94, 293.66, 349.23, 440.00], // G13
          [174.61, 220.00, 261.63, 329.63, 523.25], // Fmaj7
          [130.81, 196.00, 246.94, 329.63, 392.00]  // Cmaj9
        ],
        pattern: [0, 1, 3, 4, 2, 3, 1, 4],
        counterMelody: [3, -1, 4, -1, 2, 3, -1, 4]
      },
      {
        id: 'euler-horizon',
        title: '03. Euler’s Horizon',
        subtitle: 'Lá Menor 11 • Violoncelos & Trompas Analógicas',
        tempoMs: 490,
        padEngine: 'symphonic-strings',
        leadEngine: 'warm-horn',
        cutoff: 1050,
        reverbMix: 0.52,
        delayTime: 0.367,
        chords: [
          [110.00, 164.81, 196.00, 246.94, 293.66], // Am11
          [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
          [130.81, 196.00, 246.94, 329.63, 392.00], // Cmaj9
          [164.81, 196.00, 246.94, 329.63, 392.00]  // Em7
        ],
        pattern: [0, 2, 1, 3, 4, 2, 3, 1],
        counterMelody: [2, -1, -1, 4, 3, -1, 2, -1]
      },
      {
        id: 'fractal-lullaby',
        title: '04. Fractal Lullaby',
        subtitle: 'Si Bemol Lídio • Harpa Acústica & Coral Flutuante',
        tempoMs: 390,
        padEngine: 'ethereal-choir',
        leadEngine: 'karplus-harp',
        cutoff: 1550,
        reverbMix: 0.58,
        delayTime: 0.292,
        chords: [
          [116.54, 174.61, 220.00, 261.63, 329.63], // Bbmaj7#11
          [130.81, 196.00, 246.94, 293.66, 392.00], // C9sus
          [146.83, 220.00, 261.63, 329.63, 392.00], // Dm11
          [174.61, 220.00, 261.63, 329.63, 440.00]  // Fmaj7
        ],
        pattern: [0, 4, 2, 3, 1, 4, 2, 0],
        counterMelody: [4, -1, 3, -1, 4, -1, 2, -1]
      },
      {
        id: 'collatz-orbit',
        title: '05. Collatz Orbit (3n+1)',
        subtitle: 'Mi Lídio • Compasso 5/4 & Pizzicato Orquestral',
        tempoMs: 315,
        padEngine: 'symphonic-strings',
        leadEngine: 'karplus-harp',
        cutoff: 1620,
        reverbMix: 0.46,
        delayTime: 0.236,
        chords: [
          [164.81, 246.94, 311.13, 369.99, 493.88], // Emaj9
          [146.83, 220.00, 277.18, 329.63, 440.00], // Dmaj9
          [123.47, 185.00, 246.94, 311.13, 369.99], // Badd9
          [138.59, 207.65, 246.94, 329.63, 415.30]  // C#m11
        ],
        pattern: [0, 2, 4, 1, 3, 0, 3, 4, 2, 1],
        counterMelody: [4, -1, 2, -1, 4, 3, -1, 4, -1, 2]
      },
      {
        id: 'riemann-abyss',
        title: '06. Riemann Zeta',
        subtitle: 'Dó Menor 9 • Adágio Sinfônico & Coral Profundo',
        tempoMs: 540,
        padEngine: 'ethereal-choir',
        leadEngine: 'warm-horn',
        cutoff: 1080,
        reverbMix: 0.64,
        delayTime: 0.405,
        chords: [
          [130.81, 155.56, 196.00, 233.08, 293.66], // Cm9
          [103.83, 155.56, 196.00, 233.08, 311.13], // Abmaj7
          [116.54, 174.61, 207.65, 261.63, 311.13], // Bb6/9
          [98.00,  146.83, 196.00, 233.08, 293.66]  // Gm7
        ],
        pattern: [0, 1, 2, 4, 3, 2, 1, 0],
        counterMelody: [4, -1, -1, 3, 4, -1, 2, -1]
      },
      {
        id: 'klein-loop',
        title: '07. Klein Bottle Loop',
        subtitle: 'Sol Maior 9 • Moto Perpetuo de Cordas & Celesta',
        tempoMs: 360,
        padEngine: 'symphonic-strings',
        leadEngine: 'fm-celesta',
        cutoff: 1420,
        reverbMix: 0.48,
        delayTime: 0.270,
        chords: [
          [196.00, 246.94, 293.66, 369.99, 440.00], // Gmaj9
          [164.81, 246.94, 293.66, 329.63, 392.00], // Em9
          [130.81, 196.00, 246.94, 329.63, 392.00], // Cmaj9
          [146.83, 220.00, 261.63, 329.63, 392.00]  // D13sus
        ],
        pattern: [0, 3, 1, 4, 2, 3, 1, 2],
        counterMelody: [4, -1, 3, -1, 4, -1, 2, 3]
      },
      {
        id: 'tesseract-waltz',
        title: '08. Tesseract Waltz',
        subtitle: 'Ré Maior 9 • Valsa Sinfônica 3/4',
        tempoMs: 390,
        padEngine: 'symphonic-strings',
        leadEngine: 'karplus-harp',
        cutoff: 1640,
        reverbMix: 0.54,
        delayTime: 0.292,
        chords: [
          [146.83, 220.00, 277.18, 329.63, 415.30], // Dmaj9#11
          [123.47, 185.00, 220.00, 277.18, 329.63], // Bm9
          [98.00,  146.83, 220.00, 246.94, 329.63], // Gmaj13
          [110.00, 164.81, 220.00, 277.18, 369.99]  // A13
        ],
        pattern: [0, 2, 4, 1, 3, 4, 0, 3, 2, 1, 4, 3],
        counterMelody: [4, -1, -1, 3, -1, -1, 4, -1, -1, 2, -1, 3]
      },
      {
        id: 'fourier-sanctuary',
        title: '09. Fourier Sanctuary',
        subtitle: 'Lá Bemol Lídio • Órgão Coral & Harmônicos de Vidro',
        tempoMs: 450,
        padEngine: 'ethereal-choir',
        leadEngine: 'harmonic-glass',
        cutoff: 1500,
        reverbMix: 0.62,
        delayTime: 0.337,
        chords: [
          [103.83, 155.56, 207.65, 261.63, 311.13], // Abmaj9
          [116.54, 174.61, 233.08, 261.63, 349.23], // Bb9sus
          [130.81, 196.00, 233.08, 293.66, 392.00], // Cm11
          [155.56, 233.08, 293.66, 349.23, 466.16]  // Ebmaj9
        ],
        pattern: [0, 3, 4, 2, 1, 4, 3, 2],
        counterMelody: [4, -1, 3, -1, 4, 2, -1, 3]
      },
      {
        id: 'mandelbrot-dusk',
        title: '10. Mandelbrot Dusk',
        subtitle: 'Fá# Menor 11 • Metais Quentes & Cordas Graves',
        tempoMs: 420,
        padEngine: 'symphonic-strings',
        leadEngine: 'warm-horn',
        cutoff: 1120,
        reverbMix: 0.52,
        delayTime: 0.315,
        chords: [
          [92.50,  138.59, 185.00, 220.00, 277.18], // F#m11
          [146.83, 220.00, 277.18, 329.63, 415.30], // Dmaj9
          [110.00, 164.81, 220.00, 246.94, 329.63], // Amaj9
          [138.59, 207.65, 246.94, 311.13, 369.99]  // C#m7b13
        ],
        pattern: [0, 2, 3, 4, 2, 1, 3, 4],
        counterMelody: [3, -1, -1, 4, 2, -1, 3, -1]
      },
      {
        id: 'hopf-fibration',
        title: '11. Hopf Fibration',
        subtitle: 'Mi Bemol Maior 9 • Harpa Líquida & Ensemble Solina',
        tempoMs: 300,
        padEngine: 'symphonic-strings',
        leadEngine: 'karplus-harp',
        cutoff: 1780,
        reverbMix: 0.50,
        delayTime: 0.225,
        chords: [
          [155.56, 233.08, 293.66, 349.23, 466.16], // Ebmaj9
          [130.81, 196.00, 233.08, 293.66, 392.00], // Cm9
          [103.83, 155.56, 207.65, 261.63, 349.23], // Abmaj13
          [116.54, 174.61, 233.08, 261.63, 311.13]  // Bb11
        ],
        pattern: [0, 4, 2, 3, 1, 3, 4, 2],
        counterMelody: [4, -1, 3, -1, 4, -1, 2, 4]
      },
      {
        id: 'cantor-dust',
        title: '12. Cantor Dust',
        subtitle: 'Si Menor 9 • Coral Sacro & Cristais Harmônicos',
        tempoMs: 560,
        padEngine: 'ethereal-choir',
        leadEngine: 'harmonic-glass',
        cutoff: 1240,
        reverbMix: 0.66,
        delayTime: 0.420,
        chords: [
          [123.47, 185.00, 220.00, 277.18, 329.63], // Bm9
          [98.00,  146.83, 220.00, 246.94, 329.63], // Gmaj9
          [146.83, 220.00, 277.18, 329.63, 440.00], // Dmaj9
          [110.00, 164.81, 207.65, 246.94, 329.63]  // Amaj9/C#
        ],
        pattern: [0, 4, 1, 3, 2, 4, 0, 3],
        counterMelody: [4, -1, -1, 3, 4, -1, 2, -1]
      },
      {
        id: 'poincare-adagio',
        title: '13. Poincaré Symphony',
        subtitle: 'Dó# Menor 9 • Adágio para Cordas & Coral',
        tempoMs: 520,
        padEngine: 'symphonic-strings',
        leadEngine: 'warm-horn',
        cutoff: 1280,
        reverbMix: 0.62,
        delayTime: 0.390,
        chords: [
          [138.59, 207.65, 246.94, 311.13, 369.99], // C#m9
          [110.00, 164.81, 207.65, 246.94, 329.63], // Amaj9
          [164.81, 246.94, 311.13, 369.99, 493.88], // Emaj9
          [123.47, 185.00, 246.94, 311.13, 369.99]  // Badd9
        ],
        pattern: [0, 2, 4, 3, 1, 2, 3, 4],
        counterMelody: [4, -1, 3, 4, -1, 2, 3, -1]
      },
      {
        id: 'banach-overture',
        title: '14. Banach-Tarski Overture',
        subtitle: 'Ré Menor 11 • Finale Épico Orquestral',
        tempoMs: 330,
        padEngine: 'symphonic-strings',
        leadEngine: 'fm-celesta',
        cutoff: 1680,
        reverbMix: 0.55,
        delayTime: 0.247,
        chords: [
          [146.83, 220.00, 261.63, 329.63, 440.00], // Dm11
          [116.54, 174.61, 220.00, 261.63, 349.23], // Bbmaj9
          [130.81, 196.00, 246.94, 293.66, 392.00], // Cmaj9
          [110.00, 164.81, 220.00, 277.18, 329.63]  // A7sus4 -> A
        ],
        pattern: [0, 2, 3, 4, 1, 3, 4, 2],
        counterMelody: [4, 3, -1, 4, 2, -1, 4, 3]
      }
    ];
  }

  /**
   * Modelagem Física Karplus-Strong pré-computada com interpolação fracionária
   * Produz som autêntico de harpa de concerto / corda dedilhada sem limite de bloco
   */
  _getKarplusBuffer(freq, brightness = 0.62, decaySeconds = 2.4) {
    const key = `${freq.toFixed(2)}_${brightness.toFixed(2)}`;
    if (this.karplusCache.has(key)) {
      return this.karplusCache.get(key);
    }

    const sampleRate = this.ctx.sampleRate;
    const length = Math.min(Math.floor(sampleRate * decaySeconds), sampleRate * 4);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const period = sampleRate / Math.max(40, freq);
    const N = Math.floor(period);
    const frac = period - N;

    // 1. Excitação inicial: ruído filtrado com posição de dedilhado (1/5 da corda)
    const pickOffset = Math.max(1, Math.floor(N * 0.2));
    const noiseBurst = new Float32Array(N + 2);
    let lpState = 0;
    for (let i = 0; i < noiseBurst.length; i++) {
      const white = Math.random() * 2 - 1;
      lpState += 0.45 * (white - lpState);
      noiseBurst[i] = lpState;
    }

    for (let i = 0; i <= N; i++) {
      const delayedPick = i >= pickOffset ? noiseBurst[i - pickOffset] : 0;
      data[i] = (noiseBurst[i] - 0.65 * delayedPick) * 0.85;
    }

    // 2. Guia de onda ressonante com amortecimento dependente da frequência
    const damping = Math.pow(0.0015, 1 / (freq * decaySeconds));
    const b0 = 0.5 * brightness + 0.25;
    const b1 = 1 - b0;

    for (let i = N + 1; i < length; i++) {
      const s0 = data[i - N];
      const s1 = data[i - N - 1];
      // Interpolação fracionária para afinação microtonal/harmônica exata
      const delayed = s0 * (1 - frac) + s1 * frac;
      const prevOut = data[i - 1];
      data[i] = (b0 * delayed + b1 * prevOut) * damping;
    }

    if (this.karplusCache.size > 160) {
      const firstKey = this.karplusCache.keys().next().value;
      this.karplusCache.delete(firstKey);
    }
    this.karplusCache.set(key, buffer);
    return buffer;
  }

  /**
   * Banco de Formantes Acústicos (simula a caixa de madeira de violinos e violoncelos)
   */
  _createAcousticBodyBank() {
    const formants = [
      { freq: 275,  Q: 3.2, gain: 4.5 },  // Ressonância principal de ar (Helmholtz)
      { freq: 460,  Q: 3.8, gain: 3.8 },  // Modo principal do tampo de madeira
      { freq: 1120, Q: 4.2, gain: -2.5 }, // Reduz nasalidade eletrônica
      { freq: 2350, Q: 3.5, gain: 3.2 }   // Brilho natural do arco
    ];

    let head = null;
    let tail = null;

    for (const f of formants) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = f.freq;
      filter.Q.value = f.Q;
      filter.gain.value = f.gain;

      if (!head) {
        head = filter;
        tail = filter;
      } else {
        tail.connect(filter);
        tail = filter;
      }
    }
    return { input: head, output: tail };
  }

  /**
   * Solina Triple Ensemble Chorus (3 linhas de atraso moduladas defasadas em 120°)
   */
  _createEnsembleChorus(inputNode, outputNode) {
    const dry = this.ctx.createGain();
    dry.gain.value = 0.55;
    inputNode.connect(dry);
    dry.connect(outputNode);

    const phases = [
      { baseDelay: 0.014, depth: 0.0022, rate: 0.55, pan: -0.75 },
      { baseDelay: 0.019, depth: 0.0026, rate: 0.67, pan: 0.0 },
      { baseDelay: 0.024, depth: 0.0022, rate: 0.79, pan: 0.75 }
    ];

    for (const p of phases) {
      const delay = this.ctx.createDelay(0.1);
      delay.delayTime.value = p.baseDelay;

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = p.rate;
      lfoGain.gain.value = p.depth;

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = p.pan;

      const wet = this.ctx.createGain();
      wet.gain.value = 0.28;

      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);

      inputNode.connect(delay);
      delay.connect(panner);
      panner.connect(wet);
      wet.connect(outputNode);

      lfo.start();
    }
  }

  _createReverbImpulse(duration = 4.2, decay = 2.4) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const preDelay = Math.floor(rate * 0.024);

    for (let ch = 0; ch < 2; ch++) {
      const channel = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        if (i < preDelay) {
          channel[i] = 0;
          continue;
        }
        const t = (i - preDelay) / (length - preDelay);
        const env = Math.pow(1 - t, decay) * Math.min(1, (i - preDelay) / (rate * 0.03));
        const white = Math.random() * 2 - 1;
        const damp = 0.22 + 0.50 * (1 - t);
        lp += damp * (white - lp);
        channel[i] = lp * env;
      }

      // Reflexões iniciais de sala sinfônica
      const earlyTaps = [0.028, 0.041, 0.059, 0.078];
      earlyTaps.forEach((tapSec, idx) => {
        const pos = Math.floor(rate * (tapSec + ch * 0.004));
        if (pos < length) {
          channel[pos] += (idx % 2 === 0 ? 1 : -1) * (0.28 / (idx + 1));
        }
      });
    }
    return impulse;
  }

  _createWarmSaturator(amount = 5.0) {
    const samples = 1024;
    const curve = new Float32Array(samples);
    const norm = Math.tanh(amount * 0.14);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * amount * 0.14) / norm;
    }
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = curve;
    shaper.oversample = '2x';
    return shaper;
  }

  _initContext() {
    if (this.ctx) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Barramentos da Orquestra
    this.subBus = this.ctx.createGain();
    this.subBus.gain.value = 0.95;

    this.stringsBus = this.ctx.createGain();
    this.stringsBus.gain.value = 0.85;

    this.choirBus = this.ctx.createGain();
    this.choirBus.gain.value = 0.95;

    this.soloBus = this.ctx.createGain();
    this.soloBus.gain.value = 0.95;

    // Filtro dedicado para Contrabaixo / Sub
    const subFilter = this.ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 185;
    this.subBus.connect(subFilter);

    // Cordas passam pelo Banco de Formantes de Madeira + Solina Ensemble Chorus
    const bodyBank = this._createAcousticBodyBank();
    const stringsEnsembleOut = this.ctx.createGain();
    this.stringsBus.connect(bodyBank.input);
    this._createEnsembleChorus(bodyBank.output, stringsEnsembleOut);

    // Ping-Pong Delay Estéreo
    this.delayLeft = this.ctx.createDelay(2.0);
    this.delayRight = this.ctx.createDelay(2.0);
    this.delayLeft.delayTime.value = 0.315;
    this.delayRight.delayTime.value = 0.472;

    const fbLeft = this.ctx.createGain();
    const fbRight = this.ctx.createGain();
    fbLeft.gain.value = 0.36;
    fbRight.gain.value = 0.36;

    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 1900;

    const merger = this.ctx.createChannelMerger(2);
    const delayWet = this.ctx.createGain();
    delayWet.gain.value = 0.30;

    this.soloBus.connect(this.delayLeft);
    this.delayLeft.connect(delayFilter);
    delayFilter.connect(fbLeft);
    fbLeft.connect(this.delayRight);
    this.delayRight.connect(fbRight);
    fbRight.connect(this.delayLeft);

    this.delayLeft.connect(merger, 0, 0);
    this.delayRight.connect(merger, 0, 1);
    merger.connect(delayWet);

    // Reverb Catedral Convolucional
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this._createReverbImpulse(4.2, 2.4);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.50;

    stringsEnsembleOut.connect(this.reverbNode);
    this.choirBus.connect(this.reverbNode);
    this.soloBus.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);

    // Cadeia Master: Saturador -> Compressor -> MasterGain -> Analyser
    const saturator = this._createWarmSaturator(5.0);
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -15;
    compressor.knee.value = 18;
    compressor.ratio.value = 3.2;
    compressor.attack.value = 0.015;
    compressor.release.value = 0.28;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.82;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    subFilter.connect(saturator);
    stringsEnsembleOut.connect(saturator);
    this.choirBus.connect(saturator);
    this.soloBus.connect(saturator);
    delayWet.connect(saturator);
    this.reverbGain.connect(saturator);

    saturator.connect(compressor);
    compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  getAudioEnergy() {
    if (!this.isPlaying || !this.analyser) return { bass: 0, mid: 0 };
    this.analyser.getByteFrequencyData(this.freqData);

    const bass = (this.freqData[1] + this.freqData[2] + this.freqData[3] + this.freqData[4]) / (4 * 255);
    const mid = (this.freqData[8] + this.freqData[11] + this.freqData[14] + this.freqData[18]) / (4 * 255);
    return { bass, mid };
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  selectTrack(index) {
    this.currentTrackIndex = (index + this.tracks.length) % this.tracks.length;
    this.stepCount = 0;

    if (this.ctx) {
      const track = this.getCurrentTrack();
      const now = this.ctx.currentTime;
      if (this.delayLeft && this.delayRight) {
        this.delayLeft.delayTime.setTargetAtTime(track.delayTime, now, 0.08);
        this.delayRight.delayTime.setTargetAtTime(track.delayTime * 1.5, now, 0.08);
      }
      if (this.reverbGain) {
        this.reverbGain.gain.setTargetAtTime(track.reverbMix, now, 0.12);
      }
    }

    if (this.isPlaying) {
      this._restartScheduler();
    }
    return this.getCurrentTrack();
  }

  getCurrentTrack() {
    return this.tracks[this.currentTrackIndex];
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  play() {
    this._initContext();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying) return;

    this.isPlaying = true;
    const track = this.getCurrentTrack();
    const now = this.ctx.currentTime;
    this.delayLeft.delayTime.setValueAtTime(track.delayTime, now);
    this.delayRight.delayTime.setValueAtTime(track.delayTime * 1.5, now);
    this.reverbGain.gain.setValueAtTime(track.reverbMix, now);

    this._restartScheduler();
  }

  pause() {
    this.isPlaying = false;
    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
  }

  nextTrack() {
    return this.selectTrack(this.currentTrackIndex + 1);
  }

  prevTrack() {
    return this.selectTrack(this.currentTrackIndex - 1);
  }

  _restartScheduler() {
    if (this.stepTimer) clearInterval(this.stepTimer);
    const track = this.getCurrentTrack();

    this._triggerStep();
    this.stepTimer = setInterval(() => this._triggerStep(), track.tempoMs);
  }

  _triggerStep() {
    if (!this.isPlaying || !this.ctx) return;

    const track = this.getCurrentTrack();
    const now = this.ctx.currentTime + 0.015;
    const stepsPerChord = track.pattern.length;
    const stepInChord = this.stepCount % stepsPerChord;

    const chordIdx = Math.floor(this.stepCount / stepsPerChord) % track.chords.length;
    const chord = track.chords[chordIdx];
    const chordDuration = (track.tempoMs * stepsPerChord) / 1000;

    // 1. Cabeça do compasso: Contrabaixo + Seção de Cordas ou Coral Vocal
    if (stepInChord === 0) {
      this._playContrabass(chord[0] * 0.5, chordDuration * 0.98, now);
      if (track.padEngine === 'ethereal-choir') {
        this._playChoirPad(chord, chordDuration * 1.08, now);
      } else {
        this._playSymphonicStrings(chord, chordDuration * 1.08, track.cutoff, now);
      }
    }

    // 2. Arpejo Orquestral Principal
    const noteIndex = track.pattern[stepInChord];
    const freq = chord[noteIndex % chord.length];
    const pan = ((noteIndex / Math.max(1, chord.length - 1)) - 0.5) * 1.25;
    const noteDuration = (track.tempoMs * 2.5) / 1000;

    this._playLeadVoice(freq, track, noteDuration, pan, now);

    // 3. Contraponto Melódico Expressivo (uma oitava acima nos tempos líricos)
    if (track.counterMelody) {
      const cmIdx = track.counterMelody[stepInChord];
      if (typeof cmIdx === 'number' && cmIdx >= 0) {
        const cmFreq = chord[cmIdx % chord.length] * 2;
        this._playCounterMelody(cmFreq, noteDuration * 1.6, -pan * 0.75, now);
      }
    }

    this.stepCount++;
  }

  _playContrabass(freq, duration, startTime) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const bowHarmonic = this.ctx.createGain();
    const env = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, startTime);
    bowHarmonic.gain.value = 0.14;

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(0.24, startTime + 0.22);
    env.gain.setValueAtTime(0.20, startTime + Math.max(0.25, duration * 0.68));
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(env);
    osc2.connect(bowHarmonic);
    bowHarmonic.connect(env);
    env.connect(this.subBus);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.08);
    osc2.stop(startTime + duration + 0.08);
  }

  /**
   * Seção de Cordas Sinfônicas com Vibrato Assíncrono
   */
  _playSymphonicStrings(chord, duration, cutoff, startTime) {
    const voices = chord.slice(0, 4);
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.Q.value = 1.0;
    lpf.frequency.setValueAtTime(cutoff * 0.65, startTime);
    lpf.frequency.linearRampToValueAtTime(cutoff * 1.25, startTime + duration * 0.45);
    lpf.frequency.exponentialRampToValueAtTime(Math.max(240, cutoff * 0.62), startTime + duration);

    const env = this.ctx.createGain();
    const attack = Math.min(0.85, duration * 0.30);
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(0.072, startTime + attack);
    env.gain.setValueAtTime(0.065, startTime + Math.max(attack + 0.05, duration * 0.72));
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.45);

    lpf.connect(env);
    env.connect(this.stringsBus);

    voices.forEach((freq, idx) => {
      const pairs = [
        { detune: -8, pan: -0.6, vibRate: 4.9 + idx * 0.31 },
        { detune:  8, pan:  0.6, vibRate: 5.4 + idx * 0.27 }
      ];

      for (const p of pairs) {
        const osc = this.ctx.createOscillator();
        const panner = this.ctx.createStereoPanner();
        const vib = this.ctx.createOscillator();
        const vibDepth = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.detune.setValueAtTime(p.detune, startTime);
        panner.pan.setValueAtTime(p.pan, startTime);

        // Vibrato natural do arco entra suavemente após o ataque
        vib.type = 'sine';
        vib.frequency.setValueAtTime(p.vibRate, startTime);
        vibDepth.gain.setValueAtTime(0.0, startTime);
        vibDepth.gain.linearRampToValueAtTime(freq * 0.0045, startTime + attack + 0.35);

        vib.connect(vibDepth);
        vibDepth.connect(osc.frequency);

        osc.connect(panner);
        panner.connect(lpf);

        osc.start(startTime);
        vib.start(startTime);
        osc.stop(startTime + duration + 0.55);
        vib.stop(startTime + duration + 0.55);
      }
    });
  }

  /**
   * Coral Vocal Etéreo (Síntese Source-Filter com 3 Formantes de Vogal)
   */
  _playChoirPad(chord, duration, startTime) {
    const voices = chord.slice(0, 4);
    const vowelFormants = [
      { freq: 620,  Q: 5.5, gain: 0.90 },
      { freq: 1050, Q: 7.5, gain: 0.65 },
      { freq: 2550, Q: 9.0, gain: 0.30 }
    ];

    const choirMix = this.ctx.createGain();
    const env = this.ctx.createGain();
    const attack = Math.min(0.95, duration * 0.34);

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(0.16, startTime + attack);
    env.gain.setValueAtTime(0.14, startTime + Math.max(attack + 0.05, duration * 0.72));
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.5);

    for (const vf of vowelFormants) {
      const bp = this.ctx.createBiquadFilter();
      const fg = this.ctx.createGain();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(vf.freq, startTime);
      bp.Q.value = vf.Q;
      fg.gain.value = vf.gain;

      choirMix.connect(bp);
      bp.connect(fg);
      fg.connect(env);
    }

    env.connect(this.choirBus);

    voices.forEach((freq, idx) => {
      const singers = [-10, 0, 10];
      singers.forEach((detune, sIdx) => {
        const osc = this.ctx.createOscillator();
        const panner = this.ctx.createStereoPanner();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.detune.setValueAtTime(detune + idx * 1.4, startTime);
        panner.pan.setValueAtTime((sIdx - 1) * 0.65, startTime);

        osc.connect(panner);
        panner.connect(choirMix);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.6);
      });
    });
  }

  _playLeadVoice(freq, track, duration, pan, startTime) {
    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), startTime);

    if (track.leadEngine === 'karplus-harp') {
      const buf = this._getKarplusBuffer(freq, 0.66, Math.max(1.8, duration * 1.6));
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();

      src.buffer = buf;
      gain.gain.setValueAtTime(0.24, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.max(1.4, duration * 1.5));

      src.connect(gain);
      gain.connect(panner);
      panner.connect(this.soloBus);
      src.start(startTime);
      return;
    }

    if (track.leadEngine === 'warm-horn') {
      // Trompa / Metal Sinfônico com abertura suave de filtro
      const vcf = this.ctx.createBiquadFilter();
      vcf.type = 'lowpass';
      vcf.Q.value = 1.8;
      vcf.frequency.setValueAtTime(freq * 1.2, startTime);
      vcf.frequency.linearRampToValueAtTime(Math.min(3400, freq * 4.2), startTime + duration * 0.35);
      vcf.frequency.exponentialRampToValueAtTime(freq * 1.4, startTime + duration);

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(0.085, startTime + 0.09);
      env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 1.15);

      for (const d of [-5, 5]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.detune.setValueAtTime(d, startTime);
        osc.connect(vcf);
        osc.start(startTime);
        osc.stop(startTime + duration * 1.2 + 0.05);
      }

      vcf.connect(env);
      env.connect(panner);
      panner.connect(this.soloBus);
      return;
    }

    if (track.leadEngine === 'harmonic-glass') {
      const partials = [
        { mult: 1, gain: 0.11, decay: 1.0 },
        { mult: 2, gain: 0.04, decay: 0.65 },
        { mult: 3, gain: 0.016, decay: 0.4 }
      ];
      for (const p of partials) {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * p.mult, startTime);

        env.gain.setValueAtTime(0.0001, startTime);
        env.gain.linearRampToValueAtTime(p.gain, startTime + 0.025);
        env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * p.decay);

        osc.connect(env);
        env.connect(panner);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.08);
      }
      panner.connect(this.soloBus);
      return;
    }

    // Padrão 'fm-celesta': Sinos harmônicos FM cristalinos
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const env = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, startTime);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.0, startTime);

    modGain.gain.setValueAtTime(freq * 1.4, startTime);
    modGain.gain.exponentialRampToValueAtTime(0.4, startTime + duration * 0.45);

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(0.13, startTime + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(env);
    env.connect(panner);
    panner.connect(this.soloBus);

    carrier.start(startTime);
    mod.start(startTime);
    carrier.stop(startTime + duration + 0.08);
    mod.stop(startTime + duration + 0.08);
  }

  _playCounterMelody(freq, duration, pan, startTime) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, pan)), startTime);

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(0.048, startTime + 0.09);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(env);
    env.connect(panner);
    panner.connect(this.soloBus);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.08);
  }

  triggerDimensionChime(exp) {
    if (!this.ctx || !this.isPlaying) return;
    const track = this.getCurrentTrack();
    const stepsPerChord = track.pattern.length;
    const chordIdx = Math.floor(this.stepCount / stepsPerChord) % track.chords.length;
    const chord = track.chords[chordIdx];
    const baseNote = chord[exp % chord.length] * 2;
    const now = this.ctx.currentTime;

    // Arpejo duplo de harpa Karplus-Strong ao atravessar dimensões
    const buf1 = this._getKarplusBuffer(baseNote, 0.72, 2.2);
    const buf2 = this._getKarplusBuffer(baseNote * 1.5, 0.75, 2.4);

    [
      { buf: buf1, pan: -0.6, delay: 0 },
      { buf: buf2, pan:  0.6, delay: 0.065 }
    ].forEach((item) => {
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      src.buffer = item.buf;
      panner.pan.setValueAtTime(item.pan, now + item.delay);
      gain.gain.setValueAtTime(0.20, now + item.delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + item.delay + 2.0);
      src.connect(gain);
      gain.connect(panner);
      panner.connect(this.soloBus);
      src.start(now + item.delay);
    });
  }
}