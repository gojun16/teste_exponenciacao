import * as THREE from 'three';
import { VRWorldEnvironment } from './vrWorldEnvironment.js';
import { HandTrackingEngine } from './handTrackingEngine.js';
import { DiegeticControls3D } from './diegeticControls3D.js';

/**
 * Orquestrador Central WebXR para Meta Quest 2 (Oculus Browser).
 * Gerencia ciclo de vida da sessão VR, escala espacial do palco holográfico,
 * rastreamento de mãos, controles diegéticos 3D e sincronização com todos os módulos.
 */
export class WebXRDirector {
  constructor(engine, deps) {
    this.engine = engine;
    this.deps = deps;

    this.isSupported = false;
    this.isPresenting = false;
    this.session = null;

    // Rig do jogador (contém câmera XR e mãos/controles)
    this.playerRig = new THREE.Group();
    this.engine.scene.add(this.playerRig);

    // Palco holográfico escalável em VR (1.3m flutuando na frente do usuário)
    this.vrStageGroup = new THREE.Group();
    this.vrStageGroup.position.set(0, 1.05, -1.65);
    this.vrStageGroup.scale.setScalar(0.075);
    this.engine.scene.add(this.vrStageGroup);

    this.worldEnv = new VRWorldEnvironment(this.engine.scene);
    this.handEngine = new HandTrackingEngine(this.engine.renderer, this.playerRig, this.engine.scene);
    this.diegeticUI = new DiegeticControls3D(this.engine.scene, this.engine.camera);
    this.handEngine.diegeticUI = this.diegeticUI;

    this._savedCameraPos = new THREE.Vector3();
    this._savedCameraTarget = new THREE.Vector3();
    this._savedBackground = null;
    this._savedFog = null;

    this._bindGesturesAndUI();
    this.checkSupport();
  }

  async checkSupport() {
    if (typeof navigator !== 'undefined' && navigator.xr && navigator.xr.isSessionSupported) {
      try {
        this.isSupported = await navigator.xr.isSessionSupported('immersive-vr');
      } catch {
        this.isSupported = false;
      }
    } else {
      this.isSupported = false;
    }

    const btnVR = document.getElementById('btn-vr');
    if (btnVR) {
      if (this.isSupported) {
        btnVR.textContent = '🥽 Entrar em VR (Quest 2)';
        btnVR.title = 'Iniciar experiência imersiva WebXR com rastreamento de mãos';
      } else {
        btnVR.textContent = '🥽 VR (WebXR Quest 2)';
        btnVR.title = 'Abra no navegador do Meta Quest 2 (HTTPS ou localhost) para ativar';
      }
    }
    return this.isSupported;
  }

  recenterStage() {
    // Posiciona o holograma a 1.15m à frente do olhar atual do usuário
    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    this.engine.camera.getWorldPosition(camPos);
    this.engine.camera.getWorldDirection(camDir);
    camDir.y = 0;
    if (camDir.lengthSq() < 0.001) camDir.set(0, 0, -1);
    camDir.normalize();

    this.vrStageGroup.position.copy(camPos).addScaledVector(camDir, 1.55);
    // Mantém o cubo à frente e um pouco abaixo da linha dos olhos, fora do volume do jogador.
    this.vrStageGroup.position.y = Math.max(0.65, camPos.y - 0.45);
    this.vrStageGroup.quaternion.identity();
    this.vrStageGroup.scale.setScalar(0.075);

    if (this.deps.videoPlayer?.active && this.deps.videoPlayer.voxelMesh) {
      this.deps.videoPlayer.voxelMesh.position.set(0, 1.42, -2.35);
      this.deps.videoPlayer.voxelMesh.scale.setScalar(0.24);
    }
  }

  _bindGesturesAndUI() {
    // 1) Toque direto em blocos matemáticos ou Cubo Mágico
    this.handEngine.onBlockHover = (tipWorld) => {
      if (!this.isPresenting) return null;
      if (this.deps.rubiksCube?.active || this.deps.videoPlayer?.active) {
        this.diegeticUI.hideInspector();
        return null;
      }
      const nearest = this._findNearestMathBlock(tipWorld, 0.09);
      if (nearest) {
        this.diegeticUI.showInspector(nearest.block, nearest.worldPos);
      } else {
        this.diegeticUI.hideInspector();
      }
      return nearest?.block || null;
    };

    this.handEngine.onBlockPoke = (tipWorld, handState) => {
      if (!this.isPresenting) return false;

      // Modo Cubo Mágico: empurrar um cubinho gira a camada correspondente
      if (this.deps.rubiksCube?.active) {
        return this._pokeRubiksCube(tipWorld, handState);
      }

      // Modo Potências: tocar no cubo toca sua nota musical espacial
      if (!this.deps.videoPlayer?.active) {
        const nearest = this._findNearestMathBlock(tipWorld, 0.075);
        if (nearest && this.deps.instrument) {
          this.deps.instrument.playBlock(nearest.block);
          return true;
        }
      }
      return false;
    };

    // 2) Gesto BOOM com 2 mãos -> detona Física Sandbox (F = ma)
    this.handEngine.onBoomGesture = () => {
      if (!this.isPresenting || this.deps.rubiksCube?.active || this.deps.videoPlayer?.active) return;
      const physics = this.deps.physics;
      if (!physics) return;

      if (!physics.active) {
        const explodeVal = parseFloat(document.getElementById('explode-input')?.value || '0') || 0;
        physics.enable(this.engine.blocksData, 1 + explodeVal);
      }
      physics.applyShockwave(new THREE.Vector3(0, physics.floorY, 0), 28);
      this.deps.player?.triggerDimensionChime?.(6);
      this._syncDiegeticState();
    };

    // 3) Ações do Console Holográfico Diegético 3D
    this.diegeticUI.actions = {
      exitVR: () => this.exitVR(),
      recenterStage: () => this.recenterStage(),
      stepBase: (delta) => {
        const el = document.getElementById('base-input');
        if (!el) return;
        const next = THREE.MathUtils.clamp((parseInt(el.value, 10) || 3) + delta, 1, 25);
        el.value = String(next);
        this.deps.rebuild?.(true);
        this._syncDiegeticState();
      },
      stepExp: (delta) => {
        const el = document.getElementById('exp-input');
        if (!el) return;
        const next = THREE.MathUtils.clamp((parseInt(el.value, 10) || 3) + delta, 0, 60);
        el.value = String(next);
        this.deps.rebuild?.(true);
        this._syncDiegeticState();
      },
      cycleFilter: () => {
        const sel = document.getElementById('filter-select');
        if (!sel) return;
        sel.selectedIndex = (sel.selectedIndex + 1) % sel.options.length;
        this.deps.rebuild?.(true);
        this._syncDiegeticState();
      },
      setGap: (val) => {
        const el = document.getElementById('gap-input');
        if (el) el.value = val.toFixed(2);
        this.deps.rebuild?.(false);
        this._syncDiegeticState();
      },
      setExplode: (val) => {
        const el = document.getElementById('explode-input');
        if (el) el.value = val.toFixed(2);
        this.engine.setExplodeFactor(val);
        this._syncDiegeticState();
      },
      setSlice: (val) => {
        const el = document.getElementById('slice-input');
        if (el) el.value = val.toFixed(2);
        this.engine.setSliceRatio(val);
        this._syncDiegeticState();
      },
      toggle4DSpin: () => {
        document.getElementById('btn-4d-spin')?.click();
        this._syncDiegeticState();
      },
      set4DRot: (xw, yw) => {
        this.deps.hyper4D?.setAnglesDeg(xw, yw);
        this.deps.spatialAudio?.setHyperModulation(this.deps.hyper4D.angleXW, this.deps.hyper4D.angleYW);
        this.engine.refreshTransforms();
        this._syncDiegeticState();
      },
      toggleZCurve: () => {
        document.getElementById('btn-zcurve')?.click();
        this._syncDiegeticState();
      },
      toggleScanner: () => {
        document.getElementById('btn-scanner')?.click();
        this._syncDiegeticState();
      },
      toggleCinema: () => {
        document.getElementById('btn-cinema')?.click();
        this._syncDiegeticState();
      },
      triggerPhysics: () => {
        document.getElementById('btn-physics')?.click();
        this._syncDiegeticState();
      },
      rewindPhysics: () => {
        document.getElementById('btn-rewind')?.click();
        this._syncDiegeticState();
      },
      toggleRubiks: () => {
        document.getElementById('btn-rubiks')?.click();
        this._syncDiegeticState();
      },
      stepRubiksOrder: (delta) => {
        const rb = this.deps.rubiksCube;
        if (!rb || !rb.active) return;
        const next = THREE.MathUtils.clamp(rb.order + delta, 2, 8);
        const baseEl = document.getElementById('base-input');
        if (baseEl) baseEl.value = String(next);
        rb.rebuild(next, rb.gapRatio);
        this._syncDiegeticState();
      },
      rubiksScramble: () => {
        this.deps.rubiksCube?.scramble();
      },
      rubiksSolve: () => {
        this.deps.rubiksCube?.autoSolve();
      },
      rubiksMove: (notation) => {
        const rb = this.deps.rubiksCube;
        if (!rb || !rb.active) return;
        const mv = rb._parseNotation(notation);
        if (mv) rb.enqueueMove(mv, { record: true, source: 'manual' });
      },
      rubiksReset: () => {
        const rb = this.deps.rubiksCube;
        if (rb && rb.active) rb.rebuild(rb.order, rb.gapRatio);
      },
      toggleVideo: () => {
        document.getElementById('btn-video-player')?.click();
        if (this.deps.videoPlayer?.active && this.deps.videoPlayer.voxelMesh) {
          this.deps.videoPlayer.voxelMesh.position.set(0, 1.42, -2.35);
          this.deps.videoPlayer.voxelMesh.scale.setScalar(0.24);
        }
        this._syncDiegeticState();
      },
      videoPlayPause: () => {
        this.deps.videoPlayer?.togglePlayPause();
      },
      videoSeek: (sec) => {
        this.deps.videoPlayer?.seekBy(sec);
      },
      cycleVideoStage: () => {
        const vp = this.deps.videoPlayer;
        if (!vp) return;
        const modes = ['sculpt', 'curved', 'flat'];
        const next = modes[(modes.indexOf(vp.stageMode) + 1) % modes.length];
        vp.stageMode = next;
        this._syncDiegeticState();
      },
      cycleVideoColor: () => {
        const vp = this.deps.videoPlayer;
        if (!vp) return;
        vp.colorMode = (vp.colorMode + 1) % 4;
        vp.sharedUniforms.uColorMode.value = vp.colorMode;
        this._syncDiegeticState();
      },
      setVideoRelief: (val) => {
        const vp = this.deps.videoPlayer;
        if (vp) vp.reliefMultiplier = val;
        this._syncDiegeticState();
      }
    };
  }

  _findNearestMathBlock(tipWorld, maxDistWorld) {
    const sub = this.engine.subdivisionData;
    if (!sub || sub.count === 0 || !this.engine.cubesVisible) return null;

    // Converte a ponta do dedo para o espaço local do vrStageGroup
    const localPt = this.vrStageGroup.worldToLocal(tipWorld.clone());
    const maxLocalDist = maxDistWorld / Math.max(0.02, this.vrStageGroup.scale.x);
    const maxLocalDistSq = maxLocalDist * maxLocalDist;

    const { count, px, py, pz } = sub;
    const step = count > 3000 ? Math.floor(count / 1500) : 1;
    let bestIdx = -1;
    let bestDistSq = maxLocalDistSq;

    for (let i = 0; i < count; i += step) {
      const dx = px[i] - localPt.x;
      const dy = py[i] - localPt.y;
      const dz = pz[i] - localPt.z;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) return null;
    const block = sub.getBlock(bestIdx);
    const worldPos = this.vrStageGroup.localToWorld(new THREE.Vector3(px[bestIdx], py[bestIdx], pz[bestIdx]));
    return { block, worldPos };
  }

  _pokeRubiksCube(tipWorld, handState) {
    const rb = this.deps.rubiksCube;
    if (!rb || !rb.active || rb.isScrambling || rb.isAutoSolving || rb.currentAnim) return false;
    if (handState.speed < 0.25) return false;

    const localPt = rb.cubeGroup.worldToLocal(tipWorld.clone());
    let nearest = null;
    let bestDist = 1.6;
    for (const c of rb.cubies) {
      const d = c.mesh.position.distanceTo(localPt);
      if (d < bestDist) {
        bestDist = d;
        nearest = c;
      }
    }
    if (!nearest) return false;

    // Converte velocidade da mão para o espaço local do cubo e gira a camada ortogonal
    const invQuat = this.vrStageGroup.quaternion.clone().invert();
    const localVel = handState.velocity.clone().applyQuaternion(invQuat);

    const ax = Math.abs(nearest.mesh.position.x);
    const ay = Math.abs(nearest.mesh.position.y);
    const az = Math.abs(nearest.mesh.position.z);

    let axis = 'y';
    let dir = 1;
    if (ax >= ay && ax >= az) {
      // Face lateral X -> movimento em Y gira Z, movimento em Z gira Y
      if (Math.abs(localVel.y) >= Math.abs(localVel.z)) {
        axis = 'z';
        dir = Math.sign(localVel.y) * Math.sign(nearest.mesh.position.x);
      } else {
        axis = 'y';
        dir = -Math.sign(localVel.z) * Math.sign(nearest.mesh.position.x);
      }
    } else if (ay >= ax && ay >= az) {
      if (Math.abs(localVel.x) >= Math.abs(localVel.z)) {
        axis = 'z';
        dir = -Math.sign(localVel.x) * Math.sign(nearest.mesh.position.y);
      } else {
        axis = 'x';
        dir = Math.sign(localVel.z) * Math.sign(nearest.mesh.position.y);
      }
    } else {
      if (Math.abs(localVel.x) >= Math.abs(localVel.y)) {
        axis = 'y';
        dir = Math.sign(localVel.x) * Math.sign(nearest.mesh.position.z);
      } else {
        axis = 'x';
        dir = -Math.sign(localVel.y) * Math.sign(nearest.mesh.position.z);
      }
    }

    const layer = nearest[`g${axis}`];
    rb.enqueueMove(
      {
        axis,
        layer,
        dir: dir || 1,
        turns: 1,
        notation: rb._formatMoveNotation(axis, layer, dir || 1, 1)
      },
      { record: true, source: 'manual' }
    );
    return true;
  }

  _syncDiegeticState() {
    const base = parseInt(document.getElementById('base-input')?.value || '3', 10) || 3;
    const exp = parseInt(document.getElementById('exp-input')?.value || '3', 10) || 3;
    const filterSel = document.getElementById('filter-select');
    const filterLabel = filterSel ? filterSel.options[filterSel.selectedIndex]?.text || 'Todos' : 'Todos';

    this.diegeticUI.syncState({
      base,
      exp,
      formulaText: document.getElementById('formula')?.textContent || `${base}^${exp}`,
      dimText: document.getElementById('dim-desc')?.textContent || '',
      filterLabel,
      gap: parseFloat(document.getElementById('gap-input')?.value || '0.06') || 0.06,
      explode: this.engine.explodeFactor || 0,
      slice: this.engine.sliceRatio ?? 1,
      rotXW: Math.round(THREE.MathUtils.radToDeg(this.deps.hyper4D?.angleXW || 0)),
      rotYW: Math.round(THREE.MathUtils.radToDeg(this.deps.hyper4D?.angleYW || 0)),
      auto4D: Boolean(this.deps.hyper4D?.autoSpin),
      zCurve: Boolean(this.deps.zCurve?.visible),
      scanner: Boolean(this.deps.instrument?.scannerActive),
      physics: Boolean(this.deps.physics?.active),
      cinema: Boolean(this.deps.cinema?.active),
      rubiksActive: Boolean(this.deps.rubiksCube?.active),
      rubiksOrder: this.deps.rubiksCube?.order || 3,
      videoActive: Boolean(this.deps.videoPlayer?.active),
      videoStage: this.deps.videoPlayer?.stageMode || 'sculpt',
      videoColor: this.deps.videoPlayer?.colorMode || 0,
      videoRelief: this.deps.videoPlayer?.reliefMultiplier ?? 1.0
    });
  }

  _attachGroupsToVRStage() {
    const groups = [
      this.engine.rootGroup,
      this.engine.masterWireframe,
      this.engine.axesHelper,
      this.deps.hyper4D?.tesseractWireframe,
      this.deps.zCurve?.group,
      this.deps.instrument?.scannerGroup,
      this.deps.physics?.floorGroup,
      this.deps.rubiksCube?.cubeGroup
    ];
    for (const g of groups) {
      if (g) this.vrStageGroup.add(g);
    }
  }

  _restoreGroupsToScene() {
    const groups = [
      this.engine.rootGroup,
      this.engine.masterWireframe,
      this.engine.axesHelper,
      this.deps.hyper4D?.tesseractWireframe,
      this.deps.zCurve?.group,
      this.deps.instrument?.scannerGroup,
      this.deps.physics?.floorGroup,
      this.deps.rubiksCube?.cubeGroup
    ];
    for (const g of groups) {
      if (g) this.engine.scene.add(g);
    }
  }

  async enterVR() {
    if (this.isPresenting) return true;
    if (!navigator.xr) {
      alert('WebXR não detectado neste navegador. Abra este endereço no navegador do Meta Quest 2 (via HTTPS ou localhost).');
      return false;
    }

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
      });

      this.session = session;
      this.isPresenting = true;

      this._savedCameraPos.copy(this.engine.camera.position);
      this._savedCameraTarget.copy(this.engine.controls.target);
      this._savedBackground = this.engine.scene.background;
      this._savedFog = this.engine.scene.fog;

      // Configura WebXR no Three.js
      this.engine.renderer.xr.enabled = true;
      this.engine.renderer.xr.setReferenceSpaceType('local-floor');
      await this.engine.renderer.xr.setSession(session);

      // Posiciona câmera dentro do playerRig no chão (y = 0)
      this.playerRig.position.set(0, 0, 0);
      this.playerRig.rotation.set(0, 0, 0);
      this.playerRig.add(this.engine.camera);

      // Move os artefatos matemáticos para o palco holográfico escalável em VR
      this._attachGroupsToVRStage();
      this.vrStageGroup.position.set(0, 1.05, -1.65);
      this.vrStageGroup.rotation.set(0, 0, 0);
      this.vrStageGroup.scale.setScalar(0.075);

      // Ativa ambiente 360° e console diegético 3D
      this.engine.scene.background = new THREE.Color(0x030612);
      this.engine.scene.fog = null;
      this.engine.gpuUniforms.uIsVR.value = 1.0;

      this.worldEnv.setVisible(true);
      this.diegeticUI.setVisible(true);
      this._syncDiegeticState();

      document.body.classList.add('vr-mode-active');
      const btnVR = document.getElementById('btn-vr');
      if (btnVR) {
        btnVR.classList.add('active');
        btnVR.textContent = '🥽 Em Sessão VR';
      }

      session.addEventListener('end', () => {
        this._onSessionEnded();
      });

      return true;
    } catch (err) {
      console.error('[WebXRDirector] Falha ao iniciar sessão VR:', err);
      alert(`Não foi possível iniciar o modo VR: ${err.message || err}`);
      return false;
    }
  }

  async exitVR() {
    if (this.session) {
      try {
        await this.session.end();
      } catch {
        this._onSessionEnded();
      }
    } else {
      this._onSessionEnded();
    }
  }

  _onSessionEnded() {
    if (!this.isPresenting && !this.session) return;
    this.isPresenting = false;
    this.session = null;

    this.engine.renderer.xr.enabled = false;
    this.engine.scene.add(this.engine.camera);

    this._restoreGroupsToScene();
    this.worldEnv.setVisible(false);
    this.diegeticUI.setVisible(false);

    if (this._savedBackground !== null) this.engine.scene.background = this._savedBackground;
    this.engine.scene.fog = this._savedFog;
    this.engine.gpuUniforms.uIsVR.value = 0.0;

    this.engine.camera.position.copy(this._savedCameraPos);
    this.engine.controls.target.copy(this._savedCameraTarget);
    this.engine.controls.enabled = true;
    this.engine.controls.update();

    document.body.classList.remove('vr-mode-active');
    const btnVR = document.getElementById('btn-vr');
    if (btnVR) {
      btnVR.classList.remove('active');
      btnVR.textContent = this.isSupported ? '🥽 Entrar em VR (Quest 2)' : '🥽 VR (WebXR Quest 2)';
    }
  }

  update(dt, audioEnergy = { bass: 0, mid: 0 }) {
    if (!this.isPresenting) return;

    this.worldEnv.update(dt, audioEnergy);
    this.handEngine.update(dt, this.vrStageGroup);

    // Se o Video Player 3D estiver ativo em VR, mantém o palco centralizado na frente do usuário
    if (this.deps.videoPlayer?.active && this.deps.videoPlayer.voxelMesh) {
      this.deps.videoPlayer.voxelMesh.scale.setScalar(0.24);
    }
  }
}
