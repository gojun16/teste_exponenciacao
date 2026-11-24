import { TOTAL_DURATION } from './badAppleAudio.js';

const BPM = 138;
const BAR_SEC = (60 / BPM) * 4;

export class BadAppleAnimator {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 192;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    this.videoEl = null;
    this.useExternalVideo = false;
  }

  attachVideoFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Arquivo inválido.'));
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.src = url;
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = 'auto';
      vid.onloadeddata = () => {
        this.videoEl = vid;
        this.useExternalVideo = true;
        resolve(vid);
      };
      vid.onerror = (e) => reject(e);
    });
  }

  clearVideo() {
    if (this.videoEl) {
      this.videoEl.pause();
      URL.revokeObjectURL(this.videoEl.src);
      this.videoEl = null;
    }
    this.useExternalVideo = false;
  }

  /**
   * Renderiza o frame no instante `timeSec` na resolução (cols x rows)
   * e retorna o array RGBA pronto para mapear nos cubos 3D.
   */
sampleFrame(timeSec) {
    const w = this.canvas.width;   // Sempre 256
    const h = this.canvas.height;  // Sempre 192
    const ctx = this.ctx;

    if (this.useExternalVideo && this.videoEl && this.videoEl.readyState >= 2) {
      if (Math.abs(this.videoEl.currentTime - timeSec) > 0.12) {
        this.videoEl.currentTime = Math.min(this.videoEl.duration || timeSec, timeSec);
      }
      if (this.videoEl.paused) {
        this.videoEl.play().catch(() => {});
      }
      ctx.drawImage(this.videoEl, 0, 0, w, h);
      return;
    }

    const bar = timeSec / BAR_SEC;
    const beat = (timeSec / BAR_SEC) * 4;

    ctx.save();
    ctx.scale(w / 128, h / 96);

    if (bar < 8) {
      this._sceneIntroAppleYinYang(ctx, bar, beat);
    } else if (bar < 24) {
      this._sceneReimuAndMarisa(ctx, bar - 8, beat);
    } else if (bar < 40) {
      this._sceneSakuyaClockKnives(ctx, bar - 24, beat);
    } else if (bar < 48) {
      this._sceneScarletSisters(ctx, bar - 40, beat);
    } else if (bar < 64) {
      this._sceneDanmakuMandala(ctx, bar - 48, beat);
    } else if (bar < 80) {
      this._sceneYoumuSlashAndSakura(ctx, bar - 64, beat);
    } else if (bar < 88) {
      this._sceneYukariGaps(ctx, bar - 80, beat);
    } else if (bar < 104) {
      this._sceneLunarWavesAndMoon(ctx, bar - 88, beat);
    } else if (bar < 112) {
      this._sceneBridgeMontage(ctx, bar - 104, beat);
    } else {
      this._sceneFinalAppleBite(ctx, bar - 112, beat, timeSec);
    }

    ctx.restore();
  }

  _drawApple(ctx, cx, cy, r, color, bitten = false) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;

    // Corpo da maçã (dois lóbulos)
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.65);
    ctx.bezierCurveTo(-r * 1.15, -r * 1.1, -r * 1.35, r * 0.45, -r * 0.25, r * 0.95);
    ctx.quadraticCurveTo(0, r * 0.82, r * 0.25, r * 0.95);
    ctx.bezierCurveTo(r * 1.35, r * 0.45, r * 1.15, -r * 1.1, 0, -r * 0.65);
    ctx.fill();

    // Cabo e folha
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.15, r * 0.35, -r * 1.25);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(r * 0.32, -r * 0.95, r * 0.28, r * 0.13, -0.45, 0, Math.PI * 2);
    ctx.fill();

    // Mordida icônica (recorte na cor oposta)
    if (bitten) {
      ctx.fillStyle = color === '#ffffff' ? '#000000' : '#ffffff';
      ctx.beginPath();
      ctx.arc(r * 0.88, -r * 0.05, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawYinYang(ctx, cx, cy, r, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
    ctx.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2, false);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, r / 2, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, -r / 2, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawReimuSilhouette(ctx, x, y, scale, beat, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    const bob = Math.sin(beat * Math.PI) * 2.5;
    ctx.translate(0, bob);

    // Laço gigante icônico da Reimu
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(-14, -33);
    ctx.lineTo(-11, -18);
    ctx.closePath();
    ctx.moveTo(0, -24);
    ctx.lineTo(14, -33);
    ctx.lineTo(11, -18);
    ctx.closePath();
    ctx.fill();

    // Cabeça e cabelo esvoaçante
    ctx.beginPath();
    ctx.arc(0, -16, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, -15);
    ctx.quadraticCurveTo(-18, -2, -22 + Math.sin(beat * 2) * 3, 12);
    ctx.lineTo(-5, 6);
    ctx.fill();

    // Saia de Miko + mangas largas
    ctx.beginPath();
    ctx.moveTo(-5, -8);
    ctx.lineTo(5, -8);
    ctx.lineTo(16, 26);
    ctx.lineTo(-16, 26);
    ctx.closePath();
    ctx.fill();

    // Mangas
    const armWave = Math.sin(beat * Math.PI * 0.5) * 4;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(-22, 4 + armWave);
    ctx.lineTo(-15, 13 + armWave);
    ctx.lineTo(-4, 2);
    ctx.fill();

    // Bastão Gohei + papeis shide
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.lineTo(24, -18 - armWave);
    ctx.stroke();

    ctx.fillRect(21, -21 - armWave, 5, 4);
    ctx.fillRect(24, -17 - armWave, 5, 4);

    ctx.restore();
  }

  _drawMarisaBroom(ctx, x, y, scale, beat, color) {
    ctx.save();
    ctx.translate(x, y + Math.sin(beat * Math.PI) * 3);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    // Vassoura inclinada
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-30, 14);
    ctx.lineTo(26, -6);
    ctx.stroke();

    // Cerdas da vassoura
    ctx.beginPath();
    ctx.moveTo(-26, 13);
    ctx.lineTo(-40, 10);
    ctx.lineTo(-37, 22);
    ctx.closePath();
    ctx.fill();

    // Chapéu de bruxa pontudo
    ctx.beginPath();
    ctx.moveTo(-12, -16);
    ctx.lineTo(14, -18);
    ctx.lineTo(2, -35);
    ctx.lineTo(-10, -28);
    ctx.closePath();
    ctx.fill();

    // Cabeça e capa voando
    ctx.beginPath();
    ctx.arc(1, -11, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-2, -5);
    ctx.quadraticCurveTo(-18, -2, -26, 8 + Math.sin(beat * 3) * 3);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  _drawStar(ctx, cx, cy, r, rot, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.42;
      const a = (i * Math.PI) / 5;
      if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- CENA 1: Intro (Maçã -> Yin-Yang -> Explosão) ---
  _sceneIntroAppleYinYang(ctx, bar, beat) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 128, 96);

    if (bar < 4) {
      const t = bar / 4;
      const pulse = 1 + Math.sin(beat * Math.PI) * 0.08;
      this._drawApple(ctx, 64, 50, (8 + t * 18) * pulse, '#ffffff', false);
    } else {
      const t = (bar - 4) / 4;
      const radius = 22 + t * 65;
      this._drawYinYang(ctx, 64, 48, radius, t * Math.PI * 3);
    }
  }

  // --- CENA 2: Reimu & Marisa (Inversão Preto/Branco) ---
  _sceneReimuAndMarisa(ctx, relBar, beat) {
    if (relBar < 8) {
      const inverted = relBar >= 4;
      const bg = inverted ? '#ffffff' : '#000000';
      const fg = inverted ? '#000000' : '#ffffff';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 128, 96);

      // Chão ondulado
      ctx.fillStyle = fg;
      ctx.fillRect(0, 78, 128, 18);

      const rx = 25 + (relBar / 8) * 78;
      this._drawReimuSilhouette(ctx, rx, 52, 1.05, beat, fg);

      // Maçã voando na transição do compasso 4
      if (relBar > 3.2 && relBar < 4.8) {
        const ax = ((relBar - 3.2) / 1.6) * 140 - 6;
        this._drawApple(ctx, ax, 36, 9, fg, false);
      }
    } else {
      // Marisa voando na vassoura deixando rastro de estrelas
      const t = (relBar - 8) / 8;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 128, 96);

      const mx = 18 + t * 94;
      const my = 46 - Math.sin(t * Math.PI) * 14;

      for (let s = 0; s < 7; s++) {
        const st = t - s * 0.06;
        if (st > 0) {
          this._drawStar(ctx, 14 + st * 94, 50 - Math.sin(st * Math.PI) * 12 + (s % 2 ? 6 : -6), 4.5 - s * 0.4, beat + s, '#ffffff');
        }
      }
      this._drawMarisaBroom(ctx, mx, my, 1.05, beat, '#ffffff');
    }
  }

  // --- CENA 3: Sakuya & Relógio + Facas ---
  _sceneSakuyaClockKnives(ctx, relBar, beat) {
    const inverted = Math.floor(relBar / 4) % 2 === 1;
    const bg = inverted ? '#ffffff' : '#000000';
    const fg = inverted ? '#000000' : '#ffffff';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 96);

    // Mostrador de relógio gigante girando
    ctx.save();
    ctx.translate(64, 48);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 + relBar * 0.25;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 31, Math.sin(a) * 31);
      ctx.lineTo(Math.cos(a) * 37, Math.sin(a) * 37);
      ctx.stroke();
    }

    // Ponteiros
    const hAngle = relBar * 0.7;
    const mAngle = relBar * 3.1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(hAngle) * 20, Math.sin(hAngle) * 20);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(mAngle) * 30, Math.sin(mAngle) * 30);
    ctx.stroke();
    ctx.restore();

    // Facas arremessadas cruzando a tela
    ctx.fillStyle = fg;
    for (let k = 0; k < 8; k++) {
      const progress = ((beat * 0.45 + k * 0.13) % 1);
      const kx = progress * 150 - 11;
      const ky = 14 + k * 9.5;
      ctx.beginPath();
      ctx.moveTo(kx + 9, ky);
      ctx.lineTo(kx - 5, ky - 2.2);
      ctx.lineTo(kx - 5, ky + 2.2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- CENA 4: Remilia & Flandre Scarlet ---
  _sceneScarletSisters(ctx, relBar, beat) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 128, 96);

    const wingSpan = 26 + Math.sin(beat * Math.PI) * 10 + relBar * 2.5;
    ctx.fillStyle = '#ffffff';

    // Asas de morcego simétricas
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(64, 44);
      ctx.quadraticCurveTo(64 + side * wingSpan * 0.6, 16, 64 + side * wingSpan, 28);
      ctx.quadraticCurveTo(64 + side * wingSpan * 0.85, 44, 64 + side * wingSpan * 0.65, 48);
      ctx.quadraticCurveTo(64 + side * wingSpan * 0.45, 58, 64 + side * wingSpan * 0.25, 54);
      ctx.closePath();
      ctx.fill();
    }

    // Silhueta central + cristais orbitando (Flandre)
    ctx.beginPath();
    ctx.arc(64, 34, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(58, 41);
    ctx.lineTo(70, 41);
    ctx.lineTo(77, 74);
    ctx.lineTo(51, 74);
    ctx.closePath();
    ctx.fill();

    for (let c = 0; c < 8; c++) {
      const a = (c / 8) * Math.PI * 2 + beat * 0.5;
      const r = 24 + (c % 2) * 8;
      this._drawStar(ctx, 64 + Math.cos(a) * r, 48 + Math.sin(a) * r * 0.7, 3.8, a, '#ffffff');
    }
  }

  // --- CENA 5: Refrão 1 — Mandala Danmaku Caleidoscópica ---
  _sceneDanmakuMandala(ctx, relBar, beat) {
    const phase = Math.floor(relBar / 4) % 2;
    const bg = phase === 0 ? '#000000' : '#ffffff';
    const fg = phase === 0 ? '#ffffff' : '#000000';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 96);

    ctx.save();
    ctx.translate(64, 48);
    ctx.rotate(beat * 0.22);

    const petals = 12;
    for (let ring = 1; ring <= 3; ring++) {
      const dist = ring * 13 + Math.sin(beat * Math.PI) * 3;
      const dir = ring % 2 === 0 ? -1 : 1;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + beat * 0.15 * dir;
        this._drawStar(ctx, Math.cos(a) * dist, Math.sin(a) * dist, 5.2 - ring * 0.7, a, fg);
      }
    }

    this._drawYinYang(ctx, 0, 0, 11 + Math.sin(beat * Math.PI) * 2, -beat * 0.6);
    ctx.restore();
  }

  // --- CENA 6: Youmu (Cortes de Katana) & Yuyuko (Pétalas de Cerejeira) ---
  _sceneYoumuSlashAndSakura(ctx, relBar, beat) {
    if (relBar < 8) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 128, 96);

      // Tela partida diagonalmente deslizando a cada 2 compassos
      const slashIdx = Math.floor(relBar / 2);
      const slide = ((relBar % 2) / 2) * 14;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (slashIdx % 2 === 0) {
        ctx.moveTo(0, 0);
        ctx.lineTo(128, 0);
        ctx.lineTo(128, 36 + slide);
        ctx.lineTo(0, 62 - slide);
      } else {
        ctx.moveTo(0, 96);
        ctx.lineTo(128, 96);
        ctx.lineTo(128, 56 - slide);
        ctx.lineTo(0, 32 + slide);
      }
      ctx.closePath();
      ctx.fill();

      // Brilho da lâmina
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 62 - slide);
      ctx.lineTo(128, 36 + slide);
      ctx.stroke();
    } else {
      // Pétalas e borboletas fantasma
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 96);

      ctx.fillStyle = '#000000';
      for (let i = 0; i < 24; i++) {
        const px = ((i * 29 + beat * 11) % 136) - 4;
        const py = ((i * 19 + beat * 8) % 104) - 4;
        ctx.beginPath();
        ctx.ellipse(px, py, 3.6, 1.8, beat + i, 0, Math.PI * 2);
        ctx.fill();
      }
      this._drawApple(ctx, 64, 48, 16 + Math.sin(beat * Math.PI) * 2, '#000000', false);
    }
  }

  // --- CENA 7: Yukari Yakumo (Fendas Dimensionais) ---
  _sceneYukariGaps(ctx, relBar, beat) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 128, 96);

    const gapOpen = Math.min(1, relBar / 4) * 26 + Math.sin(beat * Math.PI) * 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.quadraticCurveTo(64, 48 - gapOpen * 1.6, 128, 48);
    ctx.quadraticCurveTo(64, 48 + gapOpen * 1.6, 0, 48);
    ctx.fill();

    // Olho da fenda no centro
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(64, 48, 13, Math.max(2, gapOpen * 0.45), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(64, 48, Math.max(1.5, gapOpen * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }

  // --- CENA 8: Refrão 2 — Ondas Lunares & Lua Cheia ---
  _sceneLunarWavesAndMoon(ctx, relBar, beat) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 128, 96);

    // Lua cheia gigante pulsar no fundo
    const moonR = 24 + Math.sin(beat * Math.PI) * 2.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(64, 38, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Ondas senoidais lunares na parte inferior
    for (let row = 0; row < 4; row++) {
      ctx.fillStyle = row % 2 === 0 ? '#000000' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 96);
      for (let x = 0; x <= 128; x += 4) {
        const y = 56 + row * 9 + Math.sin(x * 0.09 + beat * 1.4 + row) * 4.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(128, 96);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- CENA 9: Ponte Solo (Cortes Rápidos a cada 2 Tempos) ---
  _sceneBridgeMontage(ctx, relBar, beat) {
    const cut = Math.floor(beat / 2) % 6;
    const inv = cut % 2 === 1;
    const bg = inv ? '#ffffff' : '#000000';
    const fg = inv ? '#000000' : '#ffffff';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 96);

    if (cut === 0) this._drawYinYang(ctx, 64, 48, 32, beat * 2);
    else if (cut === 1) this._drawReimuSilhouette(ctx, 64, 52, 1.35, beat, fg);
    else if (cut === 2) this._drawMarisaBroom(ctx, 68, 48, 1.35, beat, fg);
    else if (cut === 3) this._drawApple(ctx, 64, 50, 26, fg, false);
    else if (cut === 4) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + beat;
        this._drawStar(ctx, 64 + Math.cos(a) * 24, 48 + Math.sin(a) * 24, 6, a, fg);
      }
    } else {
      this._drawApple(ctx, 64, 50, 28, fg, true);
    }
  }

  // --- CENA 10: Refrão Final & Mordida Icônica na Maçã ---
  _sceneFinalAppleBite(ctx, relBar, beat, timeSec) {
    if (relBar < 10) {
      // Vórtice Yin-Yang acelerado
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 128, 96);
      this._drawYinYang(ctx, 64, 48, 36 + Math.sin(beat * Math.PI) * 4, beat * 0.9);
      this._drawApple(ctx, 64, 50, 13, '#000000', false);
    } else {
      // Final clássico: fundo branco, maçã preta recebe a mordida e dissolve
      const endProgress = Math.min(1, (timeSec - (TOTAL_DURATION - 10.5)) / 10.5);
      ctx.fillStyle = endProgress > 0.75 ? '#000000' : '#ffffff';
      ctx.fillRect(0, 0, 128, 96);

      const bitten = endProgress > 0.25;
      const appleColor = endProgress > 0.75 ? '#ffffff' : '#000000';
      const scaleR = 26 * (1 - Math.max(0, endProgress - 0.75) * 3.5);
      if (scaleR > 0.5) {
        this._drawApple(ctx, 64, 50, scaleR, appleColor, bitten);
      }
    }
  }
}