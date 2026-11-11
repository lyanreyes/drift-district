import * as THREE from 'three';

/* ───────────────────────── helpers ───────────────────────── */
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const PREFIX = 'driftdistrict-v1-';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const fmt = ms => { if (ms == null) return '--:--.---'; const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, r = Math.floor(ms % 1000); return `${m}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ───────────────────────── data ───────────────────────── */
const CARS = [
  { id: 'sabre', name: 'Sabre F-One', desc: 'Formula racer', color: '#1d7cf2', max: 90, acc: 25, grip: 10, steer: 2.6, type: 'formula' },
  { id: 'vento', name: 'Vento GT', desc: 'Balanced supercar', color: '#e63946', max: 76, acc: 21, grip: 7.5, steer: 2.4, type: 'sport' },
  { id: 'kaiju', name: 'Kaiju RS', desc: 'Born to drift', color: '#ffb703', max: 70, acc: 20, grip: 5.2, steer: 2.9, type: 'coupe' },
  { id: 'brute', name: 'Brute V8', desc: 'Muscle power', color: '#8338ec', max: 74, acc: 24, grip: 6.2, steer: 2.2, type: 'muscle' },
];
const TEAMS = [
  { name: 'Forrari', c1: '#dc0000', c2: '#ffe600' },
  { name: 'Red Ball Racing', c1: '#121f45', c2: '#e2202c' },
  { name: 'Mercidas', c1: '#c4c9cf', c2: '#00d2be' },
  { name: 'McLaring', c1: '#ff8000', c2: '#101216' },
  { name: 'Aston Marlin', c1: '#00594f', c2: '#cedc00' },
  { name: 'Alpino', c1: '#0078c8', c2: '#ff87bc' },
  { name: 'Willams', c1: '#00a0de', c2: '#041e42' },
  { name: 'Sawber', c1: '#101216', c2: '#52e252' },
  { name: 'Hass', c1: '#f4f4f4', c2: '#e10600' },
  { name: 'Racing Bills', c1: '#1634cb', c2: '#f4f4f4' },
];
const MODES = {
  city: { name: 'Neon City', laps: 2 },
  gp: { name: 'Alpine Ring', laps: 3 },
  gp2: { name: 'São Paulo Circuit', laps: 3 },
  gp3: { name: 'Monte Carlo Streets', laps: 3 },
  drift: { name: 'Drift Arena', time: 90 },
};
const GP_PTS = [[0, -150], [200, -140], [270, -110], [280, -40], [230, 10], [150, 20], [110, 70], [160, 130], [240, 160], [250, 220], [180, 250], [60, 230], [0, 170], [-60, 230], [-160, 250], [-250, 200], [-240, 110], [-170, 70], [-150, 0], [-230, -40], [-270, -100], [-220, -140]];
const SP_PTS = [[60, -230], [-90, -232], [-160, -205], [-170, -150], [-225, -110], [-260, -40], [-265, 80], [-250, 180], [-200, 235], [-120, 225], [-80, 160], [-110, 80], [-80, 10], [-10, -10], [40, 50], [10, 130], [50, 200], [130, 215], [170, 150], [130, 80], [170, 20], [245, 70], [295, 20], [305, -80], [275, -170], [190, -222]];
const MC_PTS = [[-120, -20], [-30, -20], [30, -5], [70, -45], [120, -120], [170, -185], [230, -200], [270, -165], [262, -110], [300, -80], [318, -45], [285, -30], [275, 10], [240, 45], [140, 70], [40, 75], [-30, 60], [-55, 85], [-100, 80], [-150, 95], [-210, 80], [-245, 105], [-295, 90], [-330, 55], [-300, 5], [-250, -18]];
const isGP = m => m.startsWith('gp');
const DRIFT_PTS = [[-40, -120], [60, -100], [125, -40], [95, 30], [25, 25], [-5, 85], [60, 135], [10, 175], [-80, 150], [-70, 80], [-140, 50], [-175, -20], [-130, -90]];

/* ───────────────────────── renderer ───────────────────────── */
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, 1, 2500);
camera.rotation.order = 'YXZ';
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const MAXA = renderer.capabilities.getMaxAnisotropy();
const pmrem = new THREE.PMREMGenerator(renderer);
function noiseTex(base, vary, stripes) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), img = x.createImageData(256, 256);
  for (let i = 0; i < 65536; i++) {
    const n = (Math.random() - .5) * vary + (stripes ? ((i >> 5) % 2 ? 9 : -9) : 0) + (Math.random() < .02 ? -vary * .6 : 0);
    for (let k = 0; k < 3; k++) img.data[i * 4 + k] = clamp(base[k] + n, 0, 255); img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXA; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX = { asphalt: noiseTex([205, 205, 210], 70), grass: noiseTex([78, 150, 62], 46, true) };
const SKY_VS = 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
const SKY_FS = `
uniform vec3 top; uniform vec3 hor; uniform vec3 sunCol; uniform vec3 sunDir; uniform float cloud; varying vec3 vD;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 5; i++){ s += a*noise(p); p *= 2.03; a *= .5; } return s; }
void main(){
  vec3 d = normalize(vD); float h = max(d.y, 0.);
  vec3 c = mix(hor, top, pow(h, .45));
  float s = max(dot(d, sunDir), 0.);
  c += sunCol * (pow(s, 400.) * 3. + pow(s, 10.) * .22);
  if (d.y > .01) { vec2 uv = d.xz / (d.y + .08) * 1.2; float cl = smoothstep(.5, .8, fbm(uv + 3.)) * cloud * smoothstep(.01, .18, d.y); c = mix(c, mix(hor, vec3(1.), .75) + sunCol * .08, cl); }
  gl_FragColor = vec4(c, 1.);
}`;
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ───────────────────────── cars ───────────────────────── */
// Smooth body: rounded cross-sections [z, halfWidth, halfHeight, centreY, centreX] joined into one skin.
function loft(secs, mat, seg = 18, exp = 2.6) {
  const pos = [], idx = [], n = secs.length;
  for (const [z, w, h, y, x = 0] of secs) for (let k = 0; k < seg; k++) { const a = k / seg * TAU, c = Math.cos(a), sn = Math.sin(a); pos.push(x + Math.sign(c) * Math.abs(c) ** (2 / exp) * w, y + Math.sign(sn) * Math.abs(sn) ** (2 / exp) * h, z); }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + (k + 1) % seg; idx.push(a, b, a + seg, b, b + seg, a + seg); }
  for (const i of [0, n - 1]) { const [z, , , y, x = 0] = secs[i], ci = pos.length / 3; pos.push(x, y, z); for (let k = 0; k < seg; k++) idx.push(ci, i * seg + k, i * seg + (k + 1) % seg); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = mat.clone(); m.side = THREE.DoubleSide; return new THREE.Mesh(geo, m);
}
function buildFormula(g, paint, trim, dark, tail) {
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: .88, side: THREE.DoubleSide });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: .8, roughness: .35 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x101115, roughness: .5, metalness: .3 });
  const stripe = new THREE.MeshBasicMaterial({ color: 0xe10600 });
  const box = (w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); g.add(me); return me; };
  const arm = (a, b) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b); const me = new THREE.Mesh(new THREE.BoxGeometry(.04, .014, va.distanceTo(vb)), carbon); me.position.copy(va).lerp(vb, .5); me.lookAt(vb); g.add(me); };
  // monocoque: needle nose -> cockpit -> narrow "coke bottle" rear
  g.add(loft([[2.78, .05, .04, .29], [2.45, .1, .065, .33], [1.8, .16, .1, .4], [1.15, .23, .15, .44], [.6, .3, .2, .46], [0, .32, .22, .46], [-.5, .3, .22, .48], [-1.2, .22, .18, .46], [-1.9, .12, .12, .42], [-2.25, .07, .08, .4]], paint));
  // engine cover + airbox, shark fin
  g.add(loft([[.12, .09, .1, .84], [0, .13, .17, .8], [-.4, .15, .22, .74], [-1.0, .12, .2, .66], [-1.6, .07, .14, .56], [-2.15, .03, .07, .48]], trim));
  box(.02, .2, 1.0, trim, 0, .86, -1.25);
  box(.1, .1, .02, carbon, 0, .86, .135);
  box(.24, .025, .06, carbon, 0, .97, .02);
  // sidepods with dark inlets
  for (const sd of [-1, 1]) {
    g.add(loft([[.72, .16, .13, .43, sd * .55], [.55, .21, .17, .42, sd * .55], [0, .24, .18, .4, sd * .55], [-.7, .22, .15, .36, sd * .5], [-1.3, .14, .09, .3, sd * .4], [-1.75, .06, .05, .28, sd * .3]], paint));
    box(.26, .2, .02, carbon, sd * .55, .43, .73);
    box(.36, .012, 1.3, trim, sd * .55, .585, -.1);
    box(.16, .07, .05, paint, sd * .43, .72, .78); box(.03, .1, .03, carbon, sd * .36, .66, .78);
  }
  // cockpit opening, helmet, halo
  const openL = loft([[.78, .15, .035, .665], [.45, .19, .04, .685], [.1, .19, .04, .7]], carbon, 14); g.add(openL);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), trim); helmet.position.set(0, .76, .22); g.add(helmet);
  g.userData.driver = [helmet, openL, box(.2, .05, .03, carbon, 0, .78, .335)];
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.26, .028, 8, 24, Math.PI).rotateX(Math.PI / 2), carbon); halo.scale.z = 1.7; halo.position.set(0, .93, .2); g.add(halo);
  box(.035, .3, .05, carbon, 0, .8, .66, -.35);
  for (const sd of [-1, 1]) box(.04, .26, .05, carbon, sd * .26, .81, .16, .3);
  // floor + diffuser
  box(1.5, .035, 3.3, carbon, 0, .11, -.15);
  box(1.05, .2, .45, carbon, 0, .2, -2.05, -.35);
  // front wing: main plane, two flaps per side, endplates
  const wing = [box(1.9, .03, .46, paint, 0, .115, 2.62)];
  for (const sd of [-1, 1]) wing.push(
    box(.74, .025, .22, trim, sd * .56, .2, 2.5, -.3), box(.74, .025, .18, trim, sd * .56, .28, 2.38, -.5),
    box(.025, .26, .52, paint, sd * .94, .23, 2.52), box(.03, .16, .18, carbon, sd * .08, .21, 2.6));
  g.userData.wing = wing;
  // rear wing: endplates, main plane, flap, beam wing, pillar, rain light
  for (const sd of [-1, 1]) box(.03, .64, .62, paint, sd * .52, .72, -2.28);
  box(1.02, .04, .34, trim, 0, .9, -2.2, .18); box(1.02, .03, .2, paint, 0, .99, -2.4, .55);
  box(1.0, .03, .2, carbon, 0, .5, -2.25, .2); box(.05, .46, .1, carbon, 0, .68, -2.12);
  box(.07, .12, .03, tail, 0, .42, -2.47);
  // wheels: rounded slicks, rims, red sidewall stripe
  const tyreGeo = (R, w) => new THREE.LatheGeometry([[.2, -w / 2], [R - .06, -w / 2], [R, -w / 2 + .06], [R, w / 2 - .06], [R - .06, w / 2], [.2, w / 2]].map(([x, y]) => new THREE.Vector2(x, y)), 30);
  const mkWheel = (x, z, R, w) => {
    const grp = new THREE.Group(), spin = new THREE.Group(); spin.rotation.z = Math.PI / 2;
    spin.add(new THREE.Mesh(tyreGeo(R, w), rubber), new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, w * .94, 22), metal));
    for (const sd of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(R - .085, .012, 6, 30), stripe); t.rotation.x = Math.PI / 2; t.position.y = sd * (w / 2 + .003); spin.add(t); }
    grp.add(spin); grp.position.set(x, R, z); g.add(grp); return grp;
  };
  const fw = [mkWheel(.82, 1.75, .36, .36), mkWheel(-.82, 1.75, .36, .36)];
  mkWheel(.78, -1.65, .36, .46); mkWheel(-.78, -1.65, .36, .46);
  // suspension wishbones
  for (const sd of [-1, 1]) {
    arm([sd * .19, .46, 2.0], [sd * .66, .44, 1.75]); arm([sd * .22, .46, 1.45], [sd * .66, .44, 1.75]);
    arm([sd * .17, .31, 1.95], [sd * .66, .26, 1.75]); arm([sd * .2, .31, 1.45], [sd * .66, .26, 1.75]);
    arm([sd * .14, .46, -1.35], [sd * .58, .44, -1.65]); arm([sd * .1, .46, -1.95], [sd * .58, .44, -1.65]);
    arm([sd * .14, .28, -1.35], [sd * .58, .26, -1.65]); arm([sd * .1, .3, -1.95], [sd * .58, .26, -1.65]);
  }
  return fw;
}
function buildCar(spec, color, color2 = color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: .15, roughness: .35, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: .4 });
  const trim = new THREE.MeshPhysicalMaterial({ color: color2, metalness: .15, roughness: .35, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: .4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: .7 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a1420, metalness: .8, roughness: .15 });
  const head = new THREE.MeshBasicMaterial({ color: 0xfff6cc });
  const tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const box = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); g.add(me); return me; };
  const wheel = (x, z, r, w) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 22), dark); me.rotation.z = Math.PI / 2; me.position.set(x, r, z); g.add(me); };
  if (spec.type === 'formula') {
    g.userData.fw = buildFormula(g, paint, trim, dark, tail);
  } else {
    const L = spec.type === 'muscle' ? 4.7 : 4.3, W = 1.9;
    const cz = spec.type === 'muscle' ? -.45 : -.2;
    box(W, .45, L, paint, 0, .58, 0);
    box(W - .1, .2, L * .96, dark, 0, .3, 0);
    box(W - .3, .42, L * .42, glass, 0, 1.0, cz);
    box(W - .34, .05, L * .36, trim, 0, 1.23, cz); box(.45, .02, L - .1, trim, 0, .81, 0);
    if (spec.type === 'sport') {
      box(W, .05, .4, paint, 0, 1.1, -L / 2 + .25);
      box(.08, .3, .3, dark, .7, .94, -L / 2 + .25); box(.08, .3, .3, dark, -.7, .94, -L / 2 + .25);
      box(W + .1, .06, .35, dark, 0, .3, L / 2);
    }
    if (spec.type === 'coupe') {
      box(W + .15, .06, .45, dark, 0, 1.4, -L / 2 + .2);
      box(.08, .6, .3, dark, .8, 1.1, -L / 2 + .2); box(.08, .6, .3, dark, -.8, 1.1, -L / 2 + .2);
    }
    if (spec.type === 'muscle') box(.7, .14, 1.1, dark, 0, .86, 1.1);
    box(.42, .12, .05, head, .62, .62, L / 2 + .01); box(.42, .12, .05, head, -.62, .62, L / 2 + .01);
    box(.5, .1, .05, tail, .6, .66, -L / 2 - .01); box(.5, .1, .05, tail, -.6, .66, -L / 2 - .01);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(sx * .92, sz * L * .31, .38, .32);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function makeTag(name) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.roundRect(8, 8, 240, 48, 14); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold 30px Segoe UI, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(name, 128, 34, 220);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(6, 1.5, 1); s.position.y = 3.4; return s;
}

/* ───────────────────────── cockpit (first-person) view ───────────────────────── */
// Drawn as an overlay scene in camera space, so it stays crisp and never clips into the world.
const cockScene = new THREE.Scene(), cockCam = new THREE.PerspectiveCamera(70, 1, .03, 30);
cockScene.add(new THREE.HemisphereLight(0xffffff, 0x555566, .9));
{ const l = new THREE.DirectionalLight(0xffffff, 1.3); l.position.set(1, 3, 2); cockScene.add(l); }
let cock = null, camMode = 'cockpit';
const mirrorRT = new THREE.WebGLRenderTarget(384, 160);
mirrorRT.texture.wrapS = THREE.RepeatWrapping; mirrorRT.texture.repeat.x = -1; mirrorRT.texture.offset.x = 1;
const mirrorCam = new THREE.PerspectiveCamera(38, 2.4, 1, 1500), mirrorMat = new THREE.MeshBasicMaterial({ map: mirrorRT.texture });
let frameNo = 0;
const dashC = document.createElement('canvas'); dashC.width = 128; dashC.height = 64;
const dashX = dashC.getContext('2d'), dashT = new THREE.CanvasTexture(dashC); dashT.colorSpace = THREE.SRGBColorSpace;
function drawDash(speed, max, nitro) {
  dashX.fillStyle = '#05070c'; dashX.fillRect(0, 0, 128, 64);
  const rev = (speed % (max / 7)) / (max / 7);
  for (let i = 0; i < 12; i++) { dashX.fillStyle = i / 12 < rev ? (i < 5 ? '#3dff7a' : i < 9 ? '#ff4040' : '#b060ff') : '#1c2130'; dashX.fillRect(6 + i * 9.8, 4, 7, 6); }
  dashX.fillStyle = '#fff'; dashX.font = 'bold 34px Consolas, monospace'; dashX.textAlign = 'center'; dashX.textBaseline = 'middle';
  dashX.fillText(String(Math.min(8, 1 + Math.floor(speed / (max / 7)))), 64, 36);
  dashX.font = 'bold 15px Consolas, monospace'; dashX.fillStyle = '#35e0ff'; dashX.textAlign = 'left'; dashX.fillText(String(Math.round(speed * 3.6)), 6, 34);
  dashX.fillStyle = '#1c2130'; dashX.fillRect(6, 54, 116, 5); dashX.fillStyle = '#ffd23f'; dashX.fillRect(6, 54, 116 * nitro, 5);
  dashT.needsUpdate = true;
}
function buildCockpit(spec, color, color2 = color) {
  if (cock) cockScene.remove(cock.root);
  const root = new THREE.Group(), wheel = new THREE.Group(), fw = [];
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: .15, roughness: .35, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: .4 });
  const trim = new THREE.MeshPhysicalMaterial({ color: color2, metalness: .15, roughness: .35, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: .4 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: .55, metalness: .3 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: .9 });
  const mirror = mirrorMat; let wing = [];
  const screen = new THREE.MeshBasicMaterial({ map: dashT });
  const box = (p, w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); p.add(me); return me; };
  const btn = (x, y, c) => box(wheel, .016, .016, .012, new THREE.MeshBasicMaterial({ color: c }), x, y, .02);
  let eyeY, eyeZ;
  if (spec.type === 'formula') {
    eyeY = .8; eyeZ = .27;
    const carG = buildCar(spec, color, color2);
    carG.traverse(o => { if (o.isMesh) o.castShadow = false; });
    for (const m of carG.userData.driver) m.visible = false;
    carG.rotation.y = Math.PI; carG.position.set(0, -eyeY, eyeZ); root.add(carG);
    fw.push(...carG.userData.fw); wing = carG.userData.wing;
    for (const sd of [-1, 1]) { const mg = new THREE.Mesh(new THREE.PlaneGeometry(.145, .06), mirror); mg.position.set(sd * .43, .72, .752); mg.rotation.y = Math.PI; carG.add(mg); }
    // steering wheel with display, buttons, gloves and forearms
    wheel.position.set(0, -.125, -.37); wheel.rotation.x = -.28; wheel.scale.setScalar(.8);
    box(wheel, .27, .15, .03, carbon, 0, 0, 0); box(wheel, .2, .04, .03, carbon, 0, .085, 0);
    for (const sd of [-1, 1]) {
      box(wheel, .05, .2, .05, rubber, sd * .155, 0, 0);
      box(wheel, .08, .12, .09, trim, sd * .155, -.005, .02);
      box(wheel, .085, .085, .36, paint, sd * .19, -.07, .22, .3, sd * .12, 0);
    }
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(.13, .065), screen); sc.position.set(0, .03, .017); wheel.add(sc);
    [[-.095, .05, 0xff3040], [-.095, 0, 0x35e0ff], [.095, .05, 0x3dff7a], [.095, 0, 0xffd23f], [-.045, -.045, 0xff8a00], [.045, -.045, 0xb060ff], [0, -.045, 0xffffff]].forEach(b => btn(...b));
  } else {
    eyeY = 1.08; eyeZ = -.25;
    box(root, 1.7, .05, 1.6, paint, 0, -.5, -1.75); box(root, .4, .012, 1.6, trim, 0, -.47, -1.75);
    if (spec.type === 'muscle') box(root, .6, .08, 1, carbon, 0, -.45, -1.7);
    box(root, 1.7, .24, .5, carbon, 0, -.42, -.78);
    box(root, 1.75, .09, .3, carbon, 0, .47, -.8);
    for (const s of [-1, 1]) {
      box(root, .08, 1.0, .08, carbon, s * .8, .02, -.98, .45, 0, s * -.12);
      box(root, .2, .11, .05, carbon, s * .95, -.2, -1.0); box(root, .17, .085, .01, mirror, s * .95, -.2, -.972);
    }
    box(root, .26, .075, .03, carbon, 0, .36, -.72); box(root, .23, .055, .01, mirror, 0, .36, -.703);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(.2, .1), screen); sc.position.set(0, -.25, -.6); sc.rotation.x = -.3; root.add(sc);
    wheel.position.set(0, -.34, -.48); wheel.rotation.x = -.35;
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(.16, .02, 8, 28), rubber));
    box(wheel, .3, .03, .02, carbon, 0, 0, 0); box(wheel, .03, .16, .02, carbon, 0, -.08, 0); box(wheel, .08, .08, .03, carbon, 0, 0, 0);
    for (const s of [-1, 1]) box(wheel, .07, .1, .08, paint, s * .16, .01, .02);
  }
  root.add(wheel); cockScene.add(root);
  cock = { root, wheel, fw, eyeY, eyeZ, wing };
}

/* ───────────────────────── worlds ───────────────────────── */
let ROADMATS = [];
function baseWorld(o) {
  const g = new THREE.Group();
  const v = h => { const c = new THREE.Color(h).convertLinearToSRGB(); return new THREE.Vector3(c.r, c.g, c.b); };
  const sunDir = new THREE.Vector3(...o.sunDir).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({ uniforms: { top: { value: v(o.top) }, hor: { value: v(o.hor) }, sunCol: { value: v(o.sunCol) }, sunDir: { value: sunDir }, cloud: { value: o.cloud } }, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.frustumCulled = false; sky.renderOrder = -1; g.add(sky);
  scene.background = new THREE.Color(o.hor); scene.fog = new THREE.Fog(o.hor, o.fog[0], o.fog[1]);
  const es = new THREE.Scene(); es.add(sky.clone());
  if (scene.environment) scene.environment.dispose();
  scene.environment = cockScene.environment = pmrem.fromScene(es, 0, .1, 5000).texture;
  const hemi = new THREE.HemisphereLight(o.hemi[0], o.hemi[1], o.hemi[2]); g.add(hemi);
  const sun = new THREE.DirectionalLight(o.sunCol, o.sunI); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -80; sc.right = sc.top = 80; sc.near = 1; sc.far = 500; sun.shadow.bias = -.0006; sun.shadow.normalBias = .06;
  g.add(sun, sun.target);
  const pg = new THREE.PlaneGeometry(3000, 3000), uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 120, uv.getY(i) * 120);
  const ground = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ map: TEX[o.ground], color: o.tint, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.1; ground.receiveShadow = true; g.add(ground);
  ROADMATS = []; if (o.ground === 'asphalt') { ground.material.userData.r = 1; ROADMATS.push(ground.material); }
  g.userData = { sky, sun, sunDir, hemi, roadMats: ROADMATS };
  return g;
}
const ribEdge = (sp, i, o) => { const N = sp.length, p = sp[i % N], q = sp[(i + 1) % N], r = sp[(i - 1 + N) % N]; let tx = q.x - r.x, tz = q.z - r.z; const l = Math.hypot(tx, tz); tx /= l; tz /= l; return [p.x + tz * o, p.z - tx * o]; };
function ribMesh(pos, col, uvs, rough) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.asphalt, roughness: rough, metalness: 0, side: THREE.DoubleSide }));
  m.material.userData.r = rough; ROADMATS.push(m.material);
  m.receiveShadow = true; return m;
}
function ribbon(sp, a, b, y, colorFn, rough = .92) {
  const N = sp.length, pos = [], col = [], uvs = [], seg = Math.hypot(sp[1].x - sp[0].x, sp[1].z - sp[0].z) / 9;
  for (let i = 0; i < N; i++) {
    const c = colorFn(i); if (!c) continue;
    const A = ribEdge(sp, i, a), B = ribEdge(sp, i, b), C = ribEdge(sp, i + 1, a), D = ribEdge(sp, i + 1, b);
    pos.push(A[0], y, A[1], C[0], y, C[1], B[0], y, B[1], B[0], y, B[1], C[0], y, C[1], D[0], y, D[1]);
    uvs.push(a / 9, i * seg, a / 9, (i + 1) * seg, b / 9, i * seg, b / 9, i * seg, a / 9, (i + 1) * seg, b / 9, (i + 1) * seg);
    for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
  }
  return ribMesh(pos, col, uvs, rough);
}
function wall(sp, o, y0, y1, colorFn) {
  const N = sp.length, pos = [], col = [], uvs = [], of = typeof o === 'function' ? o : () => o;
  for (let i = 0; i < N; i++) {
    const c = colorFn(i); if (!c) continue;
    const A = ribEdge(sp, i, of(i)), C = ribEdge(sp, i + 1, of((i + 1) % N));
    pos.push(A[0], y0, A[1], C[0], y0, C[1], A[0], y1, A[1], A[0], y1, A[1], C[0], y0, C[1], C[0], y1, C[1]);
    uvs.push(0, 0, .3, 0, 0, .1, 0, .1, .3, 0, .3, .1);
    for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
  }
  const m = ribMesh(pos, col, uvs, .6); m.castShadow = true; return m;
}
function checkerTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#fff'; x.fillRect(i * 8, j * 8, 8, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const TRACKS = {
  gp: { pts: GP_PTS, width: 16, N: 600, B: 340, run: 7, theme: 'alpine' },
  gp2: { pts: SP_PTS, width: 15, B: 345, run: 7, theme: 'brazil' },
  gp3: { pts: MC_PTS, width: 11, B: 375, run: 1.6, theme: 'monaco' },
  drift: { pts: DRIFT_PTS, width: 18, N: 360, B: 240, theme: 'drift' },
};
const SKIES = {
  alpine: { top: 0x2a66cc, hor: 0xbcd9f2, sunCol: 0xfff2d8, sunDir: [.5, .8, .35], cloud: .9, fog: [450, 1900], ground: 'grass', tint: 0xffffff, hemi: [0xcfe4ff, 0x4a6a3a, .55], sunI: 2.8 },
  brazil: { top: 0x2f78d8, hor: 0xd9e8f2, sunCol: 0xfff0c8, sunDir: [-.4, .85, .3], cloud: 1, fog: [450, 1900], ground: 'grass', tint: 0xe6f5b8, hemi: [0xd8e8ff, 0x5a7a3a, .6], sunI: 3.0 },
  monaco: { top: 0x1f6fe0, hor: 0xcfe6fa, sunCol: 0xfff4dc, sunDir: [.3, .85, .45], cloud: .5, fog: [500, 2000], ground: 'asphalt', tint: 0xb4b4bc, hemi: [0xdcecff, 0x777777, .65], sunI: 2.9 },
  drift: { top: 0x38468a, hor: 0xf5a56c, sunCol: 0xffb070, sunDir: [-.7, .25, .4], cloud: .7, fog: [250, 1400], ground: 'asphalt', tint: 0x55555e, hemi: [0xffc9a0, 0x332233, .6], sunI: 2.4 },
};
function trackWorld(kind) {
  const T = TRACKS[kind], th = T.theme, gp = kind !== 'drift';
  const pts = T.pts, width = T.width, B = T.B, run = T.run || 7, LIM = width / 2 + run + 1.2;
  const g = baseWorld(SKIES[th]);
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
  const N = T.N || Math.round(curve.getLength() / 2.7);
  const sp = curve.getSpacedPoints(N); sp.pop();
  const R = rng(kind.length * 7 + N);
  const road = new THREE.Color(gp ? 0x5d6068 : 0x6a6a74), red = new THREE.Color(0xd62828), white = new THREE.Color(0xf4f4f4), yel = new THREE.Color(0xffd23f);
  const kA = th === 'brazil' ? new THREE.Color(0x1f9d3a) : red, kB = th === 'brazil' ? yel : white;
  g.add(ribbon(sp, -width / 2, width / 2, 0, () => road));
  g.add(ribbon(sp, width / 2, width / 2 + 1.3, .03, i => (i >> 1) % 2 ? kA : kB, .55));
  g.add(ribbon(sp, -width / 2 - 1.3, -width / 2, .03, i => (i >> 1) % 2 ? kA : kB, .55));
  if (gp) { g.add(ribbon(sp, width / 2 - .6, width / 2 - .35, .05, () => white)); g.add(ribbon(sp, -width / 2 + .35, -width / 2 + .6, .05, () => white)); }
  else g.add(ribbon(sp, -.15, .15, .05, i => i % 4 < 2 ? yel : null));

  const tan = i => { const p = sp[(i + N) % N], q = sp[(i + 1 + N) % N]; const l = Math.hypot(q.x - p.x, q.z - p.z); return [(q.x - p.x) / l, (q.z - p.z) / l]; };
  const [t0x, t0z] = tan(0), h0 = Math.atan2(t0x, t0z);
  // start line + gantry
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(width, 3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: checkerTex() }));
  sl.position.set(sp[0].x, .07, sp[0].z); sl.rotation.y = h0; g.add(sl);
  const gan = new THREE.Group(); gan.position.set(sp[0].x, 0, sp[0].z); gan.rotation.y = h0;
  const gm = new THREE.MeshLambertMaterial({ color: 0x222831 });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.8, 9, .8), gm); p.position.set(s * (width / 2 + 2.5), 4.5, 0); gan.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 6, 1.6, 1), new THREE.MeshBasicMaterial({ color: gp ? 0xd62828 : 0xff3d81 })); beam.position.y = 9; gan.add(beam);
  gan.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(gan);

  const distTo = (x, z) => { let m = 1e12; for (const p of sp) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
  const near = (x, z) => { let m = 1e12, bi = 0; for (let i = 0; i < N; i++) { const p = sp[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) { m = d; bi = i; } } const [tx, tz] = tan(bi); return { i: bi, d: Math.sqrt(m), off: (x - sp[bi].x) * tz - (z - sp[bi].z) * tx }; };
  const dummy = new THREE.Object3D();
  let pitLane = () => false, pitBox = null, pitW = () => 0;
  if (gp) {
    // pit lane on the right of the main straight, with four yellow service boxes; it funnels in and out
    const pitA = N - 40, pitLen = 62, pitCol = new THREE.Color(0x4a4c55);
    pitW = i => { const k = (i - pitA + N) % N; return k > pitLen ? 0 : clamp(Math.min(k, pitLen - k) / 6, 0, 1); };
    const boxK = i => (i - (N - 22) + N) % N;
    g.add(ribbon(sp, -15, -9, .02, i => pitW(i) >= 1 ? pitCol : null));
    g.add(ribbon(sp, -9.25, -8.95, .045, i => pitW(i) >= 1 ? white : null));
    g.add(ribbon(sp, -14.6, -10.4, .045, i => boxK(i) < 30 && boxK(i) % 8 < 3 ? yel : null, .6));
    pitLane = (x, z) => { const n = near(x, z); return pitW(n.i) >= 1 && n.off < -8 && n.off > -15.8; };
    pitBox = (x, z) => { const n = near(x, z), k = boxK(n.i); return k < 30 && k % 8 < 3 && n.off < -9.8 && n.off > -15.4; };
    const gm1 = new THREE.MeshLambertMaterial({ color: 0x2b2f3a }), gm2 = new THREE.MeshBasicMaterial({ color: 0xe10600 });
    for (let b = 0; b < 4; b++) {
      const idx = (N - 21 + b * 8) % N, [gx, gz] = ribEdge(sp, idx, -26), [tx, tz] = tan(idx), gh = Math.atan2(tx, tz);
      const gar = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 16), gm1); gar.position.set(gx, 2.5, gz); gar.rotation.y = gh; gar.castShadow = true; g.add(gar);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(11.2, .9, 16.2), gm2); sign.position.set(gx, 5.2, gz); sign.rotation.y = gh; g.add(sign);
    }
    // barriers: grey armco with a blue/white board on top, both sides of the track
    const armco = new THREE.Color(0x9aa0aa), blue = new THREE.Color(0x1f4fd6);
    const rightOff = i => -(LIM + (Math.max(LIM, 17.2) - LIM) * pitW(i));
    for (const o of [LIM, rightOff]) { g.add(wall(sp, o, 0, .9, () => armco)); g.add(wall(sp, o, .9, 1.5, i => Math.floor(i / 5) % 2 ? blue : white)); }

    if (th !== 'monaco') {
      // trees
      const TN = th === 'alpine' ? 700 : 280, fol = new THREE.InstancedMesh(th === 'alpine' ? new THREE.ConeGeometry(4, 13, 8) : new THREE.IcosahedronGeometry(5, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), TN);
      const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.45, .6, 4, 6), new THREE.MeshLambertMaterial({ color: 0x4a3524 }), TN);
      const tc = new THREE.Color(); let n = 0;
      while (n < TN) {
        let x, z;
        if (R() < .65) { const p = sp[R() * N | 0], a = R() * TAU, r = 20 + R() * 60; x = p.x + Math.cos(a) * r; z = p.z + Math.sin(a) * r; }
        else { x = (R() * 2 - 1) * (B + 260); z = (R() * 2 - 1) * (B + 260); }
        if (distTo(x, z) < LIM + 6) continue;
        const s = .7 + R() * 1.0;
        dummy.position.set(x, 3 + 6.5 * s, z); dummy.scale.set(s, s, s); dummy.updateMatrix(); fol.setMatrixAt(n, dummy.matrix);
        tc.setHSL(.3 + R() * .08, .5, (th === 'alpine' ? .16 : .24) + R() * .1); fol.setColorAt(n, tc);
        dummy.position.set(x, 2, z); dummy.scale.set(s, 1, s); dummy.updateMatrix(); trunk.setMatrixAt(n, dummy.matrix); n++;
      }
      dummy.scale.set(1, 1, 1); fol.castShadow = true; g.add(fol, trunk);
      // grandstands on the left of the main straight
      const sm = new THREE.MeshLambertMaterial({ color: 0xcfd6e6 }), rm = new THREE.MeshLambertMaterial({ color: th === 'brazil' ? 0x1f9d3a : 0xd62828 });
      for (let b = 0; b < 3; b++) {
        const idx = (N - 30 + b * 26) % N, [gx, gz] = ribEdge(sp, idx, LIM + 11), [tx, tz] = tan(idx), gh = Math.atan2(tx, tz);
        const st = new THREE.Mesh(new THREE.BoxGeometry(12, 9, 62), sm); st.position.set(gx, 4.5, gz); st.rotation.y = gh; st.castShadow = true; g.add(st);
        const rf = new THREE.Mesh(new THREE.BoxGeometry(14, .6, 64), rm); rf.position.set(gx, 13, gz); rf.rotation.y = gh; rf.castShadow = true; g.add(rf);
      }
    } else {
      // harbour city: pastel buildings, the sea, yachts, and a tunnel
      const wc = document.createElement('canvas'); wc.width = 64; wc.height = 128; const wx = wc.getContext('2d');
      wx.fillStyle = '#efe9dc'; wx.fillRect(0, 0, 64, 128);
      for (let r = 0; r < 12; r++) for (let c = 0; c < 5; c++) { wx.fillStyle = R() < .8 ? '#4f6072' : '#c9b28a'; wx.fillRect(4 + c * 12, 4 + r * 10.3, 8, 6); }
      const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
      const BN = 260, bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: wt }), BN), tc = new THREE.Color(); let n = 0, tries = 0;
      while (n < BN && tries++ < 6000) {
        const idx = R() * N | 0, side = R() < .5 ? -1 : 1, off = LIM + 10 + R() * 55, [x, z] = ribEdge(sp, idx, side * off);
        if (z > 108 || distTo(x, z) < LIM + 10 || (pitW(idx) > 0 && side < 0 && off < 46)) continue;
        const [tx, tz] = tan(idx), w = 12 + R() * 9, d = 12 + R() * 9, h = 10 + R() * 38;
        dummy.position.set(x, h / 2, z); dummy.rotation.set(0, Math.atan2(tx, tz), 0); dummy.scale.set(w, h, d); dummy.updateMatrix(); bm.setMatrixAt(n, dummy.matrix);
        tc.setHSL(.05 + R() * .1, .35 + R() * .3, .7 + R() * .2); bm.setColorAt(n, tc); n++;
      }
      bm.count = n; dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); bm.castShadow = true; g.add(bm);
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 1600), new THREE.MeshStandardMaterial({ color: 0x1a6fb0, roughness: .12, metalness: .25 }));
      sea.rotation.x = -Math.PI / 2; sea.position.set(0, -.05, 120 + 800); g.add(sea);
      const ym = new THREE.MeshStandardMaterial({ color: 0xf6f6f6, roughness: .4 });
      for (let k = 0; k < 16; k++) { const y = new THREE.Mesh(new THREE.BoxGeometry(5 + R() * 3, 3, 14 + R() * 12), ym); y.position.set(-340 + R() * 680, 1.2, 135 + R() * 150); y.rotation.y = R() * TAU; y.castShadow = true; g.add(y); }
      const tA = near(240, 45).i, tB = near(40, 75).i, inT = i => i >= tA && i <= tB, conc = new THREE.Color(0x777a82), lamp = new THREE.Color(0xfff2b0);
      const roof = ribbon(sp, -LIM - .4, LIM + .4, 5.6, i => inT(i) ? conc : null); roof.castShadow = true; g.add(roof);
      for (const o of [LIM, -LIM]) g.add(wall(sp, o, 1.5, 5.6, i => inT(i) ? conc : null));
      g.add(ribbon(sp, -.35, .35, 5.5, i => inT(i) && i % 3 === 0 ? lamp : null));
    }
    // distant hills
    const hm = new THREE.MeshLambertMaterial({ color: th === 'monaco' ? 0x8d8f6a : th === 'brazil' ? 0x4f8a48 : 0x35603c });
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + R(), r = 950 + R() * 250, hgt = 70 + R() * 130; if (th === 'monaco' && Math.sin(a) > -.15) continue; const h = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), hm); h.scale.set(320 + R() * 200, hgt, 320 + R() * 200); h.position.set(Math.cos(a) * r, -12, Math.sin(a) * r); g.add(h); }
  } else {
    // light pillars around the arena
    const pm = new THREE.MeshBasicMaterial({ color: 0xff3d81 }), cm = new THREE.MeshBasicMaterial({ color: 0x35e0ff });
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 16 + (i % 3) * 6, 1.2), i % 2 ? pm : cm); p.position.set(Math.cos(a) * (B + 6) * 1.2, 8, Math.sin(a) * (B + 6) * 1.2 + 20); g.add(p); }
  }
  const step = N / 20, cps = [];
  for (let k = 1; k <= 20; k++) { const p = sp[Math.round(k * step) % N]; cps.push({ x: p.x, z: p.z, r: Math.max(width * 1.4, 22) }); }
  return {
    group: g, B, cps, colliders: [], showCps: false,
    contain: gp ? m => {
      const n = near(m.x, m.z), bp = sp[n.i], d = n.d, base = width / 2 + run;
      const lim = n.off < 0 ? base + (Math.max(base, 15.8) - base) * pitW(n.i) : base;
      if (d <= lim) return 0;
      const nx = (m.x - bp.x) / d, nz = (m.z - bp.z) / d; m.x = bp.x + nx * lim; m.z = bp.z + nz * lim;
      const vn = m.vx * nx + m.vz * nz; if (vn > 0) { m.vx -= 1.4 * vn * nx; m.vz -= 1.4 * vn * nz; m.vx *= .9; m.vz *= .9; }
      return vn;
    } : null,
    onRoad: gp ? (x, z) => th === 'monaco' || distTo(x, z) < width / 2 + 2.2 || pitLane(x, z) : () => true, pitBox,
    spawn(i) { const idx = (N - 5 - Math.floor(i / 2) * 4) % N, p = sp[idx], [tx, tz] = tan(idx), o = (i % 2 ? -1 : 1) * width / 4; return { x: p.x + tz * o, z: p.z - tx * o, h: Math.atan2(tx, tz) }; },
    drawMap(c, M) { c.strokeStyle = '#8b93b8'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); sp.forEach((p, i) => { const [x, y] = M(p.x, p.z); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.stroke(); const [x, y] = M(sp[0].x, sp[0].z); c.fillStyle = '#fff'; c.fillRect(x - 3, y - 3, 6, 6); },
  };
}

function cityWorld() {
  const P = 80, HALF = 4, B = HALF * P + 14, R = rng(7);
  const g = baseWorld({ top: 0x060716, hor: 0x2b1b58, sunCol: 0xb9a8ff, sunDir: [.3, .7, -.5], cloud: .3, fog: [160, 950], ground: 'asphalt', tint: 0x3a3b44, hemi: [0x8899ff, 0x331a44, .9], sunI: 1.0 });
  const colliders = [], builds = [], slabs = [], parks = [];
  for (let i = -HALF; i < HALF; i++) for (let j = -HALF; j < HALF; j++) {
    const cx = (i + .5) * P, cz = (j + .5) * P; slabs.push([cx, cz]);
    if (R() < .14) { parks.push([cx, cz]); continue; }
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      if (R() < .1) continue;
      const w = 18 + R() * 8, d = 18 + R() * 8, h = 10 + R() * R() * 85, x = cx + a * 14.5, z = cz + b * 14.5;
      builds.push({ x, z, w, d, h }); colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    }
  }
  const dummy = new THREE.Object3D();
  // sidewalks
  const slab = new THREE.InstancedMesh(new THREE.BoxGeometry(60, .2, 60), new THREE.MeshLambertMaterial({ color: 0x2b2e3d }), slabs.length);
  slabs.forEach(([x, z], i) => { dummy.position.set(x, 0, z); dummy.updateMatrix(); slab.setMatrixAt(i, dummy.matrix); }); slab.receiveShadow = true; g.add(slab);
  // buildings with lit windows
  const wc = document.createElement('canvas'); wc.width = 64; wc.height = 128; const wx = wc.getContext('2d');
  wx.fillStyle = '#20232e'; wx.fillRect(0, 0, 64, 128);
  for (let r = 0; r < 12; r++) for (let c = 0; c < 5; c++) { const v = R(); wx.fillStyle = v < .45 ? '#ffd98a' : v < .6 ? '#8fe9ff' : '#0d0f16'; wx.fillRect(4 + c * 12, 4 + r * 10.3, 8, 6); }
  const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
  const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: wt, emissiveMap: wt, emissive: 0xffffff, emissiveIntensity: .75, roughness: .8 }), builds.length);
  const tint = new THREE.Color();
  builds.forEach((b, i) => { dummy.position.set(b.x, b.h / 2, b.z); dummy.scale.set(b.w, b.h, b.d); dummy.updateMatrix(); bm.setMatrixAt(i, dummy.matrix); tint.setHSL(.6 + R() * .25, .35, .55 + R() * .3); bm.setColorAt(i, tint); });
  dummy.scale.set(1, 1, 1); bm.castShadow = true; g.add(bm);
  // neon roof strips
  const neon = [0xff3d81, 0x35e0ff, 0xffd23f, 0x9d4edd];
  builds.forEach((b, i) => { if (i % 3) return; const s = new THREE.Mesh(new THREE.BoxGeometry(b.w + .4, .8, b.d + .4), new THREE.MeshBasicMaterial({ color: neon[i % 4] })); s.position.set(b.x, b.h - 1.5, b.z); g.add(s); });
  // park trees
  const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(3.5, 10, 7), new THREE.MeshLambertMaterial({ color: 0x1e7a4a }), Math.max(1, parks.length * 6)); let tn = 0;
  parks.forEach(([cx, cz]) => { for (let k = 0; k < 6; k++) { const x = cx + (R() - .5) * 46, z = cz + (R() - .5) * 46; dummy.position.set(x, 5, z); dummy.updateMatrix(); trees.setMatrixAt(tn++, dummy.matrix); colliders.push({ x0: x - .6, x1: x + .6, z0: z - .6, z1: z + .6 }); } });
  g.add(trees);
  // lane dashes
  const dashes = [];
  for (let k = -HALF; k <= HALF; k++) for (let t = -B + 5; t < B; t += 10) { const m = Math.abs(t - Math.round(t / P) * P); if (m < 13) continue; dashes.push([k * P, t, 0], [t, k * P, Math.PI / 2]); }
  const dm = new THREE.InstancedMesh(new THREE.PlaneGeometry(.35, 4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xcfd3e6 }), dashes.length);
  dashes.forEach(([x, z, r], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, r, 0); dummy.updateMatrix(); dm.setMatrixAt(i, dummy.matrix); }); dummy.rotation.set(0, 0, 0); g.add(dm);
  // boundary walls
  const wm = new THREE.MeshBasicMaterial({ color: 0xff3d81 });
  for (const [x, z, w, d] of [[0, -B - 1, 2 * B + 4, 1], [0, B + 1, 2 * B + 4, 1], [-B - 1, 0, 1, 2 * B + 4], [B + 1, 0, 1, 2 * B + 4]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.5, d), wm); m.position.set(x, 1.25, z); g.add(m); }
  // street race route (all on road centre-lines)
  const route = [[-160, -240], [0, -240], [160, -240], [160, -80], [0, -80], [0, 80], [120, 80], [240, 80], [240, 240], [0, 240], [-240, 240], [-240, 0], [-160, 0], [-160, -120]];
  const cps = route.map(([x, z]) => ({ x, z, r: 15 }));
  // finish banner
  const fin = new THREE.Mesh(new THREE.PlaneGeometry(20, 3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: checkerTex() })); fin.position.set(-160, .03, -120); g.add(fin);
  return {
    group: g, B, cps, colliders, showCps: true, onRoad: () => true,
    spawn(i) { return { x: -160 + (i % 2 ? 4.5 : -4.5), z: -104 + Math.floor(i / 2) * 9, h: Math.PI }; },
    drawMap(c, M) {
      c.strokeStyle = '#3a4066'; c.lineWidth = 3;
      for (let k = -HALF; k <= HALF; k++) { let [x0, y0] = M(k * P, -B), [x1, y1] = M(k * P, B); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();[x0, y0] = M(-B, k * P);[x1, y1] = M(B, k * P); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
      c.strokeStyle = '#ff3d81'; c.lineWidth = 2.5; c.beginPath(); route.forEach(([x, z], i) => { const [a, b] = M(x, z); i ? c.lineTo(a, b) : c.moveTo(a, b); }); c.closePath(); c.stroke();
    },
  };
}

/* ───────────────────────── state ───────────────────────── */
const state = { screen: 'menu', mode: 'city', wet: false, wx: 'dry' };
let world = null;
const me = { compound: 'slick', dmg: 0, tyre: 1, pitT: 0, pitDone: false, pitMsg: '', shake: 0, crashCd: 0, wreckT: 0, name: 'Driver', spec: CARS[0], color: '#e63946', color2: '#e63946', last: null, mesh: null, x: 0, z: 0, h: 0, vx: 0, vz: 0, steer: 0, nitro: 1, cp: 0, lap: 0, passed: 0, prog: 0, score: 0, combo: 0, comboT: 0, lapStart: 0, best: null, drifting: false, boosting: false, rank: 1 };
const race = { phase: 'free', t0: 0, results: [] };
const remotes = new Map();
let camH = 0;

// checkpoint marker
const cpMarker = new THREE.Group();
{
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 5, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
  ring.position.y = 2.5; cpMarker.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 160, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: .45, depthWrite: false }));
  beam.position.y = 80; cpMarker.add(beam);
  scene.add(cpMarker);
}

/* ───────────────────────── fx: skids + smoke ───────────────────────── */
const SK = 2000; let skI = 0, fxTick = 0;
const skid = new THREE.InstancedMesh(new THREE.PlaneGeometry(.32, 1.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: .5, depthWrite: false }), SK);
skid.frustumCulled = false; scene.add(skid);
const fxDummy = new THREE.Object3D();
function clearSkids() { fxDummy.position.set(0, -50, 0); fxDummy.rotation.set(0, 0, 0); fxDummy.updateMatrix(); for (let i = 0; i < SK; i++) skid.setMatrixAt(i, fxDummy.matrix); skid.instanceMatrix.needsUpdate = true; }
function addSkid(x, z, h) { fxDummy.position.set(x, .06, z); fxDummy.rotation.set(0, h, 0); fxDummy.updateMatrix(); skid.setMatrixAt(skI, fxDummy.matrix); skI = (skI + 1) % SK; skid.instanceMatrix.needsUpdate = true; }
const SM = 160; let smI = 0;
const smPos = new Float32Array(SM * 3).fill(-100), smLife = new Float32Array(SM);
const smGeo = new THREE.BufferGeometry(); smGeo.setAttribute('position', new THREE.BufferAttribute(smPos, 3));
const smTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const smoke = new THREE.Points(smGeo, new THREE.PointsMaterial({ color: 0xe8e8ee, map: smTex, size: 2.4, transparent: true, opacity: .22, depthWrite: false }));
smoke.frustumCulled = false; scene.add(smoke);
function puff(x, z) { smPos[smI * 3] = x + (Math.random() - .5); smPos[smI * 3 + 1] = .5; smPos[smI * 3 + 2] = z + (Math.random() - .5); smLife[smI] = 1; smI = (smI + 1) % SM; }
function driftFx(x, z, h, vh) { const s = Math.sin(h), c = Math.cos(h); for (const o of [-.9, .9]) { const wx = x - s * 1.4 + c * o, wz = z - c * 1.4 - s * o; addSkid(wx, wz, vh); if (Math.random() < .5) puff(wx, wz); } }
function updateFx(dt) {
  fxTick++;
  if (fxTick % 2 === 0) {
    if (me.drifting) driftFx(me.x, me.z, me.h, Math.atan2(me.vx, me.vz));
    if (me.dmg > .6 && fxTick % 4 === 0) puff(me.x, me.z);
    if (state.wet) { if (Math.hypot(me.vx, me.vz) > 15) puff(me.x - Math.sin(me.h) * 2.6, me.z - Math.cos(me.h) * 2.6); for (const r of remotes.values()) if (r.d && r.d[3] > 15) puff(r.x - Math.sin(r.h) * 2.6, r.z - Math.cos(r.h) * 2.6); }
    for (const r of remotes.values()) if (r.d && r.d[10] > 60 && fxTick % 4 === 0) puff(r.x, r.z);
    for (const r of remotes.values()) if (r.d && r.d[4]) driftFx(r.x, r.z, r.h, r.h);
  }
  for (let i = 0; i < SM; i++) { if (smLife[i] > 0) { smLife[i] -= dt * .9; smPos[i * 3 + 1] += dt * 2.2; if (smLife[i] <= 0) smPos[i * 3 + 1] = -100; } }
  smGeo.attributes.position.needsUpdate = true;
}

/* ───────────────────────── weather ───────────────────────── */
const RAIN_N = 1500, rainPos = new Float32Array(RAIN_N * 6), rainGeo = new THREE.BufferGeometry();
for (let i = 0; i < RAIN_N; i++) { const x = (Math.random() - .5) * 50, y = Math.random() * 20, z = (Math.random() - .5) * 50; rainPos.set([x, y, z, x + .12, y - 1.1, z], i * 6); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xc4d6ee, transparent: true, opacity: .5, depthWrite: false }));
rain.frustumCulled = false; rain.visible = false; scene.add(rain);
function updateRain(dt) {
  if (!rain.visible) return;
  for (let i = 0; i < RAIN_N; i++) { let y = rainPos[i * 6 + 1] - 36 * dt; if (y < 0) y += 20; rainPos[i * 6 + 1] = y; rainPos[i * 6 + 4] = y - 1.1; }
  rainGeo.attributes.position.needsUpdate = true; rain.position.set(camera.position.x, 0, camera.position.z);
}
function applyWeather() {
  const ud = world.group.userData, wet = state.wet, u = ud.sky.material.uniforms;
  if (!ud.base) ud.base = { top: u.top.value.clone(), hor: u.hor.value.clone(), sunCol: u.sunCol.value.clone(), cloud: u.cloud.value, sunI: ud.sun.intensity, hemiI: ud.hemi.intensity, fog: scene.fog.color.clone(), near: scene.fog.near, far: scene.fog.far };
  const b = ud.base, dark = (b.hor.x + b.hor.y + b.hor.z) / 3 < .3, f = wet ? (dark ? .3 : .85) : 0;
  u.top.value.copy(b.top).lerp(new THREE.Vector3(.3, .33, .38), f); u.hor.value.copy(b.hor).lerp(new THREE.Vector3(.46, .5, .56), f);
  u.sunCol.value.copy(b.sunCol).multiplyScalar(wet ? .08 : 1); u.cloud.value = wet ? 1 : b.cloud;
  ud.sun.intensity = b.sunI * (wet ? .3 : 1); ud.hemi.intensity = b.hemiI * (wet ? 1.25 : 1);
  scene.fog.color.copy(b.fog).lerp(new THREE.Color(0x6b7684), f); scene.fog.near = b.near * (wet ? .25 : 1); scene.fog.far = b.far * (wet ? .42 : 1);
  scene.background = scene.fog.color;
  for (const m of ud.roadMats) { m.roughness = wet ? Math.min(m.userData.r, .22) : m.userData.r; if (!m.userData.c) m.userData.c = m.color.clone(); m.color.copy(m.userData.c).multiplyScalar(wet ? .62 : 1); }
  rain.visible = wet;
}
let wxNext = 0;
function setWet(w, quiet) {
  if (state.wet === w) return;
  state.wet = w; applyWeather();
  if (!quiet) toast(w ? (isGP(state.mode) ? 'Rain! Pit for wet tyres' : 'Rain! Less grip — careful') : (isGP(state.mode) ? 'Track is drying — pit for slicks' : 'Track is drying'));
  if (net.host) broadcast({ t: 'wx', wet: w });
}
function setWeather(wx) { state.wx = wx; wxNext = performance.now() + 25000 + Math.random() * 30000; if (wx !== 'mixed') setWet(wx === 'rain'); }
setInterval(() => {
  if (state.screen !== 'play' || state.wx !== 'mixed' || (net.online && !net.host)) return;
  if (performance.now() > wxNext) { setWet(!state.wet); wxNext = performance.now() + 40000 + Math.random() * 50000; }
}, 1000);

/* ───────────────────────── input ───────────────────────── */
const keys = new Set();
addEventListener('keydown', e => {
  if (state.screen !== 'play' || e.target.tagName === 'INPUT') return;
  keys.add(e.code); initAudio();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyR') respawn();
  if (e.code === 'KeyC') toggleCam();
  if (e.code === 'Enter') requestStart();
  if (e.code === 'KeyM') { muted = !muted; toast(muted ? 'Sound off' : 'Sound on'); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
document.querySelectorAll('#touch button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); keys.add(k); initAudio(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => keys.delete(k));
});
const K = (...c) => c.some(k => keys.has(k));

/* ───────────────────────── audio ───────────────────────── */
let audio = null, muted = false;
function initAudio() {
  if (audio) return;
  try {
    const ctx = new AudioContext(), o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(ctx.destination); o.start(); audio = { ctx, o, g };
  } catch (e) { audio = {}; }
}

/* ───────────────────────── driving ───────────────────────── */
function placeAtSpawn(slot) { const s = world.spawn(slot); Object.assign(me, { x: s.x, z: s.z, h: s.h, vx: 0, vz: 0, steer: 0 }); camH = s.h; }
function resetProgress() { me.cp = 0; me.lap = 0; me.passed = 0; me.combo = 0; me.comboT = 0; me.lapStart = performance.now(); }
function respawn() {
  if (race.phase === 'count') return;
  if (!isGP(state.mode)) me.dmg = 0;
  const n = world.cps.length, p = world.cps[(me.cp - 1 + n) % n], q = world.cps[me.cp];
  Object.assign(me, { x: p.x, z: p.z, h: Math.atan2(q.x - p.x, q.z - p.z), vx: 0, vz: 0 }); me.combo = 0; camH = me.h;
}
function stepCar(dt, now) {
  const s = me.spec, locked = race.phase === 'count' || me.wreckT > 0;
  const thr = locked ? 0 : (K('KeyW', 'ArrowUp') ? 1 : 0) - (K('KeyS', 'ArrowDown') ? 1 : 0);
  const steerIn = (K('KeyA', 'ArrowLeft') ? 1 : 0) - (K('KeyD', 'ArrowRight') ? 1 : 0);
  const hb = !locked && K('Space');
  const onRoad = world.onRoad(me.x, me.z);
  const boost = !locked && K('ShiftLeft', 'ShiftRight') && me.nitro > 0.02 && thr > 0;
  me.boosting = boost;
  const max = s.max * (boost ? 1.22 : 1) * (onRoad ? 1 : .42) * (1 - .35 * me.dmg), acc = s.acc * (boost ? 1.9 : 1);

  // longitudinal
  let sin = Math.sin(me.h), cos = Math.cos(me.h);
  let vf = me.vx * sin + me.vz * cos, vl = me.vx * cos - me.vz * sin;
  if (thr > 0) { if (vf < 0) vf += 40 * dt; else if (vf < max) vf += acc * dt * (1 - (vf / max) ** 2); }
  else if (thr < 0) { if (vf > 1) vf -= 48 * (state.wet ? .72 : 1) * dt; else if (vf > -20) vf -= acc * .6 * dt; }
  else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 3 * dt);
  vf -= vf * .08 * dt;
  if (vf > max) vf -= (vf - max) * 2.2 * dt;
  if (hb) vf -= vf * .45 * dt;
  me.vx = sin * vf + cos * vl; me.vz = cos * vf - sin * vl;

  // steering
  me.steer += (steerIn - me.steer) * Math.min(1, dt * 9);
  const speed = Math.hypot(me.vx, me.vz);
  const sf = clamp(vf / 6, -1, 1), hs = 1 / (1 + speed / 55);
  me.h += me.steer * s.steer * sf * hs * (hb ? 1.5 : 1) * dt;

  // lateral grip (this is where the drift comes from)
  sin = Math.sin(me.h); cos = Math.cos(me.h);
  vf = me.vx * sin + me.vz * cos; vl = me.vx * cos - me.vz * sin;
  const gpm = isGP(state.mode);
  const wetGrip = state.wet ? (gpm ? (me.compound === 'wet' ? .86 : .58) : .74) : (gpm && me.compound === 'wet' ? .84 : 1);
  let grip = s.grip * (onRoad ? 1 : .6) * (.68 + .32 * me.tyre) * wetGrip;
  if (hb) grip = 1.0; else if (Math.abs(vl) > 7) grip *= .45;
  vl *= Math.exp(-grip * dt);
  me.vx = sin * vf + cos * vl; me.vz = cos * vf - sin * vl; me.vl = vl;

  me.x += me.vx * dt; me.z += me.vz * dt;

  // collisions: buildings, world edge, other cars
  let hit = false, impact = 0; const CR = 1.5;
  for (const c of world.colliders) {
    const px = clamp(me.x, c.x0, c.x1), pz = clamp(me.z, c.z0, c.z1);
    let dx = me.x - px, dz = me.z - pz, d = Math.hypot(dx, dz);
    if (d >= CR) continue;
    if (d < 1e-4) { // centre inside the box: push out through nearest face
      const l = me.x - c.x0, r = c.x1 - me.x, t = me.z - c.z0, b = c.z1 - me.z, m = Math.min(l, r, t, b);
      if (m === l) { dx = -1; dz = 0; me.x = c.x0 - CR; } else if (m === r) { dx = 1; dz = 0; me.x = c.x1 + CR; } else if (m === t) { dx = 0; dz = -1; me.z = c.z0 - CR; } else { dx = 0; dz = 1; me.z = c.z1 + CR; }
    } else { dx /= d; dz /= d; me.x = px + dx * CR; me.z = pz + dz * CR; }
    const vn = me.vx * dx + me.vz * dz;
    if (vn < 0) { me.vx -= 1.3 * vn * dx; me.vz -= 1.3 * vn * dz; me.vx *= .85; me.vz *= .85; if (vn < -6) { hit = true; impact = Math.max(impact, -vn); } }
  }
  const Bd = world.B - 1.5;
  if (Math.abs(me.x) > Bd) { impact = Math.max(impact, Math.abs(me.vx)); me.x = Math.sign(me.x) * Bd; me.vx *= -.3; hit = true; }
  if (Math.abs(me.z) > Bd) { impact = Math.max(impact, Math.abs(me.vz)); me.z = Math.sign(me.z) * Bd; me.vz *= -.3; hit = true; }
  if (world.contain) { const cv = world.contain(me); if (cv > 6) { hit = true; impact = Math.max(impact, cv); } }
  for (const r of remotes.values()) {
    if (!r.d) continue; let dx = me.x - r.x, dz = me.z - r.z; const d = Math.hypot(dx, dz);
    if (d < 2.8 && d > .01) { dx /= d; dz /= d; me.x += dx * (2.8 - d) * .5; me.z += dz * (2.8 - d) * .5; me.vx += dx * 2.5; me.vz += dz * 2.5; }
  }

  // drift scoring
  const slip = Math.atan2(Math.abs(vl), Math.abs(vf));
  me.drifting = speed > 10 && slip > .28 && vf > 0;
  if (hit) me.combo = 0;
  if (me.drifting) { me.combo += speed * slip * dt * 9; me.comboT = 1.1; }
  else if (me.comboT > 0) { me.comboT -= dt; if (me.comboT <= 0) bankCombo(); }

  // crash damage
  if (impact > 9 && now > me.crashCd) {
    me.crashCd = now + 400; me.dmg = Math.min(1, me.dmg + .03 + (impact - 9) * .012); me.shake = Math.min(1.2, impact * .03);
    for (let i = 0; i < 14; i++) puff(me.x + (Math.random() - .5) * 3, me.z + (Math.random() - .5) * 3);
    crashSound(impact / 60);
    if (me.dmg >= 1 && me.wreckT <= 0) me.wreckT = 2.5;
    else if (impact > 25) toast('Big crash! Car damage ' + Math.round(me.dmg * 100) + '%');
  }
  // tyre wear + pit stops (Grand Prix only)
  if (gpm) me.tyre = Math.max(0, me.tyre - speed * dt * (me.drifting ? 4 : 1) * (me.compound === 'wet' && !state.wet ? 3 : 1) / 9000);
  if (world.pitBox) {
    const inBox = world.pitBox(me.x, me.z);
    if (inBox && speed < 2 && !me.pitDone) {
      me.pitT += dt; me.pitMsg = 'PIT ' + Math.max(0, 2.5 - me.pitT).toFixed(1);
      if (me.pitT >= 2.5) { me.tyre = 1; me.dmg = 0; me.nitro = 1; me.pitDone = true; me.pitMsg = ''; me.compound = state.wet ? 'wet' : 'slick'; toast('Pit stop done — ' + (state.wet ? 'wet tyres' : 'slick tyres') + ' fitted, car repaired. Go!'); }
    } else { if (!inBox) me.pitDone = false; me.pitT = 0; me.pitMsg = ''; }
  }
  if (me.wreckT > 0) {
    me.wreckT -= dt; me.pitMsg = 'WRECKED';
    if (me.wreckT <= 0) { me.pitMsg = ''; me.dmg = gpm ? .3 : 0; me.wreckT = 0; respawn(); }
  }
  const wingOn = me.dmg < .4;
  if (me.mesh.userData.wing) for (const m of me.mesh.userData.wing) m.visible = wingOn;
  if (cock && cock.wing) for (const m of cock.wing) m.visible = wingOn;

  // nitro
  if (boost) me.nitro = Math.max(0, me.nitro - dt / 3.2); else me.nitro = Math.min(1, me.nitro + dt * (me.drifting ? .22 : .07));

  // checkpoints / laps
  const cps = world.cps, cp = cps[me.cp], dcp = Math.hypot(me.x - cp.x, me.z - cp.z);
  if (dcp < cp.r) {
    me.cp++; me.passed++;
    if (me.cp >= cps.length) {
      me.cp = 0; me.lap++;
      const lt = now - me.lapStart; me.lapStart = now; me.last = lt;
      if (state.mode !== 'drift') { if (me.best == null || lt < me.best) { me.best = lt; saveRecord(state.mode, Math.round(lt)); toast('New best lap  ' + fmt(lt)); } else toast('Lap  ' + fmt(lt)); }
      if (race.phase === 'run' && MODES[state.mode].laps && me.lap >= MODES[state.mode].laps) finish(now - race.t0);
    }
  }
  const nc = cps[me.cp]; me.prog = me.passed + 1 - Math.min(Math.hypot(me.x - nc.x, me.z - nc.z), 999) / 1000;

  // visuals
  me.mesh.position.set(me.x, 0, me.z); me.mesh.rotation.y = me.h; me.mesh.rotation.z = clamp(vl * .012, -.12, .12) * (me.spec.type === 'formula' ? .3 : 1);
  if (me.mesh.userData.fw) for (const w of me.mesh.userData.fw) w.rotation.y = me.steer * .32;
  if (world.showCps) { cpMarker.visible = true; cpMarker.position.set(nc.x, 0, nc.z); } else cpMarker.visible = false;
  if (audio && audio.o) { audio.o.frequency.value = 55 + (speed % 24) * 5 + speed * 1.6; audio.g.gain.value = muted ? 0 : .025 + Math.abs(thr) * .03; }
}
function crashSound(v) {
  if (!audio || !audio.ctx || muted) return;
  const c = audio.ctx, n = c.sampleRate * .4 | 0, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = c.createBufferSource(), g = c.createGain(); src.buffer = b; g.gain.value = clamp(v, .08, .5); src.connect(g); g.connect(c.destination); src.start();
}
function bankCombo() { if (me.combo > 0) me.score += Math.round(me.combo); me.combo = 0; me.comboT = 0; }

function toggleCam() { camMode = camMode === 'cockpit' ? 'chase' : 'cockpit'; toast(camMode === 'cockpit' ? 'Cockpit camera' : 'Chase camera'); }
function updateCamera(dt) {
  me.mesh.visible = camMode !== 'cockpit';
  if (camMode === 'cockpit') {
    const sp = Math.hypot(me.vx, me.vz), s = Math.sin(me.h), c = Math.cos(me.h);
    camera.position.set(me.x + s * cock.eyeZ, cock.eyeY, me.z + c * cock.eyeZ);
    camera.rotation.set(-.035, me.h + Math.PI + me.steer * .07, clamp((me.vl || 0) * .004, -.05, .05));
    const fov = 72 + sp * .12 + (me.boosting ? 6 : 0);
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
    cock.wheel.rotation.z = me.steer * .85;
    for (const g of cock.fw) g.rotation.y = me.steer * .32;
    cock.root.position.y = Math.sin(performance.now() * .06) * sp * .00012;
    camH = me.h;
    return;
  }
  camH += angDiff(me.h, camH) * Math.min(1, dt * 4.5);
  const sp = Math.hypot(me.vx, me.vz), dist = 8.5 + sp * .04, hgt = 3.6 + sp * .012;
  camera.position.set(me.x - Math.sin(camH) * dist, hgt, me.z - Math.cos(camH) * dist);
  camera.lookAt(me.x + Math.sin(me.h) * 3, 1.3, me.z + Math.cos(me.h) * 3);
  const fov = 62 + sp * .2 + (me.boosting ? 7 : 0);
  camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
}

/* ───────────────────────── race flow ───────────────────────── */
function mySlot() { const i = net.roster.findIndex(p => p.id === net.id); return i < 0 ? 0 : i; }
function requestStart() {
  if (net.online && !net.host) return toast('Only the host can start the race');
  if (race.phase === 'count') return;
  if (net.host) broadcast({ t: 'start' });
  beginRace();
}
function beginRace() {
  placeAtSpawn(mySlot()); resetProgress(); me.score = 0; me.dmg = 0; me.tyre = 1; me.wreckT = 0; me.pitMsg = ''; me.compound = state.wet ? 'wet' : 'slick';
  race.phase = 'count'; race.t0 = performance.now() + 4000; race.results = []; $('results').hidden = true;
}
function updateRace(now) {
  const msg = $('msg');
  if (race.phase === 'count') {
    const rem = race.t0 - now;
    if (rem <= 0) { race.phase = 'run'; me.lapStart = race.t0; race.goUntil = now + 900; }
    else msg.textContent = rem > 3000 ? 'READY' : String(Math.ceil(rem / 1000));
  }
  if (race.phase === 'run') {
    msg.textContent = now < race.goUntil ? 'GO!' : '';
    if (state.mode === 'drift' && now - race.t0 >= MODES.drift.time * 1000) { bankCombo(); saveRecord('drift', me.score, true); finish(me.score); }
  } else if (race.phase === 'free') msg.textContent = now < (race.msgUntil || 0) ? race.msgText : '';
  if (me.pitMsg && race.phase !== 'count') msg.textContent = me.pitMsg;
}
function finish(val) {
  race.phase = 'free';
  const m = { t: 'fin', id: net.id, name: me.name, val };
  addResult(m);
  if (net.host) broadcast(m); else if (net.hostConn) net.hostConn.send({ t: 'fin', val });
  race.msgText = 'FINISH'; race.msgUntil = performance.now() + 2200;
}
function addResult(m) {
  if (race.results.some(r => r.id === m.id)) return;
  race.results.push(m);
  const dr = state.mode === 'drift';
  race.results.sort((a, b) => dr ? b.val - a.val : a.val - b.val);
  const el = $('results');
  el.innerHTML = `<h2>${dr ? 'Drift results' : 'Race results'}</h2>` + race.results.map((r, i) => `<div class="r"><span>${i + 1}. ${esc(r.name)}</span><span>${dr ? r.val + ' pts' : fmt(r.val)}</span></div>`).join('') + '<button id="closeRes">Close</button>';
  el.hidden = false; $('closeRes').onclick = () => el.hidden = true;
}

/* ───────────────────────── multiplayer (PeerJS, no server needed) ───────────────────────── */
const net = { peer: null, online: false, host: false, id: 'solo', code: '', conns: new Map(), hostConn: null, roster: [], latest: {} };
const myInfo = () => ({ id: net.id, name: me.name, car: me.spec.id, color: me.color, color2: me.color2 });
const myData = () => [+me.x.toFixed(2), +me.z.toFixed(2), +me.h.toFixed(3), Math.round(Math.hypot(me.vx, me.vz)), me.drifting ? 1 : 0, +me.prog.toFixed(3), me.score + Math.round(me.combo), me.lap, Math.round(me.last || 0), Math.round(me.best || 0), Math.round(me.dmg * 100)];
const setStatus = t => $('status').textContent = t;
function broadcast(m) { for (const c of net.conns.values()) if (c.open) c.send(m); }
function sendRoster() { broadcast({ t: 'roster', list: net.roster, mode: state.mode, wet: state.wet }); syncRemotes(); }

function createRoom() {
  if (!window.Peer) return setStatus('Multiplayer library failed to load — check your internet connection.');
  setStatus('Creating lobby…');
  const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join('');
  const peer = new Peer(PREFIX + code);
  peer.on('open', () => { Object.assign(net, { peer, online: true, host: true, id: 'host', code }); net.roster = [myInfo()]; enterGame(); });
  peer.on('connection', c => {
    c.on('data', d => hostData(c, d));
    c.on('close', () => dropClient(c.peer));
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && !net.online) { peer.destroy(); createRoom(); }
    else if (!net.online) setStatus('Could not create room (' + e.type + '). Try again.');
  });
}
function hostData(c, d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'hello') {
    if (net.roster.length >= 8 && !net.conns.has(c.peer)) return c.send({ t: 'full' });
    net.conns.set(c.peer, c);
    net.roster = net.roster.filter(p => p.id !== c.peer);
    const car = CARS.some(k => k.id === d.car) ? d.car : 'vento';
    const color = /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : '#ffffff';
    const name = String(d.name || 'Driver').slice(0, 14);
    const color2 = /^#[0-9a-f]{6}$/i.test(d.color2) ? d.color2 : color;
    net.roster.push({ id: c.peer, name, car, color, color2 });
    sendRoster(); toast(name + ' joined');
  } else if (d.t === 's' && Array.isArray(d.d)) {
    net.latest[c.peer] = d.d; const r = remotes.get(c.peer); if (r) r.d = d.d;
  } else if (d.t === 'fin') {
    const p = net.roster.find(p => p.id === c.peer); if (!p) return;
    const m = { t: 'fin', id: c.peer, name: p.name, val: Number(d.val) || 0 }; addResult(m); broadcast(m);
  }
}
function dropClient(id) {
  const p = net.roster.find(p => p.id === id); if (!p) return;
  net.conns.delete(id); delete net.latest[id]; net.roster = net.roster.filter(p => p.id !== id);
  sendRoster(); toast(p.name + ' left');
}
function joinRoom(raw) {
  if (!window.Peer) return setStatus('Multiplayer library failed to load — check your internet connection.');
  const code = raw.trim().toUpperCase();
  if (code.length !== 4) return setStatus('Enter the 4-letter lobby code your friend gave you.');
  setStatus('Connecting to room ' + code + '…');
  const peer = new Peer();
  peer.on('open', id => {
    const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
    const to = setTimeout(() => { if (!net.online) { setStatus('Could not reach room ' + code + '.'); peer.destroy(); } }, 12000);
    c.on('open', () => { clearTimeout(to); Object.assign(net, { peer, online: true, host: false, id, code, hostConn: c }); c.send({ t: 'hello', name: me.name, car: me.spec.id, color: me.color, color2: me.color2 }); });
    c.on('data', clientData);
    c.on('close', () => { if (net.online) { net.online = false; net.hostConn = null; net.roster = []; syncRemotes(); updateRoomUI(); toast('Host left — you are now driving solo'); } });
  });
  peer.on('error', e => { if (!net.online) setStatus(e.type === 'peer-unavailable' ? 'Room ' + code + ' not found.' : 'Connection error (' + e.type + ').'); });
}
function clientData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'wx') { state.wet = !d.wet; setWet(!!d.wet); return; }
  if (d.t === 'roster') {
    net.roster = d.list;
    if (state.screen !== 'play') state.wet = !!d.wet; else setWet(!!d.wet, true);
    if (state.screen !== 'play') { state.mode = MODES[d.mode] ? d.mode : 'city'; enterGame(); }
    else if (d.mode !== state.mode && MODES[d.mode]) setMode(d.mode);
    syncRemotes(); updateRoomUI();
  } else if (d.t === 'snap') {
    for (const id in d.ps) { if (id === net.id) continue; const r = remotes.get(id); if (r) r.d = d.ps[id]; }
  } else if (d.t === 'start') beginRace();
  else if (d.t === 'fin') { if (d.id !== net.id) addResult(d); }
  else if (d.t === 'full') setStatus('That room is full (8 players max).');
}
function netTick() {
  if (state.screen !== 'play' || !net.online) return;
  if (net.host) { net.latest.host = myData(); if (net.conns.size) broadcast({ t: 'snap', ps: net.latest }); }
  else if (net.hostConn && net.hostConn.open) net.hostConn.send({ t: 's', d: myData() });
}
setInterval(netTick, 66);

function syncRemotes() {
  const want = new Map(net.roster.filter(p => p.id !== net.id).map(p => [p.id, p]));
  for (const [id, r] of remotes) {
    const p = want.get(id);
    if (!p || p.car !== r.car || p.color !== r.color || p.color2 !== r.color2 || p.name !== r.name) { scene.remove(r.mesh); remotes.delete(id); }
  }
  for (const [id, p] of want) {
    if (remotes.has(id)) continue;
    const spec = CARS.find(c => c.id === p.car) || CARS[0];
    const mesh = buildCar(spec, p.color, p.color2 || p.color); mesh.add(makeTag(p.name)); mesh.visible = false; scene.add(mesh);
    remotes.set(id, { id, name: p.name, car: p.car, color: p.color, color2: p.color2, mesh, d: net.latest[id] || null, x: 0, z: 0, h: 0, init: false });
  }
}
function updateRemotes(dt) {
  const k = Math.min(1, dt * 12);
  for (const r of remotes.values()) {
    if (!r.d) continue;
    if (!r.init) { r.x = r.d[0]; r.z = r.d[1]; r.h = r.d[2]; r.init = true; r.mesh.visible = true; }
    if (Math.hypot(r.d[0] - r.x, r.d[1] - r.z) > 40) { r.x = r.d[0]; r.z = r.d[1]; }
    r.x += (r.d[0] - r.x) * k; r.z += (r.d[1] - r.z) * k; r.h += angDiff(r.d[2], r.h) * k;
    r.mesh.position.set(r.x, 0, r.z); r.mesh.rotation.y = r.h;
    if (r.mesh.userData.wing) { const on = !(r.d[10] >= 40); for (const m of r.mesh.userData.wing) m.visible = on; }
  }
}

/* ───────────────────────── UI ───────────────────────── */
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }

const mapC = $('map'), mctx = mapC.getContext('2d'), mapBg = document.createElement('canvas'); mapBg.width = mapBg.height = 170;
const M = (x, z) => [(x / world.B * .46 + .5) * 170, (z / world.B * .46 + .5) * 170];
function drawMap() {
  mctx.clearRect(0, 0, 170, 170); mctx.drawImage(mapBg, 0, 0);
  if (world.showCps) { const c = world.cps[me.cp], [x, y] = M(c.x, c.z); mctx.fillStyle = '#ffd23f'; mctx.beginPath(); mctx.arc(x, y, 5, 0, TAU); mctx.fill(); }
  for (const r of remotes.values()) { if (!r.d) continue; const [x, y] = M(r.x, r.z); mctx.fillStyle = r.color; mctx.strokeStyle = '#000'; mctx.lineWidth = 1; mctx.beginPath(); mctx.arc(x, y, 4, 0, TAU); mctx.fill(); mctx.stroke(); }
  const [x, y] = M(me.x, me.z); mctx.save(); mctx.translate(x, y); mctx.rotate(-me.h); mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.moveTo(0, 7); mctx.lineTo(4.5, -5); mctx.lineTo(-4.5, -5); mctx.closePath(); mctx.fill(); mctx.restore();
}
function fastUI(now) {
  const spd = Math.hypot(me.vx, me.vz);
  $('spd').textContent = Math.round(spd * 3.6);
  $('gear').textContent = spd < .5 ? 'N' : Math.min(8, 1 + Math.floor(spd / (me.spec.max / 7)));
  $('nitro').firstElementChild.style.width = (me.nitro * 100) + '%';
  $('score').textContent = me.score;
  $('tyreBar').style.width = (me.tyre * 100) + '%'; $('tyreBar').style.background = me.tyre > .5 ? '#3dff7a' : me.tyre > .25 ? '#ffd23f' : '#e10600';
  $('dmgBar').style.width = (me.dmg * 100) + '%';
  $('tyreLbl').textContent = isGP(state.mode) ? (me.compound === 'wet' ? 'WETS' : 'SLICKS') : 'TYRES';
  $('combo').textContent = me.combo > 5 ? '+' + Math.round(me.combo) : '';
  const md = MODES[state.mode];
  if (state.mode === 'drift') {
    $('lapL').textContent = 'TIME LEFT';
    $('lap').textContent = race.phase === 'run' ? fmt(Math.max(0, md.time * 1000 - (now - race.t0))).slice(0, 4) : '1:30';
  } else {
    $('lapL').textContent = race.phase === 'free' ? 'FREE ROAM' : 'LAP';
    $('lap').textContent = race.phase === 'free' ? 'lap ' + (me.lap + 1) : Math.min(me.lap + 1, md.laps) + '/' + md.laps;
  }
  $('time').textContent = race.phase === 'run' ? fmt(now - race.t0) : race.phase === 'count' ? fmt(0) : fmt(now - me.lapStart);
  $('best').textContent = fmt(me.best);
}
function slowUI() {
  const dr = state.mode === 'drift';
  const list = [{ name: me.name, prog: me.prog, score: me.score + Math.round(me.combo), lap: me.lap, last: me.last, best: me.best, me: true }];
  for (const r of remotes.values()) list.push({ name: r.name, prog: r.d ? r.d[5] : -1, score: r.d ? r.d[6] : 0, lap: r.d ? r.d[7] : 0, last: r.d && r.d[8] || null, best: r.d && r.d[9] || null });
  list.sort((a, b) => dr ? b.score - a.score : b.prog - a.prog);
  me.rank = list.findIndex(p => p.me) + 1;
  $('pos').textContent = me.rank + '/' + list.length;
  drawDash(Math.hypot(me.vx, me.vz), me.spec.max, me.nitro);
  $('board').innerHTML = '<table><tr><th>#</th><th>Driver</th>' + (dr ? '<th>Score</th>' : '<th>Laps</th><th>Last lap</th><th>Best lap</th>') + '</tr>' +
    list.map((p, i) => `<tr class="${p.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.name)}</td>` + (dr ? `<td>${p.score}</td>` : `<td>${p.lap}</td><td>${fmt(p.last)}</td><td>${fmt(p.best)}</td>`) + '</tr>').join('') + '</table>';
}
function updateRoomUI() {
  const boss = !net.online || net.host;
  $('roomCode').innerHTML = net.online ? `ROOM<b>${net.code}</b>` : 'SOLO SESSION';
  $('copy').hidden = !net.online; $('modeSel').hidden = !boss; $('startBtn').hidden = !boss; $('wxSel').hidden = !boss; $('wxSel').value = state.wx;
  $('modeSel').value = state.mode;
}

function setMode(mode) {
  if (world) { scene.remove(world.group); world.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  state.mode = mode; world = mode === 'city' ? cityWorld() : trackWorld(mode); scene.add(world.group);
  const c = mapBg.getContext('2d'); c.clearRect(0, 0, 170, 170); world.drawMap(c, M);
  applyWeather();
  clearSkids(); race.phase = 'free'; race.results = []; race.msgUntil = 0; $('results').hidden = true;
  me.best = null; me.last = null; me.score = 0; me.dmg = 0; me.tyre = 1; me.wreckT = 0; me.pitMsg = ''; me.compound = state.wet ? 'wet' : 'slick'; resetProgress(); placeAtSpawn(mySlot());
  for (const r of remotes.values()) r.init = false;
  if (state.screen === 'play') { updateRoomUI(); toast(MODES[mode].name + (MODES[mode].laps ? ' — ' + MODES[mode].laps + ' laps' : ' — 90 s drift battle')); }
}
function enterGame() {
  state.screen = 'play'; $('menu').hidden = true; $('hud').hidden = false;
  if (me.mesh) scene.remove(me.mesh);
  me.mesh = buildCar(me.spec, me.color, me.color2); scene.add(me.mesh); buildCockpit(me.spec, me.color, me.color2);
  setMode(state.mode); syncRemotes(); updateRoomUI(); initAudio();
  toast(net.online ? (net.host ? 'Room ' + net.code + ' created — share the invite link!' : 'Joined room ' + net.code) : 'Free roam — press Enter to start a race');
}

// menu wiring
const carsEl = $('cars');
CARS.forEach((c, i) => {
  const d = document.createElement('div'); d.className = 'car' + (i ? '' : ' sel');
  const bar = (l, v) => `<span>${l}</span><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div>`;
  d.innerHTML = `<b>${c.name}</b><small>${c.desc}</small><div class="bars">${bar('Speed', c.max / 92)}${bar('Grip', c.grip / 10)}${bar('Drift', 1 - c.grip / 12)}</div>`;
  d.onclick = () => { carsEl.querySelectorAll('.car').forEach(e => e.classList.remove('sel')); d.classList.add('sel'); me.spec = c; if ($('team').value === '') $('color').value = c.color; };
  carsEl.appendChild(d);
});
try { $('name').value = localStorage.getItem('dd-name') || ''; } catch (e) { }
TEAMS.forEach((t, i) => { const o = document.createElement('option'); o.value = i; o.textContent = t.name; $('team').appendChild(o); });
$('team').onchange = e => { const t = TEAMS[e.target.value]; if (t) $('color').value = t.c1; };
function readMenu() {
  me.name = ($('name').value.trim() || 'Driver' + (Math.random() * 90 + 10 | 0)).slice(0, 14);
  me.color = $('color').value; const tm = TEAMS[$('team').value]; me.color2 = tm && tm.c1 === me.color ? tm.c2 : me.color; state.mode = $('mode0').value;
  try { localStorage.setItem('dd-name', $('name').value.trim()); } catch (e) { }
}
$('solo').onclick = () => { readMenu(); enterGame(); };
$('create').onclick = () => { readMenu(); createRoom(); };
$('join').onclick = () => { readMenu(); joinRoom($('code').value); };
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') $('join').click(); });
$('startBtn').onclick = e => { e.target.blur(); requestStart(); };
$('modeSel').onchange = e => { e.target.blur(); setMode(e.target.value); if (net.host) sendRoster(); };
$('wxSel').onchange = e => { e.target.blur(); setWeather(e.target.value); };
$('camBtn').onclick = e => { e.target.blur(); toggleCam(); };
$('leave').onclick = () => { location.href = location.pathname; };
$('copy').onclick = async () => {
  const url = location.origin + location.pathname + '?room=' + net.code;
  try { await navigator.clipboard.writeText(url); toast('Invite link copied'); } catch (e) { prompt('Send this link to your friends:', url); }
};
// website-style menu: mode pills, team cards, clock, personal records
const modeNames = { gp: 'Alpine Ring', gp2: 'São Paulo Circuit', gp3: 'Monte Carlo Streets', city: 'Neon City Street Race', drift: 'Drift Arena' };
function pickMode(m) { $('mode0').value = m; document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m)); $('roundName').textContent = modeNames[m]; }
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => pickMode(b.dataset.mode)); pickMode('gp');
const teamsEl = $('teamCards');
const markTeam = i => teamsEl.querySelectorAll('.team').forEach((e, k) => e.classList.toggle('sel', k === i));
TEAMS.forEach((t, i) => {
  const d = document.createElement('div'); d.className = 'team';
  d.innerHTML = `<i style="background:linear-gradient(100deg,${t.c1} 62%,${t.c2} 62%)"></i><b>${t.name}</b>`;
  d.onclick = () => { $('team').value = i; $('color').value = t.c1; markTeam(i); };
  teamsEl.appendChild(d);
});
$('color').oninput = () => { $('team').value = ''; markTeam(-1); };
const tick = () => $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); tick(); setInterval(tick, 20000);
function saveRecord(k, v, higher) { try { const r = JSON.parse(localStorage.getItem('dd-rec') || '{}'); if (r[k] == null || (higher ? v > r[k] : v < r[k])) { r[k] = v; localStorage.setItem('dd-rec', JSON.stringify(r)); } } catch (e) { } }
{ let r = {}; try { r = JSON.parse(localStorage.getItem('dd-rec') || '{}'); } catch (e) { }
  $('recBody').innerHTML = `<tr><td>Alpine Ring — best lap</td><td>${fmt(r.gp)}</td></tr><tr><td>São Paulo Circuit — best lap</td><td>${fmt(r.gp2)}</td></tr><tr><td>Monte Carlo Streets — best lap</td><td>${fmt(r.gp3)}</td></tr><tr><td>Neon City — best lap</td><td>${fmt(r.city)}</td></tr><tr><td>Drift Arena — best score</td><td>${r.drift != null ? r.drift + ' pts' : '—'}</td></tr>`; }
const qRoom = new URLSearchParams(location.search).get('room');
if (qRoom) { $('code').value = qRoom.slice(0, 4).toUpperCase(); setStatus('Enter your username, then press “Join lobby”.'); }

/* ───────────────────────── main loop ───────────────────────── */
setMode('city'); cpMarker.visible = false;
let last = performance.now(), uiAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state.screen === 'play') {
    updateRace(now); stepCar(dt, now); updateRemotes(dt); updateFx(dt); updateCamera(dt); updateRain(dt);
    if (me.shake > 0) { camera.position.x += (Math.random() - .5) * me.shake; camera.position.y += (Math.random() - .5) * me.shake * .5; me.shake = Math.max(0, me.shake - dt * 2); }
    fastUI(now); drawMap(); uiAcc += dt; if (uiAcc > .2) { uiAcc = 0; slowUI(); }
  } else {
    const t = now / 9000; camera.position.set(Math.cos(t) * 230, 95, Math.sin(t) * 230); camera.lookAt(0, 10, 0);
  }
  const ud = world.group.userData, fx = state.screen === 'play' ? me.x : 0, fz = state.screen === 'play' ? me.z : 0;
  ud.sky.position.copy(camera.position); ud.sun.target.position.set(fx, 0, fz); ud.sun.position.set(fx + ud.sunDir.x * 220, ud.sunDir.y * 220, fz + ud.sunDir.z * 220);
  frameNo++;
  if (state.screen === 'play' && camMode === 'cockpit' && frameNo > 5 && frameNo % 2 === 0) {
    mirrorCam.position.set(me.x, 1.1, me.z); mirrorCam.rotation.set(0, me.h, 0);
    renderer.shadowMap.autoUpdate = false; renderer.setRenderTarget(mirrorRT); renderer.render(scene, mirrorCam); renderer.setRenderTarget(null); renderer.shadowMap.autoUpdate = true;
  }
  renderer.render(scene, camera);
  if (state.screen === 'play' && camMode === 'cockpit') {
    cockCam.fov = camera.fov; cockCam.aspect = camera.aspect; cockCam.updateProjectionMatrix();
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(cockScene, cockCam); renderer.autoClear = true;
  }
}
requestAnimationFrame(frame);
window.__dd = { me, net, race, state, remotes, get world() { return world; } };
