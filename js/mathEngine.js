export const MASTER_SIZE = 10;

export function formatBigPower(base, exp) {
  try {
    const val = BigInt(base) ** BigInt(exp);
    const str = val.toString();
    if (str.length > 16) {
      return `${str[0]}.${str.slice(1, 5)} × 10<sup>${str.length - 1}</sup>`;
    }
    return val.toLocaleString('pt-BR');
  } catch {
    return '∞';
  }
}

export function getDimensionText(exp) {
  if (exp === 0) return '0D: Cubo unitário inteiro';
  if (exp === 1) return '1D: Fatiado horizontalmente (Eixo X)';
  if (exp === 2) return '2D: Grade frontal (Eixos X × Y)';
  if (exp === 3) return '3D: Matriz cúbica (Eixos X × Y × Z)';
  const axis = ['X (Largura)', 'Y (Altura)', 'Z (Profundidade)'][(exp - 1) % 3];
  return `${exp}D: Subdividindo blocos no eixo ${axis}`;
}

export function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

function estimateFilteredCount(base, depth, filterMode) {
  if (depth === 0 || base <= 1) return 1;

  const layersX = Math.ceil(depth / 3);
  const layersY = depth >= 2 ? Math.ceil((depth - 1) / 3) : 0;
  const layersZ = depth >= 3 ? Math.ceil((depth - 2) / 3) : 0;

  const nx = Math.pow(base, layersX);
  const ny = Math.pow(base, layersY);
  const nz = Math.pow(base, layersZ);
  const total = nx * ny * nz;

  if (filterMode === 'shell') {
    if (nx <= 2 || ny <= 2 || nz <= 2) return total;
    return total - (nx - 2) * (ny - 2) * (nz - 2);
  }

  if (filterMode === 'menger' && base >= 3) {
    const fullTriplets = Math.floor(depth / 3);
    const rem = depth % 3;
    const menger3D = Math.pow(base * base * base - (3 * base - 2), fullTriplets);
    return menger3D * Math.pow(base, rem);
  }

  if (filterMode === 'primes') {
    return Math.ceil(total / Math.max(2, Math.log(total))) + 64;
  }

  return total;
}

export function generateSubdivision(base, exp, gapRatio, maxInstances, filterMode = 'all') {
  let maxDepth = exp;

  if (base > 1 && exp > 0) {
    while (maxDepth > 1 && estimateFilteredCount(base, maxDepth, filterMode) > maxInstances) {
      maxDepth--;
    }
  }

  let capacity = Math.max(16, Math.ceil(estimateFilteredCount(base, maxDepth, filterMode) * 1.05));

  let px = new Float32Array(capacity);
  let py = new Float32Array(capacity);
  let pz = new Float32Array(capacity);
  let startDeltaX = new Float32Array(capacity);
  let startDeltaY = new Float32Array(capacity);
  let startDeltaZ = new Float32Array(capacity);
  let sxArr = new Float32Array(capacity);
  let syArr = new Float32Array(capacity);
  let szArr = new Float32Array(capacity);
  let hueArr = new Float32Array(capacity);
  let packedGrid = new Float32Array(capacity);
  let linearIndices = new Float64Array(capacity);

  function ensureCapacity() {
    if (count < capacity) return;
    capacity = Math.ceil(capacity * 1.5);
    const growF32 = (old) => { const n = new Float32Array(capacity); n.set(old); return n; };
    const growF64 = (old) => { const n = new Float64Array(capacity); n.set(old); return n; };
    px = growF32(px);
    py = growF32(py);
    pz = growF32(pz);
    startDeltaX = growF32(startDeltaX);
    startDeltaY = growF32(startDeltaY);
    startDeltaZ = growF32(startDeltaZ);
    sxArr = growF32(sxArr);
    syArr = growF32(syArr);
    szArr = growF32(szArr);
    hueArr = growF32(hueArr);
    packedGrid = growF32(packedGrid);
    linearIndices = growF64(linearIndices);
  }

  const powTable = new Float64Array(maxDepth);
  for (let d = 0; d < maxDepth; d++) {
    powTable[d] = Math.pow(base, maxDepth - 1 - d);
  }

  const childFracs = new Float64Array(maxDepth);
  const stepFracs = new Float64Array(maxDepth);
  for (let step = 0; step < maxDepth; step++) {
    const depthAttenuation = Math.pow(0.82, Math.floor(step / 3));
    const effectiveGap = base === 1 ? 0 : gapRatio * depthAttenuation;
    const totalGap = effectiveGap * (base - 1);
    childFracs[step] = (1 - totalGap) / base;
    stepFracs[step] = childFracs[step] + effectiveGap;
  }

  const coords = new Int32Array(maxDepth);
  const isShellMode = filterMode === 'shell' && base > 1;
  const isMengerMode = filterMode === 'menger' && base >= 3;
  const isPrimeMode = filterMode === 'primes';
  const mengerMid = Math.floor(base / 2);

  let count = 0;

  function subdivide(
    step,
    cx,
    cy,
    cz,
    sx,
    sy,
    sz,
    parentX,
    parentY,
    parentZ,
    hue,
    linearAcc,
    maskX,
    maskY,
    maskZ,
    gx,
    gy,
    gz
  ) {
    if (isShellMode && step >= 3 && maskX === 0 && maskY === 0 && maskZ === 0) {
      return;
    }

    if (step === maxDepth) {
      const linearIndex = linearAcc + 1;
      if (isPrimeMode && !isPrime(linearIndex)) return;

      ensureCapacity();

      px[count] = cx;
      py[count] = cy;
      pz[count] = cz;
      startDeltaX[count] = parentX - cx;
      startDeltaY[count] = parentY - cy;
      startDeltaZ[count] = parentZ - cz;
      sxArr[count] = sx;
      syArr[count] = sy;
      szArr[count] = sz;
      hueArr[count] = (hue % 360) / 360;
      packedGrid[count] = gx + gy * 256 + gz * 65536;
      linearIndices[count] = linearIndex;
      count++;
      return;
    }

    const axis = step % 3;
    const childFrac = childFracs[step];
    const stepFrac = stepFracs[step];
    const weight = powTable[step];
    const isPenultimate = step === maxDepth - 1;

    for (let i = 0; i < base; i++) {
      let nMaskX = maskX;
      let nMaskY = maskY;
      let nMaskZ = maskZ;

      if (isShellMode) {
        const edgeBit = (i === 0 ? 1 : 0) | (i === base - 1 ? 2 : 0);
        if (axis === 0) nMaskX = maskX & edgeBit;
        else if (axis === 1) nMaskY = maskY & edgeBit;
        else nMaskZ = maskZ & edgeBit;

        if (step >= 2 && nMaskX === 0 && nMaskY === 0 && nMaskZ === 0) {
          continue;
        }
      }

      if (isMengerMode && axis === 2) {
        let centerAxes = 0;
        if (coords[step - 2] === mengerMid) centerAxes++;
        if (coords[step - 1] === mengerMid) centerAxes++;
        if (i === mengerMid) centerAxes++;
        if (centerAxes >= 2) continue;
      }

      const normOffset = -0.5 + childFrac * 0.5 + i * stepFrac;
      const nextHue = step >= 2 ? hue + i * (135 / base) : hue;

      let ncx = cx;
      let ncy = cy;
      let ncz = cz;
      let nsx = sx;
      let nsy = sy;
      let nsz = sz;
      let ngx = gx;
      let ngy = gy;
      let ngz = gz;

      if (axis === 0) {
        ncx = cx + normOffset * sx;
        nsx = sx * childFrac;
        ngx = gx * base + i;
      } else if (axis === 1) {
        ncy = cy + normOffset * sy;
        nsy = sy * childFrac;
        ngy = gy * base + i;
      } else {
        ncz = cz + normOffset * sz;
        nsz = sz * childFrac;
        ngz = gz * base + i;
      }

      coords[step] = i;
      subdivide(
        step + 1,
        ncx,
        ncy,
        ncz,
        nsx,
        nsy,
        nsz,
        isPenultimate ? cx : parentX,
        isPenultimate ? cy : parentY,
        isPenultimate ? cz : parentZ,
        nextHue,
        linearAcc + i * weight,
        nMaskX,
        nMaskY,
        nMaskZ,
        ngx,
        ngy,
        ngz
      );
    }
  }

  subdivide(0, 0, 0, 0, MASTER_SIZE, MASTER_SIZE, MASTER_SIZE, 0, 0, 0, 195, 0, 3, 3, 3, 0, 0, 0);

  const totalPossible = Math.pow(base, maxDepth);

  // Reconstrói um único bloco sob demanda (hover/clique) sem alocar objetos para toda a malha
  function getBlock(i) {
    if (i < 0 || i >= count) return null;
    const idx = linearIndices[i];
    const blockCoords = new Array(maxDepth);
    let rem = idx - 1;
    for (let d = maxDepth - 1; d >= 0; d--) {
      blockCoords[d] = rem % base;
      rem = Math.floor(rem / base);
    }
    const x = px[i];
    const y = py[i];
    const z = pz[i];
    return {
      index: idx,
      coords: blockCoords,
      isPrime: isPrime(idx),
      x,
      y,
      z,
      startX: x + startDeltaX[i],
      startY: y + startDeltaY[i],
      startZ: z + startDeltaZ[i],
      sx: sxArr[i],
      sy: syArr[i],
      sz: szArr[i],
      hue: hueArr[i]
    };
  }

  return {
    count,
    px: px.subarray(0, count),
    py: py.subarray(0, count),
    pz: pz.subarray(0, count),
    startDeltaX: startDeltaX.subarray(0, count),
    startDeltaY: startDeltaY.subarray(0, count),
    startDeltaZ: startDeltaZ.subarray(0, count),
    sx: sxArr.subarray(0, count),
    sy: syArr.subarray(0, count),
    sz: szArr.subarray(0, count),
    hue: hueArr.subarray(0, count),
    packedGrid: packedGrid.subarray(0, count),
    linearIndices: linearIndices.subarray(0, count),
    getBlock,
    totalPossible,
    renderedDepth: maxDepth,
    filterMode
  };
}