'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * ForestWorld
 * ------------------------------------------------------------------
 * A scroll-driven cinematic flythrough for a carbon-credit site.
 *
 * A scroll-driven forest flythrough with natural terrain, trees, mist, and light.
 *
 * Everything below is built from three's core module only (no addons),
 * so it drops into an existing Next.js + three.js setup with no new
 * dependencies.
 * ------------------------------------------------------------------
 */

export default function ForestWorld() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ============================================================
    // 1. SCENE, CAMERA, RENDERER
    // ============================================================
    const scene = new THREE.Scene();

    // Warm, hazy dawn fog — reads as "hopeful new day" rather than gloom.
    const FOG_COLOR = 0xb9c99d;
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.008);

    const camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      0.1,
      180,
    );
    const baseFov = 52;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // ============================================================
    // 2. TEXTURE HELPERS (procedural, no image assets required)
    // ============================================================
    function makeSkyTexture() {
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0.0, '#213a52');
      g.addColorStop(0.32, '#4d6f7c');
      g.addColorStop(0.58, '#a9a97c');
      g.addColorStop(0.78, '#e3bd7e');
      g.addColorStop(1.0, '#f1d9a8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 512);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    function makeSurfaceTexture(base: string, detail: string, count: number, mode: 'bark' | 'leaf' | 'grass' | 'soil' | 'water') {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 256, 256);

      for (let i = 0; i < count; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const alpha = 0.08 + Math.random() * 0.2;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = detail;

        if (mode === 'bark') {
          ctx.fillRect(x, y, 1 + Math.random() * 3, 14 + Math.random() * 42);
        } else if (mode === 'leaf') {
          ctx.beginPath();
          ctx.arc(x, y, 2 + Math.random() * 9, 0, Math.PI * 2);
          ctx.fill();
        } else if (mode === 'grass') {
          ctx.fillRect(x, y, 1, 2 + Math.random() * 8);
        } else if (mode === 'water') {
          ctx.fillRect(x, y, 16 + Math.random() * 34, 1 + Math.random() * 2);
        } else {
          ctx.fillRect(x, y, 2 + Math.random() * 10, 2 + Math.random() * 7);
        }
      }

      ctx.globalAlpha = 1;
      const texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return texture;
    }

    scene.background = makeSkyTexture();
    const barkTexture = makeSurfaceTexture('#5a3b25', '#c18a51', 520, 'bark');
    const leafTexture = makeSurfaceTexture('#2f713c', '#9acb67', 420, 'leaf');
    const grassTexture = makeSurfaceTexture('#426d35', '#b5cf70', 900, 'grass');
    const soilTexture = makeSurfaceTexture('#634128', '#b07a4c', 340, 'soil');
    const realisticGrassTexture = new THREE.TextureLoader().load('/textures/grasslight-big.jpg');
    realisticGrassTexture.colorSpace = THREE.SRGBColorSpace;
    realisticGrassTexture.wrapS = THREE.RepeatWrapping;
    realisticGrassTexture.wrapT = THREE.RepeatWrapping;
    realisticGrassTexture.repeat.set(11, 18);
    realisticGrassTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const sceneTextures = [scene.background, barkTexture, leafTexture, grassTexture, soilTexture, realisticGrassTexture];
    grassTexture.repeat.set(7, 12);
    soilTexture.repeat.set(4, 8);

    // ============================================================
    // 3. THE PATH — a longer, gentler S-curve through the forest
    // ============================================================
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.1, 8),
      new THREE.Vector3(5, 1.15, -12),
      new THREE.Vector3(-6, 1.05, -35),
      new THREE.Vector3(4, 1.2, -60),
      new THREE.Vector3(-2, 1.1, -75),
      new THREE.Vector3(0, 1.1, -90),
    ]);

    // ============================================================
    // 4. LIGHTING — soft sky fill + low, warm "just risen" sun
    // ============================================================
    const hemi = new THREE.HemisphereLight(0xf8f8df, 0x3f6038, 1.85);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0xe6f0d7, 0.55));

    const sun = new THREE.DirectionalLight(0xffd6a0, 3.0);
    sun.position.set(-24, 18, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 130;
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    sun.shadow.bias = -0.00045;
    sun.shadow.radius = 4;
    scene.add(sun);

    // Cool bounce light from the opposite side keeps shadows from going pure black.
    const bounce = new THREE.DirectionalLight(0xaed4b0, 1.05);
    bounce.position.set(15, 6, -20);
    scene.add(bounce);

    // ============================================================
    // 5. TERRAIN — undulating ground instead of a flat plane
    // ============================================================
    const groundGeo = new THREE.PlaneGeometry(160, 220, 80, 110);
    const groundPos = groundGeo.attributes.position;
    for (let i = 0; i < groundPos.count; i++) {
      const x = groundPos.getX(i);
      const y = groundPos.getY(i); // pre-rotation "z" of the world
      const rolling =
        Math.sin(x * 0.06) * 0.9 +
        Math.cos(y * 0.05 + x * 0.02) * 0.7 +
        Math.sin((x + y) * 0.11) * 0.25;
      groundPos.setZ(i, rolling);
    }
    groundGeo.computeVertexNormals();

    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ color: 0x8dad60, map: realisticGrassTexture, roughness: 0.96 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.35, -45);
    ground.receiveShadow = true;
    scene.add(ground);

    const soilBase = new THREE.Mesh(
      groundGeo.clone(),
      new THREE.MeshStandardMaterial({ color: 0x513b29, map: soilTexture, roughness: 1 }),
    );
    soilBase.rotation.x = -Math.PI / 2;
    soilBase.position.set(0, -0.62, -45);
    soilBase.receiveShadow = true;
    scene.add(soilBase);

    const terrainHeight = (x: number, z: number) => {
      const localZ = -(z + 45);
      return -0.35
        + Math.sin(x * 0.06) * 0.9
        + Math.cos(localZ * 0.05 + x * 0.02) * 0.7
        + Math.sin((x + localZ) * 0.11) * 0.25;
    };

    // Dirt path — a flat ribbon that follows the terrain instead of a flattened tube.
    const pathSegments = 160;
    const pathWidth = 3.8;
    const pathPositions = new Float32Array((pathSegments + 1) * 2 * 3);
    const pathIndices: number[] = [];
    for (let i = 0; i <= pathSegments; i++) {
      const t = i / pathSegments;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const leftIndex = i * 6;
      const rightIndex = leftIndex + 3;
      const leftX = point.x - right.x * pathWidth * 0.5;
      const leftZ = point.z - right.z * pathWidth * 0.5;
      const rightX = point.x + right.x * pathWidth * 0.5;
      const rightZ = point.z + right.z * pathWidth * 0.5;
      pathPositions[leftIndex] = leftX;
      pathPositions[leftIndex + 1] = terrainHeight(leftX, leftZ) + 0.025;
      pathPositions[leftIndex + 2] = leftZ;
      pathPositions[rightIndex] = rightX;
      pathPositions[rightIndex + 1] = terrainHeight(rightX, rightZ) + 0.025;
      pathPositions[rightIndex + 2] = rightZ;
      if (i < pathSegments) {
        const current = i * 2;
        pathIndices.push(current, current + 1, current + 2, current + 1, current + 3, current + 2);
      }
    }
    const pathGeometry = new THREE.BufferGeometry();
    pathGeometry.setAttribute('position', new THREE.BufferAttribute(pathPositions, 3));
    pathGeometry.setIndex(pathIndices);
    pathGeometry.computeVertexNormals();
    const pathMesh = new THREE.Mesh(
      pathGeometry,
      new THREE.MeshStandardMaterial({ color: 0x8b613e, map: soilTexture, roughness: 1 }),
    );
    pathMesh.receiveShadow = true;
    scene.add(pathMesh);

    // ============================================================
    // 6. FOREST — varied trees, underbrush, and fallen logs
    // ============================================================
    const forest = new THREE.Group();

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x805634, map: barkTexture, bumpMap: barkTexture, bumpScale: 0.12, roughness: 0.96 });
    const trunkMatPale = new THREE.MeshStandardMaterial({ color: 0xa07a52, map: barkTexture, bumpMap: barkTexture, bumpScale: 0.1, roughness: 0.92 });
    const foliagePalette = [0x438d4d, 0x34783f, 0x58a65a, 0x3f8c4b, 0x70ad5e];
    const autumnPalette = [0xe6a044, 0xf0bd52, 0xc9792e];

    function buildTree(kind: 'evergreen' | 'autumn' | 'bare') {
      const tree = new THREE.Group();
      const height = 3.4 + Math.random() * 2.4;
      const trunkMaterial = Math.random() > 0.75 ? trunkMatPale : trunkMat;

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 + Math.random() * 0.05, 0.32 + Math.random() * 0.14, height, 7),
        trunkMaterial,
      );
      trunk.position.y = height / 2;
      trunk.rotation.y = Math.random() * Math.PI;
      trunk.castShadow = true;
      tree.add(trunk);

      // Root flare for a grounded, "planted" feel.
      const flare = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), trunkMaterial);
      flare.position.y = 0.2;
      flare.scale.set(0.5, 0.22, 0.5);
      tree.add(flare);

      if (kind === 'bare') {
        // A handful of leafless trees add realism and a quiet "before" note
        // in the restoration story — most of the forest around them thrives.
        for (let b = 0; b < 5; b++) {
          const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 1.1 + Math.random(), 5), trunkMaterial);
          branch.position.set((Math.random() - 0.5) * 0.6, height * (0.6 + Math.random() * 0.3), (Math.random() - 0.5) * 0.6);
          branch.rotation.set(Math.random() * 1.2 - 0.6, Math.random() * Math.PI, Math.random() * 1.2 - 0.6);
          branch.castShadow = true;
          tree.add(branch);
        }
        return { tree, height };
      }

      const palette = kind === 'autumn' ? autumnPalette : foliagePalette;
      const foliageColor = palette[Math.floor(Math.random() * palette.length)];
      const foliageMat = new THREE.MeshStandardMaterial({ color: foliageColor, map: leafTexture, roughness: 0.9, metalness: 0 });

      const crownCount = kind === 'evergreen' ? 4 : 3;
      for (let f = 0; f < crownCount; f++) {
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(1, 20, 14),
          foliageMat.clone(),
        );
        const phase = f / crownCount;
        const crownScale = kind === 'evergreen' ? 1.15 - f * 0.13 : 1.2 - f * 0.08;
        crown.position.set(
          Math.cos(phase * Math.PI * 2) * 0.32,
          height * (0.62 + f * 0.13),
          Math.sin(phase * Math.PI * 2) * 0.32,
        );
        crown.scale.set(crownScale, kind === 'evergreen' ? 0.82 : 0.9, crownScale);
        crown.castShadow = true;
        tree.add(crown);
      }
      return { tree, height };
    }

    function scatterAlongPath(count: number, minSpread: number, maxSpreadExtra: number, place: (pos: THREE.Vector3, side: number, t: number) => void) {
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const pt = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const side = i % 2 === 0 ? 1 : -1;
        const spread = minSpread + Math.random() * maxSpreadExtra + (t > 0.95 ? 6 : 0);
        const pos = new THREE.Vector3(
          pt.x + right.x * spread * side + (Math.random() - 0.5) * 2,
          0,
          pt.z + right.z * spread * side + (Math.random() - 0.5) * 2,
        );
        pos.y = terrainHeight(pos.x, pos.z);
        place(pos, side, t);
      }
    }

    const treePositions: THREE.Vector3[] = [];
    scatterAlongPath(230, 5.2, 9.5, (pos) => {
      const hasNearbyTree = treePositions.some((existing) => existing.distanceTo(pos) < 3.2);
      if (hasNearbyTree) return;
      const roll = Math.random();
      const kind: 'evergreen' | 'autumn' | 'bare' = roll < 0.08 ? 'bare' : roll < 0.22 ? 'autumn' : 'evergreen';
      const { tree } = buildTree(kind);
      const scale = 0.65 + Math.random() * 0.85;
      tree.position.copy(pos);
      tree.scale.setScalar(scale);
      tree.rotation.y = Math.random() * Math.PI;
      tree.userData.baseY = pos.y;
      tree.userData.swayPhase = Math.random() * Math.PI * 2;
      tree.userData.swayAmount = 0.01 + Math.random() * 0.015;
      treePositions.push(pos.clone());
      forest.add(tree);
    });
    scene.add(forest);

    // Underbrush — low rounded bushes, instanced for performance.
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3f7136, map: leafTexture, roughness: 0.95 });
    const bushes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.35, 16, 10), bushMat, 110);
    const dummy = new THREE.Object3D();
    const bushPositions: THREE.Vector3[] = [];
    let bushI = 0;
    scatterAlongPath(80, 3.0, 6.0, (pos) => {
      const nearTree = treePositions.some((treePosition) => treePosition.distanceTo(pos) < 1.6);
      const nearBush = bushPositions.some((bushPosition) => bushPosition.distanceTo(pos) < 1.1);
      if (nearTree || nearBush || bushI >= bushes.count) return;
      dummy.position.set(pos.x, pos.y + 0.25, pos.z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      const s = 0.7 + Math.random() * 0.9;
      dummy.scale.set(s, s * 0.7, s);
      dummy.updateMatrix();
      bushes.setMatrixAt(bushI++, dummy.matrix);
      bushPositions.push(pos.clone());
    });
    bushes.castShadow = true;
    scene.add(bushes);

    // Wildlife and water add quiet life to the restored forest without using floating effects.
    // Wildlife uses locally bundled GLB models with embedded textures and animation clips.
    const wildlife = new THREE.Group();
    const loader = new GLTFLoader();
    const idleModels: { object: THREE.Object3D; baseScale: number; phase: number; grounded: boolean }[] = [];
    const horseFootOffset = -0.75;
    const trailPosition = (fraction: number, side: number, offset: number, height: number) => {
      const point = curve.getPointAt(fraction);
      const tangent = curve.getTangentAt(fraction);
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const x = point.x + right.x * offset * side;
      const z = point.z + right.z * offset * side;
      return new THREE.Vector3(x, height === 0 ? terrainHeight(x, z) : height, z);
    };
    const wildlifeModels = [
      { url: '/models/Horse.glb', position: trailPosition(0.18, 1, 2.4, 0), scale: 0.018 },
      { url: '/models/Horse.glb', position: trailPosition(0.62, -1, 2.4, 0), scale: 0.014 },
      { url: '/models/Parrot.glb', position: trailPosition(0.26, -1, 0, 8), scale: 0.012 },
      { url: '/models/Flamingo.glb', position: trailPosition(0.5, 1, 0, 8.5), scale: 0.012 },
      { url: '/models/Stork.glb', position: trailPosition(0.78, -1, 0, 9), scale: 0.012 },
    ];

    wildlifeModels.forEach(({ url, position, scale }, index) => {
      loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.position.copy(position);
        model.scale.setScalar(scale);
        model.traverse((part) => {
          const mesh = part as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        });
        idleModels.push({ object: model, baseScale: scale, phase: index * 0.9, grounded: url.includes('Horse') });
        if (gltf.animations.length > 0) {
          const poseMixer = new THREE.AnimationMixer(model);
          const poseAction = poseMixer.clipAction(gltf.animations[0]);
          poseAction.play();
          poseMixer.update(url.includes('Horse') ? 0.8 : 0.35);
          poseAction.paused = true;
        }
        wildlife.add(model);
      });
    });
    scene.add(wildlife);

    // Fallen logs — decay feeding new growth, a quiet nod to the carbon cycle.
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5b3b24, map: barkTexture, bumpMap: barkTexture, bumpScale: 0.14, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const t = 0.08 + Math.random() * 0.85;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const side = Math.random() > 0.5 ? 1 : -1;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.2 + Math.random() * 2.2, 10), logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = Math.random() * 0.6;
      const logX = pt.x + right.x * 3 * side;
      const logZ = pt.z + right.z * 3 * side;
      log.position.set(logX, terrainHeight(logX, logZ) + 0.24, logZ);
      log.castShadow = true;
      log.receiveShadow = true;
      scene.add(log);
    }

    // ============================================================
    // 7. SCROLL-DRIVEN CAMERA + MAIN LOOP
    // ============================================================
    let mouseX = 0;
    let mouseY = 0;
    let targetScroll = 0;
    let currentScrollProgress = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);

    let frame = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = Math.min((time - lastTime) * 0.001, 0.05);
      lastTime = time;
      const t = time * 0.001;

      // Scroll easing
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      targetScroll = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
      currentScrollProgress += (targetScroll - currentScrollProgress) * 0.06;
      const safeScroll = Math.min(currentScrollProgress, 0.99);

      // Camera tracking with a gentle handheld drift + lean into turns
      const camPos = curve.getPointAt(safeScroll);
      const lookPos = curve.getPointAt(Math.min(safeScroll + 0.04, 1));
      const tangent = curve.getTangentAt(safeScroll);
      const parallaxX = mouseX * 0.35;
      const parallaxY = mouseY * 0.18;
      const bob = Math.sin(t * 0.6) * 0.05;

      camera.position.set(camPos.x + parallaxX, 1.25 + parallaxY + bob, camPos.z);
      camera.lookAt(lookPos.x, lookPos.y, lookPos.z);
      camera.rotation.z = -tangent.x * 0.14;
      camera.fov = baseFov + Math.sin(t * 0.18) * 0.8;
      camera.updateProjectionMatrix();

      // Forest sway
      forest.children.forEach((tree) => {
        const ud = tree.userData;
        tree.rotation.z = Math.sin(t * 0.7 + ud.swayPhase) * ud.swayAmount;
        tree.rotation.x = Math.cos(t * 0.52 + ud.swayPhase) * ud.swayAmount * 0.35;
      });

      idleModels.forEach((idle) => {
        if (!idle.grounded) {
          const breathe = 1 + Math.sin(t * 0.9 + idle.phase) * 0.012;
          idle.object.scale.setScalar(idle.baseScale * breathe);
        }
        idle.object.lookAt(camera.position.x, idle.object.position.y, camera.position.z);
        if (idle.grounded) {
          idle.object.position.y = terrainHeight(idle.object.position.x, idle.object.position.z) + horseFootOffset;
        } else {
          idle.object.rotateZ(Math.sin(t * 0.45 + idle.phase) * 0.008);
        }
      });
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    // ============================================================
    // 9. CLEANUP
    // ============================================================
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if ((mesh as any).geometry) (mesh as any).geometry.dispose?.();
        const mat = (mesh as any).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
          else mat.dispose?.();
        }
      });
      sceneTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="forest-world-canvas" aria-hidden="true" />;
}