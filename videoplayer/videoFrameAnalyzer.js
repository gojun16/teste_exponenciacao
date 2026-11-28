import * as THREE from 'three';

export class VideoFrameAnalyzer {
  constructor(width = 160, height = 120) {
    this.width = width;
    this.height = height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    const count = width * height;
    this.data = new Uint8Array(count * 4);
    this.texture = new THREE.DataTexture(
      this.data,
      width,
      height,
      THREE.RGBAFormat
    );
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.flipY = true;
    this.texture.needsUpdate = true;

    this._prevLuma = new Float32Array(count);
    this._prevFrameLuma = new Float32Array(count);
    this._hasPrevFrame = false;
    // Track chroma too: equal-luminance color cuts are still meaningful visual events.
    this._prevColor = new Uint8Array(count * 3);
    this._hasPrevColor = false;
    this._saliency = new Float32Array(count);
    this._chamfer = new Float32Array(count);
    this._accumulator = 0;

    // Telemetry exposed to camera, lighting, and reactive environment
    this.telemetry = {
      centroidX: 0.5,
      centroidY: 0.5,
      focusX: 0,
      focusY: 0,
      velocityX: 0,
      velocityY: 0,
      flowX: 0,
      flowY: 0,
      flowMagnitude: 0,
      flowAcceleration: 0,
      subjectScale: 0.5,
      motionEnergy: 0,
      avgLuma: 0.25,
      litRatio: 0.25,
      domeExposure: 1.0,
      flashDelta: 0,
      visualChange: 0,
      colorChange: 0,
      colorfulness: 0.5,
      dominantColor: new THREE.Color(0.22, 0.72, 0.96),
      secondaryColor: new THREE.Color(0.55, 0.28, 0.92),
      // Color-composition telemetry: area share, hue family and spatial location.
      dominantHueIndex: 0,
      dominantHueAngle: 0,
      dominantHueRatio: 0,
      dominantHueStrength: 0,
      colorFocusX: 0,
      colorFocusY: 0,
      colorClusterSpread: 0,
      colorContrast: 0,
      depthMorph: 0,
      depthCoverage: 0,
      depthSpread: 0
    };

    this._lastCentroidX = 0.5;
    this._lastCentroidY = 0.5;
    this._lastAvgLuma = 0.25;
    this._lastFlowMagnitude = 0;
  }

  reset() {
    this._prevLuma.fill(0);
    this._prevFrameLuma.fill(0);
    this._hasPrevFrame = false;
    this._prevColor.fill(0);
    this._hasPrevColor = false;
    this._saliency.fill(0);
    this._chamfer.fill(0);
    this._accumulator = 0;
    this._lastCentroidX = 0.5;
    this._lastCentroidY = 0.5;
    this._lastAvgLuma = 0.25;
    this.telemetry.centroidX = 0.5;
    this.telemetry.centroidY = 0.5;
    this.telemetry.focusX = 0;
    this.telemetry.focusY = 0;
    this.telemetry.velocityX = 0;
    this.telemetry.velocityY = 0;
    this.telemetry.flowX = 0;
    this.telemetry.flowY = 0;
    this.telemetry.flowMagnitude = 0;
    this.telemetry.flowAcceleration = 0;
    this._lastFlowMagnitude = 0;
    this.telemetry.motionEnergy = 0;
    this.telemetry.litRatio = 0.25;
    this.telemetry.domeExposure = 1.0;
    this.telemetry.flashDelta = 0;
    this.telemetry.visualChange = 0;
    this.telemetry.colorChange = 0;
    this.telemetry.colorfulness = 0.5;
    this.telemetry.dominantHueIndex = 0;
    this.telemetry.dominantHueAngle = 0;
    this.telemetry.dominantHueRatio = 0;
    this.telemetry.dominantHueStrength = 0;
    this.telemetry.colorFocusX = 0;
    this.telemetry.colorFocusY = 0;
    this.telemetry.colorClusterSpread = 0;
    this.telemetry.colorContrast = 0;
    this.telemetry.depthMorph = 0;
    this.telemetry.depthCoverage = 0;
    this.telemetry.depthSpread = 0;
  }

  update(sourceCanvas, dt) {
    this._accumulator += dt;
    const stepInterval = 1 / 24;
    if (this._accumulator < stepInterval) return;
    this._accumulator %= stepInterval;

    const w = this.width;
    const h = this.height;
    const total = w * h;

    this.ctx.drawImage(sourceCanvas, 0, 0, w, h);
    const pixels = this.ctx.getImageData(0, 0, w, h).data;

    // 1) Border ambient color & luminance estimation (works for both B&W and full-color videos)
    let borderR = 0, borderG = 0, borderB = 0, borderSamples = 0;
    for (let x = 0; x < w; x += 2) {
      for (const y of [0, 1, h - 2, h - 1]) {
        const idx = (y * w + x) * 4;
        borderR += pixels[idx] / 255;
        borderG += pixels[idx + 1] / 255;
        borderB += pixels[idx + 2] / 255;
        borderSamples++;
      }
    }
    for (let y = 2; y < h - 2; y += 2) {
      for (const x of [0, 1, w - 2, w - 1]) {
        const idx = (y * w + x) * 4;
        borderR += pixels[idx] / 255;
        borderG += pixels[idx + 1] / 255;
        borderB += pixels[idx + 2] / 255;
        borderSamples++;
      }
    }
    borderR /= Math.max(1, borderSamples);
    borderG /= Math.max(1, borderSamples);
    borderB /= Math.max(1, borderSamples);
    const borderLuma = borderR * 0.299 + borderG * 0.587 + borderB * 0.114;

    // 2) First pass: per-pixel luminance, screen coverage, temporal motion & color stats
    const lumaGrid = new Float32Array(total);
    const motionGrid = new Float32Array(total);

    let sumLuma = 0;
    let sumSat = 0;
    let litPixels = 0;
    let changedPixels = 0;

    let domR = 0, domG = 0, domB = 0, domWeight = 0;
    let secR = 0, secG = 0, secB = 0, secWeight = 0;
    const hueBins = new Float32Array(8);
    const hueWeightBins = new Float32Array(8);
    const hueX = new Float32Array(8);
    const hueY = new Float32Array(8);
    const hueX2 = new Float32Array(8);
    const hueY2 = new Float32Array(8);

    for (let p = 0; p < total; p++) {
      const i = p * 4;
      const r = pixels[i] / 255;
      const g = pixels[i + 1] / 255;
      const b = pixels[i + 2] / 255;

      const luma = r * 0.299 + g * 0.587 + b * 0.114;
      lumaGrid[p] = luma;
      sumLuma += luma;
      if (luma > 0.10) litPixels++;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC > 0.001 ? (maxC - minC) / maxC : 0;
      sumSat += sat;

      // Accumulate dominant & secondary colors weighted by saturation + mid-high brightness
      const cWeight = (0.15 + sat * 1.6) * (0.25 + luma * 0.85);
      // Bucket saturated pixels into 8 perceptual hue families. Pixel area and
      // chroma weight are tracked separately so a tiny vivid accent won't dominate.
      if (sat > 0.16 && maxC - minC > 0.012) {
        let hue = 0;
        if (maxC === r) hue = ((g - b) / (maxC - minC) + (g < b ? 6 : 0)) / 6;
        else if (maxC === g) hue = ((b - r) / (maxC - minC) + 2) / 6;
        else hue = ((r - g) / (maxC - minC) + 4) / 6;
        hue = (hue + 1) % 1;
        const bin = Math.min(7, Math.floor(hue * 8));
        const hueW = sat * (0.25 + luma * 0.75);
        const px = p % w, py = Math.floor(p / w);
        hueBins[bin] += 1;
        hueWeightBins[bin] += hueW;
        hueX[bin] += px * hueW; hueY[bin] += py * hueW;
        hueX2[bin] += px * px * hueW; hueY2[bin] += py * py * hueW;
      }
      domR += r * cWeight;
      domG += g * cWeight;
      domB += b * cWeight;
      domWeight += cWeight;

      const secW = (0.1 + sat * 1.4) * (1.0 - Math.abs(luma - 0.55));
      secR += (r * 0.7 + b * 0.3) * secW;
      secG += (g * 0.8 + r * 0.2) * secW;
      secB += (b * 0.7 + g * 0.3) * secW;
      secWeight += secW;

      const diff = this._hasPrevColor ? Math.abs(luma - this._prevLuma[p]) : 0;
      const prevK = p * 3;
      const colorDiff = this._hasPrevColor
        ? (Math.abs(pixels[i] - this._prevColor[prevK]) + Math.abs(pixels[i + 1] - this._prevColor[prevK + 1]) + Math.abs(pixels[i + 2] - this._prevColor[prevK + 2])) / (3 * 255)
        : 0;
      const combinedChange = diff * 0.58 + colorDiff * 0.42;
      motionGrid[p] = Math.min(1, combinedChange * 3.6);
      if (combinedChange > 0.12) changedPixels++;
      this._prevLuma[p] = luma;
      this._prevColor[prevK] = pixels[i];
      this._prevColor[prevK + 1] = pixels[i + 1];
      this._prevColor[prevK + 2] = pixels[i + 2];
    }

    this._hasPrevColor = true;

    // Sparse block-matching optical flow: estimate directional motion instead of
    // treating every changed pixel as directionless activity. Small blocks are
    // matched within a limited neighborhood; confidence is weighted by texture.
    let flowSumX = 0, flowSumY = 0, flowWeight = 0;
    const search = 4;
    if (this._hasPrevFrame) {
      const block = 6, stride = 10;
      for (let by = search + 2; by < h - search - 2; by += stride) {
        for (let bx = search + 2; bx < w - search - 2; bx += stride) {
          let texture = 0;
          for (let yy = -2; yy <= 2; yy += 2) for (let xx = -2; xx <= 2; xx += 2) {
            const q = (by + yy) * w + bx + xx;
            texture += Math.abs(this._prevFrameLuma[q] - this._prevFrameLuma[q - 1])
              + Math.abs(this._prevFrameLuma[q] - this._prevFrameLuma[q - w]);
          }
          const confidence = Math.min(1, texture * 1.7);
          if (confidence < 0.045) continue;
          let bestSad = Infinity, bestDx = 0, bestDy = 0;
          for (let dy = -search; dy <= search; dy++) for (let dx = -search; dx <= search; dx++) {
            let sad = 0, samples = 0;
            for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) {
              const cur = lumaGrid[(by + yy) * w + bx + xx];
              const prev = this._prevFrameLuma[(by + yy + dy) * w + bx + xx + dx];
              sad += Math.abs(cur - prev); samples++;
            }
            sad /= samples;
            if (sad < bestSad) { bestSad = sad; bestDx = dx; bestDy = dy; }
          }
          // Ignore ambiguous/no-motion matches and weight useful vectors by texture.
          if (bestSad < 0.19 && (bestDx !== 0 || bestDy !== 0)) {
            const wgt = confidence * (1 - Math.min(0.8, bestSad * 3));
            flowSumX += bestDx * wgt; flowSumY += bestDy * wgt; flowWeight += wgt;
          }
        }
      }
    }
    // Matcher offset is current->previous, so invert it to report previous->current motion.
    const rawFlowX = flowWeight > 0 ? -flowSumX / flowWeight / search : 0;
    const rawFlowY = flowWeight > 0 ? -flowSumY / flowWeight / search : 0;
    const rawFlowMagnitude = Math.min(1, Math.hypot(rawFlowX, rawFlowY));
    const flowAlpha = 1 - Math.exp(-Math.max(dt, stepInterval) * (rawFlowMagnitude > this.telemetry.flowMagnitude ? 10 : 4.5));
    this.telemetry.flowX += (rawFlowX - this.telemetry.flowX) * flowAlpha;
    this.telemetry.flowY += (rawFlowY - this.telemetry.flowY) * flowAlpha;
    this.telemetry.flowMagnitude += (rawFlowMagnitude - this.telemetry.flowMagnitude) * flowAlpha;
    this.telemetry.flowAcceleration += ((rawFlowMagnitude - this._lastFlowMagnitude) - this.telemetry.flowAcceleration) * 0.3;
    this._lastFlowMagnitude = rawFlowMagnitude;
    this._prevFrameLuma.set(lumaGrid);
    this._hasPrevFrame = true;

    const avgLuma = sumLuma / total;
    const litRatio = litPixels / total;
    const avgSat = sumSat / total;
    let dominantHue = 0;
    for (let b = 1; b < 8; b++) if (hueWeightBins[b] > hueWeightBins[dominantHue]) dominantHue = b;
    const hueTotal = hueBins.reduce((a, v) => a + v, 0);
    const hueRatio = hueTotal > 0 ? hueBins[dominantHue] / total : 0;
    const hueStrength = hueWeightBins[dominantHue] / Math.max(1, hueTotal);
    const hueW = hueWeightBins[dominantHue];
    if (hueW > 0.001) {
      const hcx = hueX[dominantHue] / hueW / Math.max(1, w - 1);
      const hcy = hueY[dominantHue] / hueW / Math.max(1, h - 1);
      const variance = ((hueX2[dominantHue] / hueW - (hueX[dominantHue] / hueW) ** 2) / (w * w)
        + (hueY2[dominantHue] / hueW - (hueY[dominantHue] / hueW) ** 2) / (h * h)) * 0.5;
      this.telemetry.dominantHueIndex = dominantHue;
      this.telemetry.dominantHueAngle = dominantHue * 45 + 22.5;
      this.telemetry.dominantHueRatio += (hueRatio - this.telemetry.dominantHueRatio) * 0.25;
      this.telemetry.dominantHueStrength += (hueStrength - this.telemetry.dominantHueStrength) * 0.25;
      this.telemetry.colorFocusX += ((hcx - 0.5) * 2 - this.telemetry.colorFocusX) * 0.3;
      this.telemetry.colorFocusY += ((0.5 - hcy) * 2 - this.telemetry.colorFocusY) * 0.3;
      this.telemetry.colorClusterSpread += (Math.sqrt(Math.max(0, variance)) - this.telemetry.colorClusterSpread) * 0.25;
    } else {
      this.telemetry.dominantHueRatio *= 0.85;
      this.telemetry.dominantHueStrength *= 0.85;
      this.telemetry.colorFocusX *= 0.85;
      this.telemetry.colorFocusY *= 0.85;
      this.telemetry.colorClusterSpread *= 0.85;
    }
    const sortedHueWeights = Array.from(hueWeightBins).sort((a, b) => b - a);
    const colorContrastTarget = sortedHueWeights.length > 1 && hueW > 0
      ? THREE.MathUtils.clamp((sortedHueWeights[0] - sortedHueWeights[1]) / (sortedHueWeights[0] + sortedHueWeights[1] + 0.001), 0, 1)
      : 0;
    this.telemetry.colorContrast += (colorContrastTarget - this.telemetry.colorContrast) * 0.22;
    const flashDelta = Math.abs(avgLuma - this._lastAvgLuma);
    this._lastAvgLuma = avgLuma;

    this.telemetry.avgLuma += (avgLuma - this.telemetry.avgLuma) * 0.45;
    this.telemetry.litRatio += (litRatio - this.telemetry.litRatio) * 0.45;
    this.telemetry.colorfulness += (Math.min(1, avgSat * 2.2) - this.telemetry.colorfulness) * 0.3;
    this.telemetry.flashDelta = Math.max(this.telemetry.flashDelta * 0.72, Math.min(1, flashDelta * 3.5));

    // Dynamic auto-exposure inversely proportional to screen pixel coverage & brightness:
    // Prevents flashbangs on bright full-screen frames while lifting dark/sparse scenes
    const screenFill = this.telemetry.avgLuma * 0.65 + this.telemetry.litRatio * 0.35;
    const targetExposure = THREE.MathUtils.clamp(0.34 / (screenFill + 0.16), 0.22, 1.65);
    const adaptSpeed = targetExposure < this.telemetry.domeExposure ? 9.5 : 3.0;
    const adaptAlpha = 1 - Math.exp(-Math.max(dt, stepInterval) * adaptSpeed);
    this.telemetry.domeExposure += (targetExposure - this.telemetry.domeExposure) * adaptAlpha;

    if (domWeight > 0.001) {
      const targetDom = new THREE.Color(domR / domWeight, domG / domWeight, domB / domWeight);
      // If the video is almost pure B&W, keep a crisp electric cyan-blue accent
      if (this.telemetry.colorfulness < 0.12) {
        targetDom.setRGB(0.22, 0.74, 0.97);
      }
      this.telemetry.dominantColor.lerp(targetDom, 0.25);
    }

    if (secWeight > 0.001) {
      const targetSec = new THREE.Color(secR / secWeight, secG / secWeight, secB / secWeight);
      if (this.telemetry.colorfulness < 0.12) {
        targetSec.setRGB(0.58, 0.32, 0.96);
      }
      this.telemetry.secondaryColor.lerp(targetSec, 0.25);
    }

    // 3) Second pass: Hybrid Saliency (Border Contrast + Local Spatial Gradient + Motion)
    let weightSum = 0;
    let cx = 0, cy = 0;
    let minX = w, minY = h, maxX = 0, maxY = 0;

    for (let y = 0; y < h; y++) {
      const yUp = Math.max(0, y - 1) * w;
      const yDn = Math.min(h - 1, y + 1) * w;
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const p = row + x;
        const i = p * 4;
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        const luma = lumaGrid[p];

        // Color & luminance contrast against border ambient
        const dR = r - borderR;
        const dG = g - borderG;
        const dB = b - borderB;
        const colorDist = Math.sqrt(dR * dR + dG * dG + dB * dB) * 0.75;
        const lumaDist = Math.abs(luma - borderLuma);

        // Local edge magnitude (4-neighbor gradient)
        const xL = Math.max(0, x - 1);
        const xR = Math.min(w - 1, x + 1);
        const gx = Math.abs(lumaGrid[row + xR] - lumaGrid[row + xL]);
        const gy = Math.abs(lumaGrid[yDn + x] - lumaGrid[yUp + x]);
        const edge = Math.min(1, (gx + gy) * 2.4);

        const bgContrast = Math.max(0, Math.min(1, (Math.max(colorDist, lumaDist) - 0.08) / 0.26));
        const rawSal = Math.min(1, bgContrast * 0.72 + edge * 0.38 + motionGrid[p] * 0.35);

        // Temporal smoothing to avoid voxel jitter
        const sal = this._saliency[p] * 0.35 + rawSal * 0.65;
        this._saliency[p] = sal;

        if (sal > 0.16) {
          weightSum += sal;
          cx += x * sal;
          cy += y * sal;
          if (sal > 0.42) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    if (weightSum > 2) {
      const nx = cx / weightSum / Math.max(1, w - 1);
      const ny = cy / weightSum / Math.max(1, h - 1);
      this.telemetry.velocityX = THREE.MathUtils.clamp((nx - this._lastCentroidX) * 5.2, -1, 1);
      this.telemetry.velocityY = THREE.MathUtils.clamp((ny - this._lastCentroidY) * 5.2, -1, 1);
      this._lastCentroidX = nx;
      this._lastCentroidY = ny;
      this.telemetry.centroidX = nx;
      this.telemetry.centroidY = ny;

      const targetFocusX = THREE.MathUtils.clamp((nx - 0.5) * 0.95, -0.48, 0.48);
      const targetFocusY = THREE.MathUtils.clamp((0.5 - ny) * 0.72, -0.36, 0.36);
      this.telemetry.focusX += (targetFocusX - this.telemetry.focusX) * 0.38;
      this.telemetry.focusY += (targetFocusY - this.telemetry.focusY) * 0.38;

      if (maxX > minX && maxY > minY) {
        const spanX = (maxX - minX) / Math.max(1, w - 1);
        const spanY = (maxY - minY) / Math.max(1, h - 1);
        const targetScale = THREE.MathUtils.clamp(Math.max(spanX, spanY), 0.18, 1.0);
        this.telemetry.subjectScale += (targetScale - this.telemetry.subjectScale) * 0.3;
      }
    } else {
      this.telemetry.velocityX *= 0.85;
      this.telemetry.velocityY *= 0.85;
      this.telemetry.focusX *= 0.9;
      this.telemetry.focusY *= 0.9;
    }

    const rawMotion = Math.min(1, (changedPixels / total) * 5.2);
    const rawVisualChange = Math.min(1, changedPixels / total * 3.6);
    this.telemetry.visualChange += (rawVisualChange - this.telemetry.visualChange) * 0.48;
    this.telemetry.colorChange += (rawVisualChange - this.telemetry.colorChange) * 0.34;
    this.telemetry.motionEnergy += (rawMotion - this.telemetry.motionEnergy) * 0.42;

    // 4) Chamfer 3-4 Distance Transform for volumetric 2.5D prism inflation
    const dist = this._chamfer;
    for (let i = 0; i < total; i++) {
      dist[i] = this._saliency[i] > 0.34 ? 1000 : 0;
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!dist[i]) continue;
        let d = dist[i];
        if (x > 0) d = Math.min(d, dist[i - 1] + 1);
        if (y > 0) {
          d = Math.min(d, dist[i - w] + 1);
          if (x > 0) d = Math.min(d, dist[i - w - 1] + 1.414);
          if (x < w - 1) d = Math.min(d, dist[i - w + 1] + 1.414);
        }
        dist[i] = d;
      }
    }
    for (let y = h - 1; y >= 0; y--) {
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x;
        if (!dist[i]) continue;
        let d = dist[i];
        if (x < w - 1) d = Math.min(d, dist[i + 1] + 1);
        if (y < h - 1) {
          d = Math.min(d, dist[i + w] + 1);
          if (x > 0) d = Math.min(d, dist[i + w - 1] + 1.414);
          if (x < w - 1) d = Math.min(d, dist[i + w + 1] + 1.414);
        }
        dist[i] = d;
      }
    }

    // 5) Write RGBA analysis DataTexture and derive screen morphology for the director.
    const out = this.data;
    let depthSum = 0, depthSq = 0, depthCount = 0, saliencySum = 0, salientCount = 0;
    for (let i = 0; i < total; i++) {
      const k = i * 4;
      const sal = this._saliency[i];
      const depthNorm = sal > 0.14 ? Math.min(1, dist[i] / 11.0) * sal : 0;
      depthSum += depthNorm; depthSq += depthNorm * depthNorm; depthCount++;
      saliencySum += sal; if (sal > 0.34) salientCount++;
      out[k] = Math.round(lumaGrid[i] * 255);
      out[k + 1] = Math.round(sal * 255);
      out[k + 2] = Math.round(depthNorm * 255);
      out[k + 3] = Math.round(motionGrid[i] * 255);
    }
    const meanDepth = depthSum / Math.max(1, depthCount);
    this.telemetry.depthMorph += (meanDepth - this.telemetry.depthMorph) * 0.28;
    this.telemetry.depthCoverage += (salientCount / Math.max(1, depthCount) - this.telemetry.depthCoverage) * 0.28;
    const variance = Math.max(0, depthSq / Math.max(1, depthCount) - meanDepth * meanDepth);
    this.telemetry.depthSpread += (Math.sqrt(variance) - this.telemetry.depthSpread) * 0.28;
    this.texture.needsUpdate = true;
  }
}