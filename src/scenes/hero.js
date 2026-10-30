import * as THREE from 'three';
import { simplex3 } from './noise.glsl.js';

const blobVertex = /* glsl */ `
  uniform float uTime;
  uniform float uDistort;
  uniform float uFreq;
  uniform vec2 uMouse;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying float vNoise;
  varying vec3 vObj;

  ${simplex3}

  float field(vec3 p){
    float t = uTime;
    float n = snoise(p * uFreq + vec3(0.0, t * 0.22, t * 0.12));
    n += 0.18 * snoise(p * uFreq * 2.1 - vec3(t * 0.16, 0.0, t * 0.1));
    // pointer pushes a soft bulge toward the cursor
    vec3 dir = normalize(vec3(uMouse * 1.2, 0.7));
    float bulge = smoothstep(0.35, 1.0, dot(normalize(p), dir)) * length(uMouse) * 0.55;
    return n * uDistort + bulge;
  }

  vec3 displace(vec3 p){
    return p + normalize(p) * field(p);
  }

  void main(){
    vec3 p = position;
    vec3 n = normalize(p);
    vec3 tangent = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 bitangent = normalize(cross(n, tangent));
    float e = 0.01;
    vec3 d0 = displace(p);
    vec3 d1 = displace(p + tangent * e);
    vec3 d2 = displace(p + bitangent * e);
    vec3 dn = normalize(cross(d1 - d0, d2 - d0));

    vNoise = field(p) / max(uDistort, 0.001);
    vObj = d0;
    vec4 mv = modelViewMatrix * vec4(d0, 1.0);
    vViewPos = mv.xyz;
    vNormalV = normalize(normalMatrix * dn);
    gl_Position = projectionMatrix * mv;
  }
`;

const blobFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying float vNoise;
  varying vec3 vObj;

  vec3 pal(float t){
    // purple -> lavender -> peach -> orange cosine-ish palette in brand hues
    vec3 a = vec3(0.62, 0.48, 0.80);
    vec3 b = vec3(0.32, 0.28, 0.22);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.05, 0.25, 0.55);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main(){
    vec3 n = normalize(vNormalV);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(-vViewPos);
    vec3 L = normalize(vec3(-0.5, 0.8, 0.7));
    vec3 L2 = normalize(vec3(0.8, -0.4, 0.4));

    float diff = max(dot(n, L), 0.0);
    float diff2 = max(dot(n, L2), 0.0);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.2);
    float spec = pow(max(dot(reflect(-L, n), v), 0.0), 28.0);

    vec3 deep = vec3(0.17, 0.08, 0.38);
    vec3 purple = vec3(0.384, 0.231, 0.698);
    vec3 lav = vec3(0.80, 0.73, 0.98);
    vec3 orange = vec3(0.953, 0.663, 0.231);

    float t = clamp(vNoise * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(deep, purple, smoothstep(0.0, 0.9, diff));
    col = mix(col, lav, smoothstep(0.55, 1.0, diff) * 0.55);
    // warm band flowing across the surface
    float warm = smoothstep(0.55, 0.9, t) * smoothstep(-0.2, 0.6, n.x * 0.6 + n.y * 0.5);
    col = mix(col, orange, warm * 0.85);
    col += orange * diff2 * 0.35;
    // iridescent rim
    col += pal(fres * 0.8 + t * 0.3 + uTime * 0.03) * fres * 0.75;
    col += vec3(1.0) * spec * 0.45;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const pointsVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aSeed;
  varying float vSeed;
  void main(){
    vec3 p = position;
    p.y += sin(uTime * 0.4 + aSeed * 6.28) * 0.12;
    p.x += cos(uTime * 0.3 + aSeed * 3.14) * 0.08;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aScale * uPixelRatio * (14.0 / -mv.z);
    vSeed = aSeed;
  }
`;

const pointsFragment = /* glsl */ `
  uniform float uTime;
  varying float vSeed;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 purple = vec3(0.384, 0.231, 0.698);
    vec3 orange = vec3(0.953, 0.663, 0.231);
    vec3 col = mix(purple, orange, step(0.78, vSeed));
    float twinkle = 0.55 + 0.45 * sin(uTime * 1.5 + vSeed * 40.0);
    gl_FragColor = vec4(col, a * twinkle * 0.7);
  }
`;

export function createHeroScene(canvas, anchorEl, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const isSmall = () => window.innerWidth < 900;

  const uniforms = {
    uTime: { value: 0 },
    uDistort: { value: 0.26 },
    uFreq: { value: 0.72 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  };
  const detail = isSmall() ? 48 : 80;
  const blob = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, detail),
    new THREE.ShaderMaterial({ vertexShader: blobVertex, fragmentShader: blobFragment, uniforms })
  );
  const group = new THREE.Group();
  group.add(blob);
  scene.add(group);

  // particle halo
  const COUNT = isSmall() ? 260 : 520;
  const pos = new Float32Array(COUNT * 3);
  const scale = new Float32Array(COUNT);
  const seed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const r = 1.6 + Math.random() * 2.2;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.8;
    pos[i * 3 + 2] = r * Math.cos(ph) * 0.6;
    scale[i] = 1 + Math.random() * 4;
    seed[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const pUniforms = { uTime: uniforms.uTime, uPixelRatio: { value: 1 } };
  const points = new THREE.Points(
    pGeo,
    new THREE.ShaderMaterial({
      vertexShader: pointsVertex,
      fragmentShader: pointsFragment,
      uniforms: pUniforms,
      transparent: true,
      depthWrite: false,
    })
  );
  group.add(points);

  const state = {
    mouse: new THREE.Vector2(),
    scroll: 0, // 0..1 as hero leaves the viewport
    intro: 0, // 0..1 driven by GSAP on load
    baseScale: 1,
    visible: true,
  };

  function layout() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio, isSmall() ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    pUniforms.uPixelRatio.value = dpr;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // place the blob behind the anchor element (the phone column)
    const cRect = canvas.getBoundingClientRect();
    const aRect = anchorEl.getBoundingClientRect();
    const cx = (aRect.left + aRect.width / 2 - cRect.left) / w;
    const cy = (aRect.top + aRect.height / 2 - cRect.top) / h;
    const worldH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const worldW = worldH * camera.aspect;
    group.position.x = (cx - 0.5) * worldW;
    group.position.y = -(cy - 0.5) * worldH;
    const targetPx = isSmall() ? Math.min(w * 0.95, 480) : Math.min(aRect.width * 1.35, 700);
    state.baseScale = ((targetPx / h) * worldH) / 2.4;
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!state.visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    const um = uniforms.uMouse.value;
    um.x += (state.mouse.x - um.x) * 0.05;
    um.y += (state.mouse.y - um.y) * 0.05;

    const s = state.baseScale * (0.6 + 0.4 * state.intro) * (1 + state.scroll * 0.35);
    group.scale.setScalar(s);
    uniforms.uDistort.value = 0.26 + state.scroll * 0.2;
    blob.rotation.y += dt * 0.08;
    blob.rotation.x = um.y * 0.25;
    points.rotation.y -= dt * 0.03;
    group.rotation.z = um.x * -0.08;
    renderer.render(scene, camera);
  }

  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  window.addEventListener('resize', layout);
  const io = new IntersectionObserver(([e]) => (state.visible = e.isIntersecting));
  io.observe(canvas);

  window.addEventListener('pointermove', (e) => {
    state.mouse.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  });

  layout();
  if (reduced) {
    state.intro = 1;
    group.scale.setScalar(state.baseScale);
    renderer.render(scene, camera);
  } else {
    frame();
  }

  return { state, layout, destroy: () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); } };
}
