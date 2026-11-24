import * as THREE from 'three';

export class ImageMosaic {
  constructor(engine) {
    this.engine = engine;
    this.sourceImage = null;
    this.enabled = false;
    this.base = 3;
    this.exp = 3;
    this.gridDims = { x: 3, y: 3, z: 3 };

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    this.texture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    this.texture.needsUpdate = true;

    this.uniforms = {
      uMosaicTex: { value: this.texture },
      uGridDims: { value: new THREE.Vector3(3, 3, 3) },
      uMosaicEnabled: { value: 0.0 }
    };

    this._patchedMaterials = new WeakSet();
  }

  loadFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Nenhum arquivo selecionado.'));
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.sourceImage = img;
          this.enabled = true;
          this.uniforms.uMosaicEnabled.value = 1.0;
          this.syncWithEngine();
          if (typeof this.engine?.refreshTransforms === 'function') {
            this.engine.refreshTransforms();
          }
          resolve(img);
        };
        img.onerror = (err) => reject(err);
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  clear() {
    this.sourceImage = null;
    this.enabled = false;
    this.uniforms.uMosaicEnabled.value = 0.0;
  }

  /**
   * Calcula quantas subdivisões cada eixo (X, Y, Z) recebe dado (base, exp).
   * Ex.: base=3, exp=6 -> 2 camadas por eixo -> 3^2 = 9x9x9.
   */
  _computeGridDims(base, exp) {
    if (exp <= 0 || base <= 1) return { x: 1, y: 1, z: 1 };
    const layersX = Math.ceil(exp / 3);
    const layersY = exp >= 2 ? Math.ceil((exp - 1) / 3) : 0;
    const layersZ = exp >= 3 ? Math.ceil((exp - 2) / 3) : 0;

    return {
      x: Math.pow(base, layersX),
      y: Math.pow(base, layersY),
      z: Math.pow(base, layersZ)
    };
  }

  syncWithEngine(baseOverride, expOverride) {
    const baseInput = document.getElementById('base-input');
    const expInput = document.getElementById('exp-input');

    this.base = Math.max(1, baseOverride ?? parseInt(baseInput?.value, 10) ?? this.base);
    this.exp = Math.max(0, expOverride ?? parseInt(expInput?.value, 10) ?? this.exp);
    this.gridDims = this._computeGridDims(this.base, this.exp);

    this._resampleImage();
    this._attachToInstancedMesh();
  }

  _resampleImage() {
    // Resolução da textura acompanha a maior subdivisão axial (ex.: 9x9, 27x27, etc.)
    const res = Math.max(1, this.gridDims.x, this.gridDims.y, this.gridDims.z);
    this.canvas.width = res;
    this.canvas.height = res;

    this.ctx.fillStyle = '#161c2c';
    this.ctx.fillRect(0, 0, res, res);

    if (this.sourceImage) {
      const iw = this.sourceImage.naturalWidth || this.sourceImage.width;
      const ih = this.sourceImage.naturalHeight || this.sourceImage.height;
      const side = Math.min(iw, ih);
      const sx = (iw - side) * 0.5;
      const sy = (ih - side) * 0.5;

      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.drawImage(this.sourceImage, sx, sy, side, side, 0, 0, res, res);
    }

    const imgData = this.ctx.getImageData(0, 0, res, res);
    const rgba = new Uint8Array(imgData.data.buffer);

    if (this.texture) {
      this.texture.dispose();
    }

    const newTex = new THREE.DataTexture(rgba, res, res, THREE.RGBAFormat);
    newTex.magFilter = THREE.NearestFilter;
    newTex.minFilter = THREE.NearestFilter;
    newTex.colorSpace = THREE.SRGBColorSpace;
    newTex.flipY = true;
    newTex.needsUpdate = true;

    this.texture = newTex;
    this.uniforms.uMosaicTex.value = newTex;
    this.uniforms.uGridDims.value.set(
      this.gridDims.x,
      this.gridDims.y,
      this.gridDims.z
    );
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

  _attachToInstancedMesh() {
    const instMesh = this._findInstancedMesh();
    if (!instMesh) return;

    const blocks = this.engine?.blocksData || [];
    const count = Math.max(instMesh.count, blocks.length);
    const b = this.base;

    // Acumula coordenadas hierárquicas [X1, Y1, Z1, X2, Y2, Z2...] em base b
    const coords = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const blk = blocks[i];
      let gx = 0;
      let gy = 0;
      let gz = 0;

      if (blk && Array.isArray(blk.coords) && blk.coords.length > 0) {
        for (let d = 0; d < blk.coords.length; d++) {
          const val = blk.coords[d] ?? 0;
          const axis = d % 3;
          if (axis === 0) gx = gx * b + val;
          else if (axis === 1) gy = gy * b + val;
          else gz = gz * b + val;
        }
      } else {
        gx = i % this.gridDims.x;
        gy = Math.floor(i / this.gridDims.x) % this.gridDims.y;
        gz = Math.floor(i / (this.gridDims.x * this.gridDims.y)) % this.gridDims.z;
      }

      coords[i * 3] = gx;
      coords[i * 3 + 1] = gy;
      coords[i * 3 + 2] = gz;
    }

    instMesh.geometry.setAttribute(
      'aGridCoord',
      new THREE.InstancedBufferAttribute(coords, 3)
    );

    const materials = Array.isArray(instMesh.material)
      ? instMesh.material
      : [instMesh.material];

    materials.forEach((mat) => {
      if (!mat || this._patchedMaterials.has(mat)) return;
      this._patchedMaterials.add(mat);

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uMosaicTex = this.uniforms.uMosaicTex;
        shader.uniforms.uGridDims = this.uniforms.uGridDims;
        shader.uniforms.uMosaicEnabled = this.uniforms.uMosaicEnabled;

        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
            attribute vec3 aGridCoord;
            varying vec3 vGridCoord;
            varying vec3 vLocalNormal;`
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vGridCoord = aGridCoord;
            vLocalNormal = normal;`
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
            uniform sampler2D uMosaicTex;
            uniform vec3 uGridDims;
            uniform float uMosaicEnabled;
            varying vec3 vGridCoord;
            varying vec3 vLocalNormal;`
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
              } else {
                diffuseColor.rgb = vec3(0.08, 0.09, 0.13);
              }
            }`
          );
      };

      mat.customProgramCacheKey = () => 'exponential-cube-mosaic-v3';
      mat.needsUpdate = true;
    });
  }
}