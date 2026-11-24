const BPM = 138;
const BEAT_SEC = 60 / BPM;
const STEP_SEC = BEAT_SEC / 4; // 16ª nota (~0.1087s)
export const TOTAL_BARS = 128;
export const TOTAL_DURATION = TOTAL_BARS * 16 * STEP_SEC; // ~222.6s (3m42s)

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// ============================================================================
// PARTITURA ORIGINAL EM RÉ# MENOR (D#5=75, F5=77, F#5=78, G#5=80, A#5=82, B5=83, C#6=85, D#6=87)
// Cada entrada: [step_no_bloco_de_8_compassos (0..127), nota_midi, duracao_em_steps]
// ============================================================================

// Tema Instrumental / Refrão Principal (8 compassos = 128 steps)
const MAIN_HOOK_MELODY = [
  // Compasso 1 (D#m): D#5 F5 F#5 G#5 | A#5 D#6 C#6
  [0, 75, 2], [2, 77, 2], [4, 78, 2], [6, 80, 2],
  [8, 82, 4], [12, 87, 2], [14, 85, 2],

  // Compasso 2 (B): A#5 D#5 | A#5 G#5 F#5 F5
  [16, 82, 4], [20, 75, 4],
  [24, 82, 2], [26, 80, 2], [28, 78, 2], [30, 77, 2],

  // Compasso 3 (C#): D#5 F5 F#5 G#5 | A#5 G#5 F#5
  [32, 75, 2], [34, 77, 2], [36, 78, 2], [38, 80, 2],
  [40, 82, 4], [44, 80, 2], [46, 78, 2],

  // Compasso 4 (D#m - 1ª terminação): F5 D#5 F5 F#5 | F5 D#5 C#5 F5
  [48, 77, 2], [50, 75, 2], [52, 77, 2], [54, 78, 2],
  [56, 77, 2], [58, 75, 2], [60, 73, 2], [62, 77, 2],

  // Compasso 5 (D#m): D#5 F5 F#5 G#5 | A#5 D#6 C#6
  [64, 75, 2], [66, 77, 2], [68, 78, 2], [70, 80, 2],
  [72, 82, 4], [76, 87, 2], [78, 85, 2],

  // Compasso 6 (B): A#5 D#5 | A#5 G#5 F#5 F5
  [80, 82, 4], [84, 75, 4],
  [88, 82, 2], [90, 80, 2], [92, 78, 2], [94, 77, 2],

  // Compasso 7 (C#): D#5 F5 F#5 G#5 | A#5 G#5 F#5
  [96, 75, 2], [98, 77, 2], [100, 78, 2], [102, 80, 2],
  [104, 82, 4], [108, 80, 2], [110, 78, 2],

  // Compasso 8 (A#m -> D#m - 2ª terminação): F5 F#5 G#5 A#5 | D#5
  [112, 77, 2], [114, 78, 2], [116, 80, 2], [118, 82, 2],
  [120, 75, 8]
];

// Verso ("Nagareteku toki no naka de demo / kedarusa ga hora guruguru mawatte...")
const VERSE_MELODY = [
  // Compassos 1-2: "Na-ga-re-te-ku to-ki no na-ka de de-mo"
  [0, 70, 2], [2, 75, 2], [4, 77, 2], [6, 78, 2],
  [8, 80, 3], [11, 78, 3], [14, 77, 2],
  [16, 75, 2], [18, 77, 2], [20, 78, 2], [22, 77, 2],
  [24, 75, 3], [27, 73, 3], [30, 70, 2],

  // Compassos 3-4: "ke-da-ru-sa ga ho-ra gu-ru-gu-ru ma-wat-te"
  [32, 70, 2], [34, 75, 2], [36, 77, 2], [38, 78, 2],
  [40, 80, 2], [42, 82, 2], [44, 80, 2], [46, 78, 2],
  [48, 77, 3], [51, 78, 3], [54, 80, 2],
  [56, 82, 6],

  // Compassos 5-6: "wa-ta-shi ka-ra ha-na-re-ru ko-ko-ro mo"
  [64, 70, 2], [66, 75, 2], [68, 77, 2], [70, 78, 2],
  [72, 80, 3], [75, 78, 3], [78, 77, 2],
  [80, 75, 2], [82, 77, 2], [84, 78, 2], [86, 77, 2],
  [88, 75, 3], [91, 73, 3], [94, 75, 2],

  // Compassos 7-8: "mi-e-na-i wa so-u shi-ra-na-i?"
  [96, 71, 2], [98, 73, 2], [100, 75, 2], [102, 77, 2],
  [104, 78, 3], [107, 77, 3], [110, 75, 2],
  [112, 73, 2], [114, 75, 2], [116, 77, 2], [118, 73, 2],
  [120, 75, 6]
];

// Pré-Refrão ("Yume miteru? Nani mo mitenai? / Kataru mo muda na jibun no kotoba...")
const PRECHORUS_MELODY = [
  // Compasso 1 (B): "Yu-me mi-te-ru? Na-ni mo mi-te-na-i?"
  [0, 78, 2], [2, 77, 2], [4, 75, 2], [6, 77, 2],
  [8, 78, 2], [10, 80, 2], [12, 82, 4],

  // Compasso 2 (C#): "Ka-ta-ru mo mu-da na ji-bun no ko-to-ba"
  [16, 80, 2], [18, 78, 2], [20, 77, 2], [22, 78, 2],
  [24, 80, 2], [26, 82, 2], [28, 83, 4],

  // Compasso 3 (D#m): "Ka-na-shi-mu nan-te tsu-ka-re-ru da-ke yo"
  [32, 82, 2], [34, 80, 2], [36, 78, 2], [38, 80, 2],
  [40, 82, 2], [42, 83, 2], [44, 85, 4],

  // Compasso 4 (D#m): "Na-ni mo kan-ji-zu su-go-se-re-ba i-i no"
  [48, 83, 2], [50, 82, 2], [52, 80, 2], [54, 78, 2],
  [56, 77, 4], [60, 75, 4],

  // Compasso 5 (B): "To-ma-dou ko-to-ba a-ta-e-ra-re-te mo"
  [64, 78, 2], [66, 77, 2], [68, 75, 2], [70, 77, 2],
  [72, 78, 2], [74, 80, 2], [76, 82, 4],

  // Compasso 6 (C#): "Ji-bun no ko-ko-ro ta-da u-wa-no-so-ra"
  [80, 80, 2], [82, 78, 2], [84, 77, 2], [86, 78, 2],
  [88, 80, 2], [90, 82, 2], [92, 83, 4],

  // Compasso 7 (A#m): "Mo-shi wa-ta-shi ka-ra u-go-ku no na-ra-ba"
  [96, 85, 2], [98, 83, 2], [100, 82, 2], [102, 83, 2],
  [104, 85, 2], [106, 87, 2], [108, 89, 4],

  // Compasso 8 (A#7 -> Explosão para o Refrão): "Su-be-te ka-e-ru no na-ra ku-ro ni su-ru!"
  [112, 90, 2], [114, 89, 2], [116, 87, 2], [118, 85, 2],
  [120, 87, 4], [124, 82, 4]
];

// Ponte Solo Touhou / ZUN-style (8 compassos em semicolcheias)
const BRIDGE_SOLO_MELODY = [
  // Compasso 1 (B)
  [0, 87, 2], [2, 85, 2], [4, 82, 2], [6, 83, 2],
  [8, 85, 2], [10, 87, 2], [12, 89, 2], [14, 90, 2],
  // Compasso 2 (C#)
  [16, 89, 2], [18, 87, 2], [20, 85, 2], [22, 83, 2],
  [24, 85, 4], [28, 80, 4],
  // Compasso 3 (D#m)
  [32, 82, 2], [34, 83, 2], [36, 85, 2], [38, 87, 2],
  [40, 90, 3], [43, 89, 3], [46, 87, 2],
  // Compasso 4 (D#m)
  [48, 85, 2], [50, 82, 2], [52, 80, 2], [54, 78, 2],
  [56, 82, 6], [62, 85, 2],
  // Compasso 5 (B)
  [64, 87, 2], [66, 89, 2], [68, 90, 2], [70, 89, 2],
  [72, 87, 2], [74, 85, 2], [76, 83, 2], [78, 82, 2],
  // Compasso 6 (C#)
  [80, 83, 2], [82, 85, 2], [84, 87, 2], [86, 89, 2],
  [88, 90, 4], [92, 92, 4],
  // Compasso 7 (A#m)
  [96, 94, 3], [99, 92, 3], [102, 90, 2],
  [104, 89, 2], [106, 87, 2], [108, 85, 2], [110, 83, 2],
  // Compasso 8 (A#7 -> Refrão Final)
  [112, 82, 2], [114, 85, 2], [116, 87, 2], [118, 89, 2],
  [120, 90, 4], [124, 87, 4]
];

// Progressão principal: | D#m | B | C# | D#m | D#m | B | C# | A#m-D#m |
const MAIN_CHORDS = [
  { root: 39, pad: [63, 66, 70], arp: [63, 66, 70, 75] }, // D#m
  { root: 35, pad: [59, 63, 66], arp: [59, 63, 66, 71] }, // B
  { root: 37, pad: [61, 65, 68], arp: [61, 65, 68, 73] }, // C#
  { root: 39, pad: [63, 66, 70], arp: [63, 66, 70, 75] }, // D#m
  { root: 39, pad: [63, 66, 70], arp: [63, 66, 70, 75] }, // D#m
  { root: 35, pad: [59, 63, 66], arp: [59, 63, 66, 71] }, // B
  { root: 37, pad: [61, 65, 68], arp: [61, 65, 68, 73] }, // C#
  { root: 34, pad: [58, 61, 65], arp: [58, 61, 65, 70] }  // A#m -> D#m
];

// Progressão de tensão do Pré-Refrão e Ponte: | B | C# | D#m | D#m | B | C# | A#m | A#7 |
const TENSION_CHORDS = [
  { root: 35, pad: [59, 63, 66], arp: [59, 63, 66, 71] }, // B
  { root: 37, pad: [61, 65, 68], arp: [61, 65, 68, 73] }, // C#
  { root: 39, pad: [63, 66, 70], arp: [63, 66, 70, 75] }, // D#m
  { root: 39, pad: [63, 66, 70], arp: [63, 66, 70, 75] }, // D#m
  { root: 35, pad: [59, 63, 66], arp: [59, 63, 66, 71] }, // B
  { root: 37, pad: [61, 65, 68], arp: [61, 65, 68, 73] }, // C#
  { root: 34, pad: [58, 61, 65], arp: [58, 61, 65, 70] }, // A#m
  { root: 34, pad: [58, 62, 65], arp: [58, 62, 65, 70] }  // A#7 (dominante)
];

// Ostinato clássico da Intro em D# menor
const INTRO_OSTINATO = [75, 70, 78, 70, 80, 70, 78, 70, 75, 70, 77, 70, 78, 70, 77, 70];

export class BadAppleAudioSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.dryBus = null;
    this.reverbSend = null;
    this.delaySend = null;
    this.noiseBuffer = null;

    this.isPlaying = false;
    this.startTime = 0;
    this.pauseOffset = 0;
    this.nextStep = 0;
    this.schedulerTimer = null;
    this.volume = 0.68;

    this.bassEnergy = 0;
    this.leadEnergy = 0;
  }

  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain -> Compressor/Limiter -> Saída
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 4.5;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.16;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.dryBus = this.ctx.createGain();
      this.dryBus.gain.value = 0.92;
      this.dryBus.connect(this.masterGain);

      // Reverb Algorítmico Estéreo (ConvolverNode) para profundidade de sala
      const convolver = this.ctx.createConvolver();
      convolver.buffer = this._createReverbImpulse(1.65, 2.8);
      this.reverbSend = this.ctx.createGain();
      this.reverbSend.gain.value = 0.24;
      this.reverbSend.connect(convolver);
      convolver.connect(this.masterGain);

      // Delay Estéreo em Colcheia Pontuada (3 * STEP_SEC) para estilo Eurobeat/Touhou
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.value = STEP_SEC * 3;
      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.value = 0.28;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 2600;

      this.delaySend = this.ctx.createGain();
      this.delaySend.gain.value = 0.22;
      this.delaySend.connect(delay);
      delay.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delay);
      delayFilter.connect(this.masterGain);

      // Buffer de ruído branco para bateria e pratos
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 1.5;
      this.noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _createReverbImpulse(duration, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, decay);
        channelData[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return impulse;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  start(offsetSec = 0) {
    this._ensureContext();
    this.stopSchedulerOnly();
    this.pauseOffset = Math.max(0, Math.min(TOTAL_DURATION - 0.1, offsetSec));
    this.startTime = this.ctx.currentTime - this.pauseOffset;
    this.nextStep = Math.floor(this.pauseOffset / STEP_SEC);
    this.isPlaying = true;

    this._scheduleLoop();
    this.schedulerTimer = setInterval(() => this._scheduleLoop(), 25);
  }

  seek(timeSec) {
    const clamped = Math.max(0, Math.min(TOTAL_DURATION - 0.1, timeSec));
    if (this.isPlaying) {
      this.start(clamped);
    } else {
      this.pauseOffset = clamped;
      this.nextStep = Math.floor(clamped / STEP_SEC);
    }
  }

  stopSchedulerOnly() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  stop() {
    this.isPlaying = false;
    this.stopSchedulerOnly();
    this.pauseOffset = 0;
    this.nextStep = 0;
    this.bassEnergy = 0;
    this.leadEnergy = 0;
  }

  getCurrentTime() {
    if (!this.isPlaying || !this.ctx) return this.pauseOffset;
    return Math.min(TOTAL_DURATION, Math.max(0, this.ctx.currentTime - this.startTime));
  }

  getSectionName(bar) {
    if (bar < 8) return 'Intro — Maçã & Yin-Yang';
    if (bar < 24) return 'Tema Principal — Reimu & Marisa';
    if (bar < 40) return 'Verso 1 — Sakuya & Relógio';
    if (bar < 48) return 'Pré-Refrão 1 — Irmãs Scarlet';
    if (bar < 64) return 'Refrão 1 — Danmaku Kaleidoscope';
    if (bar < 80) return 'Verso 2 — Youmu & Yuyuko';
    if (bar < 88) return 'Pré-Refrão 2 — Fronteira de Yukari';
    if (bar < 104) return 'Refrão 2 — Eientei & Lua Cheia';
    if (bar < 112) return 'Ponte Solo — Touhou ZUN Synth';
    return 'Refrão Final — A Mordida na Maçã';
  }

  updateVisualEnergy(dt) {
    this.bassEnergy = Math.max(0, this.bassEnergy - dt * 4.5);
    this.leadEnergy = Math.max(0, this.leadEnergy - dt * 3.5);
    return { bass: this.bassEnergy, mid: this.leadEnergy };
  }

  _scheduleLoop() {
    if (!this.isPlaying || !this.ctx) return;

    const horizon = this.ctx.currentTime + 0.16;
    const totalSteps = TOTAL_BARS * 16;

    while (this.startTime + this.nextStep * STEP_SEC < horizon) {
      if (this.nextStep >= totalSteps) {
        this.isPlaying = false;
        this.stopSchedulerOnly();
        break;
      }
      const when = this.startTime + this.nextStep * STEP_SEC;
      this._scheduleStep(this.nextStep, when);
      this.nextStep++;
    }
  }

  _scheduleStep(step, when) {
    const bar = Math.floor(step / 16);
    const barStep = step % 16;
    const blockStep = step % 128;

    const isPreChorus = (bar >= 40 && bar < 48) || (bar >= 80 && bar < 88);
    const isBridge = bar >= 104 && bar < 112;
    const isChorus =
      (bar >= 48 && bar < 64) ||
      (bar >= 88 && bar < 104) ||
      (bar >= 112 && bar < 127);
    const isTheme = bar >= 8 && bar < 24;
    const isVerse = (bar >= 24 && bar < 40) || (bar >= 64 && bar < 80);

    const chordTable = isPreChorus || isBridge ? TENSION_CHORDS : MAIN_CHORDS;
    const chord = chordTable[bar % 8];

    // --- 1. Prato Crash nas transições de seção ---
    if (barStep === 0 && bar >= 8 && bar % 8 === 0 && bar < 127) {
      this._playCrash(when, isChorus || isTheme ? 0.22 : 0.14);
    }

    // --- 2. Bateria Eurobeat (Kick, Snare, Hi-Hat) ---
    if (bar >= 4 && bar < 127) {
      // Bumbo 4-on-the-floor
      if (barStep % 4 === 0 && (bar >= 8 || barStep === 0 || barStep === 8)) {
        const kickVol = isChorus ? 0.56 : isTheme ? 0.50 : 0.40;
        this._playKick(when, kickVol);
        const delayMs = Math.max(0, (when - this.ctx.currentTime) * 1000);
        setTimeout(() => { this.bassEnergy = 1.0; }, delayMs);
      }

      // Caixa nos tempos 2 e 4 + virada crescente antes dos refrões
      if (bar >= 8) {
        if (barStep === 4 || barStep === 12) {
          this._playSnare(when, isChorus ? 0.34 : 0.27);
        } else if ((bar === 47 || bar === 87 || bar === 111) && barStep >= 8 && barStep % 2 === 0) {
          this._playSnare(when, 0.22 + (barStep - 8) * 0.032);
        }
      }

      // Hi-hat contratempo em estéreo
      if (bar >= 8 && barStep % 2 === 0) {
        const isOffbeat = barStep % 4 === 2;
        this._playHat(when, isOffbeat ? 0.13 : 0.045, isOffbeat ? 0.28 : -0.22);
      }
    }

    // --- 3. Baixo Oitavado (Sub + Saw Bass) ---
    if (bar >= 4 && bar < 127 && barStep % 2 === 0) {
      const octaveBoost = barStep % 4 === 2 ? 12 : 0;
      const bassGain = bar < 8 ? 0.16 : isChorus ? 0.30 : 0.24;
      this._playBass(when, midiToFreq(chord.root + octaveBoost), STEP_SEC * 1.75, bassGain);
    }

    // --- 4. Pad Harmônico Estéreo (início de cada compasso) ---
    if (bar >= 8 && bar < 127 && barStep === 0) {
      const padGain = isChorus ? 0.075 : isVerse || isPreChorus ? 0.06 : 0.04;
      this._playChordPad(when, chord.pad, STEP_SEC * 15.5, padGain);
    }

    // --- 5. Intro Ostinato ou Arpejo Espacial ---
    if (bar < 8) {
      const note = INTRO_OSTINATO[barStep];
      const filterCutoff = 700 + (bar * 16 + barStep) * 26;
      const pan = Math.sin(step * 0.35) * 0.55;
      this._playIntroPluck(when, midiToFreq(note), STEP_SEC * 1.15, 0.17, filterCutoff, pan);
      if (barStep % 4 === 0) {
        const delayMs = Math.max(0, (when - this.ctx.currentTime) * 1000);
        setTimeout(() => { this.leadEnergy = 0.65; }, delayMs);
      }
      return;
    }

    if (bar < 127) {
      const arpNote = chord.arp[barStep % 4] + (barStep >= 8 ? 12 : 0);
      const arpGain = isChorus ? 0.065 : 0.055;
      const pan = Math.sin(step * 0.42) * 0.62;
      this._playArp(when, midiToFreq(arpNote), STEP_SEC * 0.9, arpGain, pan);
    }

    // --- 6. Melodia Principal & Contraponto Harmônico ---
    let melodyTable = null;
    if (isTheme || isChorus) melodyTable = MAIN_HOOK_MELODY;
    else if (isVerse) melodyTable = VERSE_MELODY;
    else if (isPreChorus) melodyTable = PRECHORUS_MELODY;
    else if (isBridge) melodyTable = BRIDGE_SOLO_MELODY;

    if (melodyTable) {
      for (let i = 0; i < melodyTable.length; i++) {
        const [evStep, midi, durSteps] = melodyTable[i];
        if (evStep === blockStep) {
          const dur = durSteps * STEP_SEC * 0.94;
          const isBigSection = isChorus || isTheme || isBridge;
          const leadGain = isChorus ? 0.25 : isTheme || isBridge ? 0.23 : 0.19;

          this._playSuperSawLead(when, midiToFreq(midi), dur, leadGain, isBigSection);

          // Na 2ª metade do Refrão, adiciona voz harmônica uma terça/quarta abaixo
          if (isChorus && bar % 16 >= 8) {
            this._playHarmonyVoice(when, midiToFreq(midi - 5), dur, leadGain * 0.45);
          }

          const delayMs = Math.max(0, (when - this.ctx.currentTime) * 1000);
          setTimeout(() => { this.leadEnergy = 1.0; }, delayMs);
          break;
        }
      }
    }

    // Nota final resolutiva no último compasso (127)
    if (bar === 127 && barStep === 0) {
      this._playSuperSawLead(when, midiToFreq(75), STEP_SEC * 14, 0.24, true);
      this._playChordPad(when, [51, 58, 63, 66], STEP_SEC * 15, 0.08);
    }
  }

  _playSuperSawLead(when, freq, dur, gainVal, superLayer) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.8;
    filter.frequency.setValueAtTime(4200, when);
    filter.frequency.exponentialRampToValueAtTime(1650, when + dur);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, when);
    env.gain.linearRampToValueAtTime(gainVal, when + 0.014);
    env.gain.setValueAtTime(gainVal * 0.88, when + Math.max(0.02, dur - 0.04));
    env.gain.exponentialRampToValueAtTime(0.001, when + dur + 0.04);

    // LFO sutil de vibrato em notas sustentadas
    let lfo = null;
    let lfoGain = null;
    if (dur >= STEP_SEC * 3.5) {
      lfo = this.ctx.createOscillator();
      lfo.frequency.value = 5.6;
      lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0, when);
      lfoGain.gain.linearRampToValueAtTime(freq * 0.006, when + dur * 0.45);
      lfo.connect(lfoGain);
      lfo.start(when);
      lfo.stop(when + dur + 0.05);
    }

    const detunes = superLayer ? [-9, 0, 9] : [-4, 4];
    const pans = superLayer ? [-0.35, 0, 0.35] : [-0.2, 0.2];

    for (let i = 0; i < detunes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 1 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, when);
      osc.detune.setValueAtTime(detunes[i], when);
      if (lfoGain) lfoGain.connect(osc.frequency);

      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(pans[i], when);

      osc.connect(panner);
      panner.connect(filter);
      osc.start(when);
      osc.stop(when + dur + 0.05);
    }

    filter.connect(env);
    env.connect(this.dryBus);
    env.connect(this.reverbSend);
    env.connect(this.delaySend);
  }

  _playHarmonyVoice(when, freq, dur, gainVal) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner();
    const env = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, when);
    panner.pan.setValueAtTime(0.45, when);

    env.gain.setValueAtTime(0.001, when);
    env.gain.linearRampToValueAtTime(gainVal, when + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, when + dur + 0.03);

    osc.connect(filter);
    filter.connect(panner);
    panner.connect(env);
    env.connect(this.dryBus);
    env.connect(this.reverbSend);

    osc.start(when);
    osc.stop(when + dur + 0.04);
  }

  _playChordPad(when, midiNotes, dur, gainVal) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1350, when);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, when);
    env.gain.linearRampToValueAtTime(gainVal, when + 0.18);
    env.gain.setValueAtTime(gainVal * 0.85, when + Math.max(0.2, dur - 0.25));
    env.gain.exponentialRampToValueAtTime(0.001, when + dur);

    midiNotes.forEach((m, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiToFreq(m), when);

      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(idx === 0 ? -0.5 : idx === 2 ? 0.5 : 0, when);

      osc.connect(panner);
      panner.connect(filter);
      osc.start(when);
      osc.stop(when + dur + 0.02);
    });

    filter.connect(env);
    env.connect(this.dryBus);
    env.connect(this.reverbSend);
  }

  _playIntroPluck(when, freq, dur, gainVal, cutoff, pan) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner();
    const env = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);

    filter.type = 'lowpass';
    filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(cutoff, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(260, cutoff * 0.35), when + dur);

    panner.pan.setValueAtTime(pan, when);

    env.gain.setValueAtTime(0.001, when);
    env.gain.linearRampToValueAtTime(gainVal, when + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, when + dur);

    osc.connect(filter);
    filter.connect(panner);
    panner.connect(env);
    env.connect(this.dryBus);
    env.connect(this.reverbSend);
    env.connect(this.delaySend);

    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  _playBass(when, freq, dur, gainVal) {
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);

    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq, when);

    filter.type = 'lowpass';
    filter.Q.value = 2.0;
    filter.frequency.setValueAtTime(640, when);
    filter.frequency.exponentialRampToValueAtTime(145, when + dur);

    gain.gain.setValueAtTime(gainVal, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryBus);

    osc.start(when);
    sub.start(when);
    osc.stop(when + dur + 0.01);
    sub.stop(when + dur + 0.01);
  }

  _playArp(when, freq, dur, gainVal, pan) {
    const osc = this.ctx.createOscillator();
    const panner = this.ctx.createStereoPanner();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, when);
    panner.pan.setValueAtTime(pan, when);

    gain.gain.setValueAtTime(gainVal, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

    osc.connect(panner);
    panner.connect(gain);
    gain.connect(this.dryBus);
    gain.connect(this.delaySend);

    osc.start(when);
    osc.stop(when + dur + 0.01);
  }

  _playKick(when, gainVal) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, when);
    osc.frequency.exponentialRampToValueAtTime(36, when + 0.13);

    gain.gain.setValueAtTime(gainVal, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.17);

    osc.connect(gain);
    gain.connect(this.dryBus);
    osc.start(when);
    osc.stop(when + 0.18);
  }

  _playSnare(when, gainVal) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850, when);
    filter.Q.value = 0.9;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryBus);
    gain.connect(this.reverbSend);
    src.start(when);
    src.stop(when + 0.16);
  }

  _playHat(when, gainVal, pan) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7800, when);

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, when);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.045);

    src.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.dryBus);
    src.start(when);
    src.stop(when + 0.05);
  }

  _playCrash(when, gainVal) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4200, when);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.85);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryBus);
    gain.connect(this.reverbSend);
    src.start(when);
    src.stop(when + 0.9);
  }
}