import * as THREE from 'three';
import { simplex3 } from './noise.glsl.js';

// Brand "connected" field for the Integrations panel: a dot matrix lit by soft purple/orange light,
// with signal rings radiating from the Petzo hub. The canvas is viewport-sized (sticky) and the
// pattern is offset by scroll so it stays anchored to the section content.
const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uDpr;
  uniform float uScrollY;
  uniform float uSectionH;
  uniform vec2 uRes;
  uniform vec2 uMouse;
  uniform float uMouseOn;
  uniform vec2 uHub;
  uniform vec2 uVms;
  uniform vec4 uQuiet;  // x, y, w, h of the heading block (section space)
  uniform vec4 uQuiet2; // same for the VMS intro copy

  ${simplex3}

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sdBox(vec2 p, vec2 c, vec2 b){ vec2 d = abs(p - c) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float glow(vec2 p, vec2 c, float r){ float d = length(p - c) / r; return exp(-d * d * 2.0); }

  void main(){
    vec2 px = vec2(gl_FragCoord.x / uDpr, uRes.y - gl_FragCoord.y / uDpr);
    vec2 w = px + vec2(0.0, uScrollY);            // section-space position in CSS px
    float t = uTime;
    float W = uRes.x;

    vec3 purple = vec3(0.384, 0.231, 0.698);
    vec3 violet = vec3(0.541, 0.388, 0.878);
    vec3 lav    = vec3(0.788, 0.722, 0.953);
    vec3 orange = vec3(0.953, 0.663, 0.231);

    vec3 night = mix(vec3(0.090, 0.047, 0.188), vec3(0.059, 0.031, 0.125), clamp(w.y / uSectionH, 0.0, 1.0));

    // slow drifting light anchored to content
    vec2 drift = vec2(sin(t * 0.13), cos(t * 0.11)) * 50.0;
    float gHub  = glow(w, uHub + drift, 640.0);
    float gTop  = glow(w, vec2(W * 0.5, -120.0), 760.0);
    float gVms  = glow(w, uVms + drift.yx * 1.4, 680.0);
    float gWarm = glow(w, vec2(W * 0.88, uVms.y - 260.0) - drift, 460.0);

    vec3 col = night;
    col += purple * gHub * 0.62;
    col += violet * gTop * 0.22;
    col += purple * gVms * 0.30;
    col += orange * gWarm * 0.14;

    // dot matrix
    float cs = 24.0;
    vec2 cell = floor(w / cs);
    vec2 center = cell * cs + cs * 0.5;
    vec2 lp = w - center;
    float n = snoise(vec3(cell * 0.05, t * 0.1));

    // signal rings from the hub
    float dHub = length(center - uHub);
    float ring = pow(max(0.0, sin(dHub * 0.016 - t * 1.4)), 14.0) * exp(-dHub / 1000.0);

    // pointer lens
    vec2 mw = uMouse + vec2(0.0, uScrollY);
    float m = smoothstep(220.0, 0.0, length(center - mw)) * uMouseOn;

    float r = 0.65 + 0.9 * smoothstep(-0.2, 0.9, n) + ring * 1.5 + m * 1.8;
    float dotA = smoothstep(r + 0.8, r - 0.4, length(lp));
    float h = hash(cell);
    vec3 dcol = mix(lav, orange, step(0.972, h) + ring * 0.35);
    float light = clamp(gHub * 1.3 + gTop * 0.5 + gVms * 0.8 + gWarm * 0.9, 0.0, 1.0);
    float inten = 0.05 + 0.32 * light + ring * 0.55 + m * 0.6;
    // keep dots out from behind the heading copy
    float quiet = 1.0 - smoothstep(0.0, 90.0, sdBox(center, uQuiet.xy + uQuiet.zw * 0.5, uQuiet.zw * 0.5 + 24.0));
    quiet = max(quiet, 1.0 - smoothstep(0.0, 90.0, sdBox(center, uQuiet2.xy + uQuiet2.zw * 0.5, uQuiet2.zw * 0.5 + 24.0)));
    inten *= 1.0 - quiet * 0.9;
    col += dcol * dotA * inten;

    // soften side edges so the panel reads as a lit surface, not a texture
    float ex = px.x / W;
    float vx = smoothstep(0.0, 0.16, ex) * smoothstep(1.0, 0.84, ex);
    col = mix(night * 0.85, col, 0.6 + 0.4 * vx);

    col += (hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * 0.016;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const vertex = /* glsl */ `
  void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export function createDotField(canvas, section, { hubEl, lightEl, quietEls = [], reduced = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const uniforms = {
    uTime: { value: 0 },
    uDpr: { value: 1 },
    uScrollY: { value: 0 },
    uSectionH: { value: 1 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(-9999, -9999) },
    uMouseOn: { value: 0 },
    uHub: { value: new THREE.Vector2() },
    uVms: { value: new THREE.Vector2() },
    uQuiet: { value: new THREE.Vector4() },
    uQuiet2: { value: new THREE.Vector4() },
  };
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms })));

  const mouse = { x: -9999, y: -9999, on: 0 };
  let visible = false;

  function layout() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uDpr.value = dpr;
    uniforms.uRes.value.set(w, h);
  }

  function sync() {
    const s = section.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    uniforms.uScrollY.value = c.top - s.top;
    uniforms.uSectionH.value = s.height;
    const hub = hubEl.getBoundingClientRect();
    uniforms.uHub.value.set(hub.left + hub.width / 2 - s.left, hub.top + hub.height / 2 - s.top);
    const vms = lightEl.getBoundingClientRect();
    uniforms.uVms.value.set(vms.left + vms.width * 0.35 - s.left, vms.top + Math.min(vms.height, 900) * 0.45 - s.top);
    [uniforms.uQuiet, uniforms.uQuiet2].forEach((u, i) => {
      const el = quietEls[i];
      if (!el) return u.value.set(-9999, -9999, 0, 0);
      const q = el.getBoundingClientRect();
      u.value.set(q.left - s.left, q.top - s.top, q.width, q.height);
    });
    uniforms.uMouse.value.set(mouse.x - c.left, mouse.y - c.top);
    uniforms.uMouseOn.value += (mouse.on - uniforms.uMouseOn.value) * 0.08;
  }

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    uniforms.uTime.value += Math.min(clock.getDelta(), 0.05);
    sync();
    renderer.render(scene, camera);
  }

  new ResizeObserver(layout).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    clock.getDelta();
    if (reduced && visible) { sync(); renderer.render(scene, camera); }
  }).observe(section);
  section.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = 1; });
  section.addEventListener('pointerleave', () => (mouse.on = 0));

  layout();
  if (!reduced) frame();
}
