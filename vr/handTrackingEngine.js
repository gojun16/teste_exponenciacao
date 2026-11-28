import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

/**
 * Motor de Rastreamento de Mãos (WebXR Hand Tracking) + Controles Touch para Meta Quest 2.
 * Suporta:
 *  - Toque direto (Poke) com a ponta do dedo indicador em botões 3D, cubos musicais e Cubo Mágico
 *  - Pinça com 1 mão (Grab 6-DoF): agarra, move e rotaciona o holograma matemático no espaço
 *  - Pinça com 2 mãos (Two-Hand Scale/Rotate): redimensiona e gira a estrutura em escala real
 *  - Gesto "BOOM" com 2 mãos: juntar as mãos e abri-las rapidamente detona onda de choque física
 *  - Palma da mão esquerda para cima: invoca o painel holográfico diegético no pulso
 */
export class HandTrackingEngine {
  constructor(renderer, playerRig, scene) {
    this.renderer = renderer;
    this.playerRig = playerRig;
    this.scene = scene;

    this.handModelFactory = new XRHandModelFactory();
    this.controllerModelFactory = new XRControllerModelFactory();

    this.hands = [];
    this.controllers = [];
    this.handStates = [this._createHandState(0), this._createHandState(1)];

    // Estado de manipulação 1 mão / 2 mãos
    this.grabState = {
      mode: 'none', // 'none' | 'single' | 'two'
      handIndex: -1,
      initialHandPos: new THREE.Vector3(),
      initialHandQuat: new THREE.Quaternion(),
      initialTargetPos: new THREE.Vector3(),
      initialTargetQuat: new THREE.Quaternion(),
      initialTargetScale: 0.13,
      initialSpan: 0.25,
      initialMid: new THREE.Vector3(),
      initialTwoYaw: 0
    };

    // Estado de detecção do gesto "BOOM"
    this._boomArmed = false;
    this._boomArmTimer = 0;
    this._boomCooldown = 0;
    this._shockwaveRings = [];

    // Callbacks conectados pelo WebXRDirector
    this.onBlockPoke = null;      // (worldPoint, handState) => blockInfo | null
    this.onBlockHover = null;     // (worldPoint, handState) => blockInfo | null
    this.onRubiksSwipe = null;    // (worldPoint, swipeDeltaVec) => boolean
    this.onBoomGesture = null;    // (midpointWorld) => void
    this.diegeticUI = null;       // DiegeticControls3D instance

    this._tmpVecA = new THREE.Vector3();
    this._tmpVecB = new THREE.Vector3();
    this._tmpVecC = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpMat = new THREE.Matrix4();

    this._setupXRInputs();
  }

  _createHandState(index) {
    // Esfera luminosa na ponta do indicador para feedback tátil preciso
    const tipMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.011, 14, 14),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.92
      })
    );
    tipMesh.visible = false;
    this.scene.add(tipMesh);

    // Raio apontador fino para alcance à distância
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1.6)
    ]);
    const rayLine = new THREE.Line(
      rayGeo,
      new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.38
      })
    );
    rayLine.visible = false;
    this.scene.add(rayLine);

    return {
      index,
      handedness: index === 0 ? 'left' : 'right',
      active: false,
      isHandTracked: false,
      triggerPressed: false,
      isPinching: false,
      justPinched: false,
      justReleased: false,
      isPalmUp: false,
      indexTip: new THREE.Vector3(),
      prevIndexTip: new THREE.Vector3(),
      thumbTip: new THREE.Vector3(),
      wristPos: new THREE.Vector3(),
      wristQuat: new THREE.Quaternion(),
      pinchMid: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      speed: 0,
      rayOrigin: new THREE.Vector3(),
      rayDir: new THREE.Vector3(0, 0, -1),
      pokeCooldown: 0,
      rubiksDragStart: null,
      tipMesh,
      rayLine
    };
  }

  _setupXRInputs() {
    for (let i = 0; i < 2; i++) {
      // 1) WebXR Hand Tracking (mãos nuas no Quest 2)
      const hand = this.renderer.xr.getHand(i);
      const handModel = this.handModelFactory.createHandModel(hand, 'mesh');
      hand.add(handModel);

      hand.addEventListener('connected', (event) => {
        const state = this.handStates[i];
        state.active = true;
        state.isHandTracked = true;
        if (event.data?.handedness) {
          state.handedness = event.data.handedness;
        }
      });

      hand.addEventListener('disconnected', () => {
        const state = this.handStates[i];
        state.isHandTracked = false;
        state.tipMesh.visible = false;
      });

      this.playerRig.add(hand);
      this.hands.push(hand);

      // 2) WebXR Controllers (Oculus Touch caso o usuário segure os controles)
      const controller = this.renderer.xr.getController(i);
      controller.addEventListener('connected', (event) => {
        const state = this.handStates[i];
        state.active = true;
        if (event.data?.handedness) {
          state.handedness = event.data.handedness;
        }
      });
      controller.addEventListener('disconnected', () => {
        const state = this.handStates[i];
        if (!state.isHandTracked) {
          state.active = false;
          state.tipMesh.visible = false;
          state.rayLine.visible = false;
        }
      });
      controller.addEventListener('selectstart', () => {
        this.handStates[i].triggerPressed = true;
      });
      controller.addEventListener('selectend', () => {
        this.handStates[i].triggerPressed = false;
      });

      const grip = this.renderer.xr.getControllerGrip(i);
      grip.add(this.controllerModelFactory.createControllerModel(grip));
      this.playerRig.add(grip);
      this.playerRig.add(controller);
      this.controllers.push({ controller, grip });
    }
  }

  spawnShockwaveVisual(originWorld) {
    const geo = new THREE.RingGeometry(0.05, 0.09, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(originWorld);
    ring.lookAt(this.renderer.xr.getCamera().position);
    this.scene.add(ring);
    this._shockwaveRings.push({ mesh: ring, age: 0 });
  }

  _updateShockwaves(dt) {
    for (let i = this._shockwaveRings.length - 1; i >= 0; i--) {
      const item = this._shockwaveRings[i];
      item.age += dt;
      const t = item.age / 0.65;
      if (t >= 1) {
        this.scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        this._shockwaveRings.splice(i, 1);
      } else {
        const s = 1 + t * 18;
        item.mesh.scale.set(s, s, 1);
        item.mesh.material.opacity = (1 - t) * 0.85;
      }
    }
  }

  _updateSingleHand(i, dt) {
    const state = this.handStates[i];
    const hand = this.hands[i];
    const ctrl = this.controllers[i]?.controller;

    state.prevIndexTip.copy(state.indexTip);
    if (state.pokeCooldown > 0) state.pokeCooldown = Math.max(0, state.pokeCooldown - dt);

    const joints = hand?.joints;
    const indexJoint = joints?.['index-finger-tip'];
    const thumbJoint = joints?.['thumb-tip'];
    const wristJoint = joints?.['wrist'];
    const indexMeta = joints?.['index-finger-metacarpal'];
    const pinkyMeta = joints?.['pinky-finger-metacarpal'];

    let hasValidPose = false;

    if (indexJoint && indexJoint.position.lengthSq() > 0.0001) {
      state.isHandTracked = true;
      state.active = true;
      hasValidPose = true;

      indexJoint.getWorldPosition(state.indexTip);
      if (thumbJoint) {
        thumbJoint.getWorldPosition(state.thumbTip);
      } else {
        state.thumbTip.copy(state.indexTip);
      }

      if (wristJoint) {
        wristJoint.getWorldPosition(state.wristPos);
        wristJoint.getWorldQuaternion(state.wristQuat);
      } else {
        state.wristPos.copy(state.indexTip);
      }

      // Detecta se a palma está voltada para cima (para invocar menu no pulso esquerdo)
      if (wristJoint && indexMeta && pinkyMeta) {
        indexMeta.getWorldPosition(this._tmpVecA);
        pinkyMeta.getWorldPosition(this._tmpVecB);
        this._tmpVecA.sub(state.wristPos);
        this._tmpVecB.sub(state.wristPos);
        // Produto vetorial depende da lateralidade da mão
        if (state.handedness === 'left') {
          this._tmpVecC.crossVectors(this._tmpVecB, this._tmpVecA).normalize();
        } else {
          this._tmpVecC.crossVectors(this._tmpVecA, this._tmpVecB).normalize();
        }
        state.isPalmUp = this._tmpVecC.y > 0.62;
      } else {
        state.isPalmUp = false;
      }

      // Direção do raio a partir da base até a ponta do indicador
      const indexProx = joints?.['index-finger-phalanx-proximal'];
      if (indexProx) {
        indexProx.getWorldPosition(state.rayOrigin);
        state.rayDir.subVectors(state.indexTip, state.rayOrigin).normalize();
      } else {
        state.rayOrigin.copy(state.indexTip);
        state.rayDir.set(0, 0, -1).applyQuaternion(state.wristQuat);
      }
    } else if (ctrl && state.active) {
      // Fallback para controles Oculus Touch
      hasValidPose = true;
      ctrl.getWorldPosition(state.wristPos);
      ctrl.getWorldQuaternion(state.wristQuat);
      state.rayOrigin.copy(state.wristPos);
      state.rayDir.set(0, 0, -1).applyQuaternion(state.wristQuat);
      state.indexTip.copy(state.wristPos).addScaledVector(state.rayDir, 0.12);
      state.thumbTip.copy(state.indexTip);
      // Inclinar o controle esquerdo com face para cima abre o menu
      const upVec = this._tmpVecA.set(0, 1, 0).applyQuaternion(state.wristQuat);
      state.isPalmUp = upVec.y > 0.68;
    }

    if (!hasValidPose) {
      state.tipMesh.visible = false;
      state.rayLine.visible = false;
      state.isPinching = false;
      return;
    }

    // Velocidade da mão em m/s
    if (dt > 0.0001) {
      this._tmpVecA.subVectors(state.indexTip, state.prevIndexTip).divideScalar(dt);
      state.velocity.lerp(this._tmpVecA, 0.35);
      state.speed = state.velocity.length();
    }

    // Detecção de pinça com histerese
    const pinchDist = state.indexTip.distanceTo(state.thumbTip);
    const wasPinching = state.isPinching;
    if (state.triggerPressed) {
      state.isPinching = true;
    } else if (state.isHandTracked) {
      if (!wasPinching && pinchDist < 0.025) state.isPinching = true;
      else if (wasPinching && pinchDist > 0.036) state.isPinching = false;
    } else {
      state.isPinching = false;
    }

    state.justPinched = !wasPinching && state.isPinching;
    state.justReleased = wasPinching && !state.isPinching;
    state.pinchMid.addVectors(state.indexTip, state.thumbTip).multiplyScalar(0.5);

    // Atualiza visuais da ponta do dedo e raio apontador
    state.tipMesh.visible = true;
    state.tipMesh.position.copy(state.isPinching ? state.pinchMid : state.indexTip);
    state.tipMesh.material.color.setHex(state.isPinching ? 0x34d399 : 0x38bdf8);
    state.tipMesh.scale.setScalar(state.isPinching ? 1.35 : 1.0);

    state.rayLine.visible = true;
    state.rayLine.position.copy(state.rayOrigin);
    this._tmpQuat.setFromUnitVectors(new THREE.Vector3(0, 0, -1), state.rayDir);
    state.rayLine.quaternion.copy(this._tmpQuat);
    state.rayLine.material.color.setHex(state.isPinching ? 0x34d399 : 0x38bdf8);
  }

  _processStageManipulation(stageGroup) {
    if (!stageGroup) return;

    const h0 = this.handStates[0];
    const h1 = this.handStates[1];
    const p0 = h0.active && h0.isPinching;
    const p1 = h1.active && h1.isPinching;

    // Verifica se a pinça começou perto do estágio (ou já estava agarrando)
    const stageCenter = this._tmpVecA;
    stageGroup.getWorldPosition(stageCenter);
    // Alcance amplo o suficiente para agarrar a superfície do cubo, sem capturar
    // pinças feitas longe do objeto.
    const grabRadius = Math.max(0.42, stageGroup.scale.x * 9.0);

    const near0 = p0 && h0.pinchMid.distanceTo(stageCenter) <= grabRadius;
    const near1 = p1 && h1.pinchMid.distanceTo(stageCenter) <= grabRadius;

    // Transição para manipulação com 2 mãos (Escala + Rotação + Translação)
    if (p0 && p1 && (near0 || near1 || this.grabState.mode !== 'none')) {
      const span = Math.max(0.06, h0.pinchMid.distanceTo(h1.pinchMid));
      const mid = this._tmpVecB.addVectors(h0.pinchMid, h1.pinchMid).multiplyScalar(0.5);
      const yaw = Math.atan2(h1.pinchMid.x - h0.pinchMid.x, h1.pinchMid.z - h0.pinchMid.z);

      if (this.grabState.mode !== 'two') {
        this.grabState.mode = 'two';
        this.grabState.initialSpan = span;
        this.grabState.initialMid.copy(mid);
        this.grabState.initialTargetPos.copy(stageGroup.position);
        this.grabState.initialTargetQuat.copy(stageGroup.quaternion);
        this.grabState.initialTargetScale = stageGroup.scale.x;
        this.grabState.initialTwoYaw = yaw;
      } else {
        const scaleRatio = span / this.grabState.initialSpan;
        const nextScale = THREE.MathUtils.clamp(
          this.grabState.initialTargetScale * scaleRatio,
          0.04,
          0.55
        );
        stageGroup.scale.setScalar(nextScale);

        const deltaMid = this._tmpVecC.subVectors(mid, this.grabState.initialMid);
        stageGroup.position.copy(this.grabState.initialTargetPos).add(deltaMid);

        const deltaYaw = yaw - this.grabState.initialTwoYaw;
        this._tmpQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaYaw);
        stageGroup.quaternion.copy(this._tmpQuat).multiply(this.grabState.initialTargetQuat);
      }
      return;
    }

    // Manipulação com 1 mão (Grab 6-DoF)
    const singleIdx = near0 ? 0 : near1 ? 1 : (this.grabState.mode === 'single' && this.handStates[this.grabState.handIndex]?.isPinching ? this.grabState.handIndex : -1);

    if (singleIdx !== -1) {
      const h = this.handStates[singleIdx];
      if (this.grabState.mode !== 'single' || this.grabState.handIndex !== singleIdx) {
        this.grabState.mode = 'single';
        this.grabState.handIndex = singleIdx;
        this.grabState.initialHandPos.copy(h.pinchMid);
        this.grabState.initialHandQuat.copy(h.wristQuat);
        this.grabState.initialTargetPos.copy(stageGroup.position);
        this.grabState.initialTargetQuat.copy(stageGroup.quaternion);
      } else {
        const posDelta = this._tmpVecB.subVectors(h.pinchMid, this.grabState.initialHandPos);
        stageGroup.position.copy(this.grabState.initialTargetPos).add(posDelta);

        // Com uma mão, o gesto funciona como arrastar: desloca o cubo sem
        // fazê-lo girar involuntariamente conforme a orientação do pulso.
        // Rotação e escala ficam reservadas para a manipulação com duas mãos.
      }
      return;
    }

    this.grabState.mode = 'none';
    this.grabState.handIndex = -1;
  }

  _processBoomGesture(dt) {
    if (this._boomCooldown > 0) {
      this._boomCooldown = Math.max(0, this._boomCooldown - dt);
      return;
    }

    const h0 = this.handStates[0];
    const h1 = this.handStates[1];
    if (!h0.active || !h1.active) {
      this._boomArmed = false;
      return;
    }

    // Não dispara se estiver pinçando para escalar
    if (h0.isPinching || h1.isPinching) {
      this._boomArmed = false;
      return;
    }

    const dist = h0.indexTip.distanceTo(h1.indexTip);
    if (dist < 0.21) {
      this._boomArmed = true;
      this._boomArmTimer = 0.65;
    } else if (this._boomArmed) {
      this._boomArmTimer -= dt;
      if (this._boomArmTimer <= 0) {
        this._boomArmed = false;
        return;
      }
      // Verifica se ambas as mãos se afastaram rápido em direções opostas
      const dotOpp = h0.velocity.dot(h1.velocity);
      if (dist > 0.44 && h0.speed > 1.25 && h1.speed > 1.25 && dotOpp < -0.4) {
        this._boomArmed = false;
        this._boomCooldown = 1.4;
        const mid = new THREE.Vector3().addVectors(h0.indexTip, h1.indexTip).multiplyScalar(0.5);
        this.spawnShockwaveVisual(mid);
        if (typeof this.onBoomGesture === 'function') {
          this.onBoomGesture(mid);
        }
      }
    }
  }

  update(dt, stageGroup) {
    this._updateShockwaves(dt);

    for (let i = 0; i < 2; i++) {
      this._updateSingleHand(i, dt);
    }

    // 1. Interação prioritária com o Painel Holográfico Diegético 3D
    let uiConsumed = false;
    if (this.diegeticUI) {
      uiConsumed = this.diegeticUI.updateInteraction(this.handStates, dt);
    }

    // 2. Manipulação física do artefato (1 ou 2 mãos) e gesto BOOM
    if (!uiConsumed) {
      this._processStageManipulation(stageGroup);
      this._processBoomGesture(dt);

      // 3. Toque direto nos blocos matemáticos ou Cubo Mágico
      if (this.grabState.mode === 'none') {
        for (let i = 0; i < 2; i++) {
          const h = this.handStates[i];
          if (!h.active) continue;

          if (typeof this.onBlockHover === 'function') {
            this.onBlockHover(h.indexTip, h);
          }

          if (h.pokeCooldown <= 0 && typeof this.onBlockPoke === 'function') {
            const poked = this.onBlockPoke(h.indexTip, h);
            if (poked) {
              h.pokeCooldown = 0.22;
            }
          }
        }
      }
    }
  }
}
