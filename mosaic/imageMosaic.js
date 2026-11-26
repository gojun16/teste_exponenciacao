import * as THREE from 'three';

export class ImageMosaic {
  constructor(engine) {
    this.engine = engine;
    this.sourceImage = null;
    this.enabled = false;
    this.base = 3;
    this.exp = 3;
    this.gridDims = { x: 3, y: 3, z: 3 };
    this.reliefStrength = 0.0;

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
      uMosaicEnabled: { value: 0.0 },
      uReliefStrength: { value: 0.0 }
    };

    this._setupReliefUI();
  }

  _setupReliefUI() {
    const labelEl = document.getElementById('mosaic-res-label');
    const parent = labelEl?.parentElement;
    if (!parent || document.getElementById('mosaic-relief-input')) return;

    const wrapper = document.createElement('div');
    wrapper.style.marginTop = '8px';
    wrapper.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
        <label for="mosaic-relief-input">Relevo 3D (Pin-Art)</label>
        <span id="mosaic-relief-val">0.00</span>
      </div>
      <input type="range" id="mosaic-relief-input" min="-2.2" max="2.2" step="0.05" value="0" style="width: 100%;" />
    `;
    parent.appendChild(wrapper);

    this.reliefInput = document.getElementById('mosaic-relief-input');
    this.reliefValEl = document.getElementById('mosaic-relief-val');

    this.reliefInput?.addEventListener('input', (e) => {
      this.setReliefStrength(parseFloat(e.target.value) || 0);
    });
  }

  setReliefStrength(val) {
    this.reliefStrength = val;
    this.uniforms.uReliefStrength.value = val;
    if (this.engine) {
      this.engine.reliefStrength = val;
      if (this.engine.gpuUniforms) {
        this.engine.gpuUniforms.uReliefStrength.value = val;
      }
    }
    if (this.reliefInput && Math.abs(parseFloat(this.reliefInput.value) - val) > 0.01) {
      this.reliefInput.value = String(val);
    }
    if (this.reliefValEl) {
      this.reliefValEl.textContent = `${val >= 0 ? '+' : ''}${val.toFixed(2)}`;
    }
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

          if (this.engine) {
            this.engine.baseBloomStrength = 0.14;
            if (this.engine.gpuUniforms) {
              this.engine.gpuUniforms.uMosaicEnabled.value = 1.0;
            }
          }

          if (Math.abs(this.reliefStrength) < 0.01) {
            this.setReliefStrength(0.65);
          }

          this.syncWithEngine();
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
    this.setReliefStrength(0.0);
    if (this.engine) {
      this.engine.baseBloomStrength = 0.42;
      if (this.engine.gpuUniforms) {
        this.engine.gpuUniforms.uMosaicEnabled.value = 0.0;
      }
    }
  }

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

    this.uniforms.uGridDims.value.set(this.gridDims.x, this.gridDims.y, this.gridDims.z);
    if (this.engine?.gpuUniforms) {
      this.engine.gpuUniforms.uGridDims.value.set(this.gridDims.x, this.gridDims.y, this.gridDims.z);
    }

    if (this.enabled && this.sourceImage) {
      this._resampleImage();
    }
  }

  _resampleImage() {
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
    if (this.engine?.gpuUniforms) {
      this.engine.gpuUniforms.uMosaicTex.value = newTex;
    }
  }
}