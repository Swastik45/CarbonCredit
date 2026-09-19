'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ForestWorld() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- 1. SCENE & RENDERER ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a3a2b, 0.018); // Slightly denser for depth

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 150);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // --- 2. ADVANCED CINEMATIC SPLINE ---
    // A longer, more winding path to accommodate the pacing of your sections
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.1, 8),       // Start
      new THREE.Vector3(5, 1.1, -12),     // Token 1 (Land)
      new THREE.Vector3(-6, 1.1, -35),    // Token 2 (Verification)
      new THREE.Vector3(4, 1.1, -60),     // Token 3 (Exchange)
      new THREE.Vector3(-2, 1.1, -75),    // Final approach
      new THREE.Vector3(0, 1.1, -90),     // The Clearing
    ]);

    // --- 3. LIGHTING ---
    const ambientLight = new THREE.HemisphereLight(0xd9ffd6, 0x1f3c24, 1.8);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffea00, 4.0);
    sun.position.set(-20, 30, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // --- 4. GROUND & TRAIL ---
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 220),
      new THREE.MeshStandardMaterial({ color: 0x2b4c30, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, -45);
    ground.receiveShadow = true;
    scene.add(ground);

    const pathGeometry = new THREE.TubeGeometry(curve, 150, 1.8, 8, false);
    const pathMesh = new THREE.Mesh(
      pathGeometry,
      new THREE.MeshStandardMaterial({ color: 0x4a3a25, roughness: 1 })
    );
    pathMesh.position.y = -1.08; 
    pathMesh.scale.set(1, 0.02, 1); 
    pathMesh.receiveShadow = true;
    scene.add(pathMesh);

    // --- 5. THEMATIC TOKENS (Synced to your page.tsx copy) ---
    const waypoints = new THREE.Group();
    const markers: { mesh: THREE.Object3D; pivot: THREE.Group }[] = [];
    const markerFractions = [0.20, 0.45, 0.72]; // Spaced for the 3 sections

    // Token 1: "The Ground Layer" (Land) -> Amber, Rooted, Solid
    const token1Pivot = new THREE.Group();
    const token1 = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.35, 0.1, 64, 12),
      new THREE.MeshPhysicalMaterial({ color: 0xffaa00, emissive: 0x663300, roughness: 0.2, metalness: 0.8 })
    );
    token1.castShadow = true;
    token1Pivot.add(token1);
    const light1 = new THREE.PointLight(0xffaa00, 2, 6);
    token1Pivot.add(light1);
    waypoints.add(token1Pivot);
    markers.push({ mesh: token1, pivot: token1Pivot });

    // Token 2: "A Living Signal" (Verification) -> Emerald, Biological, Growing
    const token2Pivot = new THREE.Group();
    const token2 = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4, 0),
      new THREE.MeshPhysicalMaterial({ color: 0x00ffaa, emissive: 0x004422, roughness: 0.1, transmission: 0.9 })
    );
    const token2Wire = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa, wireframe: true })
    );
    token2.add(token2Wire);
    token2.castShadow = true;
    token2Pivot.add(token2);
    const light2 = new THREE.PointLight(0x00ffaa, 2, 6);
    token2Pivot.add(light2);
    waypoints.add(token2Pivot);
    markers.push({ mesh: token2, pivot: token2Pivot });

    // Token 3: "The Clear Trail" (Exchange) -> Cyan, Connected Rings
    const token3Pivot = new THREE.Group();
    const token3 = new THREE.Group();
    const ringMat = new THREE.MeshPhysicalMaterial({ color: 0x00ccff, emissive: 0x003366, roughness: 0.1, metalness: 0.9 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 16, 32), ringMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 16, 32), ringMat);
    ring2.rotation.x = Math.PI / 2;
    token3.add(ring1, ring2);
    token3Pivot.add(token3);
    const light3 = new THREE.PointLight(0x00ccff, 2, 6);
    token3Pivot.add(light3);
    waypoints.add(token3Pivot);
    markers.push({ mesh: token3, pivot: token3Pivot });

    // Place tokens on the curve
    markerFractions.forEach((fraction, i) => {
      const pt = curve.getPointAt(fraction);
      const side = i % 2 === 0 ? 1.8 : -1.8; // Alternate left/right of path
      markers[i].pivot.position.set(pt.x + side, 1.5, pt.z);
    });
    scene.add(waypoints);

    // --- 6. DESTINATION CLEARING (The Exchange) ---
    const endPt = curve.getPointAt(1.0);
    const clearing = new THREE.Mesh(
      new THREE.CircleGeometry(10, 48),
      new THREE.MeshStandardMaterial({ color: 0x3e6b45, roughness: 0.9 }),
    );
    clearing.rotation.x = -Math.PI / 2;
    clearing.position.set(endPt.x, 0.01, endPt.z);
    scene.add(clearing);

    const portalGroup = new THREE.Group();
    portalGroup.position.set(endPt.x, 1.2, endPt.z);
    
    // Outer rotating ring
    const destRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.8, 0.05, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0xffa142, emissive: 0xff5e24, emissiveIntensity: 2 })
    );
    destRing1.rotation.x = Math.PI / 2;
    
    // Inner counter-rotating ring
    const destRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.03, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffaa00, emissiveIntensity: 4 })
    );
    destRing2.rotation.x = Math.PI / 2;

    const coreLight = new THREE.PointLight(0xffa142, 3, 15);
    
    portalGroup.add(destRing1, destRing2, coreLight);
    scene.add(portalGroup);

    // --- 7. DENSE JUNGLE ---
    const forest = new THREE.Group();
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 });
    const crownMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x2d8a45, roughness: 0.75 }),
      new THREE.MeshStandardMaterial({ color: 0x1b592f, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x0f3d1f, roughness: 0.85 })
    ];

    for (let index = 0; index < 150; index++) {
      const t = index / 150;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      const side = index % 2 === 0 ? 1 : -1;
      const spread = 3.5 + Math.random() * 5 + (t > 0.95 ? 6 : 0); // Widen at the clearing
      
      const tree = new THREE.Group();
      const scale = 0.7 + Math.random() * 0.7;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 4, 7), trunkMaterial);
      trunk.position.y = 2;
      trunk.castShadow = true;
      tree.add(trunk);

      const materialChoice = crownMaterials[Math.floor(Math.random() * 3)];
      for (let f = 0; f < 3; f++) {
        const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 - f * 0.2, 1), materialChoice);
        foliage.position.set((f - 1) * 0.3, 3.2 + f * 0.8, (f % 2) * 0.2 - 0.1);
        foliage.scale.set(1.2, 0.9, 1.1);
        foliage.castShadow = true;
        tree.add(foliage);
      }

      tree.position.set(pt.x + (right.x * spread * side), 0, pt.z + (right.z * spread * side) + (Math.random() - 0.5));
      tree.scale.setScalar(scale);
      tree.rotation.y = Math.random() * Math.PI;
      forest.add(tree);
    }
    scene.add(forest);

    // --- 8. ADVANCED FALLING LEAVES (InstancedMesh) ---
    const leafCount = 300;
    const leafGeo = new THREE.ConeGeometry(0.06, 0.15, 3);
    const leafMat = new THREE.MeshBasicMaterial({ color: 0x66cc66, side: THREE.DoubleSide });
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
    
    const dummy = new THREE.Object3D();
    const leafData: { x: number; y: number; z: number; speed: number; rx: number; ry: number }[] = [];

    for (let i = 0; i < leafCount; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = Math.random() * 10 + 2;
      const z = (Math.random() - 0.5) * 100 - 45;
      leafData.push({
        x, y, z,
        speed: 0.01 + Math.random() * 0.02,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
      });
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    scene.add(leaves);

    // --- 9. INTERACTIVE & SCROLL ANIMATION ---
    let mouseX = 0;
    let mouseY = 0;
    let targetScroll = 0;
    let currentScrollProgress = 0;
    
    const onMouseMove = (e: MouseEvent) => {
      // Normalized mouse coordinates (-1 to +1) for 3D parallax
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    let frame = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) * 0.001;
      lastTime = time;

      // 1. Scroll Progress Easing
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      targetScroll = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
      currentScrollProgress += (targetScroll - currentScrollProgress) * 0.06;
      
      const safeScroll = Math.min(currentScrollProgress, 0.99);

      // 2. Cinematic Camera Tracking & "Drone Lean"
      const camPos = curve.getPointAt(safeScroll);
      const lookPos = curve.getPointAt(Math.min(safeScroll + 0.04, 1.0));
      const tangent = curve.getTangentAt(safeScroll);

      // Add mouse parallax offset to camera position
      const parallaxX = mouseX * 0.4;
      const parallaxY = mouseY * 0.2;
      const headBob = Math.sin(time * 0.006) * 0.03;

      camera.position.set(camPos.x + parallaxX, 1.2 + headBob + parallaxY, camPos.z);
      camera.lookAt(lookPos.x, lookPos.y, lookPos.z);

      // Bank/Lean camera into turns based on path tangent
      camera.rotation.z = -tangent.x * 0.15; 

      // 3. Animate Thematic Markers
      const t = time * 0.001;
      markers.forEach((m, i) => {
        m.mesh.rotation.x = t * (0.8 + i * 0.2);
        m.mesh.rotation.y = t * (1.2 + i * 0.1);
        m.pivot.position.y = 1.5 + Math.sin(t * 2 + i) * 0.15; // Hover
      });

      // 4. Animate Portal Destination
      destRing1.rotation.z = t * 0.5;
      destRing2.rotation.y = t * -0.8;
      destRing2.scale.setScalar(1 + Math.sin(t * 3) * 0.05);

      // 5. Falling Leaves Logic
      for (let i = 0; i < leafCount; i++) {
        const data = leafData[i];
        data.y -= data.speed;
        data.x += Math.sin(t + i) * 0.01; // sway
        data.rx += 0.02;
        data.ry += 0.02;

        if (data.y < 0) {
          data.y = 10 + Math.random() * 2; // reset to top
          data.x = camPos.x + (Math.random() - 0.5) * 40; // follow camera loosely
          data.z = camPos.z + (Math.random() - 0.5) * 40;
        }

        dummy.position.set(data.x, data.y, data.z);
        dummy.rotation.set(data.rx, data.ry, 0);
        dummy.updateMatrix();
        leaves.setMatrixAt(i, dummy.matrix);
      }
      leaves.instanceMatrix.needsUpdate = true;
      
      forest.rotation.y = Math.sin(t * 0.5) * 0.005; // Wind in trees

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="forest-world-canvas" aria-hidden="true" />;
}