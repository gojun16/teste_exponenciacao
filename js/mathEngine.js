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

/**
 * Estima quantos blocos sobreviverão após o filtro para permitir expoentes
 * muito maiores nos modos 'shell' e 'menger' sem estourar a memória.
 */
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
    return total / Math.max(2, Math.log(total));
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

  // Pré-calcula potências de base para índice linear O(depth) sem visitar ramos podados
  const powTable = new Array(maxDepth);
  for (let d = 0; d < maxDepth; d++) {
    powTable[d] = Math.pow(base, maxDepth - 1 - d);
  }

  // Pré-calcula frações de escala e deslocamento por profundidade
  const childFracs = new Float64Array(maxDepth);
  const stepFracs = new Float64Array(maxDepth);
  for (let step = 0; step < maxDepth; step++) {
    const depthAttenuation = Math.pow(0.82, Math.floor(step / 3));
    const effectiveGap = base === 1 ? 0 : gapRatio * depthAttenuation;
    const totalGap = effectiveGap * (base - 1);
    childFracs[step] = (1 - totalGap) / base;
    stepFracs[step] = childFracs[step] + effectiveGap;
  }

  const blocks = [];
  const coords = new Int32Array(maxDepth);
  const isShellMode = filterMode === 'shell' && base > 1;
  const isMengerMode = filterMode === 'menger' && base >= 3;
  const isPrimeMode = filterMode === 'primes';
  const mengerMid = Math.floor(base / 2);

  // Máscaras de borda global por eixo: bit 1 = ainda pode tocar min (0), bit 2 = ainda pode tocar max (b-1)
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
    maskZ
  ) {
    // Poda precoce da casca externa: se os 3 eixos já entraram no interior, nenhum filho tocará a borda
    if (isShellMode && step >= 3 && maskX === 0 && maskY === 0 && maskZ === 0) {
      return;
    }

    if (step === maxDepth) {
      const linearIndex = linearAcc + 1;
      const primeFlag = isPrimeMode ? isPrime(linearIndex) : false;
      if (isPrimeMode && !primeFlag) return;

      // Bitmask de quais faces globais este bloco toca (1:+X, 2:-X, 4:+Y, 8:-Y, 16:+Z, 32:-Z)
      let outerMask = 0;
      if (maskX & 2) outerMask |= 1;
      if (maskX & 1) outerMask |= 2;
      if (maskY & 2) outerMask |= 4;
      if (maskY & 1) outerMask |= 8;
      if (maskZ & 2) outerMask |= 16;
      if (maskZ & 1) outerMask |= 32;

      blocks.push({
        index: linearIndex,
        coords: Array.from(coords),
        isPrime: isPrimeMode ? primeFlag : isPrime(linearIndex),
        outerMask,
        x: cx,
        y: cy,
        z: cz,
        startX: parentX,
        startY: parentY,
        startZ: parentZ,
        sx,
        sy,
        sz,
        hue: (hue % 360) / 360
      });
      return;
    }

    const axis = step % 3;
    const childFrac = childFracs[step];
    const stepFrac = stepFracs[step];
    const weight = powTable[step];
    const isPenultimate = step === maxDepth - 1;

    for (let i = 0; i < base; i++) {
      // Atualiza máscaras de borda global para o eixo atual
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

      // Poda precoce da Esponja de Menger a cada tripleto (X, Y, Z) concluído
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

      if (axis === 0) {
        ncx = cx + normOffset * sx;
        nsx = sx * childFrac;
      } else if (axis === 1) {
        ncy = cy + normOffset * sy;
        nsy = sy * childFrac;
      } else {
        ncz = cz + normOffset * sz;
        nsz = sz * childFrac;
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
        nMaskZ
      );
    }
  }

  subdivide(0, 0, 0, 0, MASTER_SIZE, MASTER_SIZE, MASTER_SIZE, 0, 0, 0, 195, 0, 3, 3, 3);

  const totalPossible = Math.pow(base, maxDepth);

  return {
    blocks,
    totalPossible,
    renderedDepth: maxDepth,
    filterMode
  };
}