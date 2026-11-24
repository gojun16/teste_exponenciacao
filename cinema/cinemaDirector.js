import * as THREE from 'three';
import { CURIOSITIES } from './curiosities.js';

export class CinemaDirector {
  constructor({ engine, player, zCurve, instrument, physics, bannerEl }) {
    this.engine = engine;
    this.player = player;
    this.zCurve = zCurve;
    this.instrument = instrument;
    this.physics = physics;
    this.legacyBannerEl = bannerEl || document.getElementById('cinema-banner');

    this.active = false;
    this.paused = false;
    this.isTransitioning = false;
    this.transitionTimer = null;
    this.userDragging = false;
    this.dragResumeTimer = 0;

    // Shuffle Bag & Histórico
    this.bag = [];
    this.history = [];
    this.historyCursor = -1;
    this.currentScene = null;
    this.scenesPlayedCount = 0;

    // Temporizadores da cena
    this.sceneElapsed = 0;
    this.sceneDuration = 14;
    this.physicsStage = 0;

    // Estados interpolados suavemente (lerp)
    this.currentExplode = 0;
    this.targetExplode = 0;
    this.currentSlice = 1;
    this.targetSlice = 1;
    this.currentXW = 0;
    this.targetXW = 0;
    this.currentYW = 0;
    this.targetYW = 0;

    // Câmera orbital cinematográfica
    this.camTheta = 0.75;
    this.camPhi = 1.05;
    this.camRadius = 22;
    this.targetCamRadius = 22;
    this.camOrbitSpeed = 0.18;
    this.camTarget = new THREE.Vector3(0, 0, 0);

    // Rastreamento 3D -> 2D do Pop-up
    this.focusBlockIndex = -1;
    this.popupX = 36;
    this.popupY = Math.max(120, window.innerHeight - 290);
    this.popupInitialized = false;
    this._tmpMat4 = new THREE.Matrix4();
    this._tmpWorldPos = new THREE.Vector3();
    this._tmpProjVec = new THREE.Vector3();

    // Loop próprio garantido a 60fps
    this._rafId = null;
    this._lastRafTime = 0;
    this._lastUpdateStamp = -1;

    this._injectStyles();
    this._buildRootUI();

    this._onKeyDown = (e) => {
      if (!this.active) return;
      if (e.key === 'Escape') {
        const btnCinema = document.getElementById('btn-cinema');
        if (btnCinema) btnCinema.click();
        else this.stop(0);
      } else if (e.key === 'ArrowRight') {
        this.nextScene();
      } else if (e.key === 'ArrowLeft') {
        this.prevScene();
      } else if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        this.togglePause();
      }
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  _injectStyles() {
    if (document.getElementById('cinema-director-styles')) return;
    const style = document.createElement('style');
    style.id = 'cinema-director-styles';
    style.textContent = `
      .hud, .audio-hud {
        transition: opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1),
                    transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
      }
      body.cinema-mode-active .hud {
        opacity: 0 !important;
        transform: translateX(-28px);
        pointer-events: none !important;
      }
      body.cinema-mode-active .audio-hud {
        opacity: 0 !important;
        transform: translateX(28px);
        pointer-events: none !important;
      }

      /* Vinheta cinematográfica suave */
      #cinema-vignette {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 900;
        opacity: 0;
        background: radial-gradient(circle at center, transparent 54%, rgba(3, 6, 14, 0.68) 100%);
        transition: opacity 0.9s ease;
      }
      body.cinema-mode-active #cinema-vignette {
        opacity: 1;
      }
      body.cinema-mode-active.cinema-swapping #cinema-vignette {
        background: radial-gradient(circle at center, rgba(5, 9, 20, 0.36) 20%, rgba(3, 6, 14, 0.86) 100%);
      }

      /* Camada SVG para a linha guia 3D -> Pop-up */
      #cinema-tether-svg {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 1140;
        opacity: 0;
        transition: opacity 0.55s ease;
      }
      #cinema-tether-svg.is-visible {
        opacity: 1;
      }

      /* Barra flutuante discreta no canto superior direito */
      #cinema-top-controls {
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 1200;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(10, 15, 28, 0.72);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        color: #e8eefc;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: opacity 0.6s ease, transform 0.6s ease, visibility 0.6s ease;
      }
      body.cinema-mode-active #cinema-top-controls {
        opacity: 0.86;
        visibility: visible;
        transform: translateY(0);
      }
      body.cinema-mode-active #cinema-top-controls:hover {
        opacity: 1;
      }
      #cinema-top-controls button {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f1f5ff;
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease;
      }
      #cinema-top-controls button:hover {
        background: rgba(110, 168, 255, 0.25);
        border-color: rgba(110, 168, 255, 0.5);
      }
      #cinema-top-controls button.cinema-exit-btn {
        background: rgba(239, 68, 68, 0.24);
        border-color: rgba(239, 68, 68, 0.48);
        font-weight: 600;
        padding: 5px 13px;
      }
      #cinema-top-controls button.cinema-exit-btn:hover {
        background: rgba(239, 68, 68, 0.45);
      }
      #cinema-track-badge {
        max-width: 175px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 0 6px;
        color: #c4b5fd;
        font-size: 11px;
      }
      #cinema-counter {
        padding: 0 6px;
        color: rgba(226, 232, 240, 0.78);
        font-variant-numeric: tabular-nums;
      }

      /* Container posicionado via GPU (translate3d) seguindo o alvo 3D */
      #cinema-curiosity-card {
        position: fixed;
        left: 0;
        top: 0;
        width: min(420px, calc(100vw - 48px));
        z-index: 1150;
        pointer-events: none;
        will-change: transform;
      }

      /* Wrapper interno cuida exclusivamente do Fade-In / Fade-Out */
      .cm-card-inner {
        padding: 17px 20px 15px;
        border-radius: 16px;
        background: rgba(9, 13, 24, 0.80);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(125, 211, 252, 0.24);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.62), 0 0 24px rgba(56, 189, 248, 0.08);
        color: #f4f7ff;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: left;
        opacity: 0;
        visibility: hidden;
        transform: scale(0.95);
        transition: opacity 0.62s cubic-bezier(0.22, 1, 0.36, 1),
                    transform 0.62s cubic-bezier(0.22, 1, 0.36, 1),
                    visibility 0.62s ease;
      }
      #cinema-curiosity-card.is-visible .cm-card-inner {
        opacity: 1;
        visibility: visible;
        transform: scale(1);
      }

      .cm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 9px;
      }
      .cm-header-left {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-wrap: wrap;
      }
      .cm-category {
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: #7dd3fc;
        background: rgba(56, 189, 248, 0.14);
        border: 1px solid rgba(56, 189, 248, 0.32);
        padding: 2px 8px;
        border-radius: 999px;
      }
      .cm-active-tag {
        font-size: 9.5px;
        font-weight: 600;
        color: #fcd34d;
        background: rgba(251, 191, 36, 0.12);
        border: 1px solid rgba(251, 191, 36, 0.28);
        padding: 2px 7px;
        border-radius: 999px;
      }
      .cm-formula {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        font-weight: 700;
        color: #c4b5fd;
        background: rgba(167, 139, 250, 0.13);
        padding: 2px 8px;
        border-radius: 7px;
      }
      .cm-title {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.01em;
      }
      .cm-text {
        margin: 0 0 11px;
        font-size: 13px;
        line-height: 1.5;
        color: rgba(235, 241, 255, 0.9);
      }

      .cm-visual-cue {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 9px 11px;
        margin-bottom: 12px;
        border-radius: 10px;
        background: rgba(56, 189, 248, 0.09);
        border: 1px solid rgba(56, 189, 248, 0.24);
        font-size: 12px;
        line-height: 1.42;
        color: #dbeafe;
      }
      .cm-cue-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #38bdf8;
        box-shadow: 0 0 10px #38bdf8;
        margin-top: 4px;
        flex-shrink: 0;
        animation: cmPulse 2s infinite ease-in-out;
      }
      .cm-visual-cue strong {
        color: #7dd3fc;
        font-weight: 600;
      }

      @keyframes cmPulse {
        0%, 100% { transform: scale(0.9); opacity: 0.7; }
        50% { transform: scale(1.25); opacity: 1; }
      }

      .cm-progress-track {
        width: 100%;
        height: 3px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        overflow: hidden;
      }
      .cm-progress-fill {
        width: 0%;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #38bdf8, #a78bfa);
      }
    `;
    document.head.appendChild(style);
  }

  _buildRootUI() {
    if (!document.getElementById('cinema-vignette')) {
      const vig = document.createElement('div');
      vig.id = 'cinema-vignette';
      document.body.appendChild(vig);
    }

    if (!document.getElementById('cinema-tether-svg')) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'cinema-tether-svg';
      svg.innerHTML = `
        <defs>
          <linearGradient id="cmTetherGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#a78bfa" stop-opacity="0.75" />
          </linearGradient>
        </defs>
        <polyline id="cm-tether-line" fill="none" stroke="url(#cmTetherGrad)" stroke-width="1.6" stroke-dasharray="4 3" />
        <circle id="cm-target-ring" r="11" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.7" />
        <circle id="cm-target-dot" r="4" fill="#38bdf8" />
        <circle id="cm-card-dot" r="3.5" fill="#a78bfa" />
      `;
      document.body.appendChild(svg);
    }
    this.tetherSvg = document.getElementById('cinema-tether-svg');
    this.tetherLine = document.getElementById('cm-tether-line');
    this.targetRing = document.getElementById('cm-target-ring');
    this.targetDot = document.getElementById('cm-target-dot');
    this.cardDot = document.getElementById('cm-card-dot');

    if (!document.getElementById('cinema-top-controls')) {
      const bar = document.createElement('div');
      bar.id = 'cinema-top-controls';
      bar.innerHTML = `
        <span id="cinema-track-badge" title="Movimento Sinfônico Atual">♪ Sinfonia</span>
        <span id="cinema-counter">1 / ${CURIOSITIES.length}</span>
        <button type="button" id="cm-prev" title="Curiosidade Anterior (←)">⏮</button>
        <button type="button" id="cm-pause" title="Pausar/Retomar Cena (Espaço)">⏸</button>
        <button type="button" id="cm-next" title="Próxima Curiosidade (→)">⏭</button>
        <button type="button" id="cm-exit" class="cinema-exit-btn" title="Sair do Modo Cinema (ESC)">✕ Sair do Modo Cinema</button>
      `;
      document.body.appendChild(bar);

      bar.querySelector('#cm-prev').addEventListener('click', () => this.prevScene());
      bar.querySelector('#cm-pause').addEventListener('click', () => this.togglePause());
      bar.querySelector('#cm-next').addEventListener('click', () => this.nextScene());
      bar.querySelector('#cm-exit').addEventListener('click', () => {
        const btnCinema = document.getElementById('btn-cinema');
        if (btnCinema) btnCinema.click();
        else this.stop(0);
      });
    }

    if (!document.getElementById('cinema-curiosity-card')) {
      const card = document.createElement('div');
      card.id = 'cinema-curiosity-card';
      document.body.appendChild(card);
    }
    this.cardEl = document.getElementById('cinema-curiosity-card');
  }

  _startInternalLoop() {
    if (this._rafId !== null) return;
    this._lastRafTime = performance.now();
    const tick = (now) => {
      if (!this.active) {
        this._rafId = null;
        return;
      }
      const dt = Math.min((now - this._lastRafTime) / 1000, 0.1);
      this._lastRafTime = now;
      this.update(dt);
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _stopInternalLoop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _refillShuffleBag() {
    const indices = CURIOSITIES.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Evita duas cenas dinâmicas (com física pesada) seguidas
    for (let i = 1; i < indices.length - 1; i++) {
      const prev = CURIOSITIES[indices[i - 1]];
      const curr = CURIOSITIES[indices[i]];
      if (prev.pace === 'dynamic' && curr.pace === 'dynamic') {
        const swapIdx = indices.findIndex(
          (idx, k) => k > i && CURIOSITIES[idx].pace !== 'dynamic'
        );
        if (swapIdx !== -1) {
          [indices[i], indices[swapIdx]] = [indices[swapIdx], indices[i]];
        }
      }
    }

    if (this.currentScene && indices.length > 1) {
      if (CURIOSITIES[indices[0]].title === this.currentScene.title) {
        indices.push(indices.shift());
      }
    }

    this.bag = indices;
  }

  _drawNextIndex() {
    if (this.bag.length === 0) {
      this._refillShuffleBag();
    }
    return this.bag.shift();
  }

  _syncTrackBadge() {
    const badge = document.getElementById('cinema-track-badge');
    if (!badge || !this.player) return;
    const current = typeof this.player.getCurrentTrack === 'function'
      ? this.player.getCurrentTrack()
      : null;
    if (current?.title) {
      badge.textContent = `♪ ${current.title}`;
      badge.title = `Tocando agora: ${current.title}`;
    }
  }

  _advanceMusicTrack() {
    if (!this.player) return;
    const btnNext = document.getElementById('audio-next');
    if (btnNext) {
      btnNext.click();
    } else if (typeof this.player.nextTrack === 'function') {
      this.player.nextTrack();
    }
    this._syncTrackBadge();
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.paused = false;
    this.isTransitioning = false;
    this.popupInitialized = false;
    this.scenesPlayedCount = 0;
    this.history = [];
    this.historyCursor = -1;
    this._refillShuffleBag();

    if (this.legacyBannerEl) {
      this.legacyBannerEl.style.display = 'none';
    }

    const explodeInput = document.getElementById('explode-input');
    const sliceInput = document.getElementById('slice-input');
    const rotXWInput = document.getElementById('rot-xw-input');
    const rotYWInput = document.getElementById('rot-yw-input');
    this.currentExplode = parseFloat(explodeInput?.value) || 0;
    this.currentSlice = parseFloat(sliceInput?.value) || 1;
    this.currentXW = parseFloat(rotXWInput?.value) || 0;
    this.currentYW = parseFloat(rotYWInput?.value) || 0;

    this._syncCameraSphericalFromEngine();

    document.body.classList.add('cinema-mode-active');
    const pauseBtn = document.getElementById('cm-pause');
    if (pauseBtn) pauseBtn.textContent = '⏸';

    // Inicia ou avança a trilha sinfônica ao entrar no Modo Cinema
    if (this.player) {
      if (!this.player.isPlaying) {
        const btnPlay = document.getElementById('audio-play');
        if (btnPlay) btnPlay.click();
        else this.player.play();
      } else {
        this._advanceMusicTrack();
      }
      this._syncTrackBadge();
    }

    this._startInternalLoop();
    this.nextScene(true);
  }

  stop(restoreExplode = 0) {
    if (!this.active) return;
    this.active = false;
    this.paused = false;
    this.isTransitioning = false;
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    this._stopInternalLoop();

    document.body.classList.remove('cinema-mode-active', 'cinema-swapping');
    if (this.cardEl) this.cardEl.classList.remove('is-visible');
    if (this.tetherSvg) this.tetherSvg.classList.remove('is-visible');

    if (this.physics) this.physics.reset();
    if (this.zCurve && this.zCurve.visible) this.zCurve.reset();
    if (this.engine && !this.engine.cubesVisible) this.engine.setCubesVisible(true);

    if (this.instrument && this.instrument.scannerActive) {
      this.instrument.toggleScanner();
    }

    const btn4DSpin = document.getElementById('btn-4d-spin');
    if (this.engine?.hyper4D?.autoSpin) {
      this.engine.hyper4D.toggleAutoSpin();
    } else if (btn4DSpin?.classList.contains('active')) {
      btn4DSpin.click();
    }
    if (btn4DSpin) {
      btn4DSpin.classList.remove('active');
      btn4DSpin.textContent = 'Girar 4D (Auto)';
    }

    const filterSelect = document.getElementById('filter-select');
    const allVal = this._resolveFilterValue(filterSelect, 'all');
    if (filterSelect && allVal && filterSelect.value !== allVal) {
      filterSelect.value = allVal;
      filterSelect.dispatchEvent(new Event('input'));
    }

    this._setSliderValue('rot-xw-input', 0);
    this._setSliderValue('rot-yw-input', 0);
    this._setSliderValue('slice-input', 1);
    this._setSliderValue('explode-input', restoreExplode);
  }

  setUserDragging(isDragging) {
    this.userDragging = Boolean(isDragging);
    if (!this.userDragging && this.active) {
      this.dragResumeTimer = 1.6;
      this._syncCameraSphericalFromEngine();
    }
  }

  togglePause() {
    if (!this.active) return;
    this.paused = !this.paused;
    const pauseBtn = document.getElementById('cm-pause');
    if (pauseBtn) pauseBtn.textContent = this.paused ? '▶' : '⏸';
  }

  nextScene(immediate = false) {
    if (!this.active) return;
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (this.historyCursor < this.history.length - 1) {
      this.historyCursor++;
    } else {
      const nextIdx = this._drawNextIndex();
      this.history.push(nextIdx);
      this.historyCursor = this.history.length - 1;
    }

    const curiosity = CURIOSITIES[this.history[this.historyCursor]];
    this._transitionToCuriosity(curiosity, immediate);
  }

  prevScene() {
    if (!this.active) return;
    if (this.historyCursor > 0) {
      if (this.transitionTimer) {
        clearTimeout(this.transitionTimer);
        this.transitionTimer = null;
      }
      this.historyCursor--;
      const curiosity = CURIOSITIES[this.history[this.historyCursor]];
      this._transitionToCuriosity(curiosity, false);
    }
  }

  _transitionToCuriosity(curiosity, immediate = false) {
    if (immediate) {
      this.isTransitioning = false;
      this._applyCuriosity(curiosity);
      this._updateFloatingPopup(0.016, true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this.active && this.cardEl) this.cardEl.classList.add('is-visible');
          if (this.active && this.tetherSvg) this.tetherSvg.classList.add('is-visible');
        });
      });
      return;
    }

    this.isTransitioning = true;
    document.body.classList.add('cinema-swapping');
    if (this.cardEl) this.cardEl.classList.remove('is-visible');
    if (this.tetherSvg) this.tetherSvg.classList.remove('is-visible');
    this.targetExplode = 0;

    this.transitionTimer = setTimeout(() => {
      if (!this.active) return;
      this.transitionTimer = null;
      this.isTransitioning = false;

      this.currentExplode = 0;
      this._setSliderValue('explode-input', 0);

      this._applyCuriosity(curiosity);
      this._updateFloatingPopup(0.016, false);
      document.body.classList.remove('cinema-swapping');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this.active && this.cardEl) this.cardEl.classList.add('is-visible');
          if (this.active && this.tetherSvg) this.tetherSvg.classList.add('is-visible');
        });
      });
    }, 620);
  }

  _resolveFilterValue(filterSelect, desired) {
    if (!filterSelect) return null;
    const options = Array.from(filterSelect.options);
    if (!desired || desired === 'all') {
      const allOpt = options.find((o) => o.value === 'all' || o.value === 'none');
      return allOpt ? allOpt.value : (options[0]?.value ?? null);
    }
    if (desired === 'prime' || desired === 'primes') {
      const primeOpt = options.find(
        (o) => /prim/i.test(o.value) || /prim/i.test(o.textContent)
      );
      return primeOpt ? primeOpt.value : null;
    }
    const exact = options.find((o) => o.value === desired);
    return exact ? exact.value : null;
  }

  _applyCuriosity(curiosity) {
    this.currentScene = curiosity;
    this.sceneElapsed = 0;
    this.sceneDuration = curiosity.duration || 14;
    this.physicsStage = 0;
    this.scenesPlayedCount++;

    // Troca de movimento sinfônico a cada 2 curiosidades
    if (
      this.player &&
      this.player.isPlaying &&
      this.scenesPlayedCount > 1 &&
      this.scenesPlayedCount % 2 === 1
    ) {
      this._advanceMusicTrack();
    } else {
      this._syncTrackBadge();
    }

    const setup = curiosity.setup || {};

    if (this.physics) this.physics.reset();

    const baseInput = document.getElementById('base-input');
    const expInput = document.getElementById('exp-input');
    const filterSelect = document.getElementById('filter-select');

    let needsRebuild = false;
    if (baseInput && setup.base !== undefined && parseInt(baseInput.value) !== setup.base) {
      baseInput.value = setup.base;
      needsRebuild = true;
    }
    if (expInput && setup.exp !== undefined && parseInt(expInput.value) !== setup.exp) {
      expInput.value = setup.exp;
      needsRebuild = true;
    }

    const resolvedFilter = this._resolveFilterValue(filterSelect, setup.filter || 'all');
    if (filterSelect && resolvedFilter && filterSelect.value !== resolvedFilter) {
      filterSelect.value = resolvedFilter;
      needsRebuild = true;
    }

    if (needsRebuild && baseInput) {
      baseInput.dispatchEvent(new Event('input'));
    }

    if (setup.tuning) {
      const tuningSelect = document.getElementById('tuning-mode');
      if (tuningSelect && tuningSelect.value !== setup.tuning) {
        tuningSelect.value = setup.tuning;
        tuningSelect.dispatchEvent(new Event('change'));
      }
    }

    const wantCubes = setup.cubesVisible !== false;
    if (this.engine && Boolean(this.engine.cubesVisible) !== wantCubes) {
      this.engine.setCubesVisible(wantCubes);
    }

    if (this.zCurve) {
      const wantZ = Boolean(setup.zCurve);
      if (Boolean(this.zCurve.visible) !== wantZ) {
        this.zCurve.toggle();
        if (this.zCurve.visible && this.engine) this.engine.refreshTransforms();
      }
    }

    if (this.instrument) {
      const wantScanner = Boolean(setup.scanner);
      if (Boolean(this.instrument.scannerActive) !== wantScanner) {
        this.instrument.toggleScanner();
      }
    }

    this.targetExplode = setup.explode !== undefined ? setup.explode : 0.18;
    this.targetSlice = setup.slice !== undefined ? setup.slice : 1;
    this.targetXW = setup.rotXW !== undefined ? setup.rotXW : 0;
    this.targetYW = setup.rotYW !== undefined ? setup.rotYW : 0;

    const wantSpin4D = Boolean(setup.autoSpin4D);
    if (this.engine?.hyper4D && Boolean(this.engine.hyper4D.autoSpin) !== wantSpin4D) {
      const btn4DSpin = document.getElementById('btn-4d-spin');
      if (btn4DSpin) btn4DSpin.click();
    }

    const camCfg = setup.camera || {};
    this.targetCamRadius = camCfg.radius || 21;
    this.camOrbitSpeed = camCfg.speed || 0.18;

    this._pickFocusTarget(curiosity);
    this._renderCuriosityCard(curiosity);
  }

  _pickFocusTarget(curiosity) {
    const blocks = this.engine?.blocksData || [];
    if (blocks.length === 0) {
      this.focusBlockIndex = -1;
      return;
    }

    const focus = curiosity.focus || 'corner';
    const setup = curiosity.setup || {};

    if (focus === 'center') {
      this.focusBlockIndex = Math.floor(blocks.length / 2);
    } else if (focus === 'prime') {
      const primeIdx = blocks.findIndex((b, idx) => b.isPrime && idx >= Math.floor(blocks.length * 0.45));
      this.focusBlockIndex = primeIdx !== -1 ? primeIdx : Math.floor(blocks.length * 0.65);
    } else if (focus === 'zcurve') {
      this.focusBlockIndex = Math.min(blocks.length - 1, Math.floor(blocks.length * 0.62));
    } else if (focus === 'slice') {
      const ratio = setup.slice || 0.75;
      this.focusBlockIndex = Math.max(0, Math.min(blocks.length - 1, Math.floor(blocks.length * ratio * 0.85)));
    } else if (focus === 'physics') {
      this.focusBlockIndex = Math.min(blocks.length - 1, Math.floor(blocks.length * 0.78));
    } else {
      this.focusBlockIndex = Math.min(blocks.length - 1, Math.floor(blocks.length * 0.88));
    }
  }

  _findInstancedMesh() {
    if (this.engine?.mesh?.isInstancedMesh) return this.engine.mesh;
    if (this.engine?.instancedMesh?.isInstancedMesh) return this.engine.instancedMesh;
    let found = null;
    const root = this.engine?.rootGroup || this.engine?.scene;
    if (root && typeof root.traverse === 'function') {
      root.traverse((obj) => {
        if (!found && obj.isInstancedMesh) found = obj;
      });
    }
    return found;
  }

  _getFocusWorldPosition() {
    this._tmpWorldPos.set(0, 0, 0);
    const blocks = this.engine?.blocksData || [];
    const idx = this.focusBlockIndex;

    if (idx >= 0 && idx < blocks.length) {
      const instMesh = this._findInstancedMesh();
      if (instMesh && idx < instMesh.count) {
        instMesh.updateMatrixWorld(true);
        instMesh.getMatrixAt(idx, this._tmpMat4);
        this._tmpWorldPos.setFromMatrixPosition(this._tmpMat4);
        instMesh.localToWorld(this._tmpWorldPos);
        return this._tmpWorldPos;
      }

      const block = blocks[idx];
      const rawPos = block.position || block.pos;
      if (rawPos) {
        this._tmpWorldPos.set(rawPos.x || 0, rawPos.y || 0, rawPos.z || 0);
        if (this.engine?.rootGroup) {
          this.engine.rootGroup.updateMatrixWorld(true);
          this._tmpWorldPos.applyMatrix4(this.engine.rootGroup.matrixWorld);
        }
        return this._tmpWorldPos;
      }
    }

    if (this.engine?.rootGroup) {
      this.engine.rootGroup.updateMatrixWorld(true);
      this._tmpWorldPos.setFromMatrixPosition(this.engine.rootGroup.matrixWorld);
    }
    return this._tmpWorldPos;
  }

  _updateFloatingPopup(dt, snap = false) {
    if (!this.cardEl || !this.engine?.camera) return;

    const worldPos = this._getFocusWorldPosition();
    this._tmpProjVec.copy(worldPos).project(this.engine.camera);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const behindCamera = this._tmpProjVec.z > 1;

    const anchorX = THREE.MathUtils.clamp((this._tmpProjVec.x * 0.5 + 0.5) * vw, 40, vw - 40);
    const anchorY = THREE.MathUtils.clamp((-this._tmpProjVec.y * 0.5 + 0.5) * vh, 60, vh - 60);

    const cardRect = this.cardEl.getBoundingClientRect();
    const cardW = cardRect.width || Math.min(420, vw - 48);
    const cardH = cardRect.height || 210;

    const placeOnRight = anchorX < vw * 0.52;
    const rawTargetX = placeOnRight ? anchorX + 86 : anchorX - cardW - 86;
    const rawTargetY = anchorY - cardH * 0.38;

    let targetX = THREE.MathUtils.clamp(rawTargetX, 24, Math.max(24, vw - cardW - 24));
    let targetY = THREE.MathUtils.clamp(rawTargetY, 76, Math.max(76, vh - cardH - 24));

    // Evita sobrepor a barra superior direita
    if (targetY < 76 && targetX + cardW > vw - 440) {
      targetY = 76;
    }

    if (snap || !this.popupInitialized) {
      this.popupX = targetX;
      this.popupY = targetY;
      this.popupInitialized = true;
    } else {
      const followRate = 1 - Math.exp(-6.0 * dt);
      this.popupX += (targetX - this.popupX) * followRate;
      this.popupY += (targetY - this.popupY) * followRate;
    }

    this.cardEl.style.transform = `translate3d(${this.popupX.toFixed(1)}px, ${this.popupY.toFixed(1)}px, 0)`;

    if (this.tetherLine && this.targetRing && this.targetDot && this.cardDot) {
      if (behindCamera) {
        this.tetherLine.style.opacity = '0';
        this.targetRing.style.opacity = '0';
        this.targetDot.style.opacity = '0';
        this.cardDot.style.opacity = '0';
        return;
      }

      this.tetherLine.style.opacity = '1';
      this.targetRing.style.opacity = '0.7';
      this.targetDot.style.opacity = '1';
      this.cardDot.style.opacity = '1';

      const cardCenterX = this.popupX + cardW * 0.5;
      const attachLeft = anchorX <= cardCenterX;
      const attachX = attachLeft ? this.popupX : this.popupX + cardW;
      const attachY = THREE.MathUtils.clamp(
        anchorY,
        this.popupY + 26,
        this.popupY + cardH - 26
      );

      const elbowX = attachLeft
        ? Math.max(anchorX + 24, attachX - 28)
        : Math.min(anchorX - 24, attachX + 28);

      this.tetherLine.setAttribute(
        'points',
        `${anchorX.toFixed(1)},${anchorY.toFixed(1)} ${elbowX.toFixed(1)},${attachY.toFixed(1)} ${attachX.toFixed(1)},${attachY.toFixed(1)}`
      );

      const pulseR = 10 + Math.sin(this.sceneElapsed * 4.5) * 2.5;
      this.targetRing.setAttribute('cx', anchorX.toFixed(1));
      this.targetRing.setAttribute('cy', anchorY.toFixed(1));
      this.targetRing.setAttribute('r', pulseR.toFixed(1));

      this.targetDot.setAttribute('cx', anchorX.toFixed(1));
      this.targetDot.setAttribute('cy', anchorY.toFixed(1));

      this.cardDot.setAttribute('cx', attachX.toFixed(1));
      this.cardDot.setAttribute('cy', attachY.toFixed(1));
    }
  }

  _buildFeatureBadges(setup = {}) {
    const tags = [];
    if (setup.autoSpin4D || setup.rotXW || setup.rotYW) tags.push('Projeção 4D');
    if (setup.zCurve) tags.push('Curva Espacial Z');
    if (setup.scanner) tags.push('Scanner Musical');
    if (setup.physicsSequence) tags.push('Física F = ma');
    if (setup.filter === 'prime' || setup.filter === 'primes') tags.push('Filtro: Primos');
    if (setup.slice !== undefined && setup.slice < 0.99) tags.push(`Corte ${Math.round(setup.slice * 100)}%`);
    return tags
      .map((t) => `<span class="cm-active-tag">${t}</span>`)
      .join('');
  }

  _renderCuriosityCard(curiosity) {
    const counterEl = document.getElementById('cinema-counter');
    if (counterEl) {
      const shownNum = (this.history[this.historyCursor] ?? 0) + 1;
      counterEl.textContent = `${shownNum} / ${CURIOSITIES.length}`;
    }

    if (!this.cardEl) return;
    const badgesHTML = this._buildFeatureBadges(curiosity.setup);
    const visualCueText =
      curiosity.visualCue ||
      `Observe a estrutura ${curiosity.formula} reorganizando seus blocos em tempo real no espaço 3D.`;

    this.cardEl.innerHTML = `
      <div class="cm-card-inner">
        <div class="cm-header">
          <div class="cm-header-left">
            <span class="cm-category">${curiosity.category}</span>
            ${badgesHTML}
          </div>
          <span class="cm-formula">${curiosity.formula}</span>
        </div>
        <h3 class="cm-title">${curiosity.title}</h3>
        <p class="cm-text">${curiosity.text}</p>
        <div class="cm-visual-cue">
          <span class="cm-cue-dot"></span>
          <div><strong>Na simulação agora:</strong> ${visualCueText}</div>
        </div>
        <div class="cm-progress-track">
          <div class="cm-progress-fill" id="cm-progress-fill"></div>
        </div>
      </div>
    `;
  }

  _setSliderValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input'));
  }

  _syncCameraSphericalFromEngine() {
    if (!this.engine?.camera) return;
    const target = this.engine.controls?.target || this.camTarget;
    const offset = new THREE.Vector3().subVectors(this.engine.camera.position, target);
    const radius = Math.max(8, offset.length());
    this.camRadius = radius;
    this.camPhi = THREE.MathUtils.clamp(
      Math.acos(THREE.MathUtils.clamp(offset.y / radius, -0.95, 0.95)),
      0.35,
      2.35
    );
    this.camTheta = Math.atan2(offset.x, offset.z);
  }

  update(dt) {
    if (!this.active) return;
    if (!dt || dt <= 0 || dt > 0.5) return;

    const now = performance.now();
    if (now - this._lastUpdateStamp < 4) return;
    this._lastUpdateStamp = now;

    // 1. Interpolação suave de Explode e Slice
    const morphSpeed = this.isTransitioning ? 5.2 : 2.2;
    const morphRate = 1 - Math.exp(-morphSpeed * dt);

    if (Math.abs(this.currentExplode - this.targetExplode) > 0.001) {
      this.currentExplode += (this.targetExplode - this.currentExplode) * morphRate;
      this._setSliderValue('explode-input', this.currentExplode.toFixed(3));
    }
    if (Math.abs(this.currentSlice - this.targetSlice) > 0.001) {
      this.currentSlice += (this.targetSlice - this.currentSlice) * morphRate;
      this._setSliderValue('slice-input', this.currentSlice.toFixed(3));
    }

    // 2. Interpolação suave dos ângulos 4D
    if (!this.engine?.hyper4D?.autoSpin) {
      if (Math.abs(this.currentXW - this.targetXW) > 0.15) {
        this.currentXW += (this.targetXW - this.currentXW) * morphRate;
        this._setSliderValue('rot-xw-input', Math.round(this.currentXW));
      }
      if (Math.abs(this.currentYW - this.targetYW) > 0.15) {
        this.currentYW += (this.targetYW - this.currentYW) * morphRate;
        this._setSliderValue('rot-yw-input', Math.round(this.currentYW));
      }
    }

    // 3. Câmera Orbital Cinematográfica
    if (this.userDragging) {
      this.dragResumeTimer = 1.6;
    } else if (this.dragResumeTimer > 0) {
      this.dragResumeTimer -= dt;
      this._syncCameraSphericalFromEngine();
    } else if (this.engine?.camera) {
      this.camTheta += this.camOrbitSpeed * dt;
      this.camRadius += (this.targetCamRadius - this.camRadius) * (1 - Math.exp(-1.5 * dt));

      const breathingRadius = this.camRadius + Math.sin(this.sceneElapsed * 0.45) * 1.3;
      const breathingPhi = THREE.MathUtils.clamp(
        1.02 + Math.sin(this.sceneElapsed * 0.32) * 0.22,
        0.45,
        2.15
      );

      if (this.engine.controls?.target) {
        this.engine.controls.target.lerp(this.camTarget, 1 - Math.exp(-2.0 * dt));
      }

      const target = this.engine.controls?.target || this.camTarget;
      this.engine.camera.position.set(
        target.x + breathingRadius * Math.sin(breathingPhi) * Math.sin(this.camTheta),
        target.y + breathingRadius * Math.cos(breathingPhi),
        target.z + breathingRadius * Math.sin(breathingPhi) * Math.cos(this.camTheta)
      );

      if (this.engine.controls) {
        this.engine.controls.update();
      } else {
        this.engine.camera.lookAt(target);
      }
    }

    // 4. Atualiza posição 2D do Pop-up e da Linha Guia rastreando o ponto 3D
    this._updateFloatingPopup(dt, false);

    if (this.paused || this.isTransitioning) return;

    // 5. Sequência Coreografada de Física
    this.sceneElapsed += dt;
    if (this.currentScene?.setup?.physicsSequence && this.physics) {
      if (this.physicsStage === 0 && this.sceneElapsed >= 2.8) {
        this.physicsStage = 1;
        this.physics.enable(this.engine.blocksData, 1.15);
      } else if (this.physicsStage === 1 && this.sceneElapsed >= 7.2) {
        this.physicsStage = 2;
        const floorY = this.physics.floorY !== undefined ? this.physics.floorY : -6;
        this.physics.applyShockwave(new THREE.Vector3(0, floorY, 0), 25);
      } else if (this.physicsStage === 2 && this.sceneElapsed >= 11.2) {
        this.physicsStage = 3;
        this.physics.startRewind();
      }
    }

    // 6. Progresso e troca de cena
    const progress = Math.min(100, (this.sceneElapsed / this.sceneDuration) * 100);
    const fillEl = document.getElementById('cm-progress-fill');
    if (fillEl) fillEl.style.width = `${progress.toFixed(1)}%`;

    if (this.sceneElapsed >= this.sceneDuration) {
      this.nextScene(false);
    }
  }
}