import * as THREE from 'three';

/**
 * Ambiente 360° de Observatório Hiperdimensional para WebXR (Meta Quest 2).
 * Inclui domo estelar com compressão Reinhard (anti-flashbang), piso de referência
 * espacial para conforto vestibular, anéis orbitais e poeira cósmica reativa ao áudio.
 */
export class VRWorldEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);

    this.uniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uPrimaryColor: { value: new THREE.Color(0x38bdf8) },
      uSecondaryColor: { value: new THREE.Color(0xa855f7) }
    };

    this._buildSkyDome();
    this._buildObservatoryFloor();
    this._buildCeilingHalos();
    this._buildCosmicDust();
    this._buildVRLights();
  }

  _buildSkyDome() {
    const geo = new THREE.SphereGeometry(62, 48, 32);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.uniforms,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;
        varying vec3 vDir;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vec3 d = normalize(vDir);
          float elev = d.y;
          float az = atan(d.x, -d.z);

          // Base noturna profunda (confortável para lentes VR)
          vec3 zen = vec3(0.010, 0.016, 0.036);
          vec3 hor = vec3(0.022, 0.038, 0.075);
          vec3 col = mix(hor, zen, smoothstep(-0.05, 0.72, elev));

          // Aurora hiperdimensional sutil no horizonte
          float wave = sin(az * 3.0 + uTime * 0.25) * 0.5 + 0.5;
          float auroraBand = exp(-abs(elev - 0.12) * 5.2);
          vec3 auroraCol = mix(uPrimaryColor, uSecondaryColor, wave);
          col += auroraCol * auroraBand * (0.14 + uBass * 0.14);

          // Grade geodésica sutil para orientação espacial 360°
          float latLine = smoothstep(0.985, 1.0, abs(sin(elev * 18.8495)));
          float lonLine = smoothstep(0.988, 1.0, abs(sin(az * 12.0)));
          float grid = max(latLine, lonLine) * smoothstep(-0.2, 0.15, elev) * (1.0 - smoothstep(0.65, 0.98, elev));
          col += uPrimaryColor * grid * (0.06 + uMid * 0.08);

          // Campo estelar procedural estável (sem cintilação agressiva)
          vec3 starCell = floor(d * 190.0);
          float starSeed = hash(starCell);
          if (starSeed > 0.992 && elev > -0.1) {
            float twinkle = 0.75 + 0.25 * sin(uTime * 1.8 + starSeed * 90.0);
            col += vec3(0.75, 0.88, 1.0) * twinkle * 0.42;
          }

          // Compressão Reinhard para evitar flashbangs em VR
          col = col / (1.0 + col * 1.25);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    this.domeMesh = new THREE.Mesh(geo, mat);
    this.group.add(this.domeMesh);
  }

  _buildObservatoryFloor() {
    // Disco principal do piso em y = 0 (local-floor reference space)
    const floorGeo = new THREE.CircleGeometry(14, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x060b18,
      roughness: 0.85,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0.0;
    this.group.add(floorMesh);

    // Anéis concêntricos de referência métrica (1m, 2m, 3.2m, 4.8m)
    const radii = [1.0, 2.0, 3.2, 4.8, 7.0];
    this.floorRings = [];
    radii.forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r - 0.012, r + 0.012, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x38bdf8 : 0x1e3a5f,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: idx === 0 ? 0.55 : 0.32
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.003;
      this.group.add(ring);
      this.floorRings.push(ring);
    });

    // Marcação de pedestal sob a zona padrão do holograma (0, 0.005, -1.25)
    const padGeo = new THREE.RingGeometry(0.42, 0.46, 64);
    const padMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    this.holoPad = new THREE.Mesh(padGeo, padMat);
    this.holoPad.rotation.x = -Math.PI / 2;
    this.holoPad.position.set(0, 0.005, -1.25);
    this.group.add(this.holoPad);
  }

  _buildCeilingHalos() {
    this.halos = [];
    const specs = [
      { r: 3.4, tube: 0.018, y: 4.2, color: 0x38bdf8, speed: 0.14 },
      { r: 5.2, tube: 0.014, y: 4.8, color: 0xa855f7, speed: -0.09 }
    ];
    for (const s of specs) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(s.r, s.tube, 8, 96),
        new THREE.MeshBasicMaterial({
          color: s.color,
          transparent: true,
          opacity: 0.35
        })
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = s.y;
      mesh.userData.speed = s.speed;
      this.group.add(mesh);
      this.halos.push(mesh);
    }
  }

  _buildCosmicDust() {
    const count = 750;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color(0x38bdf8);
    const c2 = new THREE.Color(0xc084fc);
    const tmp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.6 + Math.random() * 14.0;
      const y = 0.25 + Math.random() * 5.8;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      tmp.copy(c1).lerp(c2, Math.random());
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.032,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });

    this.dustPoints = new THREE.Points(geo, mat);
    this.group.add(this.dustPoints);
  }

  _buildVRLights() {
    const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.75);
    this.group.add(hemi);

    const overhead = new THREE.PointLight(0x38bdf8, 1.4, 14);
    overhead.position.set(0, 3.2, -1.2);
    this.group.add(overhead);
  }

  setVisible(visible) {
    this.group.visible = Boolean(visible);
  }

  update(dt, audioEnergy = { bass: 0, mid: 0 }) {
    if (!this.group.visible) return;

    this.uniforms.uTime.value += dt;
    this.uniforms.uBass.value = audioEnergy.bass || 0;
    this.uniforms.uMid.value = audioEnergy.mid || 0;

    if (this.dustPoints) {
      this.dustPoints.rotation.y += dt * 0.025;
      this.dustPoints.material.opacity = 0.42 + (audioEnergy.mid || 0) * 0.28;
    }

    for (const halo of this.halos) {
      halo.rotation.z += dt * halo.userData.speed;
    }

    if (this.holoPad) {
      const pulse = 1 + (audioEnergy.bass || 0) * 0.08;
      this.holoPad.scale.set(pulse, pulse, 1);
    }
  }
}
