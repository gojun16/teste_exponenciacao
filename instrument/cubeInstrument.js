import * as THREE from 'three';
import { MASTER_SIZE } from '../js/mathEngine.js';

/**
 * Módulo Isolado: Instrumento Interativo & Scanner Laser Musical
 * Toca notas ao clicar nos blocos e varre camadas verticalmente com feixe esmeralda.
 */
export class CubeInstrument {
  constructor(scene) {
    this.scene = scene;
    this.ctx = null;
    this.tuning = null;
    this.spatial = null;

    this.scannerActive = false;
    this.scanLimit = MASTER_SIZE * 0.62;
    this.scanY = -this.scanLimit;
    this.scanDir = 1;
    this.scanSpeed = 4.4;
    this.noteCooldown = 0;

    this.scannerGroup = new THREE.Group();
    this.scannerGroup.visible = false;
    this._initScannerMesh();
    this.scene.add(this.scannerGroup);
  }

  _initScannerMesh() {
    const size = MASTER_SIZE * 1.28;

    const planeGeo = new THREE.PlaneGeometry(size, size);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, 0.04, size));
    const edgesMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85
    });
    const border = new THREE.LineSegments(edgesGeo, edgesMat);

    this.scannerGroup.add(plane);
    this.scannerGroup.add(border);
  }

  attachTuning(tuningEngine) {
    this.tuning = tuningEngine;
  }

  attachSpatial(spatialEngine) {
    this.spatial = spatialEngine;
  }

  _initAudio() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleScanner() {
    this._initAudio();
    this.scannerActive = !this.scannerActive;
    this.scannerGroup.visible = this.scannerActive;

    if (this.scannerActive) {
      this.scanY = -this.scanLimit;
      this.scanDir = 1;
      this.scannerGroup.position.y = this.scanY;
    }
    return this.scannerActive;
  }

playBlock(block, isScanner = false) {
    if (!block) return;
    this._initAudio();

    if (this.tuning) {
      const note = this.tuning.computeNote(block);
      if (this.spatial) {
        this.spatial.playSpatialNote(note, block, { isScanner });
        return;
      }
      this.tuning.playTone(this.ctx, this.ctx.destination, note, {
        duration: isScanner ? 0.22 : 0.55,
        volume: isScanner ? 0.055 : 0.16
      });
      return;
    }

    // Fallback harmônico caso o TuningEngine não esteja conectado
    const now = this.ctx.currentTime;
    const idx = typeof block.id === 'number' ? block.id : 0;
    const freq = 130.81 * Math.pow(2, (idx % 12) / 12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = block.isPrime ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const vol = isScanner ? 0.05 : 0.14;
    const dur = isScanner ? 0.2 : 0.45;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  update(dt, blocksData) {
    if (!this.scannerActive) return;

    const prevY = this.scanY;
    this.scanY += this.scanDir * this.scanSpeed * dt;

    if (this.scanY >= this.scanLimit) {
      this.scanY = this.scanLimit;
      this.scanDir = -1;
    } else if (this.scanY <= -this.scanLimit) {
      this.scanY = -this.scanLimit;
      this.scanDir = 1;
    }

    this.scannerGroup.position.y = this.scanY;

    if (!blocksData || blocksData.length === 0) return;

    this.noteCooldown -= dt;
    if (this.noteCooldown > 0) return;

    const minY = Math.min(prevY, this.scanY);
    const maxY = Math.max(prevY, this.scanY);

    // Coleta blocos atravessados neste passo (amostrando se houver milhares)
    const step = blocksData.length > 2000 ? Math.floor(blocksData.length / 800) : 1;
    const crossed = [];

    for (let i = 0; i < blocksData.length; i += step) {
      const b = blocksData[i];
      if (b.y >= minY && b.y <= maxY) {
        crossed.push(b);
      }
    }

    if (crossed.length > 0) {
      // Dispara no máximo 4 notas simultâneas por camada para manter o acorde limpo
      const maxVoices = Math.min(4, crossed.length);
      const stride = Math.max(1, Math.floor(crossed.length / maxVoices));
      for (let v = 0; v < maxVoices; v++) {
        this.playBlock(crossed[v * stride], true);
      }
      this.noteCooldown = 0.065;
    }
  }
}