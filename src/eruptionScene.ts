import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { advect, buildAshTracers, tracerState, type AshCounts, type AshTracer } from './ashSettling';
import { sampleTerrain, terrainProbe, terrainContours, type TerrainData } from './terrain';
import { applySurfaceUV, surroundingGeometry, type SurfaceImagery } from './worldSurface';
import type { ScenarioSettings, SimulationResult, Volcano } from './model';

export interface EruptionFrame {
  progress: number; settings: ScenarioSettings; result: SimulationResult;
  ash: boolean; flows: boolean; footprints: boolean; releaseHeightKm: number; settlingHours: number; deposits: boolean;
}
export const windVector = (direction: number) => ({ x: Math.sin(direction * Math.PI / 180), z: -Math.cos(direction * Math.PI / 180) });
export function terrainHeight(x: number, z: number, type: string) {
  const radius = Math.hypot(x, z), angle = Math.atan2(z, x);
  const shield = /shield|fissure/i.test(type), caldera = /caldera/i.test(type);
  const width = shield ? 5.4 : caldera ? 4.3 : 3.1;
  const height = shield ? 2.5 : caldera ? 3.1 : 4.7;
  const cone = height * Math.exp(-Math.pow(radius / width, 1.45));
  const crater = (caldera ? 2.2 : .95) * Math.exp(-Math.pow(radius / (caldera ? 1.45 : .52), 4));
  const ridges = Math.sin(angle * 9 + radius * .55) * .16 * Math.min(radius, 1) * Math.exp(-radius / 5);
  const foothills = .12 * Math.sin(x * 1.6) * Math.cos(z * 1.1) + .07 * Math.sin(x * 4 + z * 3);
  return Math.max(.07, cone - crater + ridges + foothills * Math.min(radius / 4, 1));
}
const random = (index: number) => { const n = Math.sin(index * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export function createEruptionScene(canvas: HTMLCanvasElement, volcano: Volcano, terrain: TerrainData | null = null, exaggeration = 1) {
  const unitsPerKm = terrain ? 25 / terrain.widthKm : 1;
  const heightAt = (x: number, z: number) => terrain ? ((sampleTerrain(terrain, x / unitsPerKm, -z / unitsPerKm) ?? terrain.min) - terrain.min) / 1000 * unitsPerKm * exaggeration + .07 : terrainHeight(x, z, volcano.type);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor('#c9d9df');
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#c9d9df', 24, 58);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 direction; void main(){direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec3 direction; void main(){float h=max(normalize(direction).y,0.0); vec3 horizon=vec3(0.788,0.851,0.875); vec3 zenith=vec3(0.29,0.52,0.71); gl_FragColor=vec4(mix(horizon,zenith,pow(h,0.55)),1.0);}',
  })); scene.add(sky);
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 42;
  controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI / 2.05;
  controls.enableDamping = false;
  const resetCamera = () => { const ventY = heightAt(0, 0); camera.position.set(9, ventY + 5.5, 14); controls.target.set(0, ventY * .7, 0); controls.update(); };
  resetCamera();
  scene.add(new THREE.HemisphereLight('#f7f3e7', '#536458', 1.5));
  const sun = new THREE.DirectionalLight('#fff0d4', 2.5); sun.position.set(-16, 12, -10); scene.add(sun);
  const groundGeometry = new THREE.PlaneGeometry(25, 25, terrain ? terrain.size - 1 : 128, terrain ? terrain.size - 1 : 128);
  groundGeometry.rotateX(-Math.PI / 2);
  const positions = groundGeometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  const elevationColors = ['#527b65', '#85957b', '#b3ac8a', '#8c8479', '#dedbd0'].map(value => new THREE.Color(value));
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), height = heightAt(x, z);
    positions.setY(i, height);
    const tint = terrain ? (sampleTerrain(terrain, x / unitsPerKm, -z / unitsPerKm)! - terrain.min) / Math.max(1, terrain.max - terrain.min) * 3 : height;
    if (terrain) {
      const position = THREE.MathUtils.clamp(tint / 3, 0, 1) * (elevationColors.length - 1);
      const index = Math.min(elevationColors.length - 2, Math.floor(position));
      color.copy(elevationColors[index]).lerp(elevationColors[index + 1], position - index);
    } else color.set(tint > 2.25 ? '#66645c' : tint > .7 ? '#727b66' : '#85957b');
    if (!terrain) color.multiplyScalar(.84 + random(i) * .25);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  groundGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); groundGeometry.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(groundGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .97 })); scene.add(terrainMesh);
  const contourInterval = terrain ? Math.max(100, Math.ceil((terrain.max - terrain.min) / 1200) * 100) : 100;
  const contours = new THREE.Group(); contours.visible = false; scene.add(contours);
  if (terrain) {
    const vertices = terrainContours(terrain, contourInterval);
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] *= unitsPerKm;
      vertices[i + 1] = (vertices[i + 1] - terrain.min) / 1000 * unitsPerKm * exaggeration + .085;
      vertices[i + 2] *= unitsPerKm;
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    contours.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#293d35', transparent: true, opacity: .38, depthWrite: false })));
  }
  let surroundings: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null;
  let surfaceTexture: THREE.Texture | null = null;
  let contextData: TerrainData | null = null;
  const groundMaterial = terrainMesh.material;
  function setWorldSurface(context: TerrainData | null, imagery: SurfaceImagery | null, satellite: boolean) {
    contextData = context;
    if (surroundings) { scene.remove(surroundings); surroundings.geometry.dispose(); surroundings.material.dispose(); surroundings = null; }
    surfaceTexture?.dispose(); surfaceTexture = null;
    if (terrain && context) {
      const geometry = surroundingGeometry(terrain, context, exaggeration);
      const vertices = geometry.getAttribute('position'), tints = new Float32Array(vertices.count * 3);
      for (let i = 0; i < vertices.count; i++) {
        const elevation = (vertices.getY(i) - .07) / unitsPerKm / exaggeration * 1000 + terrain.min;
        const level = THREE.MathUtils.clamp((elevation - terrain.min) / Math.max(1, terrain.max - terrain.min), 0, 1) * (elevationColors.length - 1);
        const index = Math.min(elevationColors.length - 2, Math.floor(level));
        color.copy(elevationColors[index]).lerp(elevationColors[index + 1], level - index);
        tints.set([color.r, color.g, color.b], i * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(tints, 3));
      surroundings = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
      scene.add(surroundings);
    }
    groundMaterial.map = null; groundMaterial.vertexColors = true;
    if (terrain && imagery && satellite) {
      surfaceTexture = new THREE.Texture(imagery.bitmap); surfaceTexture.colorSpace = THREE.SRGBColorSpace;
      surfaceTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); surfaceTexture.needsUpdate = true;
      applySurfaceUV(groundGeometry, terrain.center, unitsPerKm, imagery);
      groundMaterial.map = surfaceTexture; groundMaterial.vertexColors = false;
      if (surroundings) {
        applySurfaceUV(surroundings.geometry, terrain.center, unitsPerKm, imagery);
        surroundings.material.vertexColors = false; surroundings.material.map = surfaceTexture;
      }
    }
    groundMaterial.needsUpdate = true;
  }
  const ventHeight = heightAt(0, 0);
  const vent = new THREE.Mesh(new THREE.CircleGeometry(terrain ? .1 : /caldera/i.test(volcano.type) ? .65 : .28, 40), new THREE.MeshBasicMaterial({ color: '#ff863b', side: THREE.DoubleSide }));
  vent.rotation.x = -Math.PI / 2; vent.position.y = ventHeight + .08; scene.add(vent);
  const glow = new THREE.PointLight('#ff6327', 8, 7, 2); glow.position.set(0, ventHeight + .5, 0); scene.add(glow);

  const smokeMaterial = new THREE.MeshStandardMaterial({ color: '#77776f', roughness: 1, transparent: true, opacity: .62, depthWrite: false });
  const smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), smokeMaterial, 155);
  smoke.frustumCulled = false; scene.add(smoke);
  const flowCloud = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#8d8574', transparent: true, opacity: .65, depthWrite: false, roughness: 1 }), 70);
  flowCloud.frustumCulled = false; scene.add(flowCloud);
  const particlePositions = new Float32Array(420 * 3);
  const particlesGeometry = new THREE.BufferGeometry(); particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({ color: '#b86737', size: .055, transparent: true, opacity: .65 })); particles.frustumCulled = false; scene.add(particles);
  const lava = new THREE.Group(); scene.add(lava);
  for (let arm = 0; arm < 4; arm++) {
    const points = Array.from({ length: 60 }, (_, i) => { const radius = .32 + i / 59 * 5.8; const angle = arm * 1.57 + .45 + Math.sin(radius * 1.2) * .1; const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius; return new THREE.Vector3(x, heightAt(x, z) + .07, z); });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, .065, 5, false), new THREE.MeshStandardMaterial({ color: '#ff7333', emissive: '#ff4917', emissiveIntensity: 1.7, roughness: .6 }));
    lava.add(tube);
  }
  const footprintGroup = new THREE.Group(); scene.add(footprintGroup);
  const makeLine = (color: string) => { const line = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .85, depthTest: false })); line.renderOrder = 3; footprintGroup.add(line); return line; };
  const ashLine = makeLine('#a17b38'), pdcLine = makeLine('#bd5137'), laharLine = makeLine('#487d9a');
  const compass = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-10, heightAt(-10, -7) + .3, -7), 3, '#294e3e', .55, .35); scene.add(compass);
  const wind = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 11, 0), 4, '#566a61', .5, .3); scene.add(wind);
  const ashPositions = new Float32Array(1000 * 3), settledPositions = new Float32Array(1000 * 3);
  const fallingGeometry = new THREE.BufferGeometry(), settledGeometry = new THREE.BufferGeometry();
  fallingGeometry.setAttribute('position', new THREE.BufferAttribute(ashPositions, 3)); settledGeometry.setAttribute('position', new THREE.BufferAttribute(settledPositions, 3));
  const fallingAsh = new THREE.Points(fallingGeometry, new THREE.PointsMaterial({ color: '#675447', size: 2.6, sizeAttenuation: false, transparent: true, opacity: .8 }));
  const settledAsh = new THREE.Points(settledGeometry, new THREE.PointsMaterial({ color: '#e5d8c0', size: 3.6, sizeAttenuation: false, depthTest: true }));
  fallingAsh.frustumCulled = false; settledAsh.frustumCulled = false; scene.add(fallingAsh, settledAsh);
  let tracers: AshTracer[] = [], ashKey = '';
  const dummy = new THREE.Object3D();
  let lastFootprints = '';
  function update(frame: EruptionFrame) {
    const { progress, settings, result } = frame;
    const elapsedSeconds = progress * (settings.duration + (terrain ? frame.settlingHours : 0)) * 3600;
    const eruptionSeconds = settings.duration * 3600;
    const active = progress > 0 && elapsedSeconds <= eruptionSeconds, strength = settings.vei / 8;
    const growth = Math.min(1, progress * 5), drift = windVector(settings.direction);
    const rise = terrain ? frame.releaseHeightKm * unitsPerKm * exaggeration : 2.4 + strength * 6, spread = terrain ? settings.wind / 3600 * (frame.releaseHeightKm * 1000 / 20) * unitsPerKm : settings.wind / 120 * 7;
    const plumeFade = terrain ? Math.max(0, 1 - Math.max(0, elapsedSeconds - eruptionSeconds) / 600) : 1;
    smokeMaterial.opacity = .62 * plumeFade;
    smoke.visible = frame.ash && progress > 0 && plumeFade > 0; particles.visible = !terrain && frame.ash && active;
    wind.position.y = ventHeight + rise + .5;
    wind.setDirection(new THREE.Vector3(drift.x, 0, drift.z)); wind.setLength(1.2 + settings.wind / 35, .5, .3); wind.visible = settings.wind > 0;
    for (let i = 0; i < 155; i++) {
      const age = (random(i + 5) + progress * 2.7) % 1;
      const height = age * rise * growth;
      const billow = (.18 + age * (1.2 + strength)) * growth;
      const angle = random(i + 180) * Math.PI * 2;
      const width = Math.pow(age, 2) * (1.6 + strength * 2);
      dummy.position.set(drift.x * spread * age ** 2 * growth + Math.cos(angle) * width * random(i + 7), ventHeight + height, drift.z * spread * age ** 2 * growth + Math.sin(angle) * width * random(i + 7));
      dummy.scale.set(billow * (1 + random(i + 9) * .4), billow * .8, billow); dummy.rotation.set(age, angle, 0); dummy.updateMatrix(); smoke.setMatrixAt(i, dummy.matrix);
    }
    smoke.instanceMatrix.needsUpdate = true;
    const counts: AshCounts = { airborne: 0, deposited: 0, outside: 0, pending: 0 };
    fallingAsh.visible = !!terrain && frame.ash; settledAsh.visible = !!terrain && frame.deposits;
    if (terrain) {
      const options = { windKmh: settings.wind, direction: settings.direction, releaseHeightKm: frame.releaseHeightKm };
      const key = `${options.windKmh}/${options.direction}/${options.releaseHeightKm}`;
      if (key !== ashKey) { tracers = buildAshTracers(terrain, options); ashKey = key; }
      for (const tracer of tracers) {
        const status = tracerState(tracer, elapsedSeconds, eruptionSeconds);
        if (status === 'pending' || status === 'outside') { counts[status]++; continue; }
        const index = status === 'deposited' ? counts.deposited++ : counts.airborne++;
        const point = status === 'deposited' ? tracer.end : advect(tracer.origin, elapsedSeconds - tracer.birthFraction * eruptionSeconds, tracer.fallSpeed, options);
        const target = status === 'deposited' ? settledPositions : ashPositions;
        target[index * 3] = point.eastKm * unitsPerKm;
        target[index * 3 + 1] = (point.elevationM - terrain.min) / 1000 * unitsPerKm * exaggeration + (status === 'deposited' ? .1 : .07);
        target[index * 3 + 2] = -point.northKm * unitsPerKm;
      }
      fallingGeometry.setDrawRange(0, counts.airborne); settledGeometry.setDrawRange(0, counts.deposited);
      fallingGeometry.getAttribute('position').needsUpdate = true; settledGeometry.getAttribute('position').needsUpdate = true;
    }
    for (let i = 0; i < 420; i++) {
      const age = (random(i + 600) + progress * 1.6) % 1;
      const angle = random(i + 800) * Math.PI * 2;
      particlePositions[i * 3] = drift.x * age * spread * 1.6 + Math.cos(angle) * age * 2.3;
      particlePositions[i * 3 + 1] = Math.max(.3, ventHeight + Math.sin(age * Math.PI) * rise * growth - age * 3);
      particlePositions[i * 3 + 2] = drift.z * age * spread * 1.6 + Math.sin(angle) * age * 2.3;
    }
    particlesGeometry.getAttribute('position').needsUpdate = true;
    flowCloud.visible = !terrain && frame.flows && result.pdc > 0 && progress > .12;
    for (let i = 0; i < 70; i++) {
      const age = (random(i + 1000) + progress * 1.5) % 1;
      const radius = .9 + age * (2.8 + strength * 3) * growth;
      const angle = Math.floor(i / 14) * Math.PI * .4 + .25 + random(i + 12) * .25;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      dummy.position.set(x, heightAt(x, z) + .1 + age * .25, z);
      dummy.scale.setScalar(.12 + age * .45); dummy.updateMatrix(); flowCloud.setMatrixAt(i, dummy.matrix);
    }
    flowCloud.instanceMatrix.needsUpdate = true;
    lava.visible = !terrain && frame.flows && active && result.preset === 'Effusive';
    lava.children.forEach(child => { const mesh = child as THREE.Mesh; mesh.geometry.setDrawRange(0, Math.floor(Math.min(1, progress * 1.5) * 80) * 5 * 6); });
    vent.visible = active; glow.intensity = active ? 4 + strength * 9 + Math.sin(progress * 90) : 0;
    footprintGroup.visible = frame.footprints;
    const footprintKey = `${result.ash}/${result.pdc}/${result.lahar}/${settings.direction}`;
    if (lastFootprints !== footprintKey) {
      const scale = terrain ? unitsPerKm : 10 / Math.max(result.ash, result.pdc, result.lahar, 1);
      [ashLine, pdcLine, laharLine].forEach((line, index) => {
        const points = Array.from({ length: 720 }, (_, i) => {
          const a = i / 720 * Math.PI * 2;
          const along = index === 0 ? result.ash * (.5 + .5 * Math.cos(a)) : [0, result.pdc, result.lahar][index] * Math.cos(a);
          const across = index === 0 ? result.ash * .22 * Math.sin(a) : [0, result.pdc, result.lahar][index] * Math.sin(a);
          const x = (drift.x * along - drift.z * across) * scale, z = (drift.z * along + drift.x * across) * scale;
          return new THREE.Vector3(x, heightAt(x, z) + .04, z);
        });
        // Clip segments at the measured patch boundary; never shrink distances to fit.
        const segments: THREE.Vector3[] = [];
        for (let i = 0; i < points.length; i++) {
          const a = points[i], b = points[(i + 1) % points.length];
          if ([a, b].every(p => Math.abs(p.x) <= 12.5 && Math.abs(p.z) <= 12.5)) segments.push(a, b);
        }
        line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(segments);
        line.visible = index !== 1 || result.pdc > 0;
      });
      lastFootprints = footprintKey;
    }
    return counts;
  }
  function resize(width: number, height: number) { renderer.setSize(width, height, false); camera.aspect = width / height; camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(24)) * Math.max(1, 1.15 / camera.aspect))); camera.updateProjectionMatrix(); }
  function zoom(factor: number) { const offset = camera.position.clone().sub(controls.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, 6, 42)); camera.position.copy(controls.target).add(offset); controls.update(); }
  function orbit(delta: number) { const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta); camera.position.copy(controls.target).add(offset); controls.update(); }
  function topView() { camera.position.set(.01, 28, .01); controls.target.set(0, 0, 0); controls.update(); }
  const raycaster = new THREE.Raycaster();
  const marker = new THREE.Mesh(new THREE.SphereGeometry(.11, 12, 8), new THREE.MeshBasicMaterial({ color: '#293d35', depthTest: false })); marker.visible = false; marker.renderOrder = 5; scene.add(marker);
  function inspect(clientX: number, clientY: number) {
    if (!terrain) return null;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = raycaster.intersectObject(terrainMesh)[0];
    if (!hit) return null;
    marker.position.copy(hit.point).add(new THREE.Vector3(0, .15, 0)); marker.visible = true;
    return terrainProbe(terrain, hit.point.x / unitsPerKm, -hit.point.z / unitsPerKm);
  }
  function inspectVent() { marker.position.set(0, heightAt(0, 0) + .15, 0); marker.visible = !!terrain; return terrain ? terrainProbe(terrain, 0, 0) : null; }
  return { setWorldSurface, setContours: (visible: boolean) => { contours.visible = visible; }, contourInterval, inspectVent, inspect, update, resize, resetCamera, zoom, orbit, topView, controls, render: () => {
    if (terrain) {
      const east = camera.position.x / unitsPerKm, north = -camera.position.z / unitsPerKm;
      const elevation = sampleTerrain(terrain, east, north) ?? (contextData ? sampleTerrain(contextData, east, north) : null);
      if (elevation !== null) {
        const clearance = (elevation - terrain.min) / 1000 * unitsPerKm * exaggeration + .6;
        if (camera.position.y < clearance) { camera.position.y = clearance; controls.update(); }
      }
    }
    renderer.render(scene, camera);
  }, dispose: () => {
    controls.dispose(); surfaceTexture?.dispose();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material)); });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); renderer.dispose();
  } };
}
