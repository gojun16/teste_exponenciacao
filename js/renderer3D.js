import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { MASTER_SIZE } from './mathEngine.js';

export class PowerRenderer3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050811);
    this.scene.fog = new THREE.FogExp2(0x050811, 0.016);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.01,
      500
    );
    this.camera.position.set(14, 11, 16);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 0.02;
    this.controls.maxDistance = 90;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5),
      0.42,
      0.55,
      0.85
    );
    this.composer.addPass(this.bloomPass);

    this.clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), MASTER_SIZE);

    this._setupLights();
    this._setupMasterFrame();

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.instancedMesh = null;
    this.blocksData = [];
    this.currentBase = 3;
    this.currentFilterMode = 'all';
    this.animProgress = 1;
    this.explodeFactor = 0;
    this.sliceRatio = 1;
    this.hyper4D = null;
    this.physics = null;
    this.zCurve = null;
    this.cubesVisible = true;
    this.cinema = null;
    this._needsRotationReset = false;
    this.lastHitPoint = null;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-999, -999);
    this.hoveredInstanceId = null;
    this.originalColors = null;

    this.dummy = new THREE.Object3D();
    this.colorHelper = new THREE.Color();

    // Auxiliares para Frustum Culling rápido sem alocar memória por frame
    this._frustum = new THREE.Frustum();
    this._projScreenMatrix = new THREE.Matrix4();
    this._boundSphere = new THREE.Sphere();
    this._lastCamPos = new THREE.Vector3(NaN, NaN, NaN);
    this._lastCamQuat = new THREE.Quaternion(NaN, NaN, NaN, NaN);
    this._cullingDirty = true;

    window.addEventListener('resize', () => this._onResize());
  }

  attachHyper4D(hyper4DInstance) {
    this.hyper4D = hyper4DInstance;
  }

  attachPhysics(physicsInstance) {
    this.physics = physicsInstance;
  }

  attachZCurve(zCurveInstance) {
    this.zCurve = zCurveInstance;
  }

  setCubesVisible(visible) {
    this.cubesVisible = Boolean(visible);
    if (this.instancedMesh) this.instancedMesh.visible = this.cubesVisible;
    if (this.wireframeMesh) this.wireframeMesh.visible = this.cubesVisible;
    return this.cubesVisible;
  }

  toggleCubesVisibility() {
    return this.setCubesVisible(!this.cubesVisible);
  }

  attachCinema(cinemaInstance) {
    this.cinema = cinemaInstance;
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.62);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 1.35);
    dir1.position.set(15, 25, 20);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x38bdf8, 0.85);
    dir2.position.set(-18, -10, -15);
    this.scene.add(dir2);

    const coreLight = new THREE.PointLight(0xc084fc, 2.0, 28);
    coreLight.position.set(0, 0, 0);
    this.scene.add(coreLight);
  }

  _setupMasterFrame() {
    const boxGeo = new THREE.BoxGeometry(MASTER_SIZE, MASTER_SIZE, MASTER_SIZE);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22
    });
    this.masterWireframe = new THREE.LineSegments(edges, lineMat);
    this.scene.add(this.masterWireframe);

    const axesHelper = new THREE.AxesHelper(MASTER_SIZE * 0.72);
    axesHelper.material.transparent = true;
    axesHelper.material.opacity = 0.45;
    this.scene.add(axesHelper);
  }

  setSliceRatio(ratio) {
    this.sliceRatio = ratio;
    const offset = -MASTER_SIZE * 0.55 + ratio * (MASTER_SIZE * 1.15);
    this.clipPlane.constant = offset;
    this._cullingDirty = true;
  }

  setExplodeFactor(factor) {
    this.explodeFactor = factor;
    this._cullingDirty = true;
    this.refreshTransforms();
  }

  refreshTransforms() {
    this._cullingDirty = true;
    this._applyTransforms(this.animProgress);
  }

  updatePointer(clientX, clientY) {
    this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  updateData(subdivisionResult, base = 3) {
    if (this.physics) this.physics.reset();
    const { blocks, filterMode } = subdivisionResult;
    this.blocksData = blocks;
    this.currentBase = base;
    this.currentFilterMode = filterMode || 'all';
    this.animProgress = 0;
    this.hoveredInstanceId = null;
    this._cullingDirty = true;

    if (this.instancedMesh) {
      this.rootGroup.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      this.instancedMesh.material.dispose();
      this.instancedMesh = null;
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // LOD de material: acima de 8.000 instâncias usa Lambert (muito mais leve no Fragment Shader)
    const material = blocks.length > 8000
      ? new THREE.MeshLambertMaterial({
          clippingPlanes: [this.clipPlane],
          clipShadows: true
        })
      : new THREE.MeshPhysicalMaterial({
          roughness: 0.25,
          metalness: 0.35,
          clippingPlanes: [this.clipPlane],
          clipShadows: true
        });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, Math.max(1, blocks.length));
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.count = blocks.length;
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.originalColors = new Float32Array(blocks.length * 3);

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      this.colorHelper.setHSL(b.hue, 0.85, 0.52);
      this.instancedMesh.setColorAt(i, this.colorHelper);
      this.originalColors[i * 3] = this.colorHelper.r;
      this.originalColors[i * 3 + 1] = this.colorHelper.g;
      this.originalColors[i * 3 + 2] = this.colorHelper.b;
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this.rootGroup.add(this.instancedMesh);

    if (this.zCurve) {
      this.zCurve.rebuild(blocks, 1 + this.explodeFactor, this.hyper4D, base);
    }
    this.setCubesVisible(this.cubesVisible);
    this._applyTransforms(0);
  }

  _applyTransforms(t) {
    if (!this.instancedMesh || !this.blocksData) return;

    const ease = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
    const radialBoost = 1 + this.explodeFactor;
    const use4D = this.hyper4D && this.hyper4D.isActive();
    const base = this.currentBase;

    const arr = this.instancedMesh.instanceMatrix.array;
    const count = this.blocksData.length;

    if (this._needsRotationReset) {
      for (let i = 0; i < count; i++) {
        const o = i * 16;
        arr[o + 1] = 0; arr[o + 2] = 0;
        arr[o + 4] = 0; arr[o + 6] = 0;
        arr[o + 8] = 0; arr[o + 9] = 0;
      }
      this._needsRotationReset = false;
    }

    for (let i = 0; i < count; i++) {
      const b = this.blocksData[i];
      let x = (b.startX + (b.x - b.startX) * ease) * radialBoost;
      let y = (b.startY + (b.y - b.startY) * ease) * radialBoost;
      let z = (b.startZ + (b.z - b.startZ) * ease) * radialBoost;

      if (use4D) {
        const w = this.hyper4D.getWCoordinate(b.coords, base);
        const proj = this.hyper4D.projectPoint(x, y, z, w);
        x = proj.x;
        y = proj.y;
        z = proj.z;
      }

      const o = i * 16;
      arr[o] = b.sx;
      arr[o + 5] = b.sy;
      arr[o + 10] = b.sz;
      arr[o + 12] = x;
      arr[o + 13] = y;
      arr[o + 14] = z;
    }

    this._cullingDirty = true;
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    if (this.zCurve && this.zCurve.visible) {
      this.zCurve.syncPositions(this.blocksData, radialBoost, this.hyper4D, base, ease);
    }
  }

  /**
   * Frustum Culling + Corte de Faces Traseiras na GPU (escala 0 = descarte no Vertex Shader).
   * Só executa quando a câmera ou a malha mudam e há mais de 3.000 blocos.
   */
  _updateVisibilityCulling() {
    if (!this.instancedMesh || !this.cubesVisible || !this.blocksData) return;
    const count = this.blocksData.length;
    if (count < 3000) return;
    if (this.physics?.active || (this.hyper4D && this.hyper4D.isActive())) return;

    const camMoved =
      this._lastCamPos.distanceToSquared(this.camera.position) > 1e-5 ||
      Math.abs(this._lastCamQuat.dot(this.camera.quaternion)) < 0.999999;

    if (!camMoved && !this._cullingDirty) return;

    this._lastCamPos.copy(this.camera.position);
    this._lastCamQuat.copy(this.camera.quaternion);
    this._cullingDirty = false;

    this.camera.updateMatrixWorld();
    this._projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

    // No modo 'shell' sem explosão/corte, faces opostas à câmera nunca ficam visíveis
    const useMacroFaceCull =
      this.currentFilterMode === 'shell' &&
      this.animProgress >= 1 &&
      this.explodeFactor <= 0.001 &&
      this.sliceRatio >= 0.99 &&
      this.rootGroup.rotation.x === 0 &&
      this.rootGroup.rotation.y === 0 &&
      this.rootGroup.rotation.z === 0;

    let visibleFaceMask = 63;
    if (useMacroFaceCull) {
      const half = MASTER_SIZE * 0.5;
      const cx = this.camera.position.x;
      const cy = this.camera.position.y;
      const cz = this.camera.position.z;
      visibleFaceMask = 0;
      if (cx > -half) visibleFaceMask |= 1;  // +X
      if (cx < half) visibleFaceMask |= 2;   // -X
      if (cy > -half) visibleFaceMask |= 4;  // +Y
      if (cy < half) visibleFaceMask |= 8;   // -Y
      if (cz > -half) visibleFaceMask |= 16; // +Z
      if (cz < half) visibleFaceMask |= 32;  // -Z
    }

    const arr = this.instancedMesh.instanceMatrix.array;
    const scaleFactor = this.rootGroup.scale.x || 1;
    const sphere = this._boundSphere;

    for (let i = 0; i < count; i++) {
      const b = this.blocksData[i];
      const o = i * 16;

      if (useMacroFaceCull && b.outerMask !== 0 && (b.outerMask & visibleFaceMask) === 0) {
        arr[o] = 0;
        arr[o + 5] = 0;
        arr[o + 10] = 0;
        continue;
      }

      sphere.center.set(
        arr[o + 12] * scaleFactor,
        arr[o + 13] * scaleFactor,
        arr[o + 14] * scaleFactor
      );
      sphere.radius = b.sx * 0.87 * scaleFactor;

      if (this._frustum.intersectsSphere(sphere)) {
        arr[o] = b.sx;
        arr[o + 5] = b.sy;
        arr[o + 10] = b.sz;
      } else {
        arr[o] = 0;
        arr[o + 5] = 0;
        arr[o + 10] = 0;
      }
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  _applyPhysicsTransforms() {
    if (!this.instancedMesh || !this.physics) return;
    const bodies = this.physics.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      this.dummy.position.set(b.x, b.y, b.z);
      this.dummy.rotation.set(b.rx, b.ry, b.rz);
      this.dummy.scale.set(b.sx, b.sy, b.sz);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this._needsRotationReset = true;
    this._cullingDirty = true;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  raycastHover() {
    if (!this.cubesVisible || !this.instancedMesh || this.blocksData.length === 0) return null;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.instancedMesh);

    const hitId = hits.length > 0 ? hits[0].instanceId : null;
    this.lastHitPoint = hits.length > 0 ? hits[0].point.clone() : null;

    if (hitId !== this.hoveredInstanceId) {
      if (this.hoveredInstanceId !== null && this.originalColors) {
        const idx = this.hoveredInstanceId * 3;
        this.colorHelper.setRGB(
          this.originalColors[idx],
          this.originalColors[idx + 1],
          this.originalColors[idx + 2]
        );
        this.instancedMesh.setColorAt(this.hoveredInstanceId, this.colorHelper);
      }

      if (hitId !== null) {
        this.colorHelper.setHex(0xffffff);
        this.instancedMesh.setColorAt(hitId, this.colorHelper);
      }

      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }
      this.hoveredInstanceId = hitId;
    }

    return hitId !== null ? this.blocksData[hitId] : null;
  }

  setCameraPreset(preset) {
    this.rootGroup.rotation.set(0, 0, 0);
    if (preset === 1) {
      this.camera.position.set(14, 11, 16);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 2) {
      this.camera.position.set(0, 0, 22);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 3) {
      this.camera.position.set(0, 0, 0.2);
      this.controls.target.set(0, 0, -5);
    }
    this._cullingDirty = true;
    this.controls.update();
  }

  render(dt, audioEnergy = { bass: 0, mid: 0 }) {
    if (this.physics && this.physics.update(dt)) {
      if (this.zCurve) this.zCurve.update(dt, true);
      this._applyPhysicsTransforms();
      this.controls.update();
      this.composer.render();
      return;
    }

    const spun4D = this.hyper4D ? this.hyper4D.update(dt) : false;

    if (this.animProgress < 1) {
      this.animProgress = Math.min(1, this.animProgress + dt * 2.8);
      this._applyTransforms(this.animProgress);
    } else if (spun4D) {
      this._applyTransforms(1);
    }

    if (this.cinema && this.cinema.update(dt, audioEnergy.bass || 0)) {
      this._applyTransforms(1);
    }

    if (this.zCurve) this.zCurve.update(dt, false);

    const targetScale = 1 + audioEnergy.bass * 0.045;
    if (Math.abs(this.rootGroup.scale.x - targetScale) > 0.0005) {
      this.rootGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.18);
      this._cullingDirty = true;
    }
    this.bloomPass.strength = 0.42 + audioEnergy.mid * 0.45;

    this.controls.update();
    this._updateVisibilityCulling();
    this.composer.render();
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w * 0.5, h * 0.5);
    this._cullingDirty = true;
  }
}