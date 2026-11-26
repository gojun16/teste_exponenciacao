import * as THREE from 'three';

/**
 * Interface Holográfica Diegética 100% 3D para WebXR (Meta Quest 2).
 * Elimina janelas 2D tradicionais e oferece:
 *  - Console de Pulso / Flutuante com 4 abas (Potências, 4D & Física, Cubo Mágico, Voxel Video & Sair VR)
 *  - Botões táteis 3D com resposta de profundidade ao toque do indicador ou raio
 *  - Sliders 3D deslizáveis diretamente no espaço com a ponta do dedo
 *  - Plaqueta espacial flutuante de inspeção de blocos (Bloco #idx, Coordenadas, Primo)
 */
export class DiegeticControls3D {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.visible = false;
    this.pinned = false;
    this.activeTab = 'math'; // 'math' | 'sim4d' | 'rubiks' | 'video'

    this.rootGroup = new THREE.Group();
    this.rootGroup.visible = false;
    this.scene.add(this.rootGroup);

    // Dimensões do console holográfico (em metros)
    this.panelW = 0.44;
    this.panelH = 0.34;

    this.buttons = [];
    this.sliders = [];
    this._buttonCooldown = 0;

    // Estado espelhado para renderização do canvas
    this.state = {
      base: 3,
      exp: 3,
      formulaText: '3³ = 27',
      dimText: '3D: Matriz cúbica',
      filterLabel: 'Todos os Blocos',
      gap: 0.06,
      explode: 0.0,
      slice: 1.0,
      rotXW: 0,
      rotYW: 0,
      auto4D: false,
      zCurve: false,
      scanner: false,
      physics: false,
      cinema: false,
      rubiksActive: false,
      rubiksOrder: 3,
      videoActive: false,
      videoStage: 'sculpt',
      videoColor: 0,
      videoRelief: 1.0
    };

    // Callbacks de ação conectados pelo WebXRDirector
    this.actions = {};

    this._buildConsolePanel();
    this._buildInspectorPlaque();
    this._rebuildInteractiveWidgets();
  }

  _buildConsolePanel() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 790;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    // Moldura traseira translúcida com borda neon
    const backGeo = new THREE.BoxGeometry(this.panelW + 0.016, this.panelH + 0.016, 0.012);
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x070d1c,
      roughness: 0.35,
      metalness: 0.4,
      transparent: true,
      opacity: 0.92
    });
    this.backPlate = new THREE.Mesh(backGeo, backMat);
    this.backPlate.position.z = -0.007;
    this.rootGroup.add(this.backPlate);

    const edges = new THREE.EdgesGeometry(backGeo);
    const borderLine = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
    );
    borderLine.position.z = -0.007;
    this.rootGroup.add(borderLine);

    // Face frontal do display holográfico
    const screenGeo = new THREE.PlaneGeometry(this.panelW, this.panelH);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true
    });
    this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.rootGroup.add(this.screenMesh);

    this.widgetsGroup = new THREE.Group();
    this.widgetsGroup.position.z = 0.004;
    this.rootGroup.add(this.widgetsGroup);
  }

  _buildInspectorPlaque() {
    this.inspCanvas = document.createElement('canvas');
    this.inspCanvas.width = 512;
    this.inspCanvas.height = 170;
    this.inspCtx = this.inspCanvas.getContext('2d');

    this.inspTex = new THREE.CanvasTexture(this.inspCanvas);
    this.inspTex.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.PlaneGeometry(0.26, 0.086);
    const mat = new THREE.MeshBasicMaterial({
      map: this.inspTex,
      transparent: true,
      depthTest: false
    });
    this.inspectorMesh = new THREE.Mesh(geo, mat);
    this.inspectorMesh.visible = false;
    this.scene.add(this.inspectorMesh);
  }

  showInspector(block, worldPos) {
    if (!this.visible || !block || !worldPos) {
      this.inspectorMesh.visible = false;
      return;
    }

    const ctx = this.inspCtx;
    const w = this.inspCanvas.width;
    const h = this.inspCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(6, 12, 26, 0.90)';
    this._roundRect(ctx, 8, 8, w - 16, h - 16, 22);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = block.isPrime ? '#34d399' : '#38bdf8';
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`Bloco #${block.index}`, 28, 54);

    const coordsStr = block.coords && block.coords.length > 0
      ? `[${block.coords.join(' | ')}]`
      : '[Núcleo 0D]';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '24px monospace';
    ctx.fillText(coordsStr, 28, 96);

    if (block.isPrime) {
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('★ Número Primo (Sino FM)', 28, 138);
    }

    this.inspTex.needsUpdate = true;
    this.inspectorMesh.position.copy(worldPos).add(new THREE.Vector3(0, 0.085, 0));
    this.inspectorMesh.lookAt(this.camera.position);
    this.inspectorMesh.visible = true;
  }

  hideInspector() {
    this.inspectorMesh.visible = false;
  }

  _clearWidgets() {
    while (this.widgetsGroup.children.length > 0) {
      const child = this.widgetsGroup.children[0];
      this.widgetsGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    this.buttons = [];
    this.sliders = [];
  }

  _addButton(id, nx, ny, nw, nh, label, accent = 0x1e293b, onClick = null) {
    // nx, ny, nw, nh em coordenadas normalizadas [0..1] a partir do canto superior esquerdo
    const w = nw * this.panelW;
    const h = nh * this.panelH;
    const x = (nx + nw * 0.5 - 0.5) * this.panelW;
    const y = (0.5 - (ny + nh * 0.5)) * this.panelH;

    const geo = new THREE.BoxGeometry(w, h, 0.008);
    const mat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.22
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, 0.003);
    this.widgetsGroup.add(mesh);

    this.buttons.push({
      id,
      nx,
      ny,
      nw,
      nh,
      label,
      accent,
      mesh,
      hover: false,
      pressDepth: 0,
      onClick
    });
  }

  _addSlider(id, nx, ny, nw, nh, label, min, max, getter, setter) {
    const w = nw * this.panelW;
    const h = nh * this.panelH;
    const x = (nx + nw * 0.5 - 0.5) * this.panelW;
    const y = (0.5 - (ny + nh * 0.5)) * this.panelH;

    const hitGeo = new THREE.BoxGeometry(w, h, 0.014);
    const hitMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.08
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.set(x, y, 0.004);
    this.widgetsGroup.add(hitMesh);

    const thumbGeo = new THREE.SphereGeometry(0.0085, 14, 14);
    const thumbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const thumbMesh = new THREE.Mesh(thumbGeo, thumbMat);
    thumbMesh.position.set(x, y, 0.010);
    this.widgetsGroup.add(thumbMesh);

    this.sliders.push({
      id,
      nx,
      ny,
      nw,
      nh,
      label,
      min,
      max,
      getter,
      setter,
      hitMesh,
      thumbMesh,
      hover: false
    });
  }

  _rebuildInteractiveWidgets() {
    this._clearWidgets();

    // Cabeçalho superior: Fixar Painel + Sair VR
    this._addButton('pin', 0.62, 0.025, 0.17, 0.075, this.pinned ? '📌 Fixo' : '🖐 Pulso', 0x0284c7, () => {
      this.pinned = !this.pinned;
      this._rebuildInteractiveWidgets();
    });
    this._addButton('exit-vr', 0.80, 0.025, 0.17, 0.075, '✕ Sair VR', 0xdc2626, () => {
      this.actions.exitVR?.();
    });

    // Barra de 4 Abas
    const tabs = [
      { id: 'math', label: 'Potências' },
      { id: 'sim4d', label: '4D & Física' },
      { id: 'rubiks', label: 'Cubo 3D' },
      { id: 'video', label: 'Vídeo 3D' }
    ];
    tabs.forEach((t, idx) => {
      const tw = 0.225;
      const tx = 0.03 + idx * 0.238;
      this._addButton(
        `tab-${t.id}`,
        tx,
        0.125,
        tw,
        0.08,
        t.label,
        this.activeTab === t.id ? 0x0284c7 : 0x1e293b,
        () => {
          this.activeTab = t.id;
          this._rebuildInteractiveWidgets();
        }
      );
    });

    if (this.activeTab === 'math') {
      // Base - / + e Expoente - / +
      this._addButton('base-dec', 0.04, 0.36, 0.11, 0.09, 'n −', 0x1e293b, () => this.actions.stepBase?.(-1));
      this._addButton('base-inc', 0.36, 0.36, 0.11, 0.09, 'n +', 0x0284c7, () => this.actions.stepBase?.(1));

      this._addButton('exp-dec', 0.53, 0.36, 0.11, 0.09, 'e −', 0x1e293b, () => this.actions.stepExp?.(-1));
      this._addButton('exp-inc', 0.85, 0.36, 0.11, 0.09, 'e +', 0x0284c7, () => this.actions.stepExp?.(1));

      // Filtro Matemático
      this._addButton('filter-cycle', 0.04, 0.48, 0.92, 0.085, `Filtro: ${this.state.filterLabel}`, 0x334155, () => {
        this.actions.cycleFilter?.();
      });

      // Sliders 3D
      this._addSlider('gap', 0.04, 0.60, 0.92, 0.08, 'Corte (Vão)', 0, 0.28, () => this.state.gap, (v) => {
        this.state.gap = v;
        this.actions.setGap?.(v);
      });
      this._addSlider('explode', 0.04, 0.70, 0.92, 0.08, 'Gravidade Zero', 0, 1.5, () => this.state.explode, (v) => {
        this.state.explode = v;
        this.actions.setExplode?.(v);
      });
      this._addSlider('slice', 0.04, 0.80, 0.92, 0.08, 'Corte Raio-X', 0, 1.0, () => this.state.slice, (v) => {
        this.state.slice = v;
        this.actions.setSlice?.(v);
      });

      this._addButton('recenter', 0.04, 0.90, 0.92, 0.075, '🎯 Recentralizar Holograma na Frente', 0x0d9488, () => {
        this.actions.recenterStage?.();
      });
    } else if (this.activeTab === 'sim4d') {
      this._addButton('spin4d', 0.04, 0.24, 0.44, 0.095, this.state.auto4D ? '⏹ Parar 4D' : '🌀 Girar 4D (Auto)', 0x7e22ce, () => {
        this.actions.toggle4DSpin?.();
      });
      this._addButton('zcurve', 0.52, 0.24, 0.44, 0.095, this.state.zCurve ? '⏹ Ocultar Curva Z' : '⚡ Curva Z', 0x0284c7, () => {
        this.actions.toggleZCurve?.();
      });

      this._addSlider('rotxw', 0.04, 0.37, 0.92, 0.085, 'Rotação 4D (XW)', 0, 360, () => this.state.rotXW, (v) => {
        this.state.rotXW = v;
        this.actions.set4DRot?.(v, this.state.rotYW);
      });
      this._addSlider('rotyw', 0.04, 0.48, 0.92, 0.085, 'Rotação 4D (YW)', 0, 360, () => this.state.rotYW, (v) => {
        this.state.rotYW = v;
        this.actions.set4DRot?.(this.state.rotXW, v);
      });

      this._addButton('scanner', 0.04, 0.60, 0.44, 0.095, this.state.scanner ? '⏹ Parar Laser' : '🎵 Scanner Laser', 0x059669, () => {
        this.actions.toggleScanner?.();
      });
      this._addButton('cinema', 0.52, 0.60, 0.44, 0.095, this.state.cinema ? '⏹ Sair Cinema' : '🎞 Modo Cinema', 0x6d28d9, () => {
        this.actions.toggleCinema?.();
      });

      this._addButton('gravity', 0.04, 0.73, 0.44, 0.10, '💥 Gravidade / Choque', 0xd97706, () => {
        this.actions.triggerPhysics?.();
      });
      this._addButton('rewind', 0.52, 0.73, 0.44, 0.10, '⏪ Rebobinar Tempo', 0x334155, () => {
        this.actions.rewindPhysics?.();
      });

      this._addButton('recenter2', 0.04, 0.87, 0.92, 0.09, '🎯 Recentralizar Holograma', 0x0d9488, () => {
        this.actions.recenterStage?.();
      });
    } else if (this.activeTab === 'rubiks') {
      this._addButton('rb-toggle', 0.04, 0.24, 0.92, 0.10, this.state.rubiksActive ? '← Voltar para Potências (n^e)' : '🧩 Abrir Cubo Mágico Interativo (n³)', 0x059669, () => {
        this.actions.toggleRubiks?.();
      });

      this._addButton('rb-dec', 0.04, 0.37, 0.18, 0.09, 'Ordem −', 0x1e293b, () => this.actions.stepRubiksOrder?.(-1));
      this._addButton('rb-inc', 0.78, 0.37, 0.18, 0.09, 'Ordem +', 0x0284c7, () => this.actions.stepRubiksOrder?.(1));

      this._addButton('rb-scramble', 0.04, 0.49, 0.44, 0.10, '🔀 Embaralhar', 0xd97706, () => this.actions.rubiksScramble?.());
      this._addButton('rb-solve', 0.52, 0.49, 0.44, 0.10, '✨ Auto-Resolver', 0x059669, () => this.actions.rubiksSolve?.());

      const moves = ['U', "U'", 'R', "R'", 'F', "F'", 'L', "L'", 'D', "D'"];
      moves.forEach((mv, idx) => {
        const col = idx % 5;
        const row = Math.floor(idx / 5);
        this._addButton(
          `rb-mv-${mv}`,
          0.04 + col * 0.186,
          0.63 + row * 0.11,
          0.17,
          0.095,
          mv,
          0x1e293b,
          () => this.actions.rubiksMove?.(mv)
        );
      });

      this._addButton('rb-reset', 0.04, 0.87, 0.92, 0.09, '↺ Resetar Cubo Mágico', 0x334155, () => {
        this.actions.rubiksReset?.();
      });
    } else if (this.activeTab === 'video') {
      this._addButton('vp-toggle', 0.04, 0.24, 0.92, 0.10, this.state.videoActive ? '⏹ Encerrar Voxel Video 3D' : '🎬 Iniciar Voxel Video 3D', 0x0284c7, () => {
        this.actions.toggleVideo?.();
      });

      this._addButton('vp-back', 0.04, 0.37, 0.28, 0.095, '⏪ −5s', 0x1e293b, () => this.actions.videoSeek?.(-5));
      this._addButton('vp-play', 0.35, 0.37, 0.30, 0.095, '⏯ Play/Pause', 0x059669, () => this.actions.videoPlayPause?.());
      this._addButton('vp-fwd', 0.68, 0.37, 0.28, 0.095, '⏩ +5s', 0x1e293b, () => this.actions.videoSeek?.(5));

      this._addButton('vp-stage', 0.04, 0.50, 0.92, 0.095, `Palco: ${this.state.videoStage.toUpperCase()}`, 0x334155, () => {
        this.actions.cycleVideoStage?.();
      });

      this._addButton('vp-color', 0.04, 0.63, 0.92, 0.095, `Perfil de Cor: #${this.state.videoColor}`, 0x6d28d9, () => {
        this.actions.cycleVideoColor?.();
      });

      this._addSlider('vp-relief', 0.04, 0.76, 0.92, 0.09, 'Extrusão Voxel 3D', 0, 2.2, () => this.state.videoRelief, (v) => {
        this.state.videoRelief = v;
        this.actions.setVideoRelief?.(v);
      });

      this._addButton('vp-recenter', 0.04, 0.88, 0.92, 0.085, '🎯 Enquadrar Tela Voxel na Frente', 0x0d9488, () => {
        this.actions.recenterStage?.();
      });
    }

    this._redrawCanvas();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _redrawCanvas() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Fundo holográfico escuro translúcido
    ctx.fillStyle = 'rgba(7, 13, 28, 0.94)';
    this._roundRect(ctx, 4, 4, W - 8, H - 8, 28);
    ctx.fill();

    // Título superior esquerdo
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧊 CONSOLE HIPERDIMENSIONAL VR', 34, 48);

    // Formula readout na aba Potências ou Ordem na aba Cubo
    if (this.activeTab === 'math') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      this._roundRect(ctx, 36, 180, W - 72, 88, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 34px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.state.formulaText, W * 0.5, 212);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(this.state.dimText, W * 0.5, 246);

      // Valores numéricos de Base (n) e Expoente (e) entre os botões - e +
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 30px Consolas, monospace';
      ctx.fillText(`Base: ${this.state.base}`, W * 0.255, 0.405 * H);
      ctx.fillText(`Exp: ${this.state.exp}`, W * 0.745, 0.405 * H);
    } else if (this.activeTab === 'rubiks') {
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 28px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Ordem: ${this.state.rubiksOrder}×${this.state.rubiksOrder}×${this.state.rubiksOrder}`, W * 0.5, 0.415 * H);
    }

    // Desenha Botões
    for (const btn of this.buttons) {
      const bx = btn.nx * W;
      const by = btn.ny * H;
      const bw = btn.nw * W;
      const bh = btn.nh * H;

      ctx.fillStyle = btn.hover ? 'rgba(56, 189, 248, 0.42)' : `#${btn.accent.toString(16).padStart(6, '0')}cc`;
      this._roundRect(ctx, bx, by, bw, bh, 14);
      ctx.fill();

      ctx.strokeStyle = btn.hover ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = btn.hover ? 3 : 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 23px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, bx + bw * 0.5, by + bh * 0.5);
    }

    // Desenha Sliders
    for (const sl of this.sliders) {
      const sx = sl.nx * W;
      const sy = sl.ny * H;
      const sw = sl.nw * W;
      const sh = sl.nh * H;

      const val = sl.getter();
      const norm = THREE.MathUtils.clamp((val - sl.min) / Math.max(1e-5, sl.max - sl.min), 0, 1);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      this._roundRect(ctx, sx, sy, sw, sh, 12);
      ctx.fill();

      // Barra de progresso
      const pad = 16;
      const trackX = sx + pad;
      const trackW = sw - pad * 2;
      const trackY = sy + sh * 0.68;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      this._roundRect(ctx, trackX, trackY - 5, trackW, 10, 5);
      ctx.fill();

      ctx.fillStyle = sl.hover ? '#34d399' : '#38bdf8';
      this._roundRect(ctx, trackX, trackY - 5, Math.max(10, trackW * norm), 10, 5);
      ctx.fill();

      // Rótulo e valor
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(sl.label, sx + pad, sy + sh * 0.30);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(Number(val).toFixed(sl.max > 10 ? 0 : 2), sx + sw - pad, sy + sh * 0.30);

      // Sincroniza posição 3D da esfera do thumb
      const localX = ((sl.nx + (pad / W) + norm * (trackW / W)) - 0.5) * this.panelW;
      const localY = (0.5 - (sl.ny + sl.nh * 0.68)) * this.panelH;
      sl.thumbMesh.position.set(localX, localY, 0.011);
    }

    this.texture.needsUpdate = true;
  }

  syncState(partialState) {
    Object.assign(this.state, partialState);
    // Atualiza rótulos dinâmicos
    const btnFilter = this.buttons.find((b) => b.id === 'filter-cycle');
    if (btnFilter) btnFilter.label = `Filtro: ${this.state.filterLabel}`;

    const btnSpin = this.buttons.find((b) => b.id === 'spin4d');
    if (btnSpin) btnSpin.label = this.state.auto4D ? '⏹ Parar 4D' : '🌀 Girar 4D (Auto)';

    const btnZ = this.buttons.find((b) => b.id === 'zcurve');
    if (btnZ) btnZ.label = this.state.zCurve ? '⏹ Ocultar Curva Z' : '⚡ Curva Z';

    const btnScan = this.buttons.find((b) => b.id === 'scanner');
    if (btnScan) btnScan.label = this.state.scanner ? '⏹ Parar Laser' : '🎵 Scanner Laser';

    const btnCin = this.buttons.find((b) => b.id === 'cinema');
    if (btnCin) btnCin.label = this.state.cinema ? '⏹ Sair Cinema' : '🎞 Modo Cinema';

    const btnRb = this.buttons.find((b) => b.id === 'rb-toggle');
    if (btnRb) btnRb.label = this.state.rubiksActive ? '← Voltar para Potências (n^e)' : '🧩 Abrir Cubo Mágico Interativo (n³)';

    const btnVp = this.buttons.find((b) => b.id === 'vp-toggle');
    if (btnVp) btnVp.label = this.state.videoActive ? '⏹ Encerrar Voxel Video 3D' : '🎬 Iniciar Voxel Video 3D';

    const btnVpStage = this.buttons.find((b) => b.id === 'vp-stage');
    if (btnVpStage) btnVpStage.label = `Palco: ${this.state.videoStage.toUpperCase()}`;

    const btnVpCol = this.buttons.find((b) => b.id === 'vp-color');
    if (btnVpCol) btnVpCol.label = `Perfil de Cor: #${this.state.videoColor}`;

    this._redrawCanvas();
  }

  setVisible(vis) {
    this.visible = Boolean(vis);
    this.rootGroup.visible = this.visible;
    if (!this.visible) {
      this.inspectorMesh.visible = false;
    } else {
      this._redrawCanvas();
    }
  }

  updatePlacement(handStates, dt) {
    if (!this.visible) return;

    const leftHand = handStates.find((h) => h.handedness === 'left' && h.active) || handStates[0];

    if (!this.pinned && leftHand && leftHand.active) {
      // Ancora suavemente acima e à direita do pulso esquerdo, voltado para o rosto do usuário
      const targetPos = leftHand.wristPos.clone().add(new THREE.Vector3(0.08, 0.22, -0.04));
      this.rootGroup.position.lerp(targetPos, 1 - Math.exp(-9 * dt));
      this.rootGroup.lookAt(this.camera.position);
    } else if (this.pinned && this.rootGroup.position.lengthSq() < 0.001) {
      this.rootGroup.position.set(-0.38, 1.25, -0.78);
      this.rootGroup.lookAt(this.camera.position);
    }
  }

  updateInteraction(handStates, dt) {
    if (!this.visible) return false;
    if (this._buttonCooldown > 0) this._buttonCooldown = Math.max(0, this._buttonCooldown - dt);

    this.updatePlacement(handStates, dt);

    let needsRedraw = false;
    let interacted = false;

    for (const b of this.buttons) b.hover = false;
    for (const s of this.sliders) s.hover = false;

    for (const h of handStates) {
      if (!h.active) continue;

      // Converte a ponta do dedo indicador para o espaço local do console 3D
      const localTip = this.rootGroup.worldToLocal(h.indexTip.clone());
      const inFront = Math.abs(localTip.z) < 0.045;
      const u = localTip.x / this.panelW + 0.5;
      const v = 0.5 - localTip.y / this.panelH;

      if (inFront && u >= -0.05 && u <= 1.05 && v >= -0.05 && v <= 1.05) {
        interacted = true;

        // Testa botões
        for (const btn of this.buttons) {
          if (u >= btn.nx && u <= btn.nx + btn.nw && v >= btn.ny && v <= btn.ny + btn.nh) {
            btn.hover = true;
            needsRedraw = true;
            if (localTip.z <= 0.014 && this._buttonCooldown <= 0) {
              this._buttonCooldown = 0.28;
              btn.onClick?.();
            }
          }
        }

        // Testa sliders (arraste contínuo com o dedo)
        for (const sl of this.sliders) {
          if (u >= sl.nx && u <= sl.nx + sl.nw && v >= sl.ny && v <= sl.ny + sl.nh) {
            sl.hover = true;
            needsRedraw = true;
            if (localTip.z <= 0.022 || h.isPinching) {
              const norm = THREE.MathUtils.clamp((u - sl.nx) / sl.nw, 0, 1);
              const val = sl.min + norm * (sl.max - sl.min);
              sl.setter(val);
            }
          }
        }
      }
    }

    if (needsRedraw) {
      this._redrawCanvas();
    }
    return interacted;
  }
}
