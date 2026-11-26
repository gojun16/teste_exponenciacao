import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MASTER_SIZE } from '../js/mathEngine.js';

const FACE_COLORS = {
  px: 0xef4444, // +X Direita: Vermelho
  nx: 0xf97316, // -X Esquerda: Laranja
  py: 0xf8fafc, // +Y Topo: Branco
  ny: 0xfacc15, // -Y Base: Amarelo
  pz: 0x10b981, // +Z Frente: Verde
  nz: 0x2563eb, // -Z Trás: Azul
  inner: 0x0f172a // Interior: Plástico Preto Fosco
};

const SPEED_PROFILES = {
  slow: { label: 'Suave (Didático)', scrambleDur: 0.14, solveDur: 0.34, manualDur: 0.22 },
  normal: { label: 'Satisfatório', scrambleDur: 0.085, solveDur: 0.19, manualDur: 0.16 },
  fast: { label: 'Speedcube', scrambleDur: 0.055, solveDur: 0.11, manualDur: 0.12 },
  turbo: { label: 'Turbo', scrambleDur: 0.035, solveDur: 0.065, manualDur: 0.09 }
};

export class RubiksCubeDirector {
  constructor(engine) {
    this.engine = engine;
    this.active = false;
    this.order = 3; // Base (n) -> cubo n x n x n (n^3)
    this.gapRatio = 0.06;

    this.cubeGroup = new THREE.Group();
    this.cubeGroup.visible = false;
    this.engine.scene.add(this.cubeGroup);

    this.pivotGroup = new THREE.Group();
    this.cubeGroup.add(this.pivotGroup);

    this.cubies = [];
    this.cubieMeshes = [];
    this.materialsCache = new Map();
    this.stickerTexture = this._createStickerTexture();
    this.innerMaterial = new THREE.MeshStandardMaterial({
      color: FACE_COLORS.inner,
      roughness: 0.72,
      metalness: 0.12
    });

    // Fila e animação de giros
    this.moveQueue = [];
    this.currentAnim = null;
    this.moveHistory = []; // Pilha algébrica simplificada para auto-resolução exata
    this.moveCount = 0;

    // Estados de embaralhamento e auto-resolução
    this.isScrambling = false;
    this.isAutoSolving = false;
    this.solveTotalSteps = 0;
    this.solveStepIndex = 0;
    this.speedMode = 'normal';

    // Cronômetro e celebração
    this.timerRunning = false;
    this.elapsedTime = 0;
    this.celebrationTimer = 0;

    // Interação direta via raycast + arraste 3D
    this.raycaster = new THREE.Raycaster();
    this.pointerNDC = new THREE.Vector2();
    this.dragState = null;

    // Áudio Web Audio tátil
    this.audioCtx = null;
    this.soundEnabled = true;

    // Backup do estado anterior do explorador
    this._savedInstancedVisible = true;
    this._savedWireframeVisible = true;
    this._savedAxesVisible = true;
    this._savedClip = MASTER_SIZE;
    this._savedExplode = 0;
    this._savedCameraPos = new THREE.Vector3();
    this._savedCameraTarget = new THREE.Vector3();

    this.onStateChange = null;
    this.onExit = null;

    this._buildControlsPanel();
    this._bindEvents();
  }

  _createStickerTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Borda preta fosca do cubinho
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    // Adesivo central arredondado branco (tingido pela cor do material)
    const pad = 18;
    const r = 28;
    const w = size - pad * 2;
    const h = size - pad * 2;

    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.lineTo(pad + w - r, pad);
    ctx.quadraticCurveTo(pad + w, pad, pad + w, pad + r);
    ctx.lineTo(pad + w, pad + h - r);
    ctx.quadraticCurveTo(pad + w, pad + h, pad + w - r, pad + h);
    ctx.lineTo(pad + r, pad + h);
    ctx.quadraticCurveTo(pad, pad + h, pad, pad + h - r);
    ctx.lineTo(pad, pad + r);
    ctx.quadraticCurveTo(pad, pad, pad + r, pad);
    ctx.closePath();

    const grad = ctx.createLinearGradient(pad, pad, pad + w, pad + h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.65, '#f4f6fa');
    grad.addColorStop(1, '#dce3ee');
    ctx.fillStyle = grad;
    ctx.fill();

    // Brilho sutil de borda interna
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  _getStickerMaterial(hexColor) {
    if (!this.materialsCache.has(hexColor)) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: hexColor,
        map: this.stickerTexture,
        roughness: 0.24,
        metalness: 0.06,
        clearcoat: 0.55,
        clearcoatRoughness: 0.18
      });
      this.materialsCache.set(hexColor, mat);
    }
    return this.materialsCache.get(hexColor);
  }

  _buildControlsPanel() {
    if (document.getElementById('rubiks-panel')) return;

    const hud = document.querySelector('.hud');
    if (!hud) return;

    const panel = document.createElement('div');
    panel.id = 'rubiks-panel';
    panel.className = 'rubiks-panel';
    panel.innerHTML = `
    <div class="rubiks-status-card">
    <div class="rubiks-status-row">
    <span id="rb-state-badge" class="rb-badge solved">✓ Resolvido</span>
    <span id="rb-timer" class="rb-timer">00:00.0</span>
    </div>
    <div class="rubiks-metrics">
    <span>Movimentos: <strong id="rb-moves-count">0</strong></span>
    <span>Ordem: <strong id="rb-order-label">3×3×3</strong></span>
    </div>
    <div id="rb-solve-progress-wrap" class="rb-progress-wrap" hidden>
    <div class="rb-progress-header">
    <span id="rb-move-notation">Resolvendo...</span>
    <span id="rb-solve-step">0 / 0</span>
    </div>
    <div class="rb-progress-bar">
    <div id="rb-progress-fill" class="rb-progress-fill"></div>
    </div>
    </div>
    </div>

    <div class="btn-group">
    <button type="button" id="rb-btn-scramble" class="amber">🔀 Embaralhar</button>
    <button type="button" id="rb-btn-solve" class="emerald" disabled>✨ Auto-Resolver</button>
    </div>

    <div class="btn-group">
    <button type="button" id="rb-btn-undo" disabled>↩ Desfazer</button>
    <button type="button" id="rb-btn-reset-cube">↺ Resetar Cubo</button>
    </div>

    <div class="select-row">
    <label for="rb-speed-select">Velocidade:</label>
    <select id="rb-speed-select">
    <option value="slow">Suave (Didático)</option>
    <option value="normal" selected>Satisfatório</option>
    <option value="fast">Speedcube</option>
    <option value="turbo">Turbo</option>
    </select>
    </div>

    <div class="rubiks-quick-moves">
    <div class="rb-sub-label">Giros Rápidos (Faces + Meio M/E/S ou arraste no cubo):</div>
    <div class="rb-notation-grid">
    <button type="button" data-move="U">U</button>
    <button type="button" data-move="U'">U'</button>
    <button type="button" data-move="D">D</button>
    <button type="button" data-move="D'">D'</button>
    <button type="button" data-move="L">L</button>
    <button type="button" data-move="L'">L'</button>
    <button type="button" data-move="R">R</button>
    <button type="button" data-move="R'">R'</button>
    <button type="button" data-move="F">F</button>
    <button type="button" data-move="F'">F'</button>
    <button type="button" data-move="B">B</button>
    <button type="button" data-move="B'">B'</button>
    <button type="button" data-move="M" data-slice="middle" title="Meio Vertical (eixo X, acompanha L)">M</button>
    <button type="button" data-move="M'" data-slice="middle" title="Meio Vertical Invertido (eixo X)">M'</button>
    <button type="button" data-move="E" data-slice="middle" title="Meio Horizontal / Equatorial (eixo Y, acompanha D)">E</button>
    <button type="button" data-move="E'" data-slice="middle" title="Meio Horizontal Invertido (eixo Y)">E'</button>
    <button type="button" data-move="S" data-slice="middle" title="Meio Frontal (eixo Z, acompanha F)">S</button>
    <button type="button" data-move="S'" data-slice="middle" title="Meio Frontal Invertido (eixo Z)">S'</button>
    </div>
    </div>

    <div class="btn-group" style="margin-top: 2px;">
    <button type="button" id="rb-btn-sound" class="cyan active">🔊 Som Mecânico: ON</button>
    <button type="button" id="rb-btn-exit" class="violet">← Voltar ao Explorador</button>
    </div>
    `;

    const statsFooter = hud.querySelector('.stats-footer');
    if (statsFooter) {
      hud.insertBefore(panel, statsFooter);
    } else {
      hud.appendChild(panel);
    }

    this.panelEl = panel;
    this.badgeEl = document.getElementById('rb-state-badge');
    this.timerEl = document.getElementById('rb-timer');
    this.movesEl = document.getElementById('rb-moves-count');
    this.orderLabelEl = document.getElementById('rb-order-label');
    this.progressWrapEl = document.getElementById('rb-solve-progress-wrap');
    this.notationEl = document.getElementById('rb-move-notation');
    this.solveStepEl = document.getElementById('rb-solve-step');
    this.progressFillEl = document.getElementById('rb-progress-fill');

    this.btnScramble = document.getElementById('rb-btn-scramble');
    this.btnSolve = document.getElementById('rb-btn-solve');
    this.btnUndo = document.getElementById('rb-btn-undo');
    this.btnResetCube = document.getElementById('rb-btn-reset-cube');
    this.speedSelect = document.getElementById('rb-speed-select');
    this.btnSound = document.getElementById('rb-btn-sound');
    this.btnExit = document.getElementById('rb-btn-exit');

    this.btnScramble.addEventListener('click', () => this.scramble());
    this.btnSolve.addEventListener('click', () => this.autoSolve());
    this.btnUndo.addEventListener('click', () => this.undoLastMove());
    this.btnResetCube.addEventListener('click', () => this.rebuild(this.order, this.gapRatio));

    this.speedSelect.addEventListener('change', (e) => {
      this.speedMode = e.target.value;
    });

    this.btnSound.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.btnSound.classList.toggle('active', this.soundEnabled);
      this.btnSound.textContent = this.soundEnabled ? '🔊 Som Mecânico: ON' : '🔇 Som Mecânico: OFF';
    });

    this.btnExit.addEventListener('click', () => this.stop());

    panel.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.isScrambling || this.isAutoSolving) return;
        const move = this._parseNotation(btn.dataset.move);
        if (move) this.enqueueMove(move, { record: true, source: 'manual' });
      });
    });
  }

  _bindEvents() {
    const dom = this.engine.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      if (!this.active || e.button !== 0) return;
      if (this.isScrambling || this.isAutoSolving) return;

      const hit = this._raycastCube(e.clientX, e.clientY);
      if (!hit) return;

      // Bloqueia OrbitControls enquanto arrasta uma camada do cubo mágico
      if (this.engine.controls) {
        this.engine.controls.enabled = false;
      }

      this.dragState = {
        cubie: hit.cubie,
        worldPoint: hit.point.clone(),
                         worldNormal: hit.normal.clone(),
                         startX: e.clientX,
                         startY: e.clientY,
                         triggered: false
      };
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.active || !this.dragState || this.dragState.triggered) return;

      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;
      if (Math.hypot(dx, dy) < 11) return;

      this.dragState.triggered = true;
      const move = this._resolveDragToMove(this.dragState, dx, dy);
      if (move) {
        this.enqueueMove(move, { record: true, source: 'manual' });
      }
    });

    const releaseDrag = () => {
      if (!this.dragState) return;
      this.dragState = null;
      if (this.active && this.engine.controls) {
        this.engine.controls.enabled = true;
      }
    };

    window.addEventListener('pointerup', releaseDrag);
    window.addEventListener('pointercancel', releaseDrag);

    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }
      if (this.isScrambling || this.isAutoSolving) return;

      const keyMap = {
        KeyU: 'U',
        KeyD: 'D',
        KeyL: 'L',
        KeyR: 'R',
        KeyF: 'F',
        KeyB: 'B',
        KeyM: 'M',
        KeyE: 'E',
        KeyS: 'S'
      };
      const baseNotation = keyMap[e.code];
      if (baseNotation) {
        e.preventDefault();
        const notation = e.shiftKey ? `${baseNotation}'` : baseNotation;
        const move = this._parseNotation(notation);
        if (move) this.enqueueMove(move, { record: true, source: 'manual' });
      }
    });
  }

  _raycastCube(clientX, clientY) {
    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNDC, this.engine.camera);
    const hits = this.raycaster.intersectObjects(this.cubieMeshes, false);
    if (hits.length === 0) return null;

    const hit = hits[0];
    const cubie = hit.object.userData.cubie;
    if (!cubie || !hit.face) return null;

    // Converte a normal local do cubinho para normal do cubo principal (snapped ao eixo dominante)
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    const ax = Math.abs(normal.x);
    const ay = Math.abs(normal.y);
    const az = Math.abs(normal.z);

    if (ax >= ay && ax >= az) {
      normal.set(Math.sign(normal.x), 0, 0);
    } else if (ay >= ax && ay >= az) {
      normal.set(0, Math.sign(normal.y), 0);
    } else {
      normal.set(0, 0, Math.sign(normal.z));
    }

    return {
      cubie,
      point: hit.point,
      normal
    };
  }

  _resolveDragToMove(drag, dx, dy) {
    const n = drag.worldNormal;
    let t1, t2;

    if (Math.abs(n.x) > 0.5) {
      t1 = new THREE.Vector3(0, 1, 0);
      t2 = new THREE.Vector3(0, 0, 1);
    } else if (Math.abs(n.y) > 0.5) {
      t1 = new THREE.Vector3(1, 0, 0);
      t2 = new THREE.Vector3(0, 0, 1);
    } else {
      t1 = new THREE.Vector3(1, 0, 0);
      t2 = new THREE.Vector3(0, 1, 0);
    }

    const projectDir = (tangent) => {
      const p0 = drag.worldPoint.clone().project(this.engine.camera);
      const p1 = drag.worldPoint.clone().addScaledVector(tangent, 0.5).project(this.engine.camera);
      const w = window.innerWidth * 0.5;
      const h = window.innerHeight * 0.5;
      const sx = (p1.x - p0.x) * w;
      const sy = -(p1.y - p0.y) * h;
      const len = Math.hypot(sx, sy);
      return len > 1e-4 ? { x: sx / len, y: sy / len } : { x: 0, y: 0 };
    };

    const s1 = projectDir(t1);
    const s2 = projectDir(t2);
    const dot1 = dx * s1.x + dy * s1.y;
    const dot2 = dx * s2.x + dy * s2.y;

    const chosenTangent = Math.abs(dot1) >= Math.abs(dot2) ? t1 : t2;
    const signMove = (Math.abs(dot1) >= Math.abs(dot2) ? dot1 : dot2) >= 0 ? 1 : -1;

    // Eixo de rotação pela regra da mão direita: normal × tangente
    const rotAxisVec = new THREE.Vector3().crossVectors(n, chosenTangent);
    let axis = 'y';
    let axisSign = 1;

    if (Math.abs(rotAxisVec.x) > 0.5) {
      axis = 'x';
      axisSign = Math.sign(rotAxisVec.x);
    } else if (Math.abs(rotAxisVec.y) > 0.5) {
      axis = 'y';
      axisSign = Math.sign(rotAxisVec.y);
    } else {
      axis = 'z';
      axisSign = Math.sign(rotAxisVec.z);
    }

    const layer = drag.cubie[`g${axis}`];
    const dir = signMove * axisSign;

    return {
      axis,
      layer,
      dir,
      turns: 1,
      notation: this._formatMoveNotation(axis, layer, dir, 1)
    };
  }

  _parseNotation(notation) {
    const N = this.order;
    const prime = notation.includes("'");
    const doubleTurn = notation.includes('2');
    const face = notation[0];
    const turns = doubleTurn ? 2 : 1;
    const midLayer = Math.floor((N - 1) / 2);

    switch (face) {
      case 'R':
        return { axis: 'x', layer: N - 1, dir: prime ? 1 : -1, turns, notation };
      case 'L':
        return { axis: 'x', layer: 0, dir: prime ? -1 : 1, turns, notation };
      case 'M':
        if (N < 3) return null;
        return { axis: 'x', layer: midLayer, dir: prime ? -1 : 1, turns, notation };
      case 'U':
        return { axis: 'y', layer: N - 1, dir: prime ? 1 : -1, turns, notation };
      case 'D':
        return { axis: 'y', layer: 0, dir: prime ? -1 : 1, turns, notation };
      case 'E':
        if (N < 3) return null;
        return { axis: 'y', layer: midLayer, dir: prime ? -1 : 1, turns, notation };
      case 'F':
        return { axis: 'z', layer: N - 1, dir: prime ? 1 : -1, turns, notation };
      case 'B':
        return { axis: 'z', layer: 0, dir: prime ? -1 : 1, turns, notation };
      case 'S':
        if (N < 3) return null;
        return { axis: 'z', layer: midLayer, dir: prime ? 1 : -1, turns, notation };
      default:
        return null;
    }
  }

  _formatMoveNotation(axis, layer, dir, turns = 1) {
    const N = this.order;
    const suffix = turns === 2 ? '2' : '';
    const isExactCenter = N >= 3 && N % 2 === 1 && layer === Math.floor(N / 2);

    if (axis === 'x') {
      if (layer === N - 1) return `R${dir < 0 ? '' : "'"}${suffix}`;
      if (layer === 0) return `L${dir > 0 ? '' : "'"}${suffix}`;
      if (isExactCenter) return `M${dir > 0 ? '' : "'"}${suffix}`;
      return `${layer + 1}R${dir < 0 ? '' : "'"}${suffix}`;
    }
    if (axis === 'y') {
      if (layer === N - 1) return `U${dir < 0 ? '' : "'"}${suffix}`;
      if (layer === 0) return `D${dir > 0 ? '' : "'"}${suffix}`;
      if (isExactCenter) return `E${dir > 0 ? '' : "'"}${suffix}`;
      return `${layer + 1}U${dir < 0 ? '' : "'"}${suffix}`;
    }
    if (layer === N - 1) return `F${dir < 0 ? '' : "'"}${suffix}`;
    if (layer === 0) return `B${dir > 0 ? '' : "'"}${suffix}`;
    if (isExactCenter) return `S${dir < 0 ? '' : "'"}${suffix}`;
    return `${layer + 1}F${dir < 0 ? '' : "'"}${suffix}`;
  }

  start(baseOrder = 3, gapRatio = 0.06) {
    this.active = true;
    document.body.classList.add('rubiks-mode');
    this.cubeGroup.visible = true;

    this._savedInstancedVisible = this.engine.instancedMesh?.visible ?? true;
    this._savedWireframeVisible = this.engine.masterWireframe?.visible ?? true;
    this._savedAxesVisible = this.engine.axesHelper?.visible ?? true;
    this._savedClip = this.engine.clipPlane.constant;
    this._savedExplode = this.engine.explodeFactor;

    if (this.engine.instancedMesh) this.engine.instancedMesh.visible = false;
    if (this.engine.masterWireframe) this.engine.masterWireframe.visible = false;
    if (this.engine.axesHelper) this.engine.axesHelper.visible = false;
    if (this.engine.zCurve?.group) this.engine.zCurve.group.visible = false;

    this._savedCameraPos.copy(this.engine.camera.position);
    this._savedCameraTarget.copy(this.engine.controls.target);

    this.engine.rootGroup.rotation.set(0, 0, 0);
    this.engine.camera.position.set(12.2, 9.8, 13.8);
    this.engine.controls.target.set(0, 0, 0);
    this.engine.controls.enabled = true;
    this.engine.controls.update();

    this.rebuild(baseOrder, gapRatio);
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    document.body.classList.remove('rubiks-mode');
    this.cubeGroup.visible = false;
    this.moveQueue.length = 0;
    this.currentAnim = null;
    this.isScrambling = false;
    this.isAutoSolving = false;
    this.dragState = null;

    if (this.engine.instancedMesh) {
      this.engine.instancedMesh.visible = this._savedInstancedVisible;
    }
    if (this.engine.masterWireframe) {
      this.engine.masterWireframe.visible = this._savedWireframeVisible;
    }
    if (this.engine.axesHelper) {
      this.engine.axesHelper.visible = this._savedAxesVisible;
    }
    this.engine.clipPlane.constant = this._savedClip;
    this.engine.setExplodeFactor(this._savedExplode);
    this.engine.camera.position.copy(this._savedCameraPos);
    this.engine.controls.target.copy(this._savedCameraTarget);
    this.engine.controls.enabled = true;
    this.engine.controls.update();

    if (typeof this.onExit === 'function') {
      this.onExit();
    }
  }

  setGapRatio(gapRatio) {
    this.gapRatio = THREE.MathUtils.clamp(gapRatio, 0, 0.25);
    if (!this.active || this.cubies.length === 0) return;

    const N = this.order;
    const cubeSpan = MASTER_SIZE * 0.84;
    const step = cubeSpan / N;
    const cubieSize = step * (1 - this.gapRatio * 0.85);
    const scaleRatio = cubieSize / this._baseCubieSize;

    for (const c of this.cubies) {
      const pos = this._gridToWorld(c.gx, c.gy, c.gz, step);
      c.mesh.position.copy(pos);
      c.mesh.scale.setScalar(scaleRatio);
    }
  }

  rebuild(baseOrder = this.order, gapRatio = this.gapRatio) {
    const N = THREE.MathUtils.clamp(Math.round(Number(baseOrder) || 3), 2, 8);
    this.order = N;
    this.gapRatio = THREE.MathUtils.clamp(gapRatio, 0, 0.25);

    this.moveQueue.length = 0;
    this.currentAnim = null;
    this.moveHistory.length = 0;
    this.moveCount = 0;
    this.isScrambling = false;
    this.isAutoSolving = false;
    this.timerRunning = false;
    this.elapsedTime = 0;
    this.celebrationTimer = 0;

    // Limpa malhas anteriores
    for (const c of this.cubies) {
      this.cubeGroup.remove(c.mesh);
      this.pivotGroup.remove(c.mesh);
    }
    if (this._sharedCubieGeo) {
      this._sharedCubieGeo.dispose();
    }
    this.cubies = [];
    this.cubieMeshes = [];
    this.pivotGroup.rotation.set(0, 0, 0);

    const cubeSpan = MASTER_SIZE * 0.84;
    const step = cubeSpan / N;
    const cubieSize = step * (1 - this.gapRatio * 0.85);
    this._baseCubieSize = cubieSize;
    const bevel = Math.min(cubieSize * 0.085, 0.14);

    this._sharedCubieGeo = new RoundedBoxGeometry(cubieSize, cubieSize, cubieSize, 3, bevel);

    const matPX = this._getStickerMaterial(FACE_COLORS.px);
    const matNX = this._getStickerMaterial(FACE_COLORS.nx);
    const matPY = this._getStickerMaterial(FACE_COLORS.py);
    const matNY = this._getStickerMaterial(FACE_COLORS.ny);
    const matPZ = this._getStickerMaterial(FACE_COLORS.pz);
    const matNZ = this._getStickerMaterial(FACE_COLORS.nz);

    for (let gx = 0; gx < N; gx++) {
      for (let gy = 0; gy < N; gy++) {
        for (let gz = 0; gz < N; gz++) {
          const isOuter =
          gx === 0 || gx === N - 1 ||
          gy === 0 || gy === N - 1 ||
          gz === 0 || gz === N - 1;
          if (!isOuter) continue;

          // Ordem padrão de materiais do BoxGeometry/RoundedBoxGeometry: [+X, -X, +Y, -Y, +Z, -Z]
          const materials = [
            gx === N - 1 ? matPX : this.innerMaterial,
            gx === 0 ? matNX : this.innerMaterial,
            gy === N - 1 ? matPY : this.innerMaterial,
            gy === 0 ? matNY : this.innerMaterial,
            gz === N - 1 ? matPZ : this.innerMaterial,
            gz === 0 ? matNZ : this.innerMaterial
          ];

          const mesh = new THREE.Mesh(this._sharedCubieGeo, materials);
          mesh.position.copy(this._gridToWorld(gx, gy, gz, step));
          this.cubeGroup.add(mesh);

          const cubie = {
            mesh,
            homeX: gx,
            homeY: gy,
            homeZ: gz,
            gx,
            gy,
            gz
          };
          mesh.userData.cubie = cubie;
          this.cubies.push(cubie);
          this.cubieMeshes.push(mesh);
        }
      }
    }

    this._updateHUD();
  }

  _gridToWorld(gx, gy, gz, step) {
    const offset = (this.order - 1) * 0.5;
    return new THREE.Vector3(
      (gx - offset) * step,
                             (gy - offset) * step,
                             (gz - offset) * step
    );
  }

  enqueueMove(move, { record = true, source = 'manual' } = {}) {
    this.moveQueue.push({
      ...move,
      turns: move.turns || 1,
      record,
      source
    });
  }

  scramble() {
    if (this.isScrambling || this.isAutoSolving) return;

    this.moveQueue.length = 0;
    this.isScrambling = true;
    this.timerRunning = false;
    this.elapsedTime = 0;
    this.celebrationTimer = 0;

    const N = this.order;
    const totalMoves = Math.min(48, Math.max(16, N * 7));
    const axes = ['x', 'y', 'z'];
    let lastAxis = null;
    let lastLayer = null;

    for (let i = 0; i < totalMoves; i++) {
      let axis = axes[Math.floor(Math.random() * axes.length)];
      let layer = Math.floor(Math.random() * N);

      // Evita repetir imediatamente a mesma fatia consecutiva
      while (axis === lastAxis && layer === lastLayer) {
        axis = axes[Math.floor(Math.random() * axes.length)];
        layer = Math.floor(Math.random() * N);
      }

      lastAxis = axis;
      lastLayer = layer;
      const dir = Math.random() < 0.5 ? 1 : -1;

      this.enqueueMove(
        {
          axis,
          layer,
          dir,
          turns: 1,
          notation: this._formatMoveNotation(axis, layer, dir, 1)
        },
        { record: true, source: 'scramble' }
      );
    }

    this._updateHUD();
  }

  undoLastMove() {
    if (this.isScrambling || this.isAutoSolving || this.currentAnim || this.moveHistory.length === 0) {
      return;
    }
    const last = this.moveHistory.pop();
    const invDir = -last.dir;
    this.enqueueMove(
      {
        axis: last.axis,
        layer: last.layer,
        dir: invDir,
        turns: last.turns,
        notation: this._formatMoveNotation(last.axis, last.layer, invDir, last.turns)
      },
      { record: false, source: 'undo' }
    );
    this._updateHUD();
  }

  autoSolve() {
    if (this.isScrambling || this.isAutoSolving) return;
    if (this.isSolved() && this.moveHistory.length === 0) return;

    this.moveQueue.length = 0;
    this._simplifyHistory();

    if (this.moveHistory.length === 0) {
      this._updateHUD();
      return;
    }

    // Constrói a sequência inversa otimizada para resolver de forma limpa e satisfatória
    const solutionMoves = [];
    while (this.moveHistory.length > 0) {
      const m = this.moveHistory.pop();
      const invDir = -m.dir;
      solutionMoves.push({
        axis: m.axis,
        layer: m.layer,
        dir: invDir,
        turns: m.turns,
        notation: this._formatMoveNotation(m.axis, m.layer, invDir, m.turns)
      });
    }

    this.isAutoSolving = true;
    this.timerRunning = false;
    this.solveTotalSteps = solutionMoves.length;
    this.solveStepIndex = 0;

    for (const stepMove of solutionMoves) {
      this.enqueueMove(stepMove, { record: false, source: 'solve' });
    }

    this._updateHUD();
  }

  _recordMoveToHistory(move) {
    // Normaliza o giro em quarto de volta módulo 4 (1 = +90°, 2 = 180°, 3 = -90°)
    const deltaQ = (((move.dir * (move.turns || 1)) % 4) + 4) % 4;
    if (deltaQ === 0) return;

    this.moveHistory.push({
      axis: move.axis,
      layer: move.layer,
      q: deltaQ
    });

    this._simplifyHistory();
  }

  _simplifyHistory() {
    const toQ = (item) =>
    item.q !== undefined
    ? ((item.q % 4) + 4) % 4
    : (((item.dir * (item.turns || 1)) % 4) + 4) % 4;

    // Agrupa movimentos comutativos no mesmo eixo (camadas paralelas) e cancela redundâncias mod 4
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < this.moveHistory.length - 1; i++) {
        const a = this.moveHistory[i];
        const b = this.moveHistory[i + 1];

        if (a.axis === b.axis) {
          if (a.layer === b.layer) {
            const sumQ = (toQ(a) + toQ(b)) % 4;
            if (sumQ === 0) {
              this.moveHistory.splice(i, 2);
            } else {
              this.moveHistory.splice(i, 2, { axis: a.axis, layer: a.layer, q: sumQ });
            }
            changed = true;
            break;
          } else if (a.layer > b.layer) {
            // Ordena camadas paralelas do mesmo eixo para permitir cancelamentos adjacentes
            this.moveHistory[i] = b;
            this.moveHistory[i + 1] = a;
            changed = true;
            break;
          }
        }
      }
    }

    // Converte 'q' (1, 2, 3) para representação { dir, turns }
    this.moveHistory = this.moveHistory.map((item) => {
      const q = toQ(item);
      if (q === 2) return { axis: item.axis, layer: item.layer, dir: 1, turns: 2 };
      if (q === 3) return { axis: item.axis, layer: item.layer, dir: -1, turns: 1 };
      return { axis: item.axis, layer: item.layer, dir: 1, turns: 1 };
    });
  }

  isSolved() {
    if (this.cubies.length === 0) return true;
    const refQuat = this.cubies[0].mesh.quaternion;
    for (const c of this.cubies) {
      if (c.gx !== c.homeX || c.gy !== c.homeY || c.gz !== c.homeZ) {
        return false;
      }
      // Todos os cubinhos também devem compartilhar a mesma orientação espacial
      if (Math.abs(c.mesh.quaternion.dot(refQuat)) < 0.99) {
        return false;
      }
    }
    return true;
  }

  _finalizeCompletedSequence() {
    if (this.isScrambling) {
      this.isScrambling = false;
      this.moveCount = 0;
      this.elapsedTime = 0;
      this.timerRunning = !this.isSolved();
    }
    if (this.isAutoSolving) {
      this.isAutoSolving = false;
      this.moveCount = 0;
      if (this.isSolved()) {
        this.celebrationTimer = 1.6;
        this._playSolvedChime();
      }
    }
  }

  _beginNextMove() {
    if (this.moveQueue.length === 0) {
      this._finalizeCompletedSequence();
      this._updateHUD();
      return;
    }

    const move = this.moveQueue.shift();
    const profile = SPEED_PROFILES[this.speedMode] || SPEED_PROFILES.normal;
    let duration = profile.manualDur;
    if (move.source === 'scramble') duration = profile.scrambleDur;
    if (move.source === 'solve') duration = profile.solveDur;
    if ((move.turns || 1) === 2) duration *= 1.35;

    this.pivotGroup.rotation.set(0, 0, 0);
    this.pivotGroup.updateMatrixWorld();

    const gridKey = `g${move.axis}`;
    const sliceCubies = [];
    for (const c of this.cubies) {
      if (c[gridKey] === move.layer) {
        this.pivotGroup.attach(c.mesh);
        sliceCubies.push(c);
      }
    }

    if (move.source === 'solve') {
      this.solveStepIndex++;
    }

    this.currentAnim = {
      move,
      sliceCubies,
      elapsed: 0,
      duration,
      targetAngle: move.dir * (Math.PI * 0.5) * (move.turns || 1)
    };

    const pitchProgress =
    move.source === 'solve' && this.solveTotalSteps > 0
    ? this.solveStepIndex / this.solveTotalSteps
    : 0;
    this._playMechanicalClick(move.source, pitchProgress);
    this._updateHUD(move.notation);
  }

  _finishCurrentMove() {
    const { move, sliceCubies, targetAngle } = this.currentAnim;
    this.pivotGroup.rotation[move.axis] = targetAngle;
    this.pivotGroup.updateMatrixWorld();

    const cubeSpan = MASTER_SIZE * 0.84;
    const step = cubeSpan / this.order;
    const turns = move.turns || 1;
    const quarterTurns = ((move.dir * turns) % 4 + 4) % 4;

    for (const c of sliceCubies) {
      this.cubeGroup.attach(c.mesh);

      // Atualiza coordenadas inteiras da grade exatamente pelo número de quartos de volta
      for (let t = 0; t < quarterTurns; t++) {
        this._rotateGridCoordsPlus90(c, move.axis);
      }

      c.mesh.position.copy(this._gridToWorld(c.gx, c.gy, c.gz, step));
      this._snapQuaternion(c.mesh.quaternion);
    }

    this.pivotGroup.rotation.set(0, 0, 0);

    if (move.record) {
      this._recordMoveToHistory(move);
      if (!this.isScrambling) {
        this.moveCount++;
        if (!this.timerRunning && !this.isSolved()) {
          this.timerRunning = true;
        }
      }
    }

    this.currentAnim = null;

    if (this.moveQueue.length === 0) {
      this._finalizeCompletedSequence();
    }

    if (!this.isScrambling && !this.isAutoSolving && this.isSolved()) {
      this.timerRunning = false;
      this.moveHistory.length = 0;
      if (this.moveCount > 0) {
        this.celebrationTimer = 1.6;
        this._playSolvedChime();
      }
    }

    this._updateHUD();
  }

  _rotateGridCoordsPlus90(cubie, axis) {
    const max = this.order - 1;
    const { gx, gy, gz } = cubie;
    if (axis === 'x') {
      cubie.gy = max - gz;
      cubie.gz = gy;
    } else if (axis === 'y') {
      cubie.gz = max - gx;
      cubie.gx = gz;
    } else {
      cubie.gx = max - gy;
      cubie.gy = gx;
    }
  }

  _snapQuaternion(q) {
    // Projeta os eixos locais nos eixos cardeais mais próximos para eliminar qualquer erro numérico
    const m = new THREE.Matrix4().makeRotationFromQuaternion(q);
    const e = m.elements;

    const snapAxis = (ox, oy, oz) => {
      const ax = Math.abs(ox);
      const ay = Math.abs(oy);
      const az = Math.abs(oz);
      if (ax >= ay && ax >= az) return [Math.sign(ox) || 1, 0, 0];
      if (ay >= ax && ay >= az) return [0, Math.sign(oy) || 1, 0];
      return [0, 0, Math.sign(oz) || 1];
    };

    const [x0, x1, x2] = snapAxis(e[0], e[1], e[2]);
    const [y0, y1, y2] = snapAxis(e[4], e[5], e[6]);
    const [z0, z1, z2] = snapAxis(e[8], e[9], e[10]);

    m.set(
      x0, y0, z0, 0,
      x1, y1, z1, 0,
      x2, y2, z2, 0,
      0,  0,  0,  1
    );
    q.setFromRotationMatrix(m).normalize();
  }

  _initAudio() {
    if (!this.soundEnabled) return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  _playMechanicalClick(source = 'manual', progress = 0) {
    const ctx = this._initAudio();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Durante auto-resolução, o tom sobe suavemente conforme se aproxima da solução
    const baseFreq =
    source === 'solve'
    ? 310 + progress * 420
    : source === 'scramble'
    ? 240 + Math.random() * 90
    : 340 + Math.random() * 60;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.42, now + 0.045);

    const vol = source === 'scramble' ? 0.055 : 0.095;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  _playSolvedChime() {
    const ctx = this._initAudio();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // Dó Maior brilhante (C5-E5-G5-C6)
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.065);
      gain.gain.linearRampToValueAtTime(0.11, now + idx * 0.065 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.065 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.58);
    });
  }

  _formatTimer(sec) {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    const whole = Math.floor(rem);
    const tenths = Math.floor((rem - whole) * 10);
    return `${String(mins).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${tenths}`;
  }

  _updateHUD(activeNotation = '') {
    if (!this.panelEl) return;

    const solved = this.isSolved() && !this.isScrambling && !this.isAutoSolving && !this.currentAnim;
    const busy = this.isScrambling || this.isAutoSolving;
    const hasMiddleSlice = this.order >= 3;

    if (this.orderLabelEl) {
      this.orderLabelEl.textContent = `${this.order}×${this.order}×${this.order} (${Math.pow(this.order, 3)} cubos)`;
    }
    if (this.movesEl) {
      this.movesEl.textContent = String(this.moveCount);
    }
    if (this.timerEl) {
      this.timerEl.textContent = this._formatTimer(this.elapsedTime);
    }

    if (this.badgeEl) {
      if (this.isScrambling) {
        this.badgeEl.className = 'rb-badge scrambling';
        this.badgeEl.textContent = '🔀 Embaralhando...';
      } else if (this.isAutoSolving) {
        this.badgeEl.className = 'rb-badge solving';
        this.badgeEl.textContent = '✨ Auto-Resolvendo...';
      } else if (solved) {
        this.badgeEl.className = 'rb-badge solved';
        this.badgeEl.textContent = '✓ Resolvido';
      } else {
        this.badgeEl.className = 'rb-badge scrambled';
        this.badgeEl.textContent = `⚡ Embaralhado (${this.moveHistory.length} passos)`;
      }
    }

    if (this.progressWrapEl) {
      this.progressWrapEl.hidden = !this.isAutoSolving;
      if (this.isAutoSolving) {
        const pct = this.solveTotalSteps > 0
        ? Math.min(100, Math.round((this.solveStepIndex / this.solveTotalSteps) * 100))
        : 0;
        if (this.notationEl) {
          this.notationEl.textContent = activeNotation ? `Giro: ${activeNotation}` : 'Resolvendo...';
        }
        if (this.solveStepEl) {
          this.solveStepEl.textContent = `${this.solveStepIndex} / ${this.solveTotalSteps}`;
        }
        if (this.progressFillEl) {
          this.progressFillEl.style.width = `${pct}%`;
        }
      }
    }

    this.panelEl.querySelectorAll('[data-slice="middle"]').forEach((btn) => {
      btn.disabled = busy || !hasMiddleSlice;
    });

    if (this.btnScramble) this.btnScramble.disabled = busy;
    if (this.btnSolve) this.btnSolve.disabled = busy || solved || this.moveHistory.length === 0;
    if (this.btnUndo) this.btnUndo.disabled = busy || Boolean(this.currentAnim) || this.moveHistory.length === 0;
    if (this.btnResetCube) this.btnResetCube.disabled = busy;
  }

  update(dt) {
    if (!this.active) return;

    if (this.timerRunning && !this.isScrambling && !this.isAutoSolving) {
      this.elapsedTime += dt;
      if (this.timerEl) {
        this.timerEl.textContent = this._formatTimer(this.elapsedTime);
      }
    }

    if (this.celebrationTimer > 0) {
      this.celebrationTimer = Math.max(0, this.celebrationTimer - dt);
      const pulse = Math.sin((1.6 - this.celebrationTimer) * Math.PI * 2.5) * 0.045 * (this.celebrationTimer / 1.6);
      this.cubeGroup.scale.setScalar(1 + pulse);
      this.cubeGroup.rotation.y = Math.sin((1.6 - this.celebrationTimer) * Math.PI) * 0.14;
      if (this.celebrationTimer === 0) {
        this.cubeGroup.scale.setScalar(1);
        this.cubeGroup.rotation.set(0, 0, 0);
      }
    }

    if (!this.currentAnim && (this.moveQueue.length > 0 || this.isScrambling || this.isAutoSolving)) {
      this._beginNextMove();
    }

    if (this.currentAnim) {
      this.currentAnim.elapsed += dt;
      const rawT = Math.min(1, this.currentAnim.elapsed / this.currentAnim.duration);
      // Curva cúbica suave de desaceleração tátil
      const ease = 1 - Math.pow(1 - rawT, 3);
      this.pivotGroup.rotation[this.currentAnim.move.axis] = this.currentAnim.targetAngle * ease;

      if (rawT >= 1) {
        this._finishCurrentMove();
      }
    }
  }
}
