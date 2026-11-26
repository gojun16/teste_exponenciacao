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
    this.baseBloomStrength = 0.42;

    this.clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), MASTER_SIZE);

    this._setupLights();
    this._setupMasterFrame();

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.instancedMesh = null;
    this.subdivisionData = null;
    this._cachedBlocksArray = null;
    this.currentBase = 3;
    this.currentFilterMode = 'all';
    this.animProgress = 1;
    this.explodeFactor = 0;
    this.sliceRatio = 1;
    this.reliefStrength = 0;
    this.hyper4D = null;
    this.physics = null;
    this.zCurve = null;
    this.mosaic = null;
    this.cubesVisible = true;
    this.cinema = null;
    this.videoPlayer = null;
    this.rubiksCube = null;
    this.webxr = null;
    this.lastHitPoint = null;

    this.gpuUniforms = {
      uAnimEase: { value: 1.0 },
      uRadialBoost: { value: 1.0 },
      uUseRawMatrix: { value: 0.0 },
      uMosaicTex: { value: new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat) },
      uGridDims: { value: new THREE.Vector3(3, 3, 3) },
      uMosaicEnabled: { value: 0.0 },
      uReliefStrength: { value: 0.0 },
      uMacroFaceCull: { value: 0.0 },
      uVisPosFaces: { value: new THREE.Vector3(1, 1, 1) },
      uVisNegFaces: { value: new THREE.Vector3(1, 1, 1) },
      uIsVR: { value: 0.0 },
      uVRExposure: { value: 0.88 }
    };

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-999, -999);
    this._pointerDirty = false;
    this._lastHoveredBlock = null;
    this.hoveredInstanceId = null;
    this.originalColors = null;

    this.dummy = new THREE.Object3D();
    this.colorHelper = new THREE.Color();
    this._targetScaleVec = new THREE.Vector3(1, 1, 1);

    window.addEventListener('resize', () => this._onResize());
  }

  get blocksData() {
    if (!this.subdivisionData) return [];
    if (!this._cachedBlocksArray) {
      const n = this.subdivisionData.count;
      const arr = new Array(n);
      for (let i = 0; i < n; i++) {
        arr[i] = this.subdivisionData.getBlock(i);
      }
      this._cachedBlocksArray = arr;
    }
    return this._cachedBlocksArray;
  }

  getBlockCount() {
    return this.subdivisionData ? this.subdivisionData.count : 0;
  }

  getBlockAt(index) {
    return this.subdivisionData ? this.subdivisionData.getBlock(index) : null;
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

  attachMosaic(mosaicInstance) {
    this.mosaic = mosaicInstance;
    if (mosaicInstance) {
      this.gpuUniforms.uMosaicTex.value = mosaicInstance.texture;
      this.gpuUniforms.uMosaicEnabled.value = mosaicInstance.enabled ? 1.0 : 0.0;
      this.gpuUniforms.uReliefStrength.value = mosaicInstance.reliefStrength;
    }
  }

  attachVideoPlayer(videoPlayerInstance) {
    this.videoPlayer = videoPlayerInstance;
  }

  attachRubiksCube(rubiksInstance) {
    this.rubiksCube = rubiksInstance;
  }

  attachWebXR(webxrInstance) {
    this.webxr = webxrInstance;
  }

  setCubesVisible(visible) {
    this.cubesVisible = Boolean(visible);
    if (this.instancedMesh) {
      this.instancedMesh.visible = this.cubesVisible && !(this.videoPlayer && this.videoPlayer.active);
    }
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

    this.axesHelper = new THREE.AxesHelper(MASTER_SIZE * 0.72);
    this.axesHelper.material.transparent = true;
    this.axesHelper.material.opacity = 0.45;
    this.scene.add(this.axesHelper);
  }

  setSliceRatio(ratio) {
    this.sliceRatio = ratio;
    const offset = -MASTER_SIZE * 0.55 + ratio * (MASTER_SIZE * 1.15);
    this.clipPlane.constant = offset;
  }

  setExplodeFactor(factor) {
    this.explodeFactor = factor;
    this.gpuUniforms.uRadialBoost.value = 1 + factor;
    if (this.hyper4D && this.hyper4D.isActive()) {
      this._apply4DTransforms(this.animProgress);
    }
    if (this.zCurve && this.zCurve.visible) {
      this.zCurve.syncPositions(this.blocksData, 1 + factor, this.hyper4D, this.currentBase, 1);
    }
  }

  refreshTransforms() {
    const use4D = this.hyper4D && this.hyper4D.isActive();
    if (use4D) {
      this._apply4DTransforms(this.animProgress);
    } else if (this.gpuUniforms.uUseRawMatrix.value > 0.5) {
      this._writeStaticMatrices();
    }
    if (this.zCurve && this.zCurve.visible) {
      this.zCurve.syncPositions(
        this.blocksData,
        1 + this.explodeFactor,
        this.hyper4D,
        this.currentBase,
        1
      );
    }
  }

  updatePointer(clientX, clientY) {
    const nx = (clientX / window.innerWidth) * 2 - 1;
    const ny = -(clientY / window.innerHeight) * 2 + 1;
    if (nx !== this.pointer.x || ny !== this.pointer.y) {
      this.pointer.x = nx;
      this.pointer.y = ny;
      this._pointerDirty = true;
    }
  }

  _patchMaterialShaders(mat) {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.gpuUniforms);

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aPackedCoord;
          attribute vec3 aStartDelta;
          uniform float uAnimEase;
          uniform float uRadialBoost;
          uniform float uUseRawMatrix;
          uniform sampler2D uMosaicTex;
          uniform vec3 uGridDims;
          uniform float uMosaicEnabled;
          uniform float uReliefStrength;
          uniform float uIsVR;
          uniform float uVRExposure;
          uniform float uMacroFaceCull;
          uniform vec3 uVisPosFaces;
          uniform vec3 uVisNegFaces;
          varying vec3 vGridCoord;
          varying vec3 vLocalNormal;
          varying vec3 vOutDir;`
        )
        .replace(
          '#include <project_vertex>',
          `vLocalNormal = normal;
          float pGz = floor(aPackedCoord / 65536.0);
          float pRem = aPackedCoord - pGz * 65536.0;
          float pGy = floor(pRem / 256.0);
          float pGx = pRem - pGy * 256.0;
          vec3 gridCoord = vec3(pGx, pGy, pGz);

          vec3 maxIdx = max(vec3(0.0), uGridDims - 1.0);
          float dx = (maxIdx.x < 0.1) ? 1.0 : ((gridCoord.x >= maxIdx.x - 0.1 ? 1.0 : 0.0) - (gridCoord.x <= 0.1 ? 1.0 : 0.0));
          float dy = (maxIdx.y < 0.1) ? 1.0 : ((gridCoord.y >= maxIdx.y - 0.1 ? 1.0 : 0.0) - (gridCoord.y <= 0.1 ? 1.0 : 0.0));
          float dz = (maxIdx.z < 0.1) ? 1.0 : ((gridCoord.z >= maxIdx.z - 0.1 ? 1.0 : 0.0) - (gridCoord.z <= 0.1 ? 1.0 : 0.0));

          vec3 rawDir = vec3(dx, dy, dz);
          float dirLen = length(rawDir);
          vec3 outDir = (dirLen > 0.001) ? (rawDir / dirLen) : vec3(0.0);

          float pinOffset = 0.0;
          if (uMosaicEnabled > 0.5 && abs(uReliefStrength) > 0.001 && dirLen > 0.001) {
            vec2 vCell = vec2(0.0);
            vec2 vFaceDims = vec2(1.0);
            if (abs(outDir.z) >= abs(outDir.x) && abs(outDir.z) >= abs(outDir.y)) {
              vFaceDims = vec2(uGridDims.x, uGridDims.y);
              vCell = (outDir.z >= 0.0) ? vec2(gridCoord.x, gridCoord.y) : vec2(maxIdx.x - gridCoord.x, gridCoord.y);
            } else if (abs(outDir.x) >= abs(outDir.y)) {
              vFaceDims = vec2(uGridDims.z, uGridDims.y);
              vCell = (outDir.x >= 0.0) ? vec2(maxIdx.z - gridCoord.z, gridCoord.y) : vec2(gridCoord.z, gridCoord.y);
            } else {
              vFaceDims = vec2(uGridDims.x, uGridDims.z);
              vCell = (outDir.y >= 0.0) ? vec2(gridCoord.x, maxIdx.z - gridCoord.z) : vec2(gridCoord.x, gridCoord.z);
            }
            vec2 vUV = (vCell + 0.5) / max(vec2(1.0), vFaceDims);
            float luma = dot(texture2D(uMosaicTex, vUV).rgb, vec3(0.299, 0.587, 0.114));
            pinOffset = luma * uReliefStrength;
          }

          vGridCoord = gridCoord;
          vOutDir = outDir;

          vec4 localPos = vec4(transformed, 1.0);
          vec3 instCenter = vec3(0.0);

          #ifdef USE_INSTANCING
            if (uUseRawMatrix > 0.5) {
              localPos = instanceMatrix * localPos;
              instCenter = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
            } else {
              vec3 restCenter = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
              instCenter = (restCenter + aStartDelta * (1.0 - uAnimEase)) * uRadialBoost;
              vec3 scaledVert = vec3(
                transformed.x * instanceMatrix[0][0],
                transformed.y * instanceMatrix[1][1],
                transformed.z * instanceMatrix[2][2]
              );
              localPos = vec4(instCenter + scaledVert, 1.0);
            }
          #endif

          localPos.xyz += outDir * pinOffset;
          instCenter += outDir * pinOffset;

          bool culled = false;
          #ifdef USE_INSTANCING
            if (uMacroFaceCull > 0.5 && dirLen > 0.001) {
              vec3 posVis = max(vec3(0.0), sign(outDir)) * uVisPosFaces;
              vec3 negVis = max(vec3(0.0), -sign(outDir)) * uVisNegFaces;
              if (dot(posVis + negVis, vec3(1.0)) < 0.5) {
                culled = true;
              }
            }

            if (!culled) {
              vec4 clipCenter = projectionMatrix * modelViewMatrix * vec4(instCenter, 1.0);
              if (clipCenter.w > 0.0) {
                float boundPad = 11.0 + abs(uReliefStrength) * 2.2;
                float limit = clipCenter.w + boundPad;
                if (abs(clipCenter.x) > limit || abs(clipCenter.y) > limit || clipCenter.z < -limit || clipCenter.z > limit) {
                  culled = true;
                }
              }
            }
          #endif

          vec4 mvPosition = modelViewMatrix * localPos;
          if (culled) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          } else {
            gl_Position = projectionMatrix * mvPosition;
          }`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D uMosaicTex;
          uniform vec3 uGridDims;
          uniform float uMosaicEnabled;
          uniform float uReliefStrength;
          varying vec3 vGridCoord;
          varying vec3 vLocalNormal;
          varying vec3 vOutDir;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          if (uMosaicEnabled > 0.5) {
            vec3 n = vLocalNormal;
            vec2 cell = vec2(0.0);
            vec2 faceDims = vec2(1.0);
            bool isOuterFace = false;
            vec3 maxIdx = max(vec3(0.0), uGridDims - 1.0);

            if (abs(n.z) > 0.5) {
              faceDims = vec2(uGridDims.x, uGridDims.y);
              if (n.z > 0.0) {
                cell = vec2(vGridCoord.x, vGridCoord.y);
                isOuterFace = (vGridCoord.z >= maxIdx.z - 0.1);
              } else {
                cell = vec2(maxIdx.x - vGridCoord.x, vGridCoord.y);
                isOuterFace = (vGridCoord.z <= 0.1);
              }
            } else if (abs(n.x) > 0.5) {
              faceDims = vec2(uGridDims.z, uGridDims.y);
              if (n.x > 0.0) {
                cell = vec2(maxIdx.z - vGridCoord.z, vGridCoord.y);
                isOuterFace = (vGridCoord.x >= maxIdx.x - 0.1);
              } else {
                cell = vec2(vGridCoord.z, vGridCoord.y);
                isOuterFace = (vGridCoord.x <= 0.1);
              }
            } else {
              faceDims = vec2(uGridDims.x, uGridDims.z);
              if (n.y > 0.0) {
                cell = vec2(vGridCoord.x, maxIdx.z - vGridCoord.z);
                isOuterFace = (vGridCoord.y >= maxIdx.y - 0.1);
              } else {
                cell = vec2(vGridCoord.x, vGridCoord.z);
                isOuterFace = (vGridCoord.y <= 0.1);
              }
            }

            if (isOuterFace) {
              vec2 sampleUV = (cell + 0.5) / max(vec2(1.0), faceDims);
              diffuseColor.rgb = texture2D(uMosaicTex, sampleUV).rgb;
            } else if (abs(uReliefStrength) > 0.01 && length(vOutDir) > 0.001) {
              vec2 stemCell = vec2(0.0);
              vec2 stemDims = vec2(1.0);
              if (abs(vOutDir.z) >= abs(vOutDir.x) && abs(vOutDir.z) >= abs(vOutDir.y)) {
                stemDims = vec2(uGridDims.x, uGridDims.y);
                stemCell = (vOutDir.z >= 0.0) ? vec2(vGridCoord.x, vGridCoord.y) : vec2(maxIdx.x - vGridCoord.x, vGridCoord.y);
              } else if (abs(vOutDir.x) >= abs(vOutDir.y)) {
                stemDims = vec2(uGridDims.z, uGridDims.y);
                stemCell = (vOutDir.x >= 0.0) ? vec2(maxIdx.z - vGridCoord.z, vGridCoord.y) : vec2(vGridCoord.z, vGridCoord.y);
              } else {
                stemDims = vec2(uGridDims.x, uGridDims.z);
                stemCell = (vOutDir.y >= 0.0) ? vec2(vGridCoord.x, maxIdx.z - vGridCoord.z) : vec2(vGridCoord.x, vGridCoord.z);
              }
              vec2 stemUV = (stemCell + 0.5) / max(vec2(1.0), stemDims);
              diffuseColor.rgb = texture2D(uMosaicTex, stemUV).rgb * 0.62;
            } else {
              diffuseColor.rgb = vec3(0.08, 0.09, 0.13);
            }
          }
          if (uIsVR > 0.5) {
            vec3 vrCol = diffuseColor.rgb * uVRExposure;
            diffuseColor.rgb = vrCol / (1.0 + vrCol * 0.45);
          }`
        );
    };
    mat.customProgramCacheKey = () => 'exponential-cube-ultra-gpu-v11-clean';
    mat.needsUpdate = true;
  }

  updateData(subdivisionResult, base = 3) {
    if (this.physics) this.physics.reset();
    this.subdivisionData = subdivisionResult;
    this._cachedBlocksArray = null;
    this.currentBase = base;
    this.currentFilterMode = subdivisionResult.filterMode || 'all';
    this.animProgress = 0;
    this.gpuUniforms.uAnimEase.value = 0.0;
    this.gpuUniforms.uRadialBoost.value = 1.0 + this.explodeFactor;
    this.hoveredInstanceId = null;
    this._lastHoveredBlock = null;
    this._pointerDirty = true;

    const count = subdivisionResult.count;

    if (this.instancedMesh) {
      this.rootGroup.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      this.instancedMesh.material.dispose();
      this.instancedMesh = null;
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.setAttribute('aPackedCoord', new THREE.InstancedBufferAttribute(subdivisionResult.packedGrid, 1));

    const startDeltas = new Float32Array(count * 3);
    const { startDeltaX, startDeltaY, startDeltaZ } = subdivisionResult;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      startDeltas[o] = startDeltaX[i];
      startDeltas[o + 1] = startDeltaY[i];
      startDeltas[o + 2] = startDeltaZ[i];
    }
    geometry.setAttribute('aStartDelta', new THREE.InstancedBufferAttribute(startDeltas, 3));

    const material = count > 8000
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

    this._patchMaterialShaders(material);

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.count = count;
    this.originalColors = new Float32Array(count * 3);

    const { hue } = subdivisionResult;
    for (let i = 0; i < count; i++) {
      this.colorHelper.setHSL(hue[i], 0.85, 0.52);
      this.instancedMesh.setColorAt(i, this.colorHelper);
      const o = i * 3;
      this.originalColors[o] = this.colorHelper.r;
      this.originalColors[o + 1] = this.colorHelper.g;
      this.originalColors[o + 2] = this.colorHelper.b;
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this._writeStaticMatrices();
    this.rootGroup.add(this.instancedMesh);

    if (this.zCurve && this.zCurve.visible) {
      this.zCurve.rebuild(this.blocksData, 1 + this.explodeFactor, this.hyper4D, base);
    }
    if (this.rubiksCube && this.rubiksCube.active) {
      this.rubiksCube.update(dt);
      this.bloomPass.strength = 0.24;
      if (!this.renderer.xr?.isPresenting) this.controls.update();
      this._presentFrame();
      return;
    }
    if (this.videoPlayer && this.videoPlayer.active) {
      this.videoPlayer.onMeshRebuilt();
    }
    this.setCubesVisible(this.cubesVisible);
  }

  _writeStaticMatrices() {
    if (!this.instancedMesh || !this.subdivisionData) return;
    const { count, px, py, pz, sx, sy, sz } = this.subdivisionData;
    const arr = this.instancedMesh.instanceMatrix.array;

    for (let i = 0; i < count; i++) {
      const o = i * 16;
      arr[o] = sx[i];
      arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0;
      arr[o + 4] = 0;
      arr[o + 5] = sy[i];
      arr[o + 6] = 0; arr[o + 7] = 0;
      arr[o + 8] = 0; arr[o + 9] = 0;
      arr[o + 10] = sz[i];
      arr[o + 11] = 0;
      arr[o + 12] = px[i];
      arr[o + 13] = py[i];
      arr[o + 14] = pz[i];
      arr[o + 15] = 1;
    }

    this.gpuUniforms.uUseRawMatrix.value = 0.0;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  _apply4DTransforms(t) {
    if (!this.instancedMesh || !this.subdivisionData || !this.hyper4D) return;
    const ease = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
    const radialBoost = 1 + this.explodeFactor;
    const base = this.currentBase;
    const { count, px, py, pz, startDeltaX, startDeltaY, startDeltaZ, sx, sy, sz } = this.subdivisionData;
    const arr = this.instancedMesh.instanceMatrix.array;

    for (let i = 0; i < count; i++) {
      const blk = this.subdivisionData.getBlock(i);
      const rx = (px[i] + startDeltaX[i] * (1 - ease)) * radialBoost;
      const ry = (py[i] + startDeltaY[i] * (1 - ease)) * radialBoost;
      const rz = (pz[i] + startDeltaZ[i] * (1 - ease)) * radialBoost;
      const w = this.hyper4D.getWCoordinate(blk.coords, base);
      const proj = this.hyper4D.projectPoint(rx, ry, rz, w);

      const o = i * 16;
      arr[o] = sx[i];
      arr[o + 5] = sy[i];
      arr[o + 10] = sz[i];
      arr[o + 12] = proj.x;
      arr[o + 13] = proj.y;
      arr[o + 14] = proj.z;
    }

    this.gpuUniforms.uUseRawMatrix.value = 1.0;
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
    this.gpuUniforms.uUseRawMatrix.value = 1.0;
    this._pointerDirty = true;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  raycastHover(force = false) {
    if (this.videoPlayer && this.videoPlayer.active) return null;
    if (this.rubiksCube && this.rubiksCube.active) return null;
    if (!this.cubesVisible || !this.instancedMesh || !this.subdivisionData || this.subdivisionData.count === 0) {
      return null;
    }
    if (!force && !this._pointerDirty) return this._lastHoveredBlock;
    this._pointerDirty = false;

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

    this._lastHoveredBlock = hitId !== null ? this.subdivisionData.getBlock(hitId) : null;
    return this._lastHoveredBlock;
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
    this._pointerDirty = true;
    this.controls.update();
  }

  _presentFrame() {
    if (this.renderer.xr && this.renderer.xr.isPresenting) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }
  }

  render(dt, audioEnergy = { bass: 0, mid: 0 }) {
    const isVR = Boolean(this.renderer.xr && this.renderer.xr.isPresenting);
    if (isVR && this.webxr) {
      this.webxr.update(dt, audioEnergy);
    }

    if (this.videoPlayer && this.videoPlayer.active) {
      this.videoPlayer.update(dt);
      this.bloomPass.strength = this.videoPlayer.bloomStrength ?? 0.36;
      if (!isVR && this.videoPlayer.cameraRig.mode === 'free') this.controls.update();
      this._presentFrame();
      return;
    }
    if (this.physics && this.physics.update(dt)) {
      if (this.zCurve) this.zCurve.update(dt, true);
      this._applyPhysicsTransforms();
      if (!isVR) this.controls.update();
      this._presentFrame();
      return;
    }

    const use4D = this.hyper4D && this.hyper4D.isActive();
    const spun4D = this.hyper4D ? this.hyper4D.update(dt) : false;

    if (this.animProgress < 1) {
      this.animProgress = Math.min(1, this.animProgress + dt * 2.8);
      const ease = 1 - Math.pow(1 - this.animProgress, 3);
      this.gpuUniforms.uAnimEase.value = ease;
      if (use4D) this._apply4DTransforms(this.animProgress);
    } else if (spun4D) {
      this._apply4DTransforms(1);
    }

    if (this.cinema && this.cinema.update(dt, audioEnergy.bass || 0)) {
      this.gpuUniforms.uRadialBoost.value = 1 + this.explodeFactor;
    }

    if (this.zCurve) this.zCurve.update(dt, false);

    const targetScale = 1 + audioEnergy.bass * 0.045;
    this._targetScaleVec.set(targetScale, targetScale, targetScale);
    this.rootGroup.scale.lerp(this._targetScaleVec, 0.18);
    this.bloomPass.strength = this.baseBloomStrength + audioEnergy.mid * 0.35;

    if (!isVR) this.controls.update();

    const canMacroCull =
      this.currentFilterMode === 'shell' &&
      this.animProgress >= 1 &&
      this.explodeFactor <= 0.001 &&
      this.sliceRatio >= 0.99 &&
      Math.abs(this.reliefStrength) < 1.2 &&
      !use4D &&
      this.rootGroup.rotation.x === 0 &&
      this.rootGroup.rotation.y === 0 &&
      this.rootGroup.rotation.z === 0;

    this.gpuUniforms.uMacroFaceCull.value = canMacroCull ? 1.0 : 0.0;
    if (canMacroCull) {
      const half = MASTER_SIZE * 0.5;
      this.gpuUniforms.uVisPosFaces.value.set(
        this.camera.position.x > -half ? 1.0 : 0.0,
        this.camera.position.y > -half ? 1.0 : 0.0,
        this.camera.position.z > -half ? 1.0 : 0.0
      );
      this.gpuUniforms.uVisNegFaces.value.set(
        this.camera.position.x < half ? 1.0 : 0.0,
        this.camera.position.y < half ? 1.0 : 0.0,
        this.camera.position.z < half ? 1.0 : 0.0
      );
    }

    this._presentFrame();
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w * 0.5, h * 0.5);
    this._pointerDirty = true;
  }
}
