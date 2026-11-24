import * as THREE from 'three';
import { BadAppleAudioSynth, TOTAL_DURATION } from './badAppleAudio.js';
import { BadAppleAnimator } from './badAppleFrames.js';

export class BadAppleDirector {
  constructor(engine) {
    this.engine = engine;
    this.audio = new BadAppleAudioSynth();
    this.animator = new BadAppleAnimator();

    this.active = false;
    this.roomMode = true; // true = Dentro do Cubo 4D (6 paredes), false = Tela Plana 4:3
    this.morphProgress = 0;
    this.cols = 32;
    this.rows = 24;
    this.screenCount = 768;

    this.screenTexture = new THREE.CanvasTexture(this.animator.canvas);
    this.screenTexture.wrapS = THREE.RepeatWrapping;
    this.screenTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.screenTexture.minFilter = THREE.LinearFilter;
    this.screenTexture.magFilter = THREE.NearestFilter;
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;

    // Estado da câmera interna
    this.camYaw = 0;
    this.camPitch = 0;
    this.camRoll = 0;
    this.camOffset = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
    this._upVec = new THREE.Vector3(0, 1, 0);

    // Backup do estado anterior do motor
    this._savedCameraPos = new THREE.Vector3();
    this._savedCameraTarget = new THREE.Vector3();
    this._savedFov = 50;
    this._savedBloom = 0.42;
    this._savedClip = 10;
    this._savedMathUI = null;
    this._userInteracting = false;

    this._buildHUD();
    this._bindKeyboard();
  }

  _buildHUD() {
    if (document.getElementById('bad-apple-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'bad-apple-hud';
    hud.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      display: none;
      flex-direction: column;
      gap: 8px;
      width: min(620px, 94vw);
      padding: 12px 16px;
      border-radius: 14px;
      background: rgba(6, 10, 20, 0.86);
      border: 1px solid rgba(248, 250, 252, 0.24);
      backdrop-filter: blur(12px);
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.7);
    `;

    hud.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:16px;">🍎</span>
          <strong style="font-size:13px; letter-spacing:0.3px;">BAD APPLE!! 4D</strong>
          <span id="ba-section-label" style="font-size:11px; color:#94a3b8;">Intro</span>
        </div>
        <span id="ba-res-badge" style="font-size:11px; color:#38bdf8; font-weight:600;">0×0 px</span>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <span id="ba-time-cur" style="font-size:11px; font-variant-numeric:tabular-nums; color:#cbd5e1;">00:00</span>
        <input id="ba-seek-bar" type="range" min="0" max="${TOTAL_DURATION.toFixed(1)}" step="0.1" value="0" style="flex:1; accent-color:#f8fafc; cursor:pointer;" />
        <span id="ba-time-tot" style="font-size:11px; font-variant-numeric:tabular-nums; color:#94a3b8;">03:42</span>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
        <button id="ba-mode-btn" type="button" style="font-size:11px; font-weight:600; padding:5px 10px; border-radius:8px; border:1px solid rgba(56,189,248,0.45); background:rgba(56,189,248,0.16); color:#e0f2fe; cursor:pointer;">
          🧊 Cubo 4D Interno
        </button>

        <button id="ba-autocam-btn" type="button" style="font-size:11px; font-weight:600; padding:5px 10px; border-radius:8px; border:1px solid rgba(192,132,252,0.45); background:rgba(192,132,252,0.18); color:#f3e8ff; cursor:pointer;">
          🎥 Auto-Câmera 4D: ON
        </button>

        <label style="font-size:11px; padding:5px 10px; border-radius:8px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); cursor:pointer;">
          🎬 MP4
          <input id="ba-video-input" type="file" accept="video/*" style="display:none;" />
        </label>

        <div style="display:flex; align-items:center; gap:5px; font-size:11px;">
          <span>Vol</span>
          <input id="ba-vol-input" type="range" min="0" max="1" step="0.05" value="0.68" style="width:62px; accent-color:#f8fafc;" />
        </div>

        <button id="ba-stop-btn" type="button" style="font-size:11px; font-weight:600; padding:5px 11px; border-radius:8px; border:none; background:#ef4444; color:#fff; cursor:pointer;">
          Encerrar
        </button>
      </div>
    `;

    document.body.appendChild(hud);

    this.hudEl = hud;
    this.sectionEl = document.getElementById('ba-section-label');
    this.resBadgeEl = document.getElementById('ba-res-badge');
    this.timeCurEl = document.getElementById('ba-time-cur');
    this.seekBarEl = document.getElementById('ba-seek-bar');
    this.modeBtnEl = document.getElementById('ba-mode-btn');
    this.autoCamBtnEl = document.getElementById('ba-autocam-btn');
    this.volInputEl = document.getElementById('ba-vol-input');
    this.videoInputEl = document.getElementById('ba-video-input');
    this.stopBtnEl = document.getElementById('ba-stop-btn');

    this.seekBarEl.addEventListener('input', (e) => {
      this.audio.seek(parseFloat(e.target.value) || 0);
    });

    this.volInputEl.addEventListener('input', (e) => {
      this.audio.setVolume(parseFloat(e.target.value));
    });

    this.modeBtnEl.addEventListener('click', () => {
      this.roomMode = !this.roomMode;
      this.modeBtnEl.textContent = this.roomMode ? '🧊 Cubo 4D Interno' : '🖥️ Tela Cinema 4:3';
      this.morphProgress = 0.15;
      this._userInteracting = false;
      this._updateAutoCamBadge();
      this._computeScreenLayout();
    });

    this.autoCamBtnEl.addEventListener('click', () => {
      this._userInteracting = !this._userInteracting;
      this._updateAutoCamBadge();
    });

    this.videoInputEl.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await this.animator.attachVideoFile(file);
        this.audio.seek(0);
      } catch (err) {
        console.error('[BadApple] Falha ao carregar vídeo:', err);
      }
    });

    this.stopBtnEl.addEventListener('click', () => this.stop());

    this.engine.controls?.addEventListener('start', () => {
      if (this.active && !this._userInteracting) {
        this._userInteracting = true;
        this._updateAutoCamBadge();
      }
    });
  }

  _updateAutoCamBadge() {
    if (!this.autoCamBtnEl) return;
    if (!this._userInteracting) {
      this.autoCamBtnEl.textContent = '🎥 Auto-Câmera 4D: ON';
      this.autoCamBtnEl.style.opacity = '1';
    } else {
      this.autoCamBtnEl.textContent = '🖱️ Câmera Livre (Reativar)';
      this.autoCamBtnEl.style.opacity = '0.82';
    }
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.audio.seek(this.audio.getCurrentTime() + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.audio.seek(this.audio.getCurrentTime() - 5);
      }
    });
  }

  toggle() {
    if (this.active) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.morphProgress = 0;
    this._userInteracting = false;
    this.camYaw = 0;
    this.camPitch = 0;
    this.camRoll = 0;
    this.camOffset.set(0, 0, 0);
    this._updateAutoCamBadge();

    if (this.engine.instancedMesh) {
      this.engine.instancedMesh.frustumCulled = false;
    }

    this._savedCameraPos.copy(this.engine.camera.position);
    this._savedCameraTarget.copy(this.engine.controls.target);
    this._savedFov = this.engine.camera.fov;
    this._savedBloom = this.engine.baseBloomStrength;
    this._savedClip = this.engine.clipPlane.constant;

    this.engine.rootGroup.rotation.set(0, 0, 0);
    this.engine.clipPlane.constant = 80;
    this.engine.baseBloomStrength = 0.03;
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = 0.03;
    }

    const u = this.engine.gpuUniforms;
    u.uMosaicEnabled.value = 0.0;
    u.uMacroFaceCull.value = 0.0;
    u.uBadAppleMode.value = 1.0;
    u.uBadAppleTex.value = this.screenTexture;
    u.uBadAppleMorph.value = 0.0;

    // Garante no mínimo 6^5 = 7.776 voxels (36x36 por parede) para o vídeo ficar nítido
    this._savedMathUI = null;
    if (this.engine.getBlockCount() < 6000) {
      const baseEl = document.getElementById('base-input');
      const expEl = document.getElementById('exp-input');
      const filterEl = document.getElementById('filter-select');
      if (baseEl && expEl && filterEl) {
        this._savedMathUI = {
          base: baseEl.value,
          exp: expEl.value,
          filter: filterEl.value
        };
        baseEl.value = '6';
        expEl.value = '5';
        filterEl.value = 'all';
        baseEl.dispatchEvent(new Event('input'));
      } else {
        this._computeScreenLayout();
      }
    } else {
      this._computeScreenLayout();
    }

    this.audio.start(0);

    if (this.hudEl) this.hudEl.style.display = 'flex';
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.audio.stop();
    this.animator.clearVideo();

    if (this.engine.instancedMesh) {
      this.engine.instancedMesh.frustumCulled = true;
    }

    if (this.hudEl) this.hudEl.style.display = 'none';
    if (this.videoInputEl) this.videoInputEl.value = '';

    const u = this.engine.gpuUniforms;
    u.uBadAppleMode.value = 0.0;
    u.uBadAppleMorph.value = 0.0;

    this.engine.clipPlane.constant = this._savedClip;
    this.engine.baseBloomStrength = this._savedBloom;
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = this._savedBloom;
    }

    if (this.engine.mosaic?.enabled) {
      u.uMosaicEnabled.value = 1.0;
    }

    if (this._savedMathUI) {
      const baseEl = document.getElementById('base-input');
      const expEl = document.getElementById('exp-input');
      const filterEl = document.getElementById('filter-select');
      if (baseEl && expEl && filterEl) {
        baseEl.value = this._savedMathUI.base;
        expEl.value = this._savedMathUI.exp;
        filterEl.value = this._savedMathUI.filter;
        baseEl.dispatchEvent(new Event('input'));
      }
      this._savedMathUI = null;
    }

    this.engine.camera.fov = this._savedFov;
    this.engine.camera.up.set(0, 1, 0);
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
      this.engine.instancedMesh.frustumCulled = false;
    }
    const u = this.engine.gpuUniforms;
    u.uMosaicEnabled.value = 0.0;
    u.uMacroFaceCull.value = 0.0;
    u.uBadAppleMode.value = 1.0;
    u.uBadAppleTex.value = this.screenTexture;
    this._computeScreenLayout();
  }

  /**
   * Grava os atributos de destino na GPU UMA ÚNICA VEZ.
   * - Modo Cubo 4D Interno: distribui os cubos nas 6 faces internas de uma sala 14×14×14
   *   ao redor da câmera + pilares de energia 4D nos cantos.
   * - Modo Tela 4:3: tela plana frontal 16×12 + moldura externa.
   */
  _computeScreenLayout() {
    const mesh = this.engine.instancedMesh;
    const count = this.engine.getBlockCount();
    if (!mesh || count === 0) return;

    if (!mesh.geometry.getAttribute('aBadApplePos')) {
      mesh.geometry.setAttribute('aBadApplePos', new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
    }
    if (!mesh.geometry.getAttribute('aBadAppleScale')) {
      mesh.geometry.setAttribute('aBadAppleScale', new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
    }
    if (!mesh.geometry.getAttribute('aBadAppleUV')) {
      mesh.geometry.setAttribute('aBadAppleUV', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    }

    const posAttr = mesh.geometry.getAttribute('aBadApplePos');
    const scaleAttr = mesh.geometry.getAttribute('aBadAppleScale');
    const uvAttr = mesh.geometry.getAttribute('aBadAppleUV');

    const posArr = posAttr.array;
    const scaleArr = scaleAttr.array;
    const uvArr = uvAttr.array;

    if (this.roomMode) {
      // 6 paredes internas do cubo
      const perWallBudget = Math.floor(count / 6);
      const side = Math.max(2, Math.floor(Math.sqrt(perWallBudget)));
      const wallBlocks = side * side;
      const usedBlocks = wallBlocks * 6;

      this.cols = Math.min(256, side);
      this.rows = Math.min(192, Math.max(3, Math.round(this.cols * 0.75)));
      this.screenCount = usedBlocks;

      if (this.resBadgeEl) {
        this.resBadgeEl.textContent = `6× (${side}×${side}) = ${usedBlocks.toLocaleString('pt-BR')} voxels`;
      }

      const R = 7.0;
      const roomSpan = R * 2.0;
      const cell = roomSpan / side;
      const boxSize = cell * 0.88;
      const boxDepth = Math.min(0.45, cell * 1.45);

      for (let w = 0; w < 6; w++) {
        const baseIdx = w * wallBlocks;
        for (let k = 0; k < wallBlocks; k++) {
          const idx = baseIdx + k;
          const c = k % side;
          const r = Math.floor(k / side);

          const localU = (c + 0.5) / side;
          const localV = 1.0 - (r + 0.5) / side; // 1 = topo, 0 = base

          const s = (localU - 0.5) * roomSpan; // -R .. +R
          const t = (localV - 0.5) * roomSpan; // -R .. +R

          let x = 0, y = 0, z = 0;
          let sx = boxSize, sy = boxSize, sz = boxSize;

          if (w === 0) {
            // Frente (-Z)
            x = s; y = t; z = -R; sz = boxDepth;
          } else if (w === 1) {
            // Direita (+X)
            x = R; y = t; z = s; sx = boxDepth;
          } else if (w === 2) {
            // Trás (+Z)
            x = -s; y = t; z = R; sz = boxDepth;
          } else if (w === 3) {
            // Esquerda (-X)
            x = -R; y = t; z = -s; sx = boxDepth;
          } else if (w === 4) {
            // Teto (+Y)
            x = s; y = R; z = t; sy = boxDepth;
          } else {
            // Chão (-Y)
            x = s; y = -R; z = -t; sy = boxDepth;
          }

          // Mapeamento esférico contínuo: todas as 6 faces formam UMA única tela 360° sem emendas
          const dist = Math.hypot(x, y, z) || 1.0;
          const u = 0.5 + Math.atan2(x, -z) / (Math.PI * 2.0);
          const v = 0.5 + Math.asin(Math.max(-1.0, Math.min(1.0, y / dist))) / Math.PI;
          const edgeFactor = Math.min(1.0, Math.max(Math.abs(localU - 0.5), Math.abs(localV - 0.5)) * 2.0);

          const p3 = idx * 3;
          posArr[p3] = x;
          posArr[p3 + 1] = y;
          posArr[p3 + 2] = z;

          scaleArr[p3] = sx;
          scaleArr[p3 + 1] = sy;
          scaleArr[p3 + 2] = sz;

          const p4 = idx * 4;
          uvArr[p4] = u;
          uvArr[p4 + 1] = v;
          uvArr[p4 + 2] = w;
          uvArr[p4 + 3] = edgeFactor;
        }
      }

      // Blocos restantes viram pilares 4D nas 12 arestas internas do cubo
      const rem = count - usedBlocks;
      const edges = [
        [-R, -R, 0, 2], [R, -R, 0, 2], [-R, R, 0, 2], [R, R, 0, 2],
        [-R, 0, -R, 1], [R, 0, -R, 1], [-R, 0, R, 1], [R, 0, R, 1],
        [0, -R, -R, 0], [0, R, -R, 0], [0, -R, R, 0], [0, R, R, 0]
      ];
      for (let j = 0; j < rem; j++) {
        const idx = usedBlocks + j;
        const edgeDef = edges[j % 12];
        const slot = Math.floor(j / 12);
        const perEdge = Math.max(1, Math.ceil(rem / 12));
        const along = ((slot + 0.5) / perEdge - 0.5) * roomSpan;

        const p3 = idx * 3;
        posArr[p3] = edgeDef[3] === 0 ? along : edgeDef[0];
        posArr[p3 + 1] = edgeDef[3] === 1 ? along : edgeDef[1];
        posArr[p3 + 2] = edgeDef[3] === 2 ? along : edgeDef[2];

        const pillarSize = Math.max(0.08, Math.min(0.24, 9.0 / Math.sqrt(rem + 1)));
        scaleArr[p3] = pillarSize;
        scaleArr[p3 + 1] = pillarSize;
        scaleArr[p3 + 2] = pillarSize;

        const p4 = idx * 4;
        uvArr[p4] = (slot % perEdge) / perEdge;
        uvArr[p4 + 1] = 0.5;
        uvArr[p4 + 2] = 6.0; // ID 6 = Pilar 4D
        uvArr[p4 + 3] = 1.0;
      }
    } else {
      // Modo Tela Plana 4:3
      const cols = Math.max(1, Math.round(Math.sqrt(count * (4 / 3))));
      const rows = Math.max(1, Math.floor(count / cols));
      const screenCount = cols * rows;

      this.cols = Math.min(256, cols);
      this.rows = Math.min(192, rows);
      this.screenCount = screenCount;

      if (this.resBadgeEl) {
        this.resBadgeEl.textContent = `${cols}×${rows} px (${screenCount.toLocaleString('pt-BR')} voxels)`;
      }

      const screenW = 16.0;
      const screenH = 12.0;
      const cellW = screenW / cols;
      const cellH = screenH / rows;

      for (let i = 0; i < screenCount; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const u = (c + 0.5) / cols;
        const v = 1.0 - (r + 0.5) / rows;
        const edgeFactor = Math.min(1.0, Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2.0);

        const p3 = i * 3;
        posArr[p3] = -screenW * 0.5 + (c + 0.5) * cellW;
        posArr[p3 + 1] = screenH * 0.5 - (r + 0.5) * cellH;
        posArr[p3 + 2] = 0;

        scaleArr[p3] = cellW * 0.92;
        scaleArr[p3 + 1] = cellH * 0.92;
        scaleArr[p3 + 2] = Math.min(0.42, Math.max(cellW, cellH) * 1.4);

        const p4 = i * 4;
        uvArr[p4] = u;
        uvArr[p4 + 1] = v;
        uvArr[p4 + 2] = 0.0;
        uvArr[p4 + 3] = edgeFactor;
      }

      const rem = count - screenCount;
      for (let j = 0; j < rem; j++) {
        const idx = screenCount + j;
        const perim = (j / Math.max(1, rem)) * 4;
        let bx = 0, by = 0;
        if (perim < 1) { bx = -8.6 + perim * 17.2; by = 6.5; }
        else if (perim < 2) { bx = 8.6; by = 6.5 - (perim - 1) * 13.0; }
        else if (perim < 3) { bx = 8.6 - (perim - 2) * 17.2; by = -6.5; }
        else { bx = -8.6; by = -6.5 + (perim - 3) * 13.0; }

        const p3 = idx * 3;
        posArr[p3] = bx;
        posArr[p3 + 1] = by;
        posArr[p3 + 2] = -0.35;

        const bSize = Math.max(0.08, Math.min(0.26, 12 / Math.sqrt(rem + 1)));
        scaleArr[p3] = bSize;
        scaleArr[p3 + 1] = bSize;
        scaleArr[p3 + 2] = bSize;

        const p4 = idx * 4;
        uvArr[p4] = 0.5;
        uvArr[p4 + 1] = 0.5;
        uvArr[p4 + 2] = 6.0;
        uvArr[p4 + 3] = 1.0;
      }
    }

    posAttr.needsUpdate = true;
    scaleAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
  }

  _formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  _syncHyper4DUI(angleXW, angleYW) {
    if (this.engine.hyper4D) {
      this.engine.hyper4D.angleXW = angleXW;
      this.engine.hyper4D.angleYW = angleYW;
    }
    const rotXWInput = document.getElementById('rot-xw-input');
    const rotYWInput = document.getElementById('rot-yw-input');
    if (rotXWInput) rotXWInput.value = Math.round(THREE.MathUtils.radToDeg(angleXW));
    if (rotYWInput) rotYWInput.value = Math.round(THREE.MathUtils.radToDeg(angleYW));
  }

  update(dt) {
    if (!this.active) return;

    const sub = this.engine.subdivisionData;
    if (!sub || sub.count === 0) return;

    const timeSec = this.audio.getCurrentTime();
    if (timeSec >= TOTAL_DURATION - 0.05 && !this.audio.isPlaying) {
      this.stop();
      return;
    }

    const rawEnergy = this.audio.updateVisualEnergy(dt) || {};
    const energy = {
      bass: Number.isFinite(rawEnergy.bass) ? Math.max(0, Math.min(1, rawEnergy.bass)) : 0,
      mid: Number.isFinite(rawEnergy.mid) ? Math.max(0, Math.min(1, rawEnergy.mid)) : 0,
      lead: Number.isFinite(rawEnergy.lead) ? Math.max(0, Math.min(1, rawEnergy.lead)) : 0
    };
    const bar = timeSec / ((60 / 138) * 4);

    if (this.timeCurEl) this.timeCurEl.textContent = this._formatTime(timeSec);
    if (this.seekBarEl && document.activeElement !== this.seekBarEl) {
      this.seekBarEl.value = timeSec.toFixed(1);
    }
    if (this.sectionEl) {
      this.sectionEl.textContent = this.audio.getSectionName(Math.floor(bar));
    }

    // Desenha o frame atual no CanvasTexture 256×192 (upload único de textura para GPU)
    this.animator.sampleFrame(timeSec);
    this.screenTexture.needsUpdate = true;

    // Transição inicial suave de 2.0s dos cubos matemáticos para a sala 4D
    this.morphProgress = Math.min(1, this.morphProgress + dt * 0.5);
    const morphEase = 1 - Math.pow(1 - this.morphProgress, 3);

    // Coreografia 4D sincronizada com a música (dobra as bordas como Tesseract sem distorcer o centro)
    const isPreChorus = (bar >= 40 && bar < 48) || (bar >= 80 && bar < 88);
    const isChorus =
      (bar >= 48 && bar < 64) ||
      (bar >= 88 && bar < 104) ||
      (bar >= 112 && bar < 123);
    const isBridge = bar >= 104 && bar < 112;

    let targetXW = Math.sin(timeSec * 0.55) * 0.38;
    let targetYW = Math.cos(timeSec * 0.42) * 0.32;
    let depth4D = 0.65 + energy.bass * 0.25;
    let lumaW = 0.24 + energy.lead * 0.22;

    if (isPreChorus) {
      const ramp = (bar % 8) / 8;
      targetXW = Math.sin(timeSec * 1.4) * (0.45 + ramp * 0.65);
      targetYW = Math.cos(timeSec * 1.2) * (0.45 + ramp * 0.65);
      depth4D = 0.85 + ramp * 0.55;
    } else if (isChorus) {
      targetXW = Math.sin(timeSec * 0.9) * 0.72;
      targetYW = Math.sin(timeSec * 0.65) * 0.58;
      depth4D = 0.95 + energy.bass * 0.35;
      lumaW = 0.38 + energy.bass * 0.25;
    } else if (isBridge) {
      targetXW = Math.cos(timeSec * 1.8) * 0.85;
      targetYW = Math.sin(timeSec * 1.6) * 0.75;
      depth4D = 1.1;
    } else if (bar >= 123) {
      const settle = Math.max(0, 1 - (bar - 123) / 4);
      targetXW *= settle;
      targetYW *= settle;
      depth4D *= settle;
    }

    // Deslocamento panorâmico contínuo pelas 4 paredes + teto/chão
    let panU = 0.0;
    if (bar >= 8 && bar < 24) {
      // Reimu e Marisa atravessam as 4 paredes do cubo
      panU = -((bar - 8) / 16) * 1.0;
    } else if (bar >= 24 && bar < 40) {
      // Relógio e facas da Sakuya giram pelas paredes
      panU = Math.sin(timeSec * 0.35) * 0.25;
    } else if (bar >= 48 && bar < 64) {
      // Refrão 1: rotação panorâmica contínua da mandala pelas faces
      panU = ((bar - 48) / 16) * 1.0;
    } else if (bar >= 88 && bar < 104) {
      // Refrão 2: ondas lunares percorrendo toda a sala
      panU = -((bar - 88) / 16) * 1.0;
    } else if (bar >= 104 && bar < 112) {
      // Ponte: salto de tela entre faces a cada 2 compassos
      panU = Math.floor((bar - 104) / 2) * 0.25;
    }

    const u = this.engine.gpuUniforms;
    u.uBadAppleMorph.value = morphEase;
    u.uBadAppleRoomMode.value = this.roomMode ? 1.0 : 0.0;
    if (u.uBadApplePanU) u.uBadApplePanU.value = panU;
    u.uBadAppleRelief.value = (this.roomMode ? 0.55 : 0.45) + energy.bass * 0.48;
    u.uBadAppleWave.value = isBridge ? 0.45 : 0.0;
    u.uBadAppleTime.value = timeSec;
    u.uBadAppleBass.value = energy.bass;
    u.uBadAppleLead.value = energy.mid;
    u.uBadAppleAngleXW.value += (targetXW - u.uBadAppleAngleXW.value) * Math.min(1, dt * 5);
    u.uBadAppleAngleYW.value += (targetYW - u.uBadAppleAngleYW.value) * Math.min(1, dt * 5);
    u.uBadApple4DDepth.value = depth4D;
    u.uBadAppleLumaW.value = lumaW;

    this._syncHyper4DUI(u.uBadAppleAngleXW.value, u.uBadAppleAngleYW.value);

    // Coreografia da câmera interna dentro do cubo
    if (!this._userInteracting) {
      if (this.roomMode) {
        let desiredYaw = 0;
        let desiredPitch = 0;
        let desiredRoll = 0;
        let desiredFov = 72 + energy.bass * 3.5;
        let ox = 0, oy = 0, oz = 0;

        if (bar < 8) {
          desiredYaw = Math.sin(timeSec * 0.4) * 0.08;
          desiredRoll = Math.sin(timeSec * 0.5) * 0.04;
        } else if (bar < 24) {
          const rel = bar - 8;
          if (rel < 8) {
            desiredYaw = Math.sin((rel / 8) * Math.PI * 2) * 0.45;
          } else {
            const flight = (rel - 8) / 8;
            desiredYaw = -0.65 + flight * 1.3;
            desiredPitch = Math.sin(flight * Math.PI) * 0.42;
            desiredRoll = Math.cos(flight * Math.PI) * 0.14;
          }
        } else if (bar < 40) {
          desiredYaw = Math.sin(timeSec * 0.75) * 0.85;
          desiredPitch = Math.cos(timeSec * 0.55) * 0.22;
          desiredRoll = Math.sin(timeSec * 1.15) * 0.28;
        } else if (bar < 48) {
          desiredYaw = Math.sin(timeSec * 0.6) * 0.35;
          desiredPitch = 0.18 + Math.sin(timeSec * 2.0) * 0.06;
          desiredFov = 76 + energy.bass * 4.0;
        } else if (bar < 64) {
          desiredYaw = ((bar - 48) / 16) * Math.PI * 2;
          desiredPitch = Math.sin(timeSec * 0.9) * 0.26;
          desiredRoll = Math.sin(timeSec * 0.7) * 0.12;
          ox = Math.sin(timeSec * 0.8) * 0.9;
          oz = Math.cos(timeSec * 0.8) * 0.9;
        } else if (bar < 80) {
          const rel = bar - 64;
          if (rel < 8) {
            const slash = Math.floor(rel / 2);
            desiredYaw = (slash % 2 === 0 ? -1 : 1) * 0.55;
            desiredRoll = (slash % 2 === 0 ? -1 : 1) * 0.22;
          } else {
            const drift = (rel - 8) / 8;
            desiredYaw = Math.sin(drift * Math.PI) * 0.5;
            desiredPitch = 0.55 * (1 - drift * 0.8);
          }
        } else if (bar < 88) {
          desiredYaw = Math.sin(timeSec * 0.8) * 0.25;
          desiredRoll = Math.sin(timeSec * 1.5) * 0.18;
          oz = -Math.min(1.6, ((bar - 80) / 8) * 1.6);
        } else if (bar < 104) {
          desiredYaw = Math.sin(timeSec * 0.52) * Math.PI;
          desiredPitch = Math.sin(timeSec * 1.04) * 0.32;
          ox = Math.cos(timeSec * 0.7) * 0.85;
          oy = Math.sin(timeSec * 0.9) * 0.65;
        } else if (bar < 112) {
          const wallStep = Math.floor((bar - 104) / 2);
          const angles = [0, -Math.PI * 0.5, Math.PI * 0.5, Math.PI];
          desiredYaw = angles[wallStep % 4];
          desiredPitch = wallStep % 2 === 0 ? 0.15 : -0.12;
          desiredRoll = (wallStep % 2 === 0 ? 1 : -1) * 0.16;
        } else {
          if (bar < 122) {
            desiredYaw = ((bar - 112) / 10) * Math.PI * 2;
            desiredPitch = Math.sin(timeSec * 0.8) * 0.2;
          } else {
            desiredYaw = Math.round(this.camYaw / (Math.PI * 2)) * (Math.PI * 2);
            desiredPitch = 0;
            desiredRoll = 0;
            desiredFov = 68;
          }
        }

        const lerpRate = Math.min(1, dt * 3.8);
        this.camYaw += (desiredYaw - this.camYaw) * lerpRate;
        this.camPitch += (desiredPitch - this.camPitch) * lerpRate;
        this.camRoll += (desiredRoll - this.camRoll) * lerpRate;
        this.camOffset.lerp(new THREE.Vector3(ox, oy, oz), lerpRate);

        if (Math.abs(this.engine.camera.fov - desiredFov) > 0.05) {
          this.engine.camera.fov += (desiredFov - this.engine.camera.fov) * lerpRate;
          this.engine.camera.updateProjectionMatrix();
        }

        const dirX = Math.sin(this.camYaw) * Math.cos(this.camPitch);
        const dirY = Math.sin(this.camPitch);
        const dirZ = -Math.cos(this.camYaw) * Math.cos(this.camPitch);

        const forward = new THREE.Vector3(dirX, dirY, dirZ).normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        const trueUp = new THREE.Vector3().crossVectors(right, forward).normalize();

        this._upVec
          .copy(trueUp)
          .multiplyScalar(Math.cos(this.camRoll))
          .addScaledVector(right, Math.sin(this.camRoll))
          .normalize();

        this.engine.camera.up.copy(this._upVec);
        this.engine.camera.position.copy(this.camOffset);
        this._lookTarget.copy(this.camOffset).addScaledVector(forward, 7.0);
        this.engine.controls.target.copy(this._lookTarget);
      } else {
        // Modo Tela Plana 4:3
        if (Math.abs(this.engine.camera.fov - 50) > 0.1) {
          this.engine.camera.fov = 50;
          this.engine.camera.up.set(0, 1, 0);
          this.engine.camera.updateProjectionMatrix();
        }
        const camX = isChorus ? Math.sin(timeSec * 0.85) * 3.0 : 0;
        const camY = isChorus ? Math.cos(timeSec * 0.65) * 1.4 : 0;
        const camZ = 17.6 - energy.bass * 0.45;
        this.engine.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.08);
        this.engine.controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.12);
      }
    }
  }
}