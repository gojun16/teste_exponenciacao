import * as THREE from 'three';
import {
  MASTER_SIZE,
  formatBigPower,
  getDimensionText,
  generateSubdivision
} from './mathEngine.js';
import { PowerRenderer3D } from './renderer3D.js';
import { AmbientPlaylistPlayer } from '../audio/synthPlayer.js';
import { Hyper4DProjector } from '../hyper4D/rotation4D.js';
import { CubeInstrument } from '../instrument/cubeInstrument.js';
import { SandboxPhysics } from '../physics/sandboxPhysics.js';
import { SpaceFillingCurve } from '../zcurve/spaceFillingCurve.js';
import { CinemaDirector } from '../cinema/cinemaDirector.js';
import { TuningEngine } from '../audio/tuningEngine.js';
import { SpatialAudioEngine } from '../audio/spatialAudio.js';
import { ImageMosaic } from '../mosaic/imageMosaic.js';
import { BadAppleDirector } from '../badapple/badAppleDirector.js';

const container = document.getElementById('canvas-container');
const engine = new PowerRenderer3D(container);
const player = new AmbientPlaylistPlayer();
const hyper4D = new Hyper4DProjector(engine.scene);
engine.attachHyper4D(hyper4D);

const instrument = new CubeInstrument(engine.scene);
const tuning = new TuningEngine();
const spatialAudio = new SpatialAudioEngine();
instrument.attachSpatial(spatialAudio);
instrument.attachTuning(tuning);

const mosaic = new ImageMosaic(engine);
engine.attachMosaic(mosaic);
mosaic.syncWithEngine();

const mosaicInput = document.getElementById('mosaic-image-input');
const btnClearMosaic = document.getElementById('btn-clear-mosaic');
const mosaicResLabel = document.getElementById('mosaic-res-label');

function updateMosaicResolutionLabel() {
  if (!mosaicResLabel) return;
  if (!mosaic.enabled) {
    mosaicResLabel.textContent = 'Nenhuma imagem (cores matemáticas)';
    return;
  }
  const { x, y } = mosaic.gridDims;
  mosaicResLabel.textContent = `Resolução frontal: ${x}×${y} px (${(x * y).toLocaleString('pt-BR')} pixels/face)`;
}

mosaicInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    await mosaic.loadFromFile(file);
    updateMosaicResolutionLabel();
  } catch (err) {
    console.error('[ImageMosaic]', err);
    if (mosaicResLabel) mosaicResLabel.textContent = `Erro ao carregar: ${err.message}`;
  }
});

btnClearMosaic?.addEventListener('click', () => {
  mosaic.clear();
  if (mosaicInput) mosaicInput.value = '';
  updateMosaicResolutionLabel();
});

const tuningSelect = document.getElementById('tuning-mode');
if (tuningSelect) {
  tuningSelect.addEventListener('change', (e) => tuning.setMode(e.target.value));
}
const btnScanner = document.getElementById('btn-scanner');

const physics = new SandboxPhysics(engine.scene);
engine.attachPhysics(physics);
const btnPhysics = document.getElementById('btn-physics');
const btnRewind = document.getElementById('btn-rewind');
const zCurve = new SpaceFillingCurve(engine.scene);
engine.attachZCurve(zCurve);
const btnZCurve = document.getElementById('btn-zcurve');
const btnToggleCubes = document.getElementById('btn-toggle-cubes');

btnToggleCubes.addEventListener('click', () => {
  const visible = engine.toggleCubesVisibility();
  btnToggleCubes.classList.toggle('active', !visible);
  btnToggleCubes.textContent = visible ? 'Ocultar Cubos' : 'Mostrar Cubos';
});

const btnCinema = document.getElementById('btn-cinema');
const cinema = new CinemaDirector({
  engine,
  player,
  zCurve,
  instrument,
  physics,
  bannerEl: document.getElementById('cinema-banner')
});
engine.attachCinema(cinema);

const badApple = new BadAppleDirector(engine);
engine.attachBadApple(badApple);

const btnBadApple = document.createElement('button');
btnBadApple.id = 'btn-bad-apple';
btnBadApple.type = 'button';
btnBadApple.textContent = '🍎 Bad Apple!!';
btnCinema?.parentElement?.insertBefore(btnBadApple, btnCinema.nextSibling);

badApple.onStop = () => {
  btnBadApple.classList.remove('active');
  btnBadApple.textContent = '🍎 Bad Apple!!';
};

btnBadApple.addEventListener('click', () => {
  if (!badApple.active) {
    if (cinema.active) {
      cinema.stop(parseFloat(explodeInput.value) || 0);
      btnCinema.classList.remove('active');
      btnCinema.textContent = 'Modo Cinema';
    }
    if (player.isPlaying) {
      player.togglePlay();
      renderPlaylistUI();
    }
    physics.reset();
    resetPhysicsUI();
    badApple.start();
    btnBadApple.classList.add('active');
    btnBadApple.textContent = 'Parar Bad Apple!!';
  } else {
    badApple.stop();
  }
});

function syncButtonsAfterCinema() {
  btnZCurve.classList.toggle('active', zCurve.visible);
  btnZCurve.textContent = zCurve.visible ? 'Ocultar Curva Z' : 'Curva Espacial (Z)';
  btnToggleCubes.classList.toggle('active', !engine.cubesVisible);
  btnToggleCubes.textContent = engine.cubesVisible ? 'Ocultar Cubos' : 'Mostrar Cubos';
  btnScanner.classList.toggle('active', Boolean(instrument.scannerActive));
  btnScanner.textContent = instrument.scannerActive ? 'Parar Scanner Laser' : 'Scanner Laser Musical';
}

btnCinema.addEventListener('click', () => {
  if (!cinema.active) {
    physics.reset();
    resetPhysicsUI();
    cinema.start();
    btnCinema.classList.add('active');
    btnCinema.textContent = 'Parar Modo Cinema';
  } else {
    cinema.stop(parseFloat(explodeInput.value) || 0);
    btnCinema.classList.remove('active');
    btnCinema.textContent = 'Modo Cinema';
    syncButtonsAfterCinema();
  }
});

function resetPhysicsUI() {
  btnPhysics.classList.remove('active');
  btnPhysics.textContent = 'Gravidade (F = ma)';
  btnRewind.disabled = true;
}

physics.onRewindComplete = () => {
  resetPhysicsUI();
  engine.refreshTransforms();
};

// Elementos da UI (Esquerda - Matemática & 4D)
const baseInput = document.getElementById('base-input');
const expInput = document.getElementById('exp-input');
const filterSelect = document.getElementById('filter-select');
const gapInput = document.getElementById('gap-input');
const explodeInput = document.getElementById('explode-input');
const sliceInput = document.getElementById('slice-input');
const budgetInput = document.getElementById('budget-input');
const rotXWInput = document.getElementById('rot-xw-input');
const rotYWInput = document.getElementById('rot-yw-input');
const btn4DSpin = document.getElementById('btn-4d-spin');

// Libera teto maior no slider de orçamento para atingir resoluções altas na casca externa
if (budgetInput && parseInt(budgetInput.max, 10) < 1500000) {
  budgetInput.max = '1500000';
}

const formulaEl = document.getElementById('formula');
const dimDescEl = document.getElementById('dim-desc');
const instanceCountEl = document.getElementById('instance-count');
const depthLevelEl = document.getElementById('depth-level');
const fpsBadge = document.getElementById('fps-badge');
const btnDive = document.getElementById('btn-dive');

// Elementos da UI (Direita - Playlist Ambiente)
const audioStatusEl = document.getElementById('audio-status');
const trackTitleEl = document.getElementById('track-title');
const trackSubEl = document.getElementById('track-sub');
const btnAudioPlay = document.getElementById('audio-play');
const btnAudioPrev = document.getElementById('audio-prev');
const btnAudioNext = document.getElementById('audio-next');
const audioVolumeInput = document.getElementById('audio-volume');
const playlistListEl = document.getElementById('playlist-list');

// Tooltip
const tooltip = document.getElementById('inspector-tooltip');
const ttIndex = document.getElementById('tt-index');
const ttCoords = document.getElementById('tt-coords');
const ttPrime = document.getElementById('tt-prime');

let isDiving = false;
let diveLayerCount = 0;
let totalBlocksCount = 27;

// --- Playlist Ambiente ---
function renderPlaylistUI() {
  const current = player.getCurrentTrack();
  trackTitleEl.textContent = current.title;
  trackSubEl.textContent = current.subtitle;

  btnAudioPlay.textContent = player.isPlaying ? '⏸ Pausar' : '▶ Tocar';
  audioStatusEl.textContent = player.isPlaying ? 'Tocando' : 'Pausado';
  audioStatusEl.classList.toggle('playing', player.isPlaying);

  playlistListEl.innerHTML = '';
  player.tracks.forEach((track, idx) => {
    const li = document.createElement('li');
    if (idx === player.currentTrackIndex) li.classList.add('active');
    li.innerHTML = `<span>${track.title}</span><span>${idx === player.currentTrackIndex && player.isPlaying ? '♪' : ''}</span>`;
    li.addEventListener('click', () => {
      player.selectTrack(idx);
      if (!player.isPlaying) player.play();
      renderPlaylistUI();
    });
    playlistListEl.appendChild(li);
  });
}

btnAudioPlay.addEventListener('click', () => {
  player.togglePlay();
  renderPlaylistUI();
});

btnAudioNext.addEventListener('click', () => {
  player.nextTrack();
  renderPlaylistUI();
});

btnAudioPrev.addEventListener('click', () => {
  player.prevTrack();
  renderPlaylistUI();
});

btnScanner.addEventListener('click', () => {
  const active = instrument.toggleScanner();
  btnScanner.classList.toggle('active', active);
  btnScanner.textContent = active ? 'Parar Scanner Laser' : 'Scanner Laser Musical';
});

btnZCurve.addEventListener('click', () => {
  const active = zCurve.toggle();
  if (active) engine.refreshTransforms();
  btnZCurve.classList.toggle('active', active);
  btnZCurve.textContent = active ? 'Ocultar Curva Z' : 'Curva Espacial (Z)';
});

btnPhysics.addEventListener('click', () => {
  if (!physics.active) {
    isDiving = false;
    btnDive.classList.remove('active');
    btnDive.textContent = 'Mergulhar';

    const boost = 1 + parseFloat(explodeInput.value);
    if (physics.enable(engine.blocksData, boost)) {
      btnPhysics.classList.add('active');
      btnPhysics.textContent = 'Gravidade Ativa';
      btnRewind.disabled = false;
    }
  } else {
    physics.applyShockwave(new THREE.Vector3(0, physics.floorY, 0), 26);
  }
});

btnRewind.addEventListener('click', () => {
  if (physics.startRewind()) {
    btnRewind.disabled = true;
    btnPhysics.textContent = 'Rebobinando...';
  }
});

const btnSpatial = document.getElementById('btn-spatial');
if (btnSpatial) {
  btnSpatial.addEventListener('click', () => {
    spatialAudio.enabled = !spatialAudio.enabled;
    btnSpatial.classList.toggle('active', spatialAudio.enabled);
    btnSpatial.textContent = spatialAudio.enabled
      ? 'Áudio Espacial 3D: ON'
      : 'Áudio Espacial 3D: OFF';

    if (spatialAudio.enabled) {
      spatialAudio.playSpatialNote(329.63, { x: -10, y: 1, z: 0 });
      setTimeout(() => spatialAudio.playSpatialNote(440.00, { x: 10, y: 1, z: 0 }), 220);
    }
  });
}

let downPos = { x: 0, y: 0 };
container.addEventListener('pointerdown', (e) => {
  cinema.setUserDragging(true);
  downPos = { x: e.clientX, y: e.clientY };
});
container.addEventListener('pointerup', (e) => {
  cinema.setUserDragging(false);
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  if (moved < 6) {
    engine.updatePointer(e.clientX, e.clientY);
    const clickedBlock = engine.raycastHover(true);
    if (clickedBlock) {
      if (physics.active && !physics.rewinding) {
        physics.applyShockwave(engine.lastHitPoint, 24);
        player.triggerDimensionChime(5);
      } else {
        instrument.playBlock(clickedBlock);
      }
    }
  }
});

audioVolumeInput.addEventListener('input', () => {
  player.setVolume(parseFloat(audioVolumeInput.value));
});

function rebuild(playSound = false) {
  physics.reset();
  resetPhysicsUI();

  const base = Math.max(1, parseInt(baseInput.value, 10) || 1);
  tuning.setBase(base);
  const exp = Math.max(0, parseInt(expInput.value, 10) || 0);

  const gap = parseFloat(gapInput.value);
  const maxInstances = parseInt(budgetInput.value, 10) || 65536;
  const filterMode = filterSelect.value;

  const result = generateSubdivision(base, exp, gap, maxInstances, filterMode);
  const effectiveExp = result.renderedDepth;

  formulaEl.innerHTML = `${base}<sup>${effectiveExp}</sup> = <span>${formatBigPower(base, effectiveExp)}</span>`;
  dimDescEl.textContent = getDimensionText(effectiveExp);

  totalBlocksCount = result.totalPossible;
  engine.updateData(result, base);

  mosaic.syncWithEngine(base, effectiveExp);
  updateMosaicResolutionLabel();

  instanceCountEl.textContent = `Visíveis: ${result.count.toLocaleString('pt-BR')}`;

  if (playSound) player.triggerDimensionChime(effectiveExp);
}

[baseInput, expInput, gapInput, budgetInput, filterSelect].forEach((el) => {
  el.addEventListener('input', () => rebuild(true));
});

explodeInput.addEventListener('input', () => {
  engine.setExplodeFactor(parseFloat(explodeInput.value));
});

sliceInput.addEventListener('input', () => {
  engine.setSliceRatio(parseFloat(sliceInput.value));
});

function update4DFromSliders() {
  hyper4D.setAnglesDeg(parseFloat(rotXWInput.value), parseFloat(rotYWInput.value));
  spatialAudio.setHyperModulation(hyper4D.angleXW, hyper4D.angleYW);
  engine.refreshTransforms();
}

rotXWInput.addEventListener('input', update4DFromSliders);
rotYWInput.addEventListener('input', update4DFromSliders);

btn4DSpin.addEventListener('click', () => {
  const spinning = hyper4D.toggleAutoSpin();
  btn4DSpin.classList.toggle('active', spinning);
  btn4DSpin.textContent = spinning ? 'Parar 4D' : 'Girar 4D (Auto)';
  engine.refreshTransforms();
});

document.getElementById('btn-prev').addEventListener('click', () => {
  const current = parseInt(expInput.value, 10) || 0;
  if (current > 0) {
    expInput.value = current - 1;
    rebuild(true);
  }
});

document.getElementById('btn-next').addEventListener('click', () => {
  const current = parseInt(expInput.value, 10) || 0;
  expInput.value = current + 1;
  rebuild(true);
});

btnDive.addEventListener('click', () => {
  isDiving = !isDiving;
  btnDive.classList.toggle('active', isDiving);
  btnDive.textContent = isDiving ? 'Parar Mergulho' : 'Mergulhar';
});

document.getElementById('btn-reset').addEventListener('click', () => {
  cinema.stop(0);
  btnCinema.classList.remove('active');
  btnCinema.textContent = 'Modo Cinema';
  engine.setCubesVisible(true);
  btnToggleCubes.classList.remove('active');
  btnToggleCubes.textContent = 'Ocultar Cubos';
  zCurve.reset();
  btnZCurve.classList.remove('active');
  btnZCurve.textContent = 'Curva Espacial (Z)';
  physics.reset();
  resetPhysicsUI();
  isDiving = false;
  btnDive.classList.remove('active');
  btnDive.textContent = 'Mergulhar';

  hyper4D.reset();
  spatialAudio.setHyperModulation(0, 0);
  rotXWInput.value = 0;
  rotYWInput.value = 0;
  btn4DSpin.classList.remove('active');
  btn4DSpin.textContent = 'Girar 4D (Auto)';

  diveLayerCount = 0;
  depthLevelEl.textContent = 'Camada: 0';
  sliceInput.value = 1;
  explodeInput.value = 0;
  engine.setSliceRatio(1);
  engine.setExplodeFactor(0);
  engine.refreshTransforms();
  engine.setCameraPreset(1);

  if (typeof instrument.reset === 'function') {
    instrument.reset();
  } else {
    instrument.scannerActive = false;
    if (instrument.scannerGroup) instrument.scannerGroup.visible = false;
  }
  btnScanner.classList.remove('active');
  btnScanner.textContent = 'Scanner Laser Musical';
});

// Inspeção com o Mouse
window.addEventListener('mousemove', (e) => {
  engine.updatePointer(e.clientX, e.clientY);

  if (e.target.closest('.hud') || e.target.closest('.audio-hud')) {
    tooltip.style.display = 'none';
    return;
  }

  tooltip.style.left = `${e.clientX}px`;
  tooltip.style.top = `${e.clientY}px`;
});

function formatCoordsLabel(coords) {
  if (!coords || coords.length === 0) return '[Núcleo 0D]';
  const axisNames = ['X', 'Y', 'Z', 'W'];
  if (coords.length <= 4) {
    return `[${coords.map((val, i) => `${axisNames[i]}:${val}`).join(' | ')}]`;
  }
  const parts = coords.map((val, idx) => {
    const layer = Math.floor(idx / 3) + 1;
    const axis = ['X', 'Y', 'Z'][idx % 3];
    return `${axis}${layer}:${val}`;
  });
  return `[${parts.join(' | ')}]`;
}

// Teclado
const keys = {};
window.addEventListener('keydown', (e) => {
  if (document.activeElement.tagName === 'INPUT') return;
  keys[e.code] = true;

  if (e.code === 'Digit1') engine.setCameraPreset(1);
  if (e.code === 'Digit2') engine.setCameraPreset(2);
  if (e.code === 'Digit3') engine.setCameraPreset(3);
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function handleKeyboardMovement(dt) {
  const speed = 11 * dt;
  const forward = new THREE.Vector3();
  engine.camera.getWorldDirection(forward);
  const right = new THREE.Vector3().crossVectors(forward, engine.camera.up).normalize();

  if (keys['KeyW']) {
    engine.camera.position.addScaledVector(forward, speed);
    engine.controls.target.addScaledVector(forward, speed);
  }
  if (keys['KeyS']) {
    engine.camera.position.addScaledVector(forward, -speed);
    engine.controls.target.addScaledVector(forward, -speed);
  }
  if (keys['KeyA']) {
    engine.camera.position.addScaledVector(right, -speed);
    engine.controls.target.addScaledVector(right, -speed);
  }
  if (keys['KeyD']) {
    engine.camera.position.addScaledVector(right, speed);
    engine.controls.target.addScaledVector(right, speed);
  }
}

// Loop Principal
let lastTime = performance.now();
let frames = 0;
let fpsTimer = lastTime;
const lookDirVec = new THREE.Vector3();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  handleKeyboardMovement(dt);

  if (hyper4D.autoSpin) {
    rotXWInput.value = Math.round(THREE.MathUtils.radToDeg(hyper4D.angleXW));
    rotYWInput.value = Math.round(THREE.MathUtils.radToDeg(hyper4D.angleYW));
    spatialAudio.setHyperModulation(hyper4D.angleXW, hyper4D.angleYW);
  }

  const hoveredBlock = engine.raycastHover();
  if (hoveredBlock) {
    tooltip.style.display = 'block';
    ttIndex.textContent = `Bloco #${hoveredBlock.index} de ${totalBlocksCount}`;
    ttCoords.textContent = formatCoordsLabel(hoveredBlock.coords);
    ttPrime.textContent = hoveredBlock.isPrime ? '★ Número Primo' : '';
  } else {
    tooltip.style.display = 'none';
  }

  if (isDiving) {
    const base = Math.max(2, parseInt(baseInput.value, 10) || 2);
    const dir = new THREE.Vector3().subVectors(engine.controls.target, engine.camera.position).normalize();
    const dist = engine.camera.position.distanceTo(engine.controls.target);

    engine.camera.position.addScaledVector(dir, dist * 1.4 * dt);
    engine.rootGroup.rotation.z += 0.25 * dt;

    if (dist < MASTER_SIZE / (base * 1.5)) {
      engine.camera.position.copy(dir).multiplyScalar(-MASTER_SIZE * 1.2);
      diveLayerCount++;
      depthLevelEl.textContent = `Camada: ${diveLayerCount}`;
      player.triggerDimensionChime(diveLayerCount + 3);
    }
  }

  engine.camera.getWorldDirection(lookDirVec);
  spatialAudio.updateListener(engine.camera, lookDirVec);
  instrument.update(dt, instrument.scannerActive ? engine.blocksData : []);
  engine.render(dt, player.getAudioEnergy());

  frames++;
  if (now - fpsTimer >= 500) {
    fpsBadge.textContent = `${Math.round((frames * 1000) / (now - fpsTimer))} FPS`;
    frames = 0;
    fpsTimer = now;
  }
}

renderPlaylistUI();
rebuild(false);
requestAnimationFrame(animate);