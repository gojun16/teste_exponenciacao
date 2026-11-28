import * as THREE from 'three';
import { VideoAudioEngine, AUDIO_PRESETS } from './videoAudioEngine.js';
import { VideoFrameAnalyzer } from './videoFrameAnalyzer.js';
import { CinematicCameraRig, CAMERA_MODES } from './cinematicCamera.js';

export class VideoPlayerDirector {
  constructor(engine) {
    this.engine = engine;
    this.audio = new VideoAudioEngine();
    this.analyzer = new VideoFrameAnalyzer(160, 120);
    this.cameraRig = new CinematicCameraRig();

    this.active = false;
    this.bloomStrength = 0.36;
    this.stageMode = 'sculpt'; // 'sculpt' | 'curved' | 'flat'
    this.colorMode = 0; // 0: Natural, 1: Vibrante HDR, 2: Neon Synth, 3: Alto Contraste P&B
    this.reliefMultiplier = 1.0;
    this.morphProgress = 0;

    // Independent Base & Exponent Voxel Resolution System (default 3^8 = 6,561 screen voxels)
    this.voxelBase = 3;
    this.voxelExponent = 8;
    this.maxScreenVoxels = 262144; // GPU safety cap (591x443 @ 4:3)
    this.currentAspect = 16 / 9;

    this.cols = 108;
    this.rows = 61;
    this.screenVoxelCount = this.cols * this.rows;
    this.orbitalVoxelCount = 720;
    this.totalVoxelCount = this.screenVoxelCount + this.orbitalVoxelCount;
    this._computeGridDimensions();

    // Offscreen high-res video frame buffer (dynamically scaled with voxel resolution)
    this.frameCanvas = document.createElement('canvas');
    this.frameCanvas.width = 384;
    this.frameCanvas.height = 216;
    this.frameCtx = this.frameCanvas.getContext('2d', { willReadFrequently: true });

    this.screenTexture = new THREE.CanvasTexture(this.frameCanvas);
    this.screenTexture.minFilter = THREE.LinearFilter;
    this.screenTexture.magFilter = THREE.LinearFilter;
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;

    // HTML5 Video Element (plays real MP4/WebM video + native audio routed via Web Audio API)
    this.videoEl = null;
    this.videoObjectUrl = null;
    this.hasVideo = false;
    this.videoTitle = 'Modo Demonstração (Arraste um MP4)';
    this.demoPlaying = true;
    this.demoTime = 0;

    // GPU Uniforms shared across Voxel Mesh and Reactive Panoramic Dome
    this.sharedUniforms = {
      uScreenTex: { value: this.screenTexture },
      uAnalysisTex: { value: this.analyzer.texture },
      uTime: { value: 0.0 },
      uMorph: { value: 0.0 },
      uSculptMode: { value: 1.0 },
      uColorMode: { value: 0.0 },
      uAspectScale: { value: new THREE.Vector2(1.1547, 0.866) },
      uGridDim: { value: new THREE.Vector2(this.cols, this.rows) },
      uBass: { value: 0.0 },
      uMid: { value: 0.0 },
      uHigh: { value: 0.0 },
      uBeatPulse: { value: 0.0 },
      uReliefScale: { value: 1.45 },
      uCurveDepth: { value: 0.65 },
      uWaveAmp: { value: 0.25 },
      uTwistAmp: { value: 0.16 },
      uCentroid: { value: new THREE.Vector2(0.5, 0.5) },
      uVelocity: { value: new THREE.Vector2(0.0, 0.0) },
      uMotion: { value: 0.0 },
      uAvgLuma: { value: 0.25 },
      uDomeExposure: { value: 1.0 },
      uColorfulness: { value: 0.5 },
      uDominantColor: { value: new THREE.Color(0.22, 0.72, 0.96) },
      uSecondaryColor: { value: new THREE.Color(0.55, 0.28, 0.92) }
    };

    // Backup of previous mathematical engine state
    this._savedCameraPos = new THREE.Vector3();
    this._savedCameraTarget = new THREE.Vector3();
    this._savedCameraUp = new THREE.Vector3(0, 1, 0);
    this._savedFov = 50;
    this._savedControlsEnabled = true;
    this._savedBloom = 0.42;
    this._savedBloomThreshold = 0.85;
    this._savedBloomRadius = 0.55;
    this._savedInstancedVisible = true;
    this._savedClip = 10;
    this._savedSceneBackground = null;
    this._savedSceneFog = null;
    this._savedHelperVisibility = null;

    this._uiVisible = true;
    this._stageCenter = new THREE.Vector3(0, 0, -4.5);
    this._stageTarget = new THREE.Vector3(0, 0, -4.5);

    this._buildReactiveEnvironment();
    this._buildHUD();
    this._bindEvents();
  }

  _computeGridDimensions() {
    const rawTarget = Math.pow(this.voxelBase, this.voxelExponent);
    const isCapped = rawTarget > this.maxScreenVoxels;
    const targetCount = Math.min(this.maxScreenVoxels, Math.max(16, Math.round(rawTarget)));

    const rows = Math.max(4, Math.round(Math.sqrt(targetCount / this.currentAspect)));
    const cols = Math.max(4, Math.round(rows * this.currentAspect));

    this.cols = cols;
    this.rows = rows;
    this.screenVoxelCount = cols * rows;
    this.totalVoxelCount = this.screenVoxelCount + this.orbitalVoxelCount;

    return { rawTarget, isCapped };
  }

  _syncFrameCanvasResolution() {
    const targetW = Math.min(1280, Math.max(384, this.cols * 2));
    const targetH = Math.max(216, Math.round(targetW / this.currentAspect));

    if (this.frameCanvas.width !== targetW || this.frameCanvas.height !== targetH) {
      this.frameCanvas.width = targetW;
      this.frameCanvas.height = targetH;
      this.screenTexture.dispose();
      this.screenTexture = new THREE.CanvasTexture(this.frameCanvas);
      this.screenTexture.minFilter = THREE.LinearFilter;
      this.screenTexture.magFilter = THREE.LinearFilter;
      this.screenTexture.colorSpace = THREE.SRGBColorSpace;
      this.sharedUniforms.uScreenTex.value = this.screenTexture;
    }
  }

  setVoxelResolution(base, exponent) {
    const nextBase = THREE.MathUtils.clamp(Math.round(Number(base) || 3), 2, 16);
    const nextExp = THREE.MathUtils.clamp(Math.round(Number(exponent) || 8), 1, 20);

    this.voxelBase = nextBase;
    this.voxelExponent = nextExp;

    if (this.baseInputEl) this.baseInputEl.value = String(nextBase);
    if (this.expInputEl) this.expInputEl.value = String(nextExp);

    this._rebuildVoxelGrid();
  }

  _rebuildVoxelGrid() {
    const { rawTarget, isCapped } = this._computeGridDimensions();
    this.sharedUniforms.uGridDim.value.set(this.cols, this.rows);

    this._syncFrameCanvasResolution();
    this._buildVoxelMesh();
    this._updateResolutionHUD(rawTarget, isCapped);
  }

  _formatSuperscript(num) {
    const map = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    return String(num).replace(/[0-9]/g, (d) => map[d] || d);
  }

  _updateResolutionHUD(rawTarget = Math.pow(this.voxelBase, this.voxelExponent), isCapped = false) {
    const expr = `${this.voxelBase}${this._formatSuperscript(this.voxelExponent)}`;
    const activeStr = this.screenVoxelCount.toLocaleString('pt-BR');

    if (this.powReadoutEl) {
      if (isCapped) {
        this.powReadoutEl.style.color = '#fbbf24';
        this.powReadoutEl.textContent = `${expr} = ${Math.round(rawTarget).toLocaleString('pt-BR')} → máx. ${activeStr} (${this.cols}×${this.rows})`;
      } else {
        this.powReadoutEl.style.color = '#34d399';
        this.powReadoutEl.textContent = `${expr} = ${Math.round(rawTarget).toLocaleString('pt-BR')} → ${activeStr} voxels (${this.cols}×${this.rows})`;
      }
    }

    if (this.resBadgeEl) {
      const mathCount = this.engine.getBlockCount();
      this.resBadgeEl.textContent = `${activeStr} cubos 3D (${this.cols}×${this.rows}) · ${mathCount.toLocaleString('pt-BR')} blocos mat.`;
    }
  }

  _buildHUD() {
    if (document.getElementById('voxel-player-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'voxel-player-hud';
    hud.style.cssText = `
      position: fixed;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      display: none;
      flex-direction: column;
      gap: 8px;
      width: min(860px, 96vw);
      padding: 12px 16px;
      border-radius: 15px;
      background: rgba(6, 10, 20, 0.88);
      border: 1px solid rgba(56, 189, 248, 0.34);
      backdrop-filter: blur(14px);
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 16px 44px rgba(0, 0, 0, 0.78);
    `;

    const audioOptions = AUDIO_PRESETS.map(
      (p) => `<option value="${p.id}">${p.label}</option>`
    ).join('');

    const camOptions = CAMERA_MODES.map(
      (c) => `<option value="${c.id}">${c.label}</option>`
    ).join('');

    const stepBtnStyle = `
      font-size: 12px;
      font-weight: 700;
      width: 22px;
      height: 22px;
      padding: 0;
      border-radius: 6px;
      border: 1px solid rgba(56, 189, 248, 0.4);
      background: rgba(56, 189, 248, 0.16);
      color: #e0f2fe;
      cursor: pointer;
      line-height: 1;
    `;

    const numInputStyle = `
      width: 42px;
      height: 22px;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      border-radius: 6px;
      border: 1px solid rgba(56, 189, 248, 0.45);
      background: #0f172a;
      color: #f8fafc;
      padding: 0 2px;
    `;

    hud.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <span style="font-size:16px;">🎬</span>
          <strong id="vp-title-label" style="font-size:13px; letter-spacing:0.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:320px;">
            VOXEL VIDEO PLAYER 3D
          </strong>
          <span id="vp-shot-label" style="font-size:11px; color:#c084fc; font-weight:600;">Plano: Órbita Espacial</span>
        </div>
        <span id="vp-res-badge" style="font-size:11px; color:#38bdf8; font-weight:600;">
          ${this.screenVoxelCount.toLocaleString('pt-BR')} cubos 3D (${this.cols}×${this.rows})
        </span>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <button id="vp-play-btn" type="button" title="Play / Pause (Espaço)" style="font-size:12px; font-weight:700; padding:4px 10px; border-radius:7px; border:1px solid rgba(255,255,255,0.22); background:rgba(56,189,248,0.2); color:#f8fafc; cursor:pointer;">
          ⏸
        </button>
        <span id="vp-time-cur" style="font-size:11px; font-variant-numeric:tabular-nums; color:#cbd5e1;">00:00</span>
        <input id="vp-seek-bar" type="range" min="0" max="100" step="0.05" value="0" style="flex:1; accent-color:#38bdf8; cursor:pointer;" />
        <span id="vp-time-tot" style="font-size:11px; font-variant-numeric:tabular-nums; color:#94a3b8;">--:--</span>
        <button id="vp-loop-btn" type="button" title="Repetir Vídeo (L)" style="font-size:11px; padding:4px 8px; border-radius:7px; border:1px solid rgba(56,189,248,0.45); background:rgba(56,189,248,0.18); color:#e0f2fe; cursor:pointer;">
          🔁 Loop: ON
        </button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; padding:6px 10px; border-radius:9px; background:rgba(15, 23, 42, 0.78); border:1px solid rgba(56, 189, 248, 0.24);">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:11px; font-weight:700; color:#7dd3fc;">📐 Resolução (Base ^ Expoente):</span>

          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:11px; color:#94a3b8;">Base</span>
            <button id="vp-base-dec" type="button" title="Diminuir Base" style="${stepBtnStyle}">−</button>
            <input id="vp-base-input" type="number" min="2" max="16" step="1" value="${this.voxelBase}" style="${numInputStyle}" />
            <button id="vp-base-inc" type="button" title="Aumentar Base" style="${stepBtnStyle}">+</button>
          </div>

          <span style="font-size:12px; font-weight:700; color:#38bdf8;">^</span>

          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:11px; color:#94a3b8;">Exp</span>
            <button id="vp-exp-dec" type="button" title="Diminuir Expoente" style="${stepBtnStyle}">−</button>
            <input id="vp-exp-input" type="number" min="1" max="20" step="1" value="${this.voxelExponent}" style="${numInputStyle}" />
            <button id="vp-exp-inc" type="button" title="Aumentar Expoente" style="${stepBtnStyle}">+</button>
          </div>
        </div>

        <span id="vp-pow-readout" style="font-size:11px; font-weight:600; font-variant-numeric:tabular-nums; color:#34d399;">
          3⁸ = 6.561 → ${this.screenVoxelCount.toLocaleString('pt-BR')} voxels (${this.cols}×${this.rows})
        </span>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
        <label style="font-size:11px; font-weight:600; padding:5px 10px; border-radius:8px; background:rgba(16,185,129,0.22); border:1px solid rgba(52,211,153,0.45); color:#ecfdf5; cursor:pointer;">
          📂 Abrir MP4 / Vídeo
          <input id="vp-video-input" type="file" accept="video/*" style="display:none;" />
        </label>

        <select id="vp-stage-select" title="Geometria do Palco 3D" style="font-size:11px; padding:5px 8px; border-radius:8px; background:#0f172a; color:#e0f2fe; border:1px solid rgba(56,189,248,0.4);">
          <option value="sculpt">🧊 Escultura Voxel 2.5D</option>
          <option value="curved">🎭 Tela Curva Cinema</option>
          <option value="flat">🖼️ Quadro Plano 3D</option>
        </select>

        <select id="vp-color-select" title="Perfil de Cor dos Voxels" style="font-size:11px; padding:5px 8px; border-radius:8px; background:#0f172a; color:#f8fafc; border:1px solid rgba(255,255,255,0.2);">
          <option value="0">🎨 Cor Original</option>
          <option value="1">🌈 Vibrante HDR</option>
          <option value="2">🔮 Neon Synthwave</option>
          <option value="3">☯ Alto Contraste P&B</option>
        </select>

        <select id="vp-audio-select" title="Efeitos de Áudio do MP4 (Web Audio DSP)" style="font-size:11px; padding:5px 8px; border-radius:8px; background:#0f172a; color:#fde68a; border:1px solid rgba(251,191,36,0.4);">
          ${audioOptions}
        </select>

        <select id="vp-cam-select" title="Direção de Câmera" style="font-size:11px; padding:5px 8px; border-radius:8px; background:#0f172a; color:#f3e8ff; border:1px solid rgba(192,132,252,0.45);">
          ${camOptions}
        </select>

        <div style="display:flex; align-items:center; gap:4px; font-size:11px;" title="Extrusão 3D">
          <span>3D</span>
          <input id="vp-relief-input" type="range" min="0" max="2.2" step="0.05" value="1.0" style="width:52px; accent-color:#c084fc;" />
        </div>

        <div style="display:flex; align-items:center; gap:4px; font-size:11px;">
          <button id="vp-mute-btn" type="button" title="Mutar (M)" style="font-size:11px; padding:3px 6px; border-radius:6px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); color:#fff; cursor:pointer;">🔊</button>
          <input id="vp-vol-input" type="range" min="0" max="1" step="0.02" value="0.78" style="width:56px; accent-color:#38bdf8;" />
        </div>

        <button id="vp-stop-btn" type="button" style="font-size:11px; font-weight:600; padding:5px 11px; border-radius:8px; border:none; background:#ef4444; color:#fff; cursor:pointer;">
          Encerrar
        </button>
      </div>
    `;

    hud.style.opacity = '1';
    hud.style.transition = 'opacity 260ms ease, translate 260ms ease';
    hud.style.translate = '0 0';
    const idleStyle = document.createElement('style');
    idleStyle.id = 'voxel-player-idle-style';
    idleStyle.textContent = `
      #voxel-player-hud.voxel-player-hud-idle { opacity: 0 !important; translate: 0 12px !important; pointer-events: none !important; }
      #voxel-player-hud { will-change: opacity, translate; }
    `;
    if (!document.getElementById(idleStyle.id)) document.head.appendChild(idleStyle);
    document.body.appendChild(hud);

    // Drag & Drop overlay
    const dropOverlay = document.createElement('div');
    dropOverlay.id = 'vp-drop-overlay';
    dropOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 90;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(5, 8, 17, 0.82);
      border: 3px dashed #38bdf8;
      color: #e0f2fe;
      font-family: system-ui, sans-serif;
      font-size: 20px;
      font-weight: 700;
      pointer-events: none;
    `;
    dropOverlay.textContent = '🎬 Solte o arquivo de vídeo (MP4, WebM, MOV) para reproduzir em Voxels 3D';
    document.body.appendChild(dropOverlay);

    this.hudEl = hud;
    this.dropOverlayEl = dropOverlay;
    this.titleEl = document.getElementById('vp-title-label');
    this.shotEl = document.getElementById('vp-shot-label');
    this.resBadgeEl = document.getElementById('vp-res-badge');
    this.powReadoutEl = document.getElementById('vp-pow-readout');
    this.baseInputEl = document.getElementById('vp-base-input');
    this.expInputEl = document.getElementById('vp-exp-input');
    this.playBtnEl = document.getElementById('vp-play-btn');
    this.timeCurEl = document.getElementById('vp-time-cur');
    this.timeTotEl = document.getElementById('vp-time-tot');
    this.seekBarEl = document.getElementById('vp-seek-bar');
    this.loopBtnEl = document.getElementById('vp-loop-btn');
    this.videoInputEl = document.getElementById('vp-video-input');
    this.stageSelectEl = document.getElementById('vp-stage-select');
    this.colorSelectEl = document.getElementById('vp-color-select');
    this.audioSelectEl = document.getElementById('vp-audio-select');
    this.camSelectEl = document.getElementById('vp-cam-select');
    this.reliefInputEl = document.getElementById('vp-relief-input');
    this.muteBtnEl = document.getElementById('vp-mute-btn');
    this.volInputEl = document.getElementById('vp-vol-input');
    this.stopBtnEl = document.getElementById('vp-stop-btn');

    // Cinematic HUD auto-hide: fade UI and cursor after inactivity.
    this._idleHideDelay = 2400;
    this._idleHideTimer = null;
    this._hudInteracting = false;
    this._idlePointerTarget = this.engine.renderer?.domElement || null;
    this._showHUDForActivity = () => {
      if (!this.active || !this._uiVisible) return;
      this.hudEl?.classList.remove('voxel-player-hud-idle');
      if (this._idlePointerTarget) this._idlePointerTarget.style.cursor = '';
      clearTimeout(this._idleHideTimer);
      this._idleHideTimer = setTimeout(() => {
        if (!this.active || !this._uiVisible || this._hudInteracting) return;
        this.hudEl?.classList.add('voxel-player-hud-idle');
        if (this._idlePointerTarget) this._idlePointerTarget.style.cursor = 'none';
      }, this._idleHideDelay);
    };
    this._idlePointerMoveHandler = () => this._showHUDForActivity();
    this._idlePointerDownHandler = (e) => {
      if (this.hudEl?.contains(e.target)) this._hudInteracting = true;
      this._showHUDForActivity();
    };
    this._idlePointerUpHandler = () => {
      this._hudInteracting = false;
      this._showHUDForActivity();
    };
    this._idleFocusHandler = () => {
      this._hudInteracting = false;
      this._showHUDForActivity();
    };
    document.addEventListener('mousemove', this._idlePointerMoveHandler, { passive: true });
    document.addEventListener('pointerdown', this._idlePointerDownHandler, { passive: true });
    document.addEventListener('pointerup', this._idlePointerUpHandler, { passive: true });
    this.hudEl?.addEventListener('focusout', this._idleFocusHandler);
    this._showHUDForActivity();

    // Base & Exponent resolution controls
    document.getElementById('vp-base-dec')?.addEventListener('click', () => {
      this.setVoxelResolution(this.voxelBase - 1, this.voxelExponent);
    });
    document.getElementById('vp-base-inc')?.addEventListener('click', () => {
      this.setVoxelResolution(this.voxelBase + 1, this.voxelExponent);
    });
    document.getElementById('vp-exp-dec')?.addEventListener('click', () => {
      this.setVoxelResolution(this.voxelBase, this.voxelExponent - 1);
    });
    document.getElementById('vp-exp-inc')?.addEventListener('click', () => {
      this.setVoxelResolution(this.voxelBase, this.voxelExponent + 1);
    });
    this.baseInputEl?.addEventListener('change', (e) => {
      this.setVoxelResolution(e.target.value, this.voxelExponent);
    });
    this.expInputEl?.addEventListener('change', (e) => {
      this.setVoxelResolution(this.voxelBase, e.target.value);
    });

    this.playBtnEl.addEventListener('click', () => this.togglePlayPause());

    this.seekBarEl.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      if (this.hasVideo && this.videoEl) {
        this.videoEl.currentTime = Math.min(this.videoEl.duration || val, Math.max(0, val));
      } else {
        this.demoTime = val;
      }
    });

    this.loopBtnEl.addEventListener('click', () => {
      const nextLoop = this.videoEl ? !this.videoEl.loop : true;
      if (this.videoEl) this.videoEl.loop = nextLoop;
      this.loopBtnEl.textContent = nextLoop ? '🔁 Loop: ON' : '🔁 Loop: OFF';
      this.loopBtnEl.style.opacity = nextLoop ? '1' : '0.6';
    });

    this.videoInputEl.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) await this.loadVideoFile(file);
    });

    this.stageSelectEl.addEventListener('change', (e) => {
      this.stageMode = e.target.value;
    });

    this.colorSelectEl.addEventListener('change', (e) => {
      this.colorMode = parseInt(e.target.value, 10) || 0;
      this.sharedUniforms.uColorMode.value = this.colorMode;
    });

    this.audioSelectEl.addEventListener('change', (e) => {
      this.audio.setPreset(e.target.value);
    });

    this.camSelectEl.addEventListener('change', (e) => {
      const mode = e.target.value;
      this.cameraRig.setMode(mode);
      if (this.engine.controls) {
        this.engine.controls.enabled = mode === 'free';
      }
    });

    this.reliefInputEl.addEventListener('input', (e) => {
      this.reliefMultiplier = parseFloat(e.target.value) || 0;
    });

    this.muteBtnEl.addEventListener('click', () => {
      const muted = this.audio.setMuted(!this.audio.muted);
      this.muteBtnEl.textContent = muted ? '🔇' : '🔊';
    });

    this.volInputEl.addEventListener('input', (e) => {
      this.audio.setVolume(parseFloat(e.target.value));
      if (this.audio.muted && parseFloat(e.target.value) > 0) {
        this.audio.setMuted(false);
        this.muteBtnEl.textContent = '🔊';
      }
    });

    this.stopBtnEl.addEventListener('click', () => this.stop());

    this.engine.controls?.addEventListener('start', () => {
      if (this.active && this.cameraRig.mode !== 'free') {
        this.cameraRig.setMode('free');
        if (this.camSelectEl) this.camSelectEl.value = 'free';
      }
    });

    this._updateResolutionHUD();
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'KeyU') {
        e.preventDefault();
        this._uiVisible = !this._uiVisible;
        document.body.classList.toggle('voxel-player-ui-visible', this._uiVisible);
        if (this.hudEl) {
          this.hudEl.style.display = this._uiVisible ? 'flex' : 'none';
          this.hudEl.classList.remove('voxel-player-hud-idle');
        }
        if (this._idlePointerTarget) this._idlePointerTarget.style.cursor = '';
        if (this._uiVisible) this._showHUDForActivity();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        this.stop();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.seekBy(5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.seekBy(-5);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        const muted = this.audio.setMuted(!this.audio.muted);
        if (this.muteBtnEl) this.muteBtnEl.textContent = muted ? '🔇' : '🔊';
      }
    });

    // Global Drag & Drop for video files
    window.addEventListener('dragover', (e) => {
      if (!this.active) return;
      e.preventDefault();
      if (this.dropOverlayEl) this.dropOverlayEl.style.display = 'flex';
    });

    window.addEventListener('dragleave', (e) => {
      if (!this.active) return;
      if (e.relatedTarget === null && this.dropOverlayEl) {
        this.dropOverlayEl.style.display = 'none';
      }
    });

    window.addEventListener('drop', async (e) => {
      if (!this.active) return;
      e.preventDefault();
      if (this.dropOverlayEl) this.dropOverlayEl.style.display = 'none';
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('video/')) {
        await this.loadVideoFile(file);
      }
    });
  }

  async loadVideoFile(file) {
    if (!file) return;
    this._disposeVideoElement();

    const url = URL.createObjectURL(file);
    this.videoObjectUrl = url;

    const vid = document.createElement('video');
    vid.src = url;
    vid.playsInline = true;
    vid.loop = true;
    vid.preload = 'auto';
    vid.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      vid.onloadedmetadata = () => resolve();
      vid.onerror = (err) => reject(err);
    });

    this.videoEl = vid;
    this.hasVideo = true;
    this.videoTitle = file.name.replace(/\.[^/.]+$/, '');

    // Adjust aspect ratio & rebuild voxel grid to match native video proportions at current Base^Exp
    const vw = vid.videoWidth || 1280;
    const vh = vid.videoHeight || 720;
    const aspect = THREE.MathUtils.clamp(vw / Math.max(1, vh), 0.5, 2.5);
    this.currentAspect = aspect;

    // Normalize screen area so 16:9, 4:3, and 9:16 occupy balanced 3D space
    const baseArea = 11.2 * 8.4;
    const targetW = Math.sqrt(baseArea * aspect);
    const targetH = targetW / aspect;
    this.sharedUniforms.uAspectScale.value.set(targetW / 11.2, targetH / 8.4);

    this._rebuildVoxelGrid();

    this.analyzer.reset();
    this.audio.attachVideoElement(vid);

    if (this.titleEl) this.titleEl.textContent = this.videoTitle;
    if (this.seekBarEl) {
      this.seekBarEl.max = (vid.duration || 100).toFixed(2);
      this.seekBarEl.value = '0';
    }
    if (this.timeTotEl) {
      this.timeTotEl.textContent = this._formatTime(vid.duration || 0);
    }

    await vid.play().catch(() => {});
    if (this.playBtnEl) this.playBtnEl.textContent = '⏸';
  }

  _disposeVideoElement() {
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.removeAttribute('src');
      this.videoEl.load();
      this.videoEl = null;
    }
    if (this.videoObjectUrl) {
      URL.revokeObjectURL(this.videoObjectUrl);
      this.videoObjectUrl = null;
    }
    this.hasVideo = false;
  }

  togglePlayPause() {
    if (this.hasVideo && this.videoEl) {
      this.audio.resume();
      if (this.videoEl.paused) {
        this.videoEl.play().catch(() => {});
        if (this.playBtnEl) this.playBtnEl.textContent = '⏸';
      } else {
        this.videoEl.pause();
        if (this.playBtnEl) this.playBtnEl.textContent = '▶';
      }
    } else {
      this.demoPlaying = !this.demoPlaying;
      if (this.playBtnEl) this.playBtnEl.textContent = this.demoPlaying ? '⏸' : '▶';
    }
  }

  seekBy(deltaSec) {
    if (this.hasVideo && this.videoEl) {
      const dur = this.videoEl.duration || 0;
      this.videoEl.currentTime = Math.max(0, Math.min(dur, this.videoEl.currentTime + deltaSec));
    } else {
      this.demoTime = Math.max(0, this.demoTime + deltaSec);
    }
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.stageGroup.visible = true;
    this.morphProgress = 0;
    this._uiVisible = true;
    document.body.classList.add('voxel-player-cinematic', 'voxel-player-ui-visible');

    this._savedSceneBackground = this.engine.scene.background?.clone?.() ?? this.engine.scene.background;
    this._savedSceneFog = this.engine.scene.fog?.clone?.() ?? this.engine.scene.fog;
    this._savedHelperVisibility = {
      wireframe: this.engine.masterWireframe?.visible ?? true,
      axes: this.engine.axesHelper?.visible ?? true,
      zCurve: this.engine.zCurve?.group?.visible ?? false
    };

    if (this.engine.masterWireframe) this.engine.masterWireframe.visible = false;
    if (this.engine.axesHelper) this.engine.axesHelper.visible = false;
    if (this.engine.zCurve?.group) this.engine.zCurve.group.visible = false;

    this.engine.scene.background = new THREE.Color(0x03050d);
    if (this.engine.scene.fog) {
      this.engine.scene.fog.color.set(0x03050d);
      this.engine.scene.fog.density = 0.011;
    }

    if (this.engine.instancedMesh) {
      this._savedInstancedVisible = this.engine.instancedMesh.visible;
      this.engine.instancedMesh.visible = false;
    }

    this._savedCameraPos.copy(this.engine.camera.position);
    this._savedCameraTarget.copy(this.engine.controls.target);
    this._savedCameraUp.copy(this.engine.camera.up);
    this._savedFov = this.engine.camera.fov;
    this._savedControlsEnabled = this.engine.controls?.enabled ?? true;
    if (this.engine.controls) this.engine.controls.enabled = this.cameraRig.mode === 'free';

    this._savedBloom = this.engine.baseBloomStrength;
    this._savedBloomThreshold = this.engine.bloomPass?.threshold ?? 0.85;
    this._savedBloomRadius = this.engine.bloomPass?.radius ?? 0.55;
    this._savedClip = this.engine.clipPlane.constant;

    this.engine.rootGroup.rotation.set(0, 0, 0);
    this.engine.clipPlane.constant = 120;
    this.engine.baseBloomStrength = 0.34;
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = 0.34;
      this.engine.bloomPass.threshold = 0.68;
      this.engine.bloomPass.radius = 0.65;
    }

    this.cameraRig.reset(this._stageCenter);
    this.analyzer.reset();
    this.demoPlaying = true;

    this._updateResolutionHUD();

    if (this.hudEl) {
      this.hudEl.style.display = 'flex';
      this.hudEl.classList.remove('voxel-player-hud-idle');
    }
    this._showHUDForActivity?.();
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    clearTimeout(this._idleHideTimer);
    document.removeEventListener('mousemove', this._idlePointerMoveHandler);
    document.removeEventListener('pointerdown', this._idlePointerDownHandler);
    document.removeEventListener('pointerup', this._idlePointerUpHandler);
    this.hudEl?.removeEventListener('focusout', this._idleFocusHandler);
    this.hudEl?.classList.remove('voxel-player-hud-idle');
    if (this._idlePointerTarget) this._idlePointerTarget.style.cursor = '';
    if (this.stageGroup) this.stageGroup.visible = false;
    document.body.classList.remove('voxel-player-cinematic', 'voxel-player-ui-visible');

    this._disposeVideoElement();
    this.videoTitle = 'Modo Demonstração (Arraste um MP4)';
    if (this.titleEl) this.titleEl.textContent = 'VOXEL VIDEO PLAYER 3D';
    if (this.timeTotEl) this.timeTotEl.textContent = '--:--';

    if (this.engine.instancedMesh) {
      this.engine.instancedMesh.visible = this._savedInstancedVisible;
    }

    if (this.hudEl) this.hudEl.style.display = 'none';
    if (this.dropOverlayEl) this.dropOverlayEl.style.display = 'none';
    if (this.videoInputEl) this.videoInputEl.value = '';

    this.engine.clipPlane.constant = this._savedClip;
    if (this._savedSceneBackground !== null) this.engine.scene.background = this._savedSceneBackground;
    if (this._savedSceneFog !== null) this.engine.scene.fog = this._savedSceneFog;
    if (this._savedHelperVisibility) {
      if (this.engine.masterWireframe) this.engine.masterWireframe.visible = this._savedHelperVisibility.wireframe;
      if (this.engine.axesHelper) this.engine.axesHelper.visible = this._savedHelperVisibility.axes;
      if (this.engine.zCurve?.group) this.engine.zCurve.group.visible = this._savedHelperVisibility.zCurve;
    }
    this._savedHelperVisibility = null;

    this.engine.baseBloomStrength = this._savedBloom;
    this.bloomStrength = this._savedBloom;
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = this._savedBloom;
      this.engine.bloomPass.threshold = this._savedBloomThreshold;
      this.engine.bloomPass.radius = this._savedBloomRadius;
    }

    this.engine.camera.fov = this._savedFov;
    this.engine.camera.up.copy(this._savedCameraUp);
    if (this.engine.controls) this.engine.controls.enabled = this._savedControlsEnabled;
    this.engine.camera.updateProjectionMatrix();
    this.engine.camera.position.copy(this._savedCameraPos);
    this.engine.controls.target.copy(this._savedCameraTarget);
    this.engine.refreshTransforms();
    this.engine.controls.update();

    if (typeof this.onStop === 'function') {
      this.onStop();
    }
  }

  onMeshRebuilt() {
    if (!this.active) return;
    if (this.engine.instancedMesh) {
      this.engine.instancedMesh.visible = false;
    }
    this._updateResolutionHUD();
  }

  _patchVoxelShader(material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.sharedUniforms);

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute vec4 aVoxelUV;
          attribute vec4 aVoxelRest;
          uniform sampler2D uScreenTex;
          uniform sampler2D uAnalysisTex;
          uniform float uTime;
          uniform float uMorph;
          uniform float uSculptMode;
          uniform vec2 uAspectScale;
          uniform vec2 uGridDim;
          uniform float uBass;
          uniform float uMid;
          uniform float uHigh;
          uniform float uBeatPulse;
          uniform float uReliefScale;
          uniform float uCurveDepth;
          uniform float uWaveAmp;
          uniform float uTwistAmp;
          varying vec4 vVoxelUV;
          varying vec3 vLocalNormal;
          varying float vSalMask;
          varying float vChamferDepth;
          varying float vMotionEdge;`
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
          vLocalNormal = normal;
          if (aVoxelUV.z < 0.5) {
            float nxN = (aVoxelRest.x * uAspectScale.x) / 5.6;
            float twistN = nxN * uTwistAmp * uSculptMode;
            float cN = cos(twistN);
            float sN = sin(twistN);
            objectNormal = normalize(vec3(
              objectNormal.x * cN - objectNormal.z * sN,
              objectNormal.y,
              objectNormal.x * sN + objectNormal.z * cN
            ));
          }`
        )
        .replace(
          '#include <project_vertex>',
          `vVoxelUV = aVoxelUV;
          vSalMask = 0.0;
          vChamferDepth = 0.0;
          vMotionEdge = 0.0;

          vec3 finalPos = vec3(0.0);
          vec3 vox = transformed;

          if (aVoxelUV.z < 0.5) {
            vec4 analysis = texture2D(uAnalysisTex, aVoxelUV.xy);
            float salMask = analysis.g;
            float chamferDepth = analysis.b;
            float motionEdge = analysis.a;

            vSalMask = salMask;
            vChamferDepth = chamferDepth;
            vMotionEdge = motionEdge;

            // 2.5D Volumetric Relief driven by saliency + chamfer inflation + motion + audio
            float popOut = (salMask * (0.24 + chamferDepth * uReliefScale) + motionEdge * (0.18 + uHigh * 0.25)) * step(0.01, uReliefScale);
            float bgWave = (1.0 - salMask) * (
              sin(aVoxelUV.x * 16.0 + uTime * 2.1) * cos(aVoxelUV.y * 12.0 - uTime * 1.6) * 0.05 * uSculptMode - 0.06
            );
            float zExtrude = popOut + bgWave;

            float cellW = (11.2 * uAspectScale.x) / max(1.0, uGridDim.x);
            float cellH = (8.4 * uAspectScale.y) / max(1.0, uGridDim.y);
            float popScale = 1.0 + salMask * (0.03 + uBass * 0.05) + motionEdge * 0.04;
            float sxyX = cellW * 0.88 * popScale;
            float sxyY = cellH * 0.88 * popScale;
            float sz = min(cellW, cellH) * 0.88 + max(0.0, zExtrude) * 1.25;

            vox = vec3(transformed.x * sxyX, transformed.y * sxyY, transformed.z * sz);

            vec3 surf = vec3(aVoxelRest.x * uAspectScale.x, aVoxelRest.y * uAspectScale.y, aVoxelRest.z);
            float nx = surf.x / 5.6;
            float ny = surf.y / 4.2;

            float waveZ = (
              sin(nx * 4.5 + uTime * 1.8) * 0.24 +
              cos(ny * 3.8 - uTime * 1.3) * 0.18 +
              sin((nx + ny) * 5.2 + uTime * 2.5) * 0.12
            ) * uWaveAmp * uSculptMode;

            float archZ = -nx * nx * uCurveDepth - ny * ny * (uCurveDepth * 0.25);

            float twistAngle = nx * uTwistAmp * uSculptMode + sin(ny * 2.2 + uTime * 0.7) * uTwistAmp * 0.35 * uSculptMode;
            float ct = cos(twistAngle);
            float st = sin(twistAngle);

            float beatScale = 1.0 + uBeatPulse * 0.038;
            vec3 bent = vec3(
              surf.x * beatScale,
              surf.y * beatScale + sin(nx * 3.14159 + uTime * 1.1) * 0.12 * uWaveAmp * uSculptMode,
              archZ + waveZ
            );

            vec3 twisted = vec3(
              bent.x * ct - bent.z * st,
              bent.y,
              bent.x * st + bent.z * ct
            );

            twisted.z += zExtrude * 0.5;

            float seed = aVoxelUV.w * 6.2831853;
            vec3 scatterPos = surf * 1.65 + vec3(
              cos(seed * 3.0) * 3.2,
              sin(seed * 5.0) * 2.6,
              sin(seed * 7.0) * 5.5 - 3.0
            );
            finalPos = mix(scatterPos, twisted, uMorph);
          } else {
            // 720 Orbital 3D Cubes reacting to video colors and music
            float seed = aVoxelUV.w * 6.2831853;
            float ringLayer = aVoxelUV.y;
            float speed = (0.22 + ringLayer * 0.30) * (1.0 + uBass * 0.45);
            float angle = aVoxelUV.x * 6.2831853 + uTime * speed * (ringLayer > 0.5 ? 1.0 : -1.0);

            float radius = aVoxelRest.x + sin(uTime * 1.05 + seed * 4.0) * (0.45 + uBass * 0.85);
            float orbitY = aVoxelRest.y + cos(angle * 2.0 + seed) * (0.55 + uMid * 0.75);
            float orbitZ = aVoxelRest.z + sin(angle * 1.5 + seed * 2.0) * (1.1 + uBass * 0.9);

            float rA = uTime * (1.2 + ringLayer * 1.5) + seed;
            float ca = cos(rA);
            float sa = sin(rA);
            vec3 rotVox = vec3(
              transformed.x * ca - transformed.z * sa,
              transformed.y,
              transformed.x * sa + transformed.z * ca
            );
            float cb = cos(rA * 0.7);
            float sb = sin(rA * 0.7);
            rotVox = vec3(
              rotVox.x,
              rotVox.y * cb - rotVox.z * sb,
              rotVox.y * sb + rotVox.z * cb
            );

            float cubeScale = aVoxelRest.w * (0.72 + 0.45 * sin(uTime * 2.8 + seed * 5.0) + uBass * 0.55 + uHigh * 0.35);
            vox = rotVox * cubeScale;

            vec3 orbitPos = vec3(cos(angle) * radius, orbitY, orbitZ);
            finalPos = mix(orbitPos * 1.8, orbitPos, uMorph);
          }

          vec4 mvPosition = modelViewMatrix * vec4(finalPos + vox, 1.0);
          gl_Position = projectionMatrix * mvPosition;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D uScreenTex;
          uniform float uTime;
          uniform float uColorMode;
          uniform float uBass;
          uniform float uMid;
          uniform float uHigh;
          uniform vec3 uDominantColor;
          uniform vec3 uSecondaryColor;
          varying vec4 vVoxelUV;
          varying vec3 vLocalNormal;
          varying float vSalMask;
          varying float vChamferDepth;
          varying float vMotionEdge;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          if (vVoxelUV.z < 0.5) {
            vec3 vidCol = texture2D(uScreenTex, vVoxelUV.xy).rgb;
            float luma = dot(vidCol, vec3(0.299, 0.587, 0.114));

            // Color profile grading
            if (uColorMode > 0.5 && uColorMode < 1.5) {
              // Vibrante HDR: boost saturation & contrast
              vidCol = mix(vec3(luma), vidCol, 1.45);
              vidCol = pow(max(vec3(0.0), vidCol), vec3(0.92));
            } else if (uColorMode > 1.5 && uColorMode < 2.5) {
              // Neon Synthwave: remap luminance + chromatic boost
              vec3 neonGrad = mix(vec3(0.06, 0.14, 0.42), vec3(0.12, 0.88, 0.98), smoothstep(0.12, 0.65, luma));
              neonGrad = mix(neonGrad, vec3(0.95, 0.25, 0.85), smoothstep(0.55, 0.95, luma));
              vidCol = mix(neonGrad, vidCol * 1.35, 0.48);
            } else if (uColorMode > 2.5) {
              // Alto Contraste P&B
              float bw = smoothstep(0.38, 0.62, luma);
              vidCol = vec3(bw);
            }

            bool isFrontOrBack = abs(vLocalNormal.z) > 0.55;
            if (isFrontOrBack) {
              vec3 baseTone = vec3(0.025) + vidCol * 0.94;
              vec3 rimTint = mix(uDominantColor, uSecondaryColor, vChamferDepth);
              diffuseColor.rgb = baseTone + rimTint * (vMotionEdge * (0.24 + uHigh * 0.36));
            } else {
              // Extruded 3D side walls inherit the pixel's true RGB color shaded by depth!
              vec3 prismTint = mix(vidCol * 0.85, mix(uDominantColor, uSecondaryColor, vChamferDepth), 0.28);
              float sideBoost = 0.26 + vSalMask * (0.55 + luma * 0.30) + uBass * 0.20;
              diffuseColor.rgb = prismTint * sideBoost;
            }
          } else {
            // Orbital 3D cubes dynamically adopt the video's live dominant & secondary colors
            float seed = vVoxelUV.w * 6.2831853;
            float pulse = 0.5 + 0.5 * sin(uTime * 2.4 + seed * 3.0);
            vec3 col = mix(uDominantColor * 0.45, uSecondaryColor * 0.85, pulse);
            col = mix(col, uDominantColor * 1.25, (0.25 + uHigh * 0.55) * (0.5 + 0.5 * cos(seed * 7.0 - uTime * 2.0)));
            diffuseColor.rgb = col * (0.48 + uBass * 0.65);
          }`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          if (vVoxelUV.z < 0.5) {
            totalEmissiveRadiance += diffuseColor.rgb * (0.14 + vSalMask * 0.14 + vMotionEdge * 0.16);
          } else {
            totalEmissiveRadiance += diffuseColor.rgb * (0.35 + uBass * 0.35);
          }`
        );
    };

    material.customProgramCacheKey = () => 'universal-voxel-3d-player-v3';
    material.needsUpdate = true;
  }

  _buildVoxelMesh() {
    const prevPos = this.voxelMesh ? this.voxelMesh.position.clone() : this._stageCenter.clone();
    const prevRot = this.voxelMesh ? this.voxelMesh.rotation.clone() : new THREE.Euler();

    if (this.voxelMesh) {
      this.stageGroup.remove(this.voxelMesh);
      this.voxelMesh.geometry.dispose();
      this.voxelMesh = null;
    }

    if (!this.voxelMaterial) {
      this.voxelMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.34,
        metalness: 0.26
      });
      this._patchVoxelShader(this.voxelMaterial);
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const voxelUVs = new Float32Array(this.totalVoxelCount * 4);
    const voxelRest = new Float32Array(this.totalVoxelCount * 4);

    const width = 11.2;
    const height = 8.4;
    const stepX = width / this.cols;
    const stepY = height / this.rows;
    const cubeSize = Math.min(stepX, stepY) * 0.87;

    let idx = 0;
    for (let r = 0; r < this.rows; r++) {
      const v = (r + 0.5) / this.rows;
      const y = (v - 0.5) * height;
      for (let c = 0; c < this.cols; c++) {
        const u = (c + 0.5) / this.cols;
        const x = (u - 0.5) * width;
        const seed = ((c * 73856093) ^ (r * 19349663)) >>> 0;
        const normSeed = (seed % 10000) / 10000;

        const o = idx * 4;
        voxelUVs[o] = u;
        voxelUVs[o + 1] = v;
        voxelUVs[o + 2] = 0.0;
        voxelUVs[o + 3] = normSeed;

        voxelRest[o] = x;
        voxelRest[o + 1] = y;
        voxelRest[o + 2] = 0.0;
        voxelRest[o + 3] = cubeSize;
        idx++;
      }
    }

    for (let i = 0; i < this.orbitalVoxelCount; i++) {
      const t = i / this.orbitalVoxelCount;
      const layer = (i % 7) / 6;
      const radius = 7.6 + (i % 31) * 0.28;
      const baseY = (((i * 43) % 101) / 100 - 0.5) * 12.0;
      const baseZ = -1.5 - ((i * 17) % 37) * 0.25;
      const size = 0.075 + (i % 5) * 0.025;
      const seed = ((i * 83492791) >>> 0) % 10000 / 10000;

      const o = idx * 4;
      voxelUVs[o] = t;
      voxelUVs[o + 1] = layer;
      voxelUVs[o + 2] = 1.0;
      voxelUVs[o + 3] = seed;

      voxelRest[o] = radius;
      voxelRest[o + 1] = baseY;
      voxelRest[o + 2] = baseZ;
      voxelRest[o + 3] = size;
      idx++;
    }

    boxGeo.setAttribute('aVoxelUV', new THREE.InstancedBufferAttribute(voxelUVs, 4));
    boxGeo.setAttribute('aVoxelRest', new THREE.InstancedBufferAttribute(voxelRest, 4));

    this.voxelMesh = new THREE.InstancedMesh(boxGeo, this.voxelMaterial, this.totalVoxelCount);
    this.voxelMesh.frustumCulled = false;
    this.voxelMesh.position.copy(prevPos);
    this.voxelMesh.rotation.copy(prevRot);

    const matArr = this.voxelMesh.instanceMatrix.array;
    for (let i = 0; i < this.totalVoxelCount; i++) {
      const o = i * 16;
      matArr[o] = 1;
      matArr[o + 5] = 1;
      matArr[o + 10] = 1;
      matArr[o + 15] = 1;
    }
    this.voxelMesh.instanceMatrix.needsUpdate = true;
    this.stageGroup.add(this.voxelMesh);
  }

  _buildReactiveEnvironment() {
    const scene = this.engine.scene;
    this.stageGroup = new THREE.Group();
    this.stageGroup.visible = false;
    scene.add(this.stageGroup);

    // 1) Living Panoramic Sky Dome (360-degree reactive shader driven by live video texture & motion)
    const domeGeo = new THREE.SphereGeometry(68, 48, 32);
    const domeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.sharedUniforms,
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uScreenTex;
        uniform sampler2D uAnalysisTex;
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uHigh;
        uniform float uBeatPulse;
        uniform vec2 uCentroid;
        uniform vec2 uVelocity;
        uniform float uMotion;
        uniform float uAvgLuma;
        uniform float uDomeExposure;
        uniform vec3 uDominantColor;
        uniform vec3 uSecondaryColor;
        varying vec3 vWorldDir;

        void main() {
          vec3 d = normalize(vWorldDir);
          float azimuth = atan(d.x, -d.z) / 3.14159265; // -1..1 (0 = straight ahead)
          float elev = d.y; // -1..1

          // Shift center of radial energy flow with on-screen action centroid
          vec2 focusCenter = vec2((uCentroid.x - 0.5) * 0.45, (0.5 - uCentroid.y) * 0.35);
          vec2 p = vec2(azimuth * 1.35, elev * 1.15) - focusCenter;

          float r = length(p);
          float ang = atan(p.y, p.x);

          // Continuous outward radial advection waves synchronized with motion & bass
          float flowSpeed = 0.14 + uMotion * 0.28 + uBass * 0.22;
          float waveCoord = fract(r * 0.55 - uTime * flowSpeed + sin(ang * 4.0 + uTime * 0.6) * 0.04);

          vec2 sampleUV = vec2(
            clamp(0.5 + cos(ang) * waveCoord * 0.48 + uVelocity.x * 0.08, 0.01, 0.99),
            clamp(0.5 + sin(ang) * waveCoord * 0.48 - uVelocity.y * 0.08, 0.01, 0.99)
          );

          vec3 vidSample = texture2D(uScreenTex, sampleUV).rgb;
          vec4 salSample = texture2D(uAnalysisTex, sampleUV);

          // Deep cosmic base + color-adaptive aura
          vec3 deepSpace = vec3(0.012, 0.018, 0.042);
          vec3 aura = mix(uDominantColor, uSecondaryColor, 0.5 + 0.5 * sin(ang * 2.0 + r * 3.0 - uTime * 0.8));

          // Expanding pulse rings triggered by beats & screen motion
          float pulseRing = smoothstep(0.86, 1.0, sin(r * 14.0 - uTime * (2.6 + uBass * 3.0)));
          float edgeEcho = salSample.g * (0.28 + uMotion * 0.35) + salSample.a * 0.35;

          // Subtle panoramic latitude/longitude energy lattice
          float gridX = smoothstep(0.96, 1.0, abs(sin((azimuth + uVelocity.x * 0.15) * 25.1327)));
          float gridY = smoothstep(0.96, 1.0, abs(sin((elev - uTime * 0.05) * 18.8495)));
          float lattice = max(gridX, gridY) * (0.08 + uMid * 0.16);

          // Auto-exposure balanced by screen pixel coverage (prevents flashbang & avoids pitch black)
          float expGain = uDomeExposure;

          vec3 col = deepSpace;
          col += vidSample * (0.36 * expGain + uBass * 0.08 * min(expGain, 1.0));
          col += aura * (
            0.12 * clamp(expGain, 0.45, 1.45) +
            edgeEcho * (0.28 * expGain) +
            pulseRing * (0.14 + uBeatPulse * 0.22) * clamp(expGain, 0.35, 1.35)
          );
          col += mix(uDominantColor, vec3(1.0), 0.35) * lattice * clamp(expGain, 0.35, 1.30);

          // Horizon glow
          float horizon = exp(-abs(elev + 0.15) * 4.5);
          col += aura * horizon * (0.14 + uBass * 0.16) * clamp(expGain, 0.40, 1.35);

          // Soft Reinhard highlight compression so bright flashes never exceed bloom threshold
          col = col / (1.0 + col * 1.15);

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.reactiveDome = new THREE.Mesh(domeGeo, domeMat);
    this.stageGroup.add(this.reactiveDome);

    // 2) Dedicated Stage Lights
    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 1.45);
    keyLight.position.set(7, 11, 12);
    this.stageGroup.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.15);
    rimLight.position.set(-10, -6, 6);
    this.stageGroup.add(rimLight);

    this.silhouetteLight = new THREE.PointLight(0x38bdf8, 3.2, 24, 1.4);
    this.silhouetteLight.position.set(0, 0, -1.5);
    this.stageGroup.add(this.silhouetteLight);

    // 3) 3D Voxel InstancedMesh (driven by Base ^ Exponent + 720 orbital cubes)
    this._buildVoxelMesh();

    // 4) Portal frame around the main video: aligned to the voxel screen, never floating independently.
    this._buildPortalFrame();

    // 4) Color-Reactive Geometric Torus Rings
    this.stageRings = [];
    const ringSpecs = [
      { radius: 8.8, tube: 0.022, x: 0.24, y: 0.08, z: -8.5 },
      { radius: 11.4, tube: 0.017, x: -0.32, y: 0.25, z: -11.5 },
      { radius: 14.2, tube: 0.014, x: 0.44, y: -0.18, z: -14.5 },
      { radius: 17.5, tube: 0.012, x: -0.18, y: -0.28, z: -17.5 }
    ];
    for (const spec of ringSpecs) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(spec.radius, spec.tube, 6, 128),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.36 })
      );
      ring.rotation.set(spec.x, spec.y, 0);
      ring.position.set(0, 0, spec.z);
      this.stageGroup.add(ring);
      this.stageRings.push(ring);
    }

    // 5) Parallax Wireframe Monoliths
    this.stageMonoliths = [];
    const monolithMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.26
    });
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      const depth = -2.5 - Math.floor(i / 2) * 2.8;
      const heightM = 4.6 + (i % 3) * 1.5;
      const geo = new THREE.BoxGeometry(0.24 + (i % 3) * 0.1, heightM, 0.34);
      const pillar = new THREE.Mesh(geo, monolithMat);
      pillar.position.set(side * (9.4 + (i % 3) * 1.25), (i % 4 - 1.5) * 0.55, depth);
      pillar.userData.baseY = pillar.position.y;
      pillar.rotation.z = side * (0.04 + (i % 3) * 0.02);
      this.stageGroup.add(pillar);
      this.stageMonoliths.push(pillar);
    }

    // 6) Perspective Floor Grid
    this.stageGrid = new THREE.GridHelper(84, 52, 0x38bdf8, 0x0f172a);
    this.stageGrid.position.set(0, -5.8, -7.5);
    this.stageGrid.material.transparent = true;
    this.stageGrid.material.opacity = 0.24;
    this.stageGroup.add(this.stageGrid);
  }

  _buildPortalFrame() {
    this.portalFrame = new THREE.Group();
    this.portalFrame.position.set(0, 0, -0.42);
    const width = 11.45;
    const height = 8.65;
    const rail = 0.13;
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, metalness: 0.72, roughness: 0.24,
      emissive: 0x123b68, emissiveIntensity: 0.85
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, transparent: true, opacity: 0.32,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const makeRail = (w, h, x, y, z, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), material);
      mesh.position.set(x, y, z);
      this.portalFrame.add(mesh);
      return mesh;
    };
    // Main solid frame rails, with a second soft light outline.
    makeRail(width, rail, 0, height / 2, 0, frameMat);
    makeRail(width, rail, 0, -height / 2, 0, frameMat);
    makeRail(rail, height, -width / 2, 0, 0, frameMat);
    makeRail(rail, height, width / 2, 0, 0, frameMat);
    const glowW = width + 0.32, glowH = height + 0.32, glowR = 0.055;
    makeRail(glowW, glowR, 0, glowH / 2, -0.08, glowMat);
    makeRail(glowW, glowR, 0, -glowH / 2, -0.08, glowMat);
    makeRail(glowR, glowH, -glowW / 2, 0, -0.08, glowMat);
    makeRail(glowR, glowH, glowW / 2, 0, -0.08, glowMat);

    // Corner accents / portal nodes.
    this.portalNodes = [];
    const nodeGeo = new THREE.SphereGeometry(0.105, 12, 8);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x9be7ff });
    for (const [x, y] of [[-width/2, -height/2], [-width/2, height/2], [width/2, -height/2], [width/2, height/2]]) {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(x, y, 0.03);
      this.portalFrame.add(node);
      this.portalNodes.push(node);
    }
    this.stageGroup.add(this.portalFrame);
    this.portalFrame.userData.glowMaterial = glowMat;
    this.portalFrame.userData.frameMaterial = frameMat;
  }

  _renderDemoFrame(timeSec) {
    const w = this.frameCanvas.width;
    const h = this.frameCanvas.height;
    const ctx = this.frameCtx;

    // Vivid color-cycling geometric kaleidoscope demo when no MP4 is loaded yet
    const hueBase = (timeSec * 28) % 360;
    const grad = ctx.createRadialGradient(
      w * (0.5 + 0.15 * Math.sin(timeSec * 0.8)),
      h * (0.5 + 0.15 * Math.cos(timeSec * 0.6)),
      10,
      w * 0.5,
      h * 0.5,
      w * 0.65
    );
    grad.addColorStop(0, `hsl(${hueBase}, 82%, 14%)`);
    grad.addColorStop(1, `hsl(${(hueBase + 140) % 360}, 75%, 4%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(timeSec * 0.45);

    const scale = Math.min(w, h) / 216;
    const rings = 3;
    for (let r = 1; r <= rings; r++) {
      const radius = r * (Math.min(w, h) * 0.11) + Math.sin(timeSec * 3.5 + r) * 8 * scale;
      const count = 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + timeSec * (r % 2 === 0 ? -0.7 : 0.7);
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        ctx.fillStyle = `hsl(${(hueBase + r * 55 + i * 25) % 360}, 92%, 62%)`;
        ctx.beginPath();
        ctx.arc(px, py, (14 - r * 2.5) * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Central pulsing core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, (18 + Math.sin(timeSec * 4.3) * 4) * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  update(dt) {
    if (!this.active) return;

    let timeSec = 0;
    let isPlaying = false;

    if (this.hasVideo && this.videoEl) {
      timeSec = this.videoEl.currentTime || 0;
      isPlaying = !this.videoEl.paused && !this.videoEl.ended;

      if (this.videoEl.readyState >= 2) {
        this.frameCtx.drawImage(this.videoEl, 0, 0, this.frameCanvas.width, this.frameCanvas.height);
        this.screenTexture.needsUpdate = true;
      }

      if (this.timeCurEl) this.timeCurEl.textContent = this._formatTime(timeSec);
      if (this.seekBarEl && document.activeElement !== this.seekBarEl) {
        this.seekBarEl.value = timeSec.toFixed(2);
      }
    } else {
      if (this.demoPlaying) this.demoTime += dt;
      timeSec = this.demoTime;
      isPlaying = this.demoPlaying;

      this._renderDemoFrame(timeSec);
      this.screenTexture.needsUpdate = true;

      if (this.timeCurEl) this.timeCurEl.textContent = this._formatTime(timeSec);
      if (this.seekBarEl && document.activeElement !== this.seekBarEl) {
        this.seekBarEl.value = (timeSec % 100).toFixed(2);
      }
    }

    // 1) Extract real-time audio spectrum & beat pulse from MP4 soundtrack
    const energy = this.audio.updateEnergy(dt, this.hasVideo, isPlaying);

    // 2) Analyze live video frame for color palette, saliency, motion & 2.5D depth
    this.analyzer.update(this.frameCanvas, dt);
    const tel = this.analyzer.telemetry;
    const exposureNorm = THREE.MathUtils.clamp((tel.domeExposure - 0.22) / (1.65 - 0.22), 0, 1);

    // Spatial stereo pan follows on-screen action centroid
    this.audio.setStereoPan((tel.centroidX - 0.5) * 1.1);

    if (isPlaying || this.morphProgress < 1) {
      this.morphProgress = Math.min(1, this.morphProgress + dt * 0.72);
    }

    const intensity = THREE.MathUtils.clamp(
      energy.bass * 0.58 + energy.mid * 0.24 + energy.high * 0.18 + tel.motionEnergy * 0.24,
      0,
      1
    );
    this.bloomStrength = (0.26 + intensity * 0.24 + energy.beatPulse * 0.10) * (0.68 + 0.32 * exposureNorm);

    // 3) Stage geometry motion
    const isSculpt = this.stageMode === 'sculpt';
    const isCurved = this.stageMode === 'curved';
    const sculptFactor = isSculpt ? 1.0 : 0.0;

    let pathX = isSculpt ? Math.sin(timeSec * 0.30) * 1.55 : 0;
    let pathY = isSculpt ? Math.sin(timeSec * 0.22) * 0.62 : 0;
    let pathZ = -4.5 + (isSculpt ? Math.sin(timeSec * 0.18) * 0.42 : 0);

    this._stageTarget.set(pathX, pathY, pathZ);
    const follow = 1 - Math.exp(-dt * 2.6);
    this.voxelMesh.position.lerp(this._stageTarget, follow);

    const targetRotY = (tel.focusX * -0.24 + Math.sin(timeSec * 0.22) * 0.12) * sculptFactor;
    const targetRotX = (tel.focusY * 0.18 + Math.sin(timeSec * 0.17) * 0.05) * sculptFactor;
    const targetRotZ = (Math.sin(timeSec * 0.26) * 0.035 + energy.mid * 0.025) * sculptFactor;

    this.voxelMesh.rotation.y += (targetRotY - this.voxelMesh.rotation.y) * follow;
    this.voxelMesh.rotation.x += (targetRotX - this.voxelMesh.rotation.x) * follow;
    this.voxelMesh.rotation.z += (targetRotZ - this.voxelMesh.rotation.z) * follow;

    // 4) Dynamic light & environment colors synced to live video palette
    if (this.silhouetteLight) {
      this.silhouetteLight.position.set(
        this.voxelMesh.position.x + tel.focusX * 6.5,
        this.voxelMesh.position.y + tel.focusY * 4.8,
        this.voxelMesh.position.z + 3.6
      );
      this.silhouetteLight.intensity = (2.2 + energy.bass * 2.1 + tel.motionEnergy * 1.2) * (0.62 + 0.38 * exposureNorm);
      this.silhouetteLight.color.copy(tel.dominantColor);
    }

    // Keep the portal rigidly attached to the video screen transform.
    if (this.portalFrame && this.voxelMesh) {
      this.portalFrame.position.copy(this.voxelMesh.position);
      this.portalFrame.rotation.copy(this.voxelMesh.rotation);
      this.portalFrame.position.z += -0.42;
      const pulse = 0.65 + energy.beatPulse * 1.25 + energy.bass * 0.35;
      this.portalFrame.userData.frameMaterial.emissive.copy(tel.dominantColor).multiplyScalar(0.42 + pulse * 0.3);
      this.portalFrame.userData.frameMaterial.color.copy(tel.dominantColor);
      this.portalFrame.userData.glowMaterial.color.copy(tel.secondaryColor);
      this.portalFrame.userData.glowMaterial.opacity = 0.18 + pulse * 0.17;
      this.portalNodes?.forEach((node, i) => {
        node.scale.setScalar(0.82 + energy.beatPulse * 0.7 + 0.12 * Math.sin(timeSec * 2 + i));
        node.material.color.copy(i % 2 ? tel.secondaryColor : tel.dominantColor);
      });
    }

    this.stageRings.forEach((ring, i) => {
      ring.rotation.x += dt * (0.04 + i * 0.015) * (i % 2 ? -1 : 1);
      ring.rotation.y += dt * (0.06 + i * 0.02) * (i % 2 ? 1 : -1);
      ring.material.opacity = (0.20 + intensity * 0.24) * (0.55 + 0.45 * exposureNorm);
      ring.material.color.copy(i % 2 === 0 ? tel.dominantColor : tel.secondaryColor);
    });

    this.stageMonoliths.forEach((pillar, i) => {
      pillar.rotation.y = Math.sin(timeSec * 0.22 + i) * 0.18;
      pillar.position.y = pillar.userData.baseY + Math.sin(timeSec * 0.28 + i * 1.6) * 0.34;
      if (i === 0) {
        pillar.material.color.copy(tel.dominantColor);
      }
    });

    if (this.stageGrid && Array.isArray(this.stageGrid.material)) {
      this.stageGrid.material[0]?.color?.copy(tel.dominantColor);
    } else if (this.stageGrid?.material?.color) {
      this.stageGrid.material.color.copy(tel.dominantColor);
    }

    // 5) Update shared GPU uniforms
    const u = this.sharedUniforms;
    u.uTime.value = timeSec;
    u.uMorph.value = 1 - Math.pow(1 - this.morphProgress, 3);
    u.uSculptMode.value = sculptFactor;
    u.uBass.value = energy.bass;
    u.uMid.value = energy.mid;
    u.uHigh.value = energy.high;
    u.uBeatPulse.value = energy.beatPulse;
    u.uCentroid.value.set(tel.centroidX, tel.centroidY);
    u.uVelocity.value.set(tel.velocityX, tel.velocityY);
    u.uMotion.value = tel.motionEnergy;
    u.uAvgLuma.value = tel.avgLuma;
    u.uDomeExposure.value = tel.domeExposure;
    u.uColorfulness.value = tel.colorfulness;
    u.uDominantColor.value.copy(tel.dominantColor);
    u.uSecondaryColor.value.copy(tel.secondaryColor);

    if (isSculpt) {
      u.uReliefScale.value = (1.42 + energy.bass * 0.78 + tel.motionEnergy * 0.35) * this.reliefMultiplier;
      u.uCurveDepth.value = 0.62 + energy.mid * 0.28;
      u.uWaveAmp.value = 0.28 + tel.motionEnergy * 0.38;
      u.uTwistAmp.value = 0.15 + Math.sin(timeSec * 0.35) * 0.12;
    } else if (isCurved) {
      u.uReliefScale.value = (1.15 + energy.bass * 0.45) * this.reliefMultiplier;
      u.uCurveDepth.value = 0.85;
      u.uWaveAmp.value = 0.0;
      u.uTwistAmp.value = 0.0;
    } else {
      u.uReliefScale.value = (0.95 + energy.bass * 0.35) * this.reliefMultiplier;
      u.uCurveDepth.value = 0.0;
      u.uWaveAmp.value = 0.0;
      u.uTwistAmp.value = 0.0;
    }

    // 6) Update critically damped spring camera rig (desktop only; VR uses headset pose)
    const inVR = Boolean(this.engine?.webxr?.isPresenting);
    if (!inVR) {
      this.cameraRig.update(
      dt,
      timeSec,
      this.voxelMesh.position,
      energy,
      tel,
      this.stageMode,
      this.engine.camera,
      this.engine.controls
    );
    }

    if (this.shotEl) {
      this.shotEl.textContent = `${this.cameraRig.getCurrentShotLabel()} · ${this.cameraRig.mode === 'idle' ? 'controles liberados para ajustes' : (this.cameraRig._decisionReason || 'direção automática')}`;
    }
  }
}