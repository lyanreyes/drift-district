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
  { snd: 'formula', id: 'sabre', name: 'Sabre F-One', desc: 'Formula racer', color: '#1d7cf2', max: 90, acc: 25, grip: 10, steer: 2.6, type: 'formula' },
  { snd: 'v8', id: 'vento', name: 'Vento GT', desc: 'Balanced supercar', color: '#e63946', max: 76, acc: 21, grip: 7.5, steer: 2.4, type: 'sport' },
  { snd: 'turbo', id: 'kaiju', name: 'Kaiju RS', desc: 'Born to drift', color: '#ffb703', max: 70, acc: 20, grip: 5.2, steer: 2.9, type: 'coupe' },
  { snd: 'v8', id: 'brute', name: 'Brute V8', desc: 'Muscle power', color: '#8338ec', max: 74, acc: 24, grip: 6.2, steer: 2.2, type: 'muscle' },
  { snd: 'turbo', off: 1, id: 'rally', name: 'Gravel RS', desc: 'Rally car — loves dirt', color: '#2a9d8f', max: 68, acc: 23, grip: 6.5, steer: 2.8, type: 'rally' },
  { snd: 'v8', off: 1, id: 'pickup', name: 'Dune 4x4', desc: '4x4 pickup — goes anywhere', color: '#e76f51', max: 58, acc: 19, grip: 6, steer: 2.3, type: 'pickup' },
  { snd: 'v8', off: 1, big: 1, id: 'monster', name: 'Crusher', desc: 'Monster truck — hard to wreck', color: '#7cb518', max: 50, acc: 20, grip: 5, steer: 2.2, type: 'monster' },
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
  rally: { name: 'Forest Stage', laps: 3 },
  dunes: { name: 'Desert Dunes', laps: 3 },
  monster: { name: 'Monster Arena', laps: 3 },
  gp: { name: 'Austria Ring', laps: 10 },
  gp2: { name: 'São Paulo Circuit', laps: 10 },
  gp3: { name: 'Monte Carlo Streets', laps: 10 },
  gp4: { name: 'Japan Circuit', laps: 10 },
  gp5: { name: 'Singapore Night Streets', laps: 10 },
  drift: { name: 'Drift Arena', time: 90 },
};
const GP_PTS = [[80, 200], [-120, 200], [-230, 185], [-262, 120], [-250, -40], [-225, -170], [-170, -235], [-110, -200], [-20, -110], [70, -20], [150, 10], [215, -30], [270, -10], [285, 70], [250, 150], [190, 195]];
const JP_PTS = [[-40, -220], [120, -222], [230, -200], [280, -140], [250, -80], [270, -20], [225, 30], [255, 90], [215, 150], [240, 215], [170, 250], [60, 235], [-10, 180], [20, 110], [-30, 60], [-90, 110], [-120, 200], [-210, 245], [-290, 190], [-280, 90], [-275, -40], [-250, -130], [-215, -170], [-180, -178], [-165, -215]];
const SG_PTS = [[40, 220], [-140, 220], [-215, 200], [-235, 140], [-200, 95], [-240, 40], [-235, -80], [-200, -160], [-120, -175], [-60, -140], [-20, -190], [60, -200], [100, -150], [80, -80], [130, -30], [220, -50], [280, -10], [270, 70], [200, 90], [190, 150], [250, 180], [240, 235], [150, 225]];
const RALLY_PTS = [[0, -240], [140, -230], [250, -170], [230, -80], [280, 10], [220, 90], [250, 190], [160, 250], [60, 200], [-20, 250], [-130, 220], [-110, 130], [-200, 80], [-280, 130], [-300, 20], [-230, -60], [-270, -150], [-190, -230], [-100, -190]];
const SP_PTS = [[60, -230], [-90, -232], [-160, -205], [-170, -150], [-225, -110], [-260, -40], [-265, 80], [-250, 180], [-200, 235], [-120, 225], [-80, 160], [-110, 80], [-80, 10], [-10, -10], [40, 50], [10, 130], [50, 200], [130, 215], [170, 150], [130, 80], [170, 20], [245, 70], [295, 20], [305, -80], [275, -170], [190, -222]];
const MC_PTS = [[-120, -20], [-30, -20], [30, -5], [70, -45], [120, -120], [170, -185], [230, -200], [270, -165], [262, -110], [300, -80], [318, -45], [285, -30], [275, 10], [240, 45], [140, 70], [40, 75], [-30, 60], [-55, 85], [-100, 80], [-150, 95], [-210, 80], [-245, 105], [-295, 90], [-330, 55], [-300, 5], [-250, -18]];
const isGP = m => m.startsWith('gp');
const CATS = {
  f1: { name: 'Formula', maps: ['gp', 'gp2', 'gp3', 'gp4', 'gp5'], cars: ['sabre'] },
  rally: { name: 'Rally', maps: ['rally', 'dunes'], cars: ['rally', 'pickup'] },
  monster: { name: 'Monster Truck', maps: ['monster', 'dunes'], cars: ['monster'] },
  street: { name: 'Street', maps: ['city'], cars: ['vento', 'kaiju', 'brute'] },
  drift: { name: 'Drift', maps: ['drift'], cars: ['kaiju', 'vento', 'brute'] },
};
const TYRES = {
  soft: { name: 'Soft', dry: 1.06, wet: .55, wear: 2, col: 0xe10600 },
  medium: { name: 'Medium', dry: 1, wet: .58, wear: 1.1, col: 0xffd23f },
  hard: { name: 'Hard', dry: .95, wet: .56, wear: .65, col: 0xf4f4f4 },
  wet: { name: 'Wet', dry: .84, wet: .88, wear: 1, col: 0x1f6fe0 },
};
const DRIFT_PTS = [[-40, -120], [60, -100], [125, -40], [95, 30], [25, 25], [-5, 85], [60, 135], [10, 175], [-80, 150], [-70, 80], [-140, 50], [-175, -20], [-130, -90]];

/* ───────────────────────── renderer ───────────────────────── */
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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
TEX.sand = noiseTex([214, 186, 130], 34);
TEX.blotch = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  for (let i = 0; i < 46; i++) { const px = Math.random() * 256, py = Math.random() * 256, r = 12 + Math.random() * 44, gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(0,0,0,${.1 + Math.random() * .2})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); return t; })();
const TREAD = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#141518'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#34363c'; x.lineWidth = 6;
  for (let px = -8; px < 72; px += 16) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px + 10, 32); x.lineTo(px, 64); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 1); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const RIMTEX = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#16181c'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#c9ced6'; x.lineWidth = 9; x.beginPath(); x.arc(64, 64, 57, 0, 7); x.stroke(); x.lineWidth = 11;
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); x.stroke(); }
  x.fillStyle = '#8f96a3'; x.beginPath(); x.arc(64, 64, 15, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const WM = { rubber: new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: .88, side: THREE.DoubleSide }), tread: new THREE.MeshStandardMaterial({ map: TREAD, roughness: .92, side: THREE.DoubleSide }), metal: new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: .8, roughness: .35, side: THREE.DoubleSide }), rim: new THREE.MeshStandardMaterial({ map: RIMTEX, metalness: .5, roughness: .4 }) };
TEX.crowd = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#8f96a6'; x.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `hsl(${Math.random() * 360 | 0},${40 + Math.random() * 50 | 0}%,${35 + Math.random() * 45 | 0}%)`; x.fillRect(Math.random() * 256, Math.random() * 64, 3, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
TEX.fence = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.strokeStyle = '#d6dae2'; x.lineWidth = 3; x.strokeRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 30); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const textTex = (txt, bg, fg) => { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 512, 96); x.fillStyle = fg; x.font = 'bold 62px Segoe UI, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 256, 52); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
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
  const stripe = new THREE.MeshBasicMaterial({ color: 0xe10600 }); g.userData.stripe = stripe;
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
function wheelMesh(R, w, tread) {
  const grp = new THREE.Group(), spin = new THREE.Group(); spin.rotation.z = Math.PI / 2;
  const prof = [[R * .58, -w / 2], [R - .07, -w / 2], [R, -w / 2 + .08], [R, w / 2 - .08], [R - .07, w / 2], [R * .58, w / 2]].map(([x, y]) => new THREE.Vector2(x, y));
  spin.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 22), tread ? WM.tread : WM.rubber));
  spin.add(new THREE.Mesh(new THREE.CylinderGeometry(R * .6, R * .6, w * .8, 18, 1, true), WM.metal));
  for (const sd of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(R * .6, 20), WM.rim); cap.rotation.x = -sd * Math.PI / 2; cap.position.y = sd * w * .4; spin.add(cap); }
  grp.add(spin); return grp;
}
function buildCar(spec, color, color2 = color) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: .15, roughness: .35, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: .4 });
  const trim = new THREE.MeshPhysicalMaterial({ color: color2, metalness: .15, roughness: .35, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: .4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: .7 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a1420, metalness: .8, roughness: .12 });
  const head = new THREE.MeshBasicMaterial({ color: 0xfff6cc }), tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const box = (w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); g.add(me); return me; };
  const link = (a, b, m = dark, th = .1) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), me = new THREE.Mesh(new THREE.BoxGeometry(th, th, va.distanceTo(vb)), m); me.position.copy(va).lerp(vb, .5); me.lookAt(vb); g.add(me); };
  const wheel = (x, z, R, w, tread) => { const wm = wheelMesh(R, w, tread); wm.position.set(x, R, z); g.add(wm); return wm; };
  const t = spec.type;
  if (t === 'formula') g.userData.fw = buildFormula(g, paint, trim, dark, tail);
  else if (t === 'pickup' || t === 'monster') {
    const big = t === 'monster', R = big ? 1.0 : .52, lift = big ? 1.75 : .68, W = 1.0;
    g.add(loft([[2.5, W * .9, .2, lift + .3], [2.25, W, .3, lift + .34], [0, W, .32, lift + .36], [-2.4, W, .3, lift + .36], [-2.55, W * .95, .25, lift + .36]], paint, 18, 5));
    g.add(loft([[1.05, W * .86, .04, lift + .7], [.65, W * .9, .3, lift + .98], [-.35, W * .9, .3, lift + .98], [-.55, W * .88, .04, lift + .72]], glass, 16, 4));
    g.add(loft([[.62, W * .8, .03, lift + 1.29], [-.32, W * .8, .03, lift + 1.29]], trim, 12, 4));
    box(1.7, .06, 1.75, dark, 0, lift + .67, -1.5); box(1.2, .28, .08, dark, 0, lift + .36, 2.52);
    box(2.1, .16, .2, dark, 0, lift + .1, 2.58); box(2.1, .16, .2, dark, 0, lift + .1, -2.6); box(1.3, .1, .1, head, 0, lift + 1.36, .5);
    for (const sx of [-1, 1]) { box(.36, .16, .06, head, sx * .72, lift + .42, 2.5); box(.26, .22, .06, tail, sx * .8, lift + .42, -2.56); box(.14, .1, .2, dark, sx * 1.08, lift + .8, .9); }
    if (big) {
      for (const sx of [-1, 1]) { box(.14, .14, 4.4, dark, sx * .45, 1.3, 0); box(.1, .95, .1, trim, sx * .82, lift + 1.1, -.8); }
      box(1.74, .1, .1, trim, 0, lift + 1.58, -.8);
      for (const sz of [-1, 1]) { box(2.3, .24, .24, dark, 0, R, sz * 1.75); for (const sx of [-1, 1]) { link([sx * .45, 1.3, sz * .35], [sx * .78, R, sz * 1.75]); link([sx * .6, lift + .12, sz * 1.45], [sx * .95, R + .12, sz * 1.75], trim, .16); } }
    } else { box(1.7, .09, .09, dark, 0, lift + .52, 2.66); for (const sx of [-1, 1]) box(.09, .5, .09, dark, sx * .85, lift + .92, -.72); box(1.79, .09, .09, dark, 0, lift + 1.17, -.72); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(sx * (W + (big ? .48 : .02)), sz * 1.75, R, big ? .95 : .44, true);
  } else {
    const L = t === 'muscle' ? 4.8 : t === 'rally' ? 4.1 : 4.4, hL = L / 2, W = .95, low = t === 'sport';
    const roofY = low ? 1.1 : t === 'rally' ? 1.38 : 1.26, cf = low ? .55 : t === 'muscle' ? .25 : .6, cr = low ? -1.2 : t === 'muscle' ? -1.4 : -1.25, belt = low ? .78 : .84, gh = (roofY - belt) / 2;
    g.add(loft([[hL, W * .72, .15, .5], [hL - .3, W * .96, .23, .52], [hL * .5, W, .26, .55], [0, W, low ? .25 : .29, .56], [-hL * .5, W, .29, .57], [-hL + .3, W * .97, .26, .58], [-hL, W * .78, .17, .58]], paint, 18, 4.5));
    g.add(loft([[cf, W * .74, .04, belt - .02], [cf - .55, W * .8, gh, belt + gh], [cr + .5, W * .78, gh, belt + gh], [cr, W * .7, .04, belt]], glass, 16, 3.5));
    g.add(loft([[cf - .6, W * .66, .025, roofY], [cr + .55, W * .64, .025, roofY]], trim, 12, 4));
    box(W * 2 + .04, .14, L * .7, dark, 0, .3, 0); box(W * 1.5, .1, .1, dark, 0, .4, hL - .02); box(.5, .1, .1, dark, 0, .36, -hL + .02);
    for (const sx of [-1, 1]) { box(.4, .1, .08, head, sx * .56, .6, hL - .09); box(.46, .08, .08, tail, sx * .52, .68, -hL + .04); box(.15, .09, .2, paint, sx * (W + .05), .9, cf - .3); }
    if (low) { box(W * 2, .05, .36, trim, 0, 1.02, -hL + .22); for (const sx of [-1, 1]) box(.07, .22, .26, dark, sx * .7, .9, -hL + .22); box(W * 2 + .1, .05, .3, dark, 0, .28, hL - .05); }
    if (t === 'coupe') { box(W * 2 + .1, .06, .42, dark, 0, 1.36, -hL + .2); for (const sx of [-1, 1]) box(.07, .52, .26, dark, sx * .78, 1.1, -hL + .2); }
    if (t === 'muscle') { box(.7, .13, 1.1, dark, 0, .87, 1.15); box(W * 1.9, .05, .24, paint, 0, .9, -hL + .15); }
    if (t === 'rally') {
      box(W * 2 + .1, .06, .5, trim, 0, 1.5, -hL + .25); for (const sx of [-1, 1]) box(.08, .6, .3, dark, sx * .8, 1.2, -hL + .25);
      box(.5, .12, .5, dark, 0, roofY + .07, .1); for (const k of [-1.5, -.5, .5, 1.5]) box(.24, .24, .1, head, k * .3, .92, hL - .25);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(.34, .3, .04, trim, sx * .88, .22, sz * L * .31 - .45);
    }
    const R = t === 'rally' ? .37 : .35;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(sx * (W - .1), sz * L * .31, R, .3, t === 'rally');
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
  const mirror = mirrorMat; let wing = [], stripe = null;
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
    fw.push(...carG.userData.fw); wing = carG.userData.wing; stripe = carG.userData.stripe;
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
    eyeY = spec.type === 'monster' ? 2.75 : spec.type === 'pickup' ? 1.7 : 1.08; eyeZ = -.25;
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
  cock = { root, wheel, fw, eyeY, eyeZ, wing, stripe };
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
  const blot = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshBasicMaterial({ map: TEX.blotch, transparent: true, depthWrite: false })); blot.rotation.x = -Math.PI / 2; blot.position.y = -.07; g.add(blot);
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
  gp: { pts: GP_PTS, width: 16, B: 340, run: 7, theme: 'alpine' },
  gp4: { pts: JP_PTS, width: 15, B: 345, run: 7, theme: 'japan' },
  gp5: { pts: SG_PTS, width: 12, B: 345, run: 1.6, theme: 'singapore' },
  rally: { pts: RALLY_PTS, width: 12, B: 360, theme: 'rally' },
  gp2: { pts: SP_PTS, width: 15, B: 345, run: 7, theme: 'brazil' },
  gp3: { pts: MC_PTS, width: 11, B: 375, run: 1.6, theme: 'monaco' },
  drift: { pts: DRIFT_PTS, width: 18, N: 360, B: 240, theme: 'drift' },
};
const SKIES = {
  alpine: { top: 0x2a66cc, hor: 0xbcd9f2, sunCol: 0xfff2d8, sunDir: [.5, .8, .35], cloud: .9, fog: [450, 1900], ground: 'grass', tint: 0xffffff, hemi: [0xcfe4ff, 0x4a6a3a, .55], sunI: 2.8 },
  brazil: { top: 0x2f78d8, hor: 0xd9e8f2, sunCol: 0xfff0c8, sunDir: [-.4, .85, .3], cloud: 1, fog: [450, 1900], ground: 'grass', tint: 0xe6f5b8, hemi: [0xd8e8ff, 0x5a7a3a, .6], sunI: 3.0 },
  monaco: { top: 0x1f6fe0, hor: 0xcfe6fa, sunCol: 0xfff4dc, sunDir: [.3, .85, .45], cloud: .5, fog: [500, 2000], ground: 'asphalt', tint: 0xb4b4bc, hemi: [0xdcecff, 0x777777, .65], sunI: 2.9 },
  japan: { top: 0x3b7fd6, hor: 0xe6eef5, sunCol: 0xfff3d6, sunDir: [.45, .8, -.3], cloud: .8, fog: [450, 1900], ground: 'grass', tint: 0xf0ffd0, hemi: [0xdde9ff, 0x4a6a3a, .6], sunI: 2.9 },
  singapore: { top: 0x04050f, hor: 0x1b1f45, sunCol: 0xf2f5ff, sunDir: [.2, .9, .3], cloud: .25, fog: [300, 1500], ground: 'asphalt', tint: 0x55565f, hemi: [0xbfd0ff, 0x444455, 1.15], sunI: 1.9 },
  rally: { top: 0x4a86c8, hor: 0xe8d9b8, sunCol: 0xffe2b0, sunDir: [-.5, .55, .4], cloud: .6, fog: [300, 1500], ground: 'grass', tint: 0xd9cf88, hemi: [0xfff0d8, 0x6a5a3a, .7], sunI: 2.6 },
  arena: { top: 0x18214e, hor: 0xe08a55, sunCol: 0xfff0d0, sunDir: [.3, .8, .4], cloud: .5, fog: [300, 1400], ground: 'sand', tint: 0xb99a6c, hemi: [0xffe0c0, 0x554433, 1.0], sunI: 2.3 },
  desert: { top: 0x2f7fe0, hor: 0xf3dfb8, sunCol: 0xfff1c8, sunDir: [.6, .7, .2], cloud: .25, fog: [350, 1700], ground: 'sand', tint: 0xffffff, hemi: [0xfff3d8, 0x8a6a3a, .75], sunI: 3.0 },
  drift: { top: 0x38468a, hor: 0xf5a56c, sunCol: 0xffb070, sunDir: [-.7, .25, .4], cloud: .7, fog: [250, 1400], ground: 'asphalt', tint: 0x55555e, hemi: [0xffc9a0, 0x332233, .6], sunI: 2.4 },
};
function trackWorld(kind) {
  const T = TRACKS[kind], th = T.theme, gp = isGP(kind), rally = th === 'rally', street = th === 'monaco' || th === 'singapore', night = th === 'singapore';
  const pts = T.pts, width = T.width, B = T.B, run = T.run || 7, LIM = width / 2 + run + 1.2;
  const g = baseWorld(SKIES[th]);
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
  const N = T.N || Math.round(curve.getLength() / 2.7);
  const sp = curve.getSpacedPoints(N); sp.pop();
  const R = rng(kind.length * 7 + N);
  const road = new THREE.Color(rally ? 0xb08a5a : gp ? 0x5d6068 : 0x6a6a74), red = new THREE.Color(0xd62828), white = new THREE.Color(0xf4f4f4), yel = new THREE.Color(0xffd23f);
  const kA = th === 'brazil' ? new THREE.Color(0x1f9d3a) : red, kB = th === 'brazil' ? yel : white;
  g.add(ribbon(sp, -width / 2, width / 2, 0, () => road));
  if (!rally) g.add(ribbon(sp, width / 2, width / 2 + 1.3, .03, i => (i >> 1) % 2 ? kA : kB, .55));
  if (!rally) g.add(ribbon(sp, -width / 2 - 1.3, -width / 2, .03, i => (i >> 1) % 2 ? kA : kB, .55));
  if (gp) { g.add(ribbon(sp, width / 2 - .6, width / 2 - .35, .05, () => white)); g.add(ribbon(sp, -width / 2 + .35, -width / 2 + .6, .05, () => white)); }
  else if (!rally) g.add(ribbon(sp, -.15, .15, .05, i => i % 4 < 2 ? yel : null));

  const tan = i => { const p = sp[(i + N) % N], q = sp[(i + 1 + N) % N]; const l = Math.hypot(q.x - p.x, q.z - p.z); return [(q.x - p.x) / l, (q.z - p.z) / l]; };
  const [t0x, t0z] = tan(0), h0 = Math.atan2(t0x, t0z);
  // start line + gantry
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(width, 3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: checkerTex() }));
  sl.position.set(sp[0].x, .07, sp[0].z); sl.rotation.y = h0; g.add(sl);
  const gan = new THREE.Group(); gan.position.set(sp[0].x, 0, sp[0].z); gan.rotation.y = h0;
  const gm = new THREE.MeshLambertMaterial({ color: 0x222831 });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.8, 9, .8), gm); p.position.set(s * (width / 2 + 2.5), 4.5, 0); gan.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 6, 1.6, 1), new THREE.MeshBasicMaterial({ color: gp ? 0xd62828 : 0xff3d81 })); beam.position.y = 9; gan.add(beam);
  for (let k = -2; k <= 2; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.38, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff1a1a })); l.position.set(k * 1.3, 7.7, -.55); gan.add(l); }
  gan.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(gan);

  const distTo = (x, z) => { let m = 1e12; for (const p of sp) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
  const near = (x, z) => { let m = 1e12, bi = 0; for (let i = 0; i < N; i++) { const p = sp[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) { m = d; bi = i; } } const [tx, tz] = tan(bi); return { i: bi, d: Math.sqrt(m), off: (x - sp[bi].x) * tz - (z - sp[bi].z) * tx }; };
  const dummy = new THREE.Object3D();
  let pitLane = () => false, pitBox = null, pitW = () => 0, wallK = () => false;
  if (gp) {
    // pit lane on the right of the main straight, with four yellow service boxes; it funnels in and out
    const pitA = N - 40, pitLen = 62, pitCol = new THREE.Color(0x4a4c55);
    pitW = i => { const k = (i - pitA + N) % N; return k > pitLen ? 0 : clamp(Math.min(k, pitLen - k) / 6, 0, 1); };
    const boxK = i => (i - (N - 22) + N) % N;
    // pit wall between track and pit lane, pit crew at each box, and an entry gantry
    wallK = i => { const k = (i - pitA + N) % N; return k >= 12 && k <= pitLen - 12; };
    g.add(wall(sp, -8.7, 0, 1.0, i => wallK(i) ? (Math.floor(i / 3) % 2 ? red : white) : null));
    const crew = new THREE.InstancedMesh(new THREE.BoxGeometry(.5, 1.7, .5), new THREE.MeshLambertMaterial({ color: 0xe10600 }), 12);
    for (let b = 0; b < 4; b++) for (let q = 0; q < 3; q++) { const [cx, cz] = ribEdge(sp, (N - 22 + b * 8 + q) % N, -15.9); dummy.position.set(cx, .85, cz); dummy.updateMatrix(); crew.setMatrixAt(b * 3 + q, dummy.matrix); }
    crew.castShadow = true; g.add(crew);
    { const gi = (pitA + 13) % N, [tx, tz] = tan(gi), pg2 = new THREE.Group(); pg2.position.set(sp[gi].x, 0, sp[gi].z); pg2.rotation.y = Math.atan2(tx, tz);
      for (const px of [-8.9, -16.1]) { const po = new THREE.Mesh(new THREE.BoxGeometry(.4, 6.2, .4), gm); po.position.set(px, 3.1, 0); po.castShadow = true; pg2.add(po); }
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.4), new THREE.MeshBasicMaterial({ map: textTex('PIT LANE  100', '#0b0b10', '#ffffff'), side: THREE.DoubleSide })); sg.position.set(-12.5, 5.5, 0); sg.rotation.y = Math.PI; pg2.add(sg); g.add(pg2); }
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

    if (!street) {
      // trees
      const TN = th === 'alpine' ? 420 : 200, fol = new THREE.InstancedMesh(th === 'alpine' ? new THREE.ConeGeometry(4, 13, 8) : new THREE.IcosahedronGeometry(5, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), TN);
      const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.45, .6, 4, 6), new THREE.MeshLambertMaterial({ color: 0x4a3524 }), TN);
      const tc = new THREE.Color(); let n = 0;
      while (n < TN) {
        let x, z;
        if (R() < .65) { const p = sp[R() * N | 0], a = R() * TAU, r = 20 + R() * 60; x = p.x + Math.cos(a) * r; z = p.z + Math.sin(a) * r; }
        else { x = (R() * 2 - 1) * (B + 260); z = (R() * 2 - 1) * (B + 260); }
        if (distTo(x, z) < LIM + 6) continue;
        const s = .7 + R() * 1.0;
        dummy.position.set(x, 3 + 6.5 * s, z); dummy.scale.set(s, s, s); dummy.updateMatrix(); fol.setMatrixAt(n, dummy.matrix);
        if (th === 'japan' && R() < .4) tc.setHSL(.93, .7, .78); else tc.setHSL(.3 + R() * .08, .5, (th === 'alpine' ? .16 : .24) + R() * .1); fol.setColorAt(n, tc);
        dummy.position.set(x, 2, z); dummy.scale.set(s, 1, s); dummy.updateMatrix(); trunk.setMatrixAt(n, dummy.matrix); n++;
      }
      dummy.scale.set(1, 1, 1); fol.castShadow = true; g.add(fol, trunk);
      // grandstands on the left of the main straight
      const sm = new THREE.MeshLambertMaterial({ color: 0xffffff, map: TEX.crowd }), rm = new THREE.MeshLambertMaterial({ color: th === 'brazil' ? 0x1f9d3a : 0xd62828 });
      for (let b = 0; b < 3; b++) {
        const idx = (N - 30 + b * 26) % N, [gx, gz] = ribEdge(sp, idx, LIM + 11), [tx, tz] = tan(idx), gh = Math.atan2(tx, tz);
        const st = new THREE.Mesh(new THREE.BoxGeometry(12, 9, 62), sm); st.position.set(gx, 4.5, gz); st.rotation.y = gh; st.castShadow = true; g.add(st);
        const rf = new THREE.Mesh(new THREE.BoxGeometry(14, .6, 64), rm); rf.position.set(gx, 13, gz); rf.rotation.y = gh; rf.castShadow = true; g.add(rf);
      }
    } else {
      // harbour city: pastel buildings, the sea, yachts, and a tunnel
      const wc = document.createElement('canvas'); wc.width = 64; wc.height = 128; const wx = wc.getContext('2d');
      wx.fillStyle = night ? '#1c1f2a' : '#efe9dc'; wx.fillRect(0, 0, 64, 128);
      for (let r = 0; r < 12; r++) for (let c = 0; c < 5; c++) { wx.fillStyle = night ? (R() < .5 ? '#ffd98a' : R() < .3 ? '#8fe9ff' : '#0d0f16') : (R() < .8 ? '#4f6072' : '#c9b28a'); wx.fillRect(4 + c * 12, 4 + r * 10.3, 8, 6); }
      const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
      const BN = 260, bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), night ? new THREE.MeshStandardMaterial({ map: wt, emissiveMap: wt, emissive: 0xffffff, emissiveIntensity: .9, roughness: .8 }) : new THREE.MeshLambertMaterial({ map: wt }), BN), tc = new THREE.Color(); let n = 0, tries = 0;
      while (n < BN && tries++ < 6000) {
        const idx = R() * N | 0, side = R() < .5 ? -1 : 1, off = LIM + 10 + R() * 55, [x, z] = ribEdge(sp, idx, side * off);
        if ((th === 'monaco' && z > 108) || distTo(x, z) < LIM + 10 || (pitW(idx) > 0 && side < 0 && off < 46)) continue;
        const [tx, tz] = tan(idx), w = 12 + R() * 9, d = 12 + R() * 9, h = 10 + R() * 38;
        dummy.position.set(x, h / 2, z); dummy.rotation.set(0, Math.atan2(tx, tz), 0); dummy.scale.set(w, h, d); dummy.updateMatrix(); bm.setMatrixAt(n, dummy.matrix);
        tc.setHSL(.05 + R() * .1, .35 + R() * .3, .7 + R() * .2); bm.setColorAt(n, tc); n++;
      }
      bm.count = n; dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); bm.castShadow = true; g.add(bm);
      if (th === 'monaco') {
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 1600), new THREE.MeshStandardMaterial({ color: 0x1a6fb0, roughness: .12, metalness: .25 }));
      sea.rotation.x = -Math.PI / 2; sea.position.set(0, -.05, 120 + 800); g.add(sea);
      const ym = new THREE.MeshStandardMaterial({ color: 0xf6f6f6, roughness: .4 });
      for (let k = 0; k < 16; k++) { const y = new THREE.Mesh(new THREE.BoxGeometry(5 + R() * 3, 3, 14 + R() * 12), ym); y.position.set(-340 + R() * 680, 1.2, 135 + R() * 150); y.rotation.y = R() * TAU; y.castShadow = true; g.add(y); }
      const tA = near(240, 45).i, tB = near(40, 75).i, inT = i => i >= tA && i <= tB, conc = new THREE.Color(0x777a82), lamp = new THREE.Color(0xfff2b0);
      const roof = ribbon(sp, -LIM - .4, LIM + .4, 5.6, i => inT(i) ? conc : null); roof.castShadow = true; g.add(roof);
      for (const o of [LIM, -LIM]) g.add(wall(sp, o, 1.5, 5.6, i => inT(i) ? conc : null));
      g.add(ribbon(sp, -.35, .35, 5.5, i => inT(i) && i % 3 === 0 ? lamp : null));
      }
      // catch fences above the walls
      const fenceMat = new THREE.MeshBasicMaterial({ map: TEX.fence, transparent: true, alphaTest: .3, side: THREE.DoubleSide, color: night ? 0x9aa0b0 : 0xffffff });
      for (const o of [LIM, rightOff]) { const f = wall(sp, o, 1.5, 4.4, () => white); f.material = fenceMat; f.castShadow = false; g.add(f); }
      if (night) {
        // floodlights lining the street circuit
        const ids = []; for (let i = 0; i < N; i += 8) ids.push(i);
        const lm = new THREE.InstancedMesh(new THREE.BoxGeometry(.7, .35, 2.2), new THREE.MeshBasicMaterial({ color: 0xfff6dc }), ids.length * 2);
        const pl = new THREE.InstancedMesh(new THREE.BoxGeometry(.25, 9, .25), new THREE.MeshLambertMaterial({ color: 0x5a606c }), ids.length * 2);
        ids.forEach((idx, k) => [LIM + 1.3, rightOff(idx) - 1.3].forEach((o, q) => {
          const [x, z] = ribEdge(sp, idx, o), [tx, tz] = tan(idx); dummy.rotation.set(0, Math.atan2(tx, tz), 0);
          dummy.position.set(x, 9, z); dummy.updateMatrix(); lm.setMatrixAt(k * 2 + q, dummy.matrix);
          dummy.position.set(x, 4.5, z); dummy.updateMatrix(); pl.setMatrixAt(k * 2 + q, dummy.matrix);
        }));
        dummy.rotation.set(0, 0, 0); g.add(lm, pl);
      }
    }
    // rubbered-in racing line, gravel traps on the corners, overhead banners
    const rl = ribbon(sp, -2.4, 2.4, .012, () => new THREE.Color(0x0c0c0c)); Object.assign(rl.material, { transparent: true, opacity: .28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); g.add(rl);
    const curv = i => { const [ax, az] = tan(i - 4), [bx, bz] = tan(i + 4); return Math.abs(ax * bz - az * bx); }, gravel = new THREE.Color(0xcdbb8a);
    if (!street) {
      g.add(ribbon(sp, width / 2 + 1.3, width / 2 + run - .4, .012, i => curv(i) > .1 ? gravel : null, 1));
      g.add(ribbon(sp, -(width / 2 + run - .4), -(width / 2 + 1.3), .012, i => curv(i) > .1 && pitW(i) === 0 ? gravel : null, 1));
    }
    for (const fr of [.27, .52, .77]) {
      const idx = Math.round(N * fr), [tx, tz] = tan(idx), bg = new THREE.Group(); bg.position.set(sp[idx].x, 0, sp[idx].z); bg.rotation.y = Math.atan2(tx, tz);
      for (const sd of [-1, 1]) { const po = new THREE.Mesh(new THREE.BoxGeometry(.6, 8.6, .6), gm); po.position.set(sd * (LIM + .6), 4.3, 0); po.castShadow = true; bg.add(po); }
      const bb = new THREE.Mesh(new THREE.BoxGeometry(LIM * 2 + 1.8, 1.5, .5), new THREE.MeshBasicMaterial({ color: [0x1f4fd6, 0xffd23f, 0x1f9d3a][Math.round(fr * 4) % 3] })); bb.position.y = 8.6; bg.add(bb); g.add(bg);
    }
    // distant hills
    const hm = new THREE.MeshLambertMaterial({ color: th === 'monaco' ? 0x8d8f6a : th === 'brazil' ? 0x4f8a48 : 0x35603c });
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + R(), r = 950 + R() * 250, hgt = 70 + R() * 130; if (th === 'singapore' || (th === 'monaco' && Math.sin(a) > -.15)) continue; const h = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), hm); h.scale.set(320 + R() * 200, hgt, 320 + R() * 200); h.position.set(Math.cos(a) * r, -12, Math.sin(a) * r); g.add(h); }
    if (th === 'alpine') { // snow-capped peaks
      const rock = new THREE.MeshLambertMaterial({ color: 0x5c6470, flatShading: true }), snow = new THREE.MeshLambertMaterial({ color: 0xf2f6fa, flatShading: true });
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + R() * .5, r = 1150 + R() * 200, hh = 260 + R() * 200, w = 220 + R() * 120, ry = R() * 3;
        const m1 = new THREE.Mesh(new THREE.ConeGeometry(w, hh, 7), rock); m1.position.set(Math.cos(a) * r, hh / 2 - 10, Math.sin(a) * r); m1.rotation.y = ry;
        const m2 = new THREE.Mesh(new THREE.ConeGeometry(w * .37, hh * .36, 7), snow); m2.position.set(m1.position.x, hh * .82 - 9, m1.position.z); m2.rotation.y = ry; g.add(m1, m2); }
    }
    if (th === 'brazil') { // city skyline on the horizon
      const sk = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xaab4c4 }), 46);
      for (let i = 0; i < 46; i++) { const a = Math.PI * (.95 + R() * .75), r = 720 + R() * 220, hh = 40 + R() * R() * 170, w = 26 + R() * 30; dummy.position.set(Math.cos(a) * r, hh / 2, Math.sin(a) * r); dummy.scale.set(w, hh, w); dummy.updateMatrix(); sk.setMatrixAt(i, dummy.matrix); }
      dummy.scale.set(1, 1, 1); g.add(sk);
    }
    if (th === 'japan') { // ferris wheel beside the track
      const fi = Math.round(N * .6), [fx, fz] = ribEdge(sp, fi, LIM + 48), [tx, tz] = tan(fi), fg = new THREE.Group(), wm = new THREE.MeshLambertMaterial({ color: 0xf4f4f4 }), cols = [0xe10600, 0xffd23f, 0x1f6fe0, 0x1f9d3a];
      fg.position.set(fx, 34, fz); fg.rotation.y = Math.atan2(tx, tz) + Math.PI / 2;
      fg.add(new THREE.Mesh(new THREE.TorusGeometry(27, .6, 6, 40), wm));
      for (let k = 0; k < 8; k++) { const sp2 = new THREE.Mesh(new THREE.BoxGeometry(54, .35, .35), wm); sp2.rotation.z = k / 8 * Math.PI; fg.add(sp2); }
      for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, cb = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 3), new THREE.MeshLambertMaterial({ color: cols[k % 4] })); cb.position.set(Math.cos(a) * 27, Math.sin(a) * 27 - 2, 0); fg.add(cb); }
      for (const sd of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 40, 1.2), wm); leg.position.set(sd * 9, -17, 0); leg.rotation.z = sd * .26; fg.add(leg); }
      g.add(fg);
    }
  } else if (rally) {
    // forest stage
    const TN = 520, fol = new THREE.InstancedMesh(new THREE.ConeGeometry(4, 13, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }), TN);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.45, .6, 4, 6), new THREE.MeshLambertMaterial({ color: 0x4a3524 }), TN), tc = new THREE.Color(); let n = 0;
    while (n < TN) {
      let x, z;
      if (R() < .7) { const p = sp[R() * N | 0], a = R() * TAU, r = 12 + R() * 60; x = p.x + Math.cos(a) * r; z = p.z + Math.sin(a) * r; } else { x = (R() * 2 - 1) * (B + 260); z = (R() * 2 - 1) * (B + 260); }
      if (distTo(x, z) < width / 2 + 5) continue;
      const sc = .7 + R() * 1.0;
      dummy.position.set(x, 3 + 6.5 * sc, z); dummy.scale.set(sc, sc, sc); dummy.updateMatrix(); fol.setMatrixAt(n, dummy.matrix);
      tc.setHSL(.27 + R() * .08, .45, .18 + R() * .1); fol.setColorAt(n, tc);
      dummy.position.set(x, 2, z); dummy.scale.set(sc, 1, sc); dummy.updateMatrix(); trunk.setMatrixAt(n, dummy.matrix); n++;
    }
    dummy.scale.set(1, 1, 1); fol.castShadow = true; g.add(fol, trunk);
    const hm = new THREE.MeshLambertMaterial({ color: 0x6f7f4a });
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + R(), r = 950 + R() * 250; const h = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), hm); h.scale.set(320 + R() * 200, 70 + R() * 130, 320 + R() * 200); h.position.set(Math.cos(a) * r, -12, Math.sin(a) * r); g.add(h); }
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
      if (wallK(n.i) && Math.abs(n.off + 8.7) < 1.5) {
        const [tx, tz] = tan(n.i), sh = (n.off > -8.7 ? -7.2 : -10.2) - n.off, vl = m.vx * tz - m.vz * tx;
        m.x += sh * tz; m.z -= sh * tx; m.vx -= vl * tz; m.vz += vl * tx; return Math.abs(vl);
      }
      if (d <= lim) return 0;
      const nx = (m.x - bp.x) / d, nz = (m.z - bp.z) / d; m.x = bp.x + nx * lim; m.z = bp.z + nz * lim;
      const vn = m.vx * nx + m.vz * nz; if (vn > 0) { m.vx -= 1.4 * vn * nx; m.vz -= 1.4 * vn * nz; m.vx *= .9; m.vz *= .9; }
      return vn;
    } : null,
    onRoad: gp ? (x, z) => street || distTo(x, z) < width / 2 + 2.2 || pitLane(x, z) : rally ? (x, z) => distTo(x, z) < width / 2 + 1.5 : () => true, pitBox,
    pitLane: gp ? pitLane : null, loose: rally, grassy: gp && !street,
    spawn(i) { const idx = (N - 5 - Math.floor(i / 2) * 4) % N, p = sp[idx], [tx, tz] = tan(idx), o = (i % 2 ? -1 : 1) * width / 4; return { x: p.x + tz * o, z: p.z - tx * o, h: Math.atan2(tx, tz) }; },
    drawMap(c, M) { c.strokeStyle = '#8b93b8'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); sp.forEach((p, i) => { const [x, y] = M(p.x, p.z); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.stroke(); const [x, y] = M(sp[0].x, sp[0].z); c.fillStyle = '#fff'; c.fillRect(x - 3, y - 3, 6, 6); },
  };
}

const DUNE_PTS = [[0, -260], [150, -250], [270, -180], [300, -60], [230, 40], [280, 150], [200, 250], [70, 230], [-30, 280], [-160, 240], [-260, 170], [-220, 60], [-290, -40], [-250, -150], [-140, -200], [-90, -270]];
function terrainWorld(kind) {
  const arena = kind === 'monster', R = rng(arena ? 5 : 9), B = arena ? 135 : 390, width = 14;
  const g = baseWorld(SKIES[arena ? 'arena' : 'desert']), dummy = new THREE.Object3D();
  let sp = [], N = 0;
  // bumps: [x, z, radiusX, radiusZ, height, flatTop]
  const bumps = arena ? [[0, -50, 13, 22, 3.4, 0], [-20, 50, 9, 20, 2.6, 0], [20, 50, 9, 20, 2.6, 0], [0, 0, 17, 17, 4.6, 0], [-55, 0, 7, 13, 1.3, 1], [60, 2, 10, 10, 2.2, 0]] : [];
  if (!arena) {
    const curve = new THREE.CatmullRomCurve3(DUNE_PTS.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
    N = Math.round(curve.getLength() / 3); sp = curve.getSpacedPoints(N); sp.pop();
    for (const fr of [.14, .38, .6, .84]) { const p = sp[Math.round(N * fr)]; bumps.push([p.x, p.z, 11, 11, 2.8, 0]); }
  }
  const tan = i => { const p = sp[(i + N) % N], q = sp[(i + 1 + N) % N]; const l = Math.hypot(q.x - p.x, q.z - p.z); return [(q.x - p.x) / l, (q.z - p.z) / l]; };
  const distTo = (x, z) => { let m = 1e12; for (const p of sp) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
  const dune = (x, z) => 5 * (Math.sin(x * .021 + 1) * Math.cos(z * .017) + 1) + 2.2 * (Math.sin(x * .047 + z * .039) + 1);
  const height = (x, z) => {
    let h = 0;
    if (!arena) { const f = clamp((480 - Math.hypot(x, z)) / 90, 0, 1); h = dune(x, z) * f * f * (3 - 2 * f); }
    for (const b of bumps) { const d = Math.hypot((x - b[0]) / b[2], (z - b[1]) / b[3]); if (d < 1) h += b[4] * (b[5] ? Math.min(1, (1 - d) * 3) : (Math.cos(Math.PI * d) + 1) / 2); }
    return h;
  };
  // one terrain mesh; the driving line is painted into its vertex colours
  const S = arena ? 300 : 1040, seg = arena ? 150 : 208, geo = new THREE.PlaneGeometry(S, S, seg, seg).rotateX(-Math.PI / 2), pa = geo.attributes.position, uv = geo.attributes.uv, col = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), z = pa.getZ(i), h = height(x, z); pa.setY(i, h);
    const k = arena ? .8 + Math.min(.2, h * .05) : 1; let r = 1, gg = arena ? .92 : 1, b = arena ? .8 : 1;
    if (!arena && Math.abs(x) < 410 && Math.abs(z) < 410 && distTo(x, z) < width / 2) { r = .8; gg = .72; b = .62; }
    col[i * 3] = r * k; col[i * 3 + 1] = gg * k; col[i * 3 + 2] = b * k; uv.setXY(i, uv.getX(i) * S / 22, uv.getY(i) * S / 22);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const ter = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: TEX.sand, vertexColors: true, roughness: 1, metalness: 0 })); ter.receiveShadow = true; ter.material.userData.r = 1; ROADMATS.push(ter.material); g.add(ter);
  let cps, spawn, drawMap, contain = null;
  if (arena) {
    const A = 122, Bz = 82, ct = TEX.crowd.clone(); ct.wrapS = THREE.RepeatWrapping; ct.repeat.set(22, 1); ct.needsUpdate = true;
    const ring = (rt, rb, h, y, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 72, 1, true), mat); m.scale.set(A, 1, Bz); m.position.y = y; g.add(m); return m; };
    ring(1, 1, 3, 1.5, new THREE.MeshLambertMaterial({ color: 0xe9edf2, side: THREE.DoubleSide }));
    ring(1.03, 1.03, .7, 3.2, new THREE.MeshBasicMaterial({ color: 0xe10600, side: THREE.DoubleSide }));
    ring(1.3, 1.02, 15, 10.6, new THREE.MeshLambertMaterial({ map: ct, side: THREE.DoubleSide }));
    ring(1.34, 1.3, 2.5, 19.2, new THREE.MeshLambertMaterial({ color: 0x1c2030, side: THREE.DoubleSide }));
    const lampM = new THREE.MeshBasicMaterial({ color: 0xfff6dc }), poleM = new THREE.MeshLambertMaterial({ color: 0x4a505c });
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + .2, px = Math.cos(a) * A * 1.36, pz = Math.sin(a) * Bz * 1.36; const po = new THREE.Mesh(new THREE.BoxGeometry(1.2, 44, 1.2), poleM); po.position.set(px, 22, pz); const lp = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 1), lampM); lp.position.set(px, 45, pz); lp.lookAt(0, 0, 0); g.add(po, lp); }
    // row of scrap cars to drive over
    const jc = [0x7a2a2a, 0x2a4a7a, 0x6a6a2a, 0x3a6a4a];
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.15, 1.9), new THREE.MeshLambertMaterial({ color: jc[k] })); c.position.set(-55, .62, -8.4 + k * 5.6); c.castShadow = true; g.add(c); const cab = new THREE.Mesh(new THREE.BoxGeometry(2, .5, 1.7), new THREE.MeshLambertMaterial({ color: 0x1a1d22 })); cab.position.set(-55.3, 1.25, -8.4 + k * 5.6); g.add(cab); }
    // tyre-stack markers around the course
    const tm = new THREE.InstancedMesh(new THREE.CylinderGeometry(.9, .9, 1.4, 10), new THREE.MeshLambertMaterial({ color: 0x18191c }), 40);
    for (let k = 0; k < 40; k++) { const a = k / 40 * TAU, rr = k % 2 ? .62 : .96; dummy.position.set(Math.cos(a) * A * rr * (k % 2 ? .55 : 1) + (k % 2 ? 0 : 0), .7, Math.sin(a) * Bz * rr * (k % 2 ? .4 : 1)); dummy.updateMatrix(); tm.setMatrixAt(k, dummy.matrix); }
    g.add(tm);
    cps = [[-70, -48], [0, -50], [70, -48], [100, 0], [70, 48], [20, 50], [-20, 50], [-70, 48], [-100, 0]].map(([x, z]) => ({ x, z, r: 15 }));
    spawn = i => ({ x: -100 + (i % 2 ? 4.5 : -4.5), z: 14 + Math.floor(i / 2) * 8, h: Math.PI });
    drawMap = (c, M) => { c.strokeStyle = '#8b93b8'; c.lineWidth = 3; c.beginPath(); for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU, [x, y] = M(Math.cos(a) * A, Math.sin(a) * Bz); k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.strokeStyle = '#ff3d81'; c.lineWidth = 2.5; c.beginPath(); cps.forEach((p, k) => { const [x, y] = M(p.x, p.z); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.stroke(); };
    contain = m => { const e = Math.hypot(m.x / (A - 4), m.z / (Bz - 4)); if (e <= 1) return 0; let nx = m.x / (A * A), nz = m.z / (Bz * Bz); const l = Math.hypot(nx, nz); nx /= l; nz /= l; m.x /= e; m.z /= e; const vn = m.vx * nx + m.vz * nz; if (vn > 0) { m.vx -= 1.4 * vn * nx; m.vz -= 1.4 * vn * nz; } return vn; };
  } else {
    // rocks, cacti, route posts, mesas
    const rk = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x9a7a5c, flatShading: true }), 110);
    const ca = new THREE.InstancedMesh(new THREE.CylinderGeometry(.38, .45, 4, 7), new THREE.MeshLambertMaterial({ color: 0x3f7d3a }), 80);
    let n = 0, m2 = 0, guard = 0;
    while ((n < 110 || m2 < 80) && guard++ < 4000) { const x = (R() * 2 - 1) * 430, z = (R() * 2 - 1) * 430; if (distTo(x, z) < width / 2 + 4) continue; const y = height(x, z);
      if (n < 110 && R() < .6) { const sc = .8 + R() * 2.6; dummy.position.set(x, y + sc * .3, z); dummy.scale.set(sc * (1 + R()), sc, sc * (1 + R())); dummy.rotation.set(R(), R() * 6, 0); dummy.updateMatrix(); rk.setMatrixAt(n++, dummy.matrix); }
      else if (m2 < 80) { dummy.position.set(x, y + 2, z); dummy.scale.set(1, .6 + R() * .9, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); ca.setMatrixAt(m2++, dummy.matrix); } }
    rk.count = n; ca.count = m2; dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); rk.castShadow = ca.castShadow = true; g.add(rk, ca);
    const posts = []; for (let i = 0; i < N; i += 7) posts.push(i);
    const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(.25, 1.8, .25), new THREE.MeshBasicMaterial({ color: 0xffffff }), posts.length * 2), pc = new THREE.Color();
    posts.forEach((idx, k) => [1, -1].forEach((sd, q) => { const [x, z] = ribEdge(sp, idx, sd * (width / 2 + .8)); dummy.position.set(x, height(x, z) + .9, z); dummy.updateMatrix(); pm.setMatrixAt(k * 2 + q, dummy.matrix); pm.setColorAt(k * 2 + q, pc.set(sd > 0 ? 0xe10600 : 0xffffff)); }));
    g.add(pm);
    const mesa = new THREE.MeshLambertMaterial({ color: 0xb5744a, flatShading: true });
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + R(), r = 880 + R() * 260, hh = 60 + R() * 110, mm = new THREE.Mesh(new THREE.CylinderGeometry(90 + R() * 90, 130 + R() * 120, hh, 8), mesa); mm.position.set(Math.cos(a) * r, hh / 2 - 4, Math.sin(a) * r); mm.rotation.y = R() * 3; g.add(mm); }
    { const [tx, tz] = tan(0), y0 = height(sp[0].x, sp[0].z), sg = new THREE.Group(), gm = new THREE.MeshLambertMaterial({ color: 0x222831 }); sg.position.set(sp[0].x, y0, sp[0].z); sg.rotation.y = Math.atan2(tx, tz);
      for (const sd of [-1, 1]) { const po = new THREE.Mesh(new THREE.BoxGeometry(.7, 9, .7), gm); po.position.set(sd * (width / 2 + 2), 4.5, 0); po.castShadow = true; sg.add(po); }
      const bb = new THREE.Mesh(new THREE.BoxGeometry(width + 5, 1.6, .8), new THREE.MeshBasicMaterial({ color: 0xe10600 })); bb.position.y = 9; sg.add(bb); g.add(sg); }
    const step = N / 20; cps = []; for (let k = 1; k <= 20; k++) { const p = sp[Math.round(k * step) % N]; cps.push({ x: p.x, z: p.z, r: 24 }); }
    spawn = i => { const idx = (N - 5 - Math.floor(i / 2) * 4) % N, p = sp[idx], [tx, tz] = tan(idx), o = (i % 2 ? -1 : 1) * 3.4; return { x: p.x + tz * o, z: p.z - tx * o, h: Math.atan2(tx, tz) }; };
    drawMap = (c, M) => { c.strokeStyle = '#8b93b8'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); sp.forEach((p, i) => { const [x, y] = M(p.x, p.z); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.stroke(); };
  }
  return { group: g, B, cps, colliders: [], showCps: arena, height, loose: true, contain, onRoad: arena ? () => true : (x, z) => distTo(x, z) < width / 2 + 2, spawn, drawMap };
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
const state = { screen: 'menu', mode: 'city', cat: 'f1', wet: false, wx: 'dry' };
let world = null;
const me = { y: 0, vy: 0, air: false, airT: 0, pitch: 0, cat: 'f1', pick: { f1: 'sabre', rally: 'rally', monster: 'monster', street: 'vento', drift: 'kaiju' }, penalty: 0, strikes: 0, offT: 0, offFlag: false, pitSpeed: false, penCd: 0, tyreWarn: false, compound: 'medium', nextComp: 'medium', dmg: 0, tyre: 1, pitT: 0, pitDone: false, pitMsg: '', shake: 0, crashCd: 0, wreckT: 0, name: 'Driver', spec: CARS[0], color: '#e63946', color2: '#e63946', last: null, mesh: null, x: 0, z: 0, h: 0, vx: 0, vz: 0, steer: 0, nitro: 1, cp: 0, lap: 0, passed: 0, prog: 0, score: 0, combo: 0, comboT: 0, lapStart: 0, best: null, drifting: false, boosting: false, rank: 1 };
const race = { phase: 'free', t0: 0, results: [] };
const remotes = new Map();
let menuCar = null; const previewPos = { x: 0, z: 0 };
function refreshPreview() {
  if (state.screen !== 'menu' || !world) return;
  if (menuCar) scene.remove(menuCar);
  const col = $('color').value, tm = TEAMS[$('team').value], sp0 = world.spawn(0);
  menuCar = buildCar(me.spec, col, tm && tm.c1 === col ? tm.c2 : col); previewPos.x = sp0.x; previewPos.z = sp0.z;
  menuCar.position.set(sp0.x, 0, sp0.z); menuCar.rotation.y = sp0.h; scene.add(menuCar);
}
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
function puff(x, z) { smPos[smI * 3] = x + (Math.random() - .5); smPos[smI * 3 + 1] = .5 + (world && world.height ? world.height(x, z) : 0); smPos[smI * 3 + 2] = z + (Math.random() - .5); smLife[smI] = 1; smI = (smI + 1) % SM; }
const debris = [];
for (let i = 0; i < 36; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .6 })); m.visible = false; m.castShadow = true; scene.add(m); debris.push({ m, v: new THREE.Vector3(), w: new THREE.Vector3(), life: 0 }); }
const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a1e, transparent: true, opacity: 0, depthWrite: false })); scene.add(fireball);
let fireT = 0;
function explode(x, z, color, vx = 0, vz = 0) {
  let n = 0;
  for (const d of debris) {
    if (n >= 24) break; if (d.life > 0) continue; n++;
    const sc = .15 + Math.random() * .55; d.m.scale.set(sc * (.6 + Math.random()), sc * .5, sc * (1 + Math.random()));
    d.m.material.color.set(n % 3 === 0 ? color : n % 3 === 1 ? 0x111111 : 0x333842);
    d.g = world.height ? world.height(x, z) : 0; d.m.position.set(x + (Math.random() - .5) * 2, d.g + .6 + Math.random(), z + (Math.random() - .5) * 2);
    d.v.set(vx * .4 + (Math.random() - .5) * 16, 5 + Math.random() * 10, vz * .4 + (Math.random() - .5) * 16); d.w.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
    d.life = 3.2; d.m.visible = true;
  }
  fireball.position.set(x, 1 + (world.height ? world.height(x, z) : 0), z); fireT = .7;
  for (let i = 0; i < 30; i++) puff(x + (Math.random() - .5) * 4, z + (Math.random() - .5) * 4);
  crashSound(.5);
}
function driftFx(x, z, h, vh) { const s = Math.sin(h), c = Math.cos(h); for (const o of [-.9, .9]) { const wx = x - s * 1.4 + c * o, wz = z - c * 1.4 - s * o; if (!world.height) addSkid(wx, wz, vh); if (Math.random() < .5) puff(wx, wz); } }
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
  for (const d of debris) {
    if (d.life <= 0) continue; d.life -= dt; d.v.y -= 22 * dt; d.m.position.addScaledVector(d.v, dt);
    if (d.m.position.y < (d.g || 0) + .15) { d.m.position.y = (d.g || 0) + .15; d.v.y *= -.35; d.v.x *= .7; d.v.z *= .7; d.w.multiplyScalar(.7); }
    d.m.rotation.x += d.w.x * dt; d.m.rotation.y += d.w.y * dt; d.m.rotation.z += d.w.z * dt; if (d.life <= 0) d.m.visible = false;
  }
  if (fireT > 0) { fireT -= dt; fireball.scale.setScalar(1 + (.7 - fireT) * 9); fireball.material.opacity = Math.max(0, fireT / .7 * .9); }
  else fireball.material.opacity = 0;
  if ((state.wet || world.loose) && fxTick % 3 === 0 && world.loose && Math.hypot(me.vx, me.vz) > 10) puff(me.x - Math.sin(me.h) * 2.6, me.z - Math.cos(me.h) * 2.6);
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
  if (isGP(state.mode)) pickTyre(w ? 'wet' : (me.nextComp === 'wet' ? 'medium' : me.nextComp), true);
  if (!quiet) toast(w ? (isGP(state.mode) ? 'Rain! Pit for wet tyres' : 'Rain! Less grip — careful') : (isGP(state.mode) ? 'Track is drying — pit for slicks' : 'Track is drying'));
  if (!quiet) radio(w ? 'Rain is starting. ' + (isGP(state.mode) ? 'Box for wet tyres.' : 'Careful out there.') : 'Track is drying.' + (isGP(state.mode) ? ' Box for slicks.' : ''));
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
  if (e.code === 'Escape') $('settings').hidden = !$('settings').hidden;
  const ty = { Digit1: 'soft', Digit2: 'medium', Digit3: 'hard', Digit4: 'wet' }[e.code]; if (ty && isGP(state.mode)) pickTyre(ty);
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
const opt = { master: .8, engine: true, music: true, voice: true, shadows: true };
try { Object.assign(opt, JSON.parse(localStorage.getItem('dd-opt') || '{}')); } catch (e) { }
const saveOpt = () => { try { localStorage.setItem('dd-opt', JSON.stringify(opt)); } catch (e) { } };
let musicStep = 0;
setInterval(() => {
  if (!audio || !audio.ctx || muted || !opt.music || state.screen !== 'play') return;
  const c = audio.ctx, t = c.currentTime + .03, st = musicStep++ % 32, root = [55, 55, 65.4, 49][(st >> 3) % 4];
  const note = (f, dur, type, vol) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol * opt.master, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .02); };
  if (st % 2 === 0) note(root * (st % 8 === 6 ? 1.5 : 1), .24, 'sawtooth', .045);
  note(root * 4 * [1, 1.5, 2, 2.4, 3, 2.4, 2, 1.5][st % 8], .15, 'triangle', .026);
  if (st % 8 === 0) note(root * 2, 1.0, 'sine', .04);
}, 140);
function initAudio() {
  if (audio) return;
  try {
    const ctx = new AudioContext(), master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination);
    const shaper = ctx.createWaveShaper(), curve = new Float32Array(256); for (let i = 0; i < 256; i++) curve[i] = Math.tanh((i / 128 - 1) * 3); shaper.curve = curve;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800; lp.Q.value = 1.3;
    const eg = ctx.createGain(); eg.gain.value = 0; shaper.connect(lp); lp.connect(eg); eg.connect(master);
    const mk = (type, gv) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; g.gain.value = gv; o.connect(g); g.connect(shaper); o.start(); return { o, g }; };
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const nz = (type, f, q) => { const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true; const bf = ctx.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; src.connect(bf); bf.connect(g); g.connect(master); src.start(); return { f: bf, g }; };
    audio = { ctx, master, lp, eg, o1: mk('sawtooth', .5), o2: mk('sawtooth', .35), o3: mk('square', .1), sub: mk('triangle', .5), exh: nz('bandpass', 300, .8), wind: nz('highpass', 1800, .5), tyre: nz('bandpass', 2400, 6), rainN: nz('highpass', 5000, .3), rpm: 0 };
    loadSamples();
  } catch (e) { console.warn('Audio could not start', e); audio = {}; }
}
// real engine recordings: six rev-band loops (measured pitch in Hz) and one V8 loop cut from a longer recording
const SND_F = [43, 60, 65, 70, 73, 76];
async function loadSamples() {
  try {
    const c = audio.ctx, get = async u => c.decodeAudioData(await (await fetch(u)).arrayBuffer());
    const mkSrc = (buf, f0) => { const src = c.createBufferSource(), g = c.createGain(); src.buffer = buf; src.loop = true; g.gain.value = 0; src.connect(g); g.connect(audio.master); src.start(); return { s: src, g, f0 }; };
    const bufs = await Promise.all([0, 1, 2, 3, 4, 5].map(i => get('sounds/loop_' + i + '.wav')));
    audio.loops = bufs.map((b, i) => mkSrc(b, SND_F[i]));
    const v = await get('sounds/v8.ogg'), x = v.getChannelData(0), sr = v.sampleRate, a = Math.floor(9 * sr), n = Math.floor(1.8 * sr), xf = Math.floor(.15 * sr), lb = c.createBuffer(1, n, sr), y = lb.getChannelData(0);
    for (let i = 0; i < n; i++) y[i] = x[a + i];
    for (let k = 0; k < xf; k++) { const t = k / xf; y[n - xf + k] = y[n - xf + k] * (1 - t) + x[a - xf + k] * t; }
    audio.v8 = mkSrc(lb, 70);
  } catch (e) { console.warn('Engine recordings not loaded; using generated sound.', e); }
}
// [idle Hz, redline Hz, second-voice ratio, sub-bass level, brightness]
const SOUND = { formula: [95, 560, 1.006, .12, 2.2], v8: [34, 185, 1.5, .8, 1], turbo: [55, 320, 1.01, .35, 1.4] };
function updateAudio(speed, thr) {
  if (!audio || !audio.ctx) return;
  const sp = me.spec, pr = SOUND[sp.snd || 'v8'], t = audio.ctx.currentTime, span = sp.max / 7, set = (p, v) => p.setTargetAtTime(v, t, .04);
  const gear = Math.min(6, Math.floor(speed / span)); let rev = clamp((speed - gear * span) / span * .75 + .2, 0, 1);
  if (speed < 3 && K('KeyW', 'ArrowUp')) rev = .7;
  audio.rpm += (rev - audio.rpm) * .18;
  audio.master.gain.value = opt.master * .65;
  const f = pr[0] + (pr[1] - pr[0]) * audio.rpm, on = muted || !opt.engine || me.wreckT > 0 ? 0 : 1, th = Math.abs(thr);
  set(audio.o1.o.frequency, f); set(audio.o2.o.frequency, f * pr[2]); set(audio.o3.o.frequency, f * 2); set(audio.sub.o.frequency, f * .5); set(audio.sub.g.gain, pr[3]);
  set(audio.lp.frequency, (300 + audio.rpm * 2200 + th * 1400) * pr[4]);
  if (audio.loops) {
    const key = sp.snd || 'v8', useV8 = key === 'v8' && audio.v8, rg = { formula: [70, 240], v8: [36, 125], turbo: [48, 165] }[key];
    const ft = rg[0] * (rg[1] / rg[0]) ** audio.rpm, vol = on * (.35 + th * .45 + audio.rpm * .15), pos = audio.rpm * 5;
    audio.loops.forEach((L, i) => { set(L.s.playbackRate, clamp(ft / L.f0, .3, 4)); set(L.g.gain, useV8 ? 0 : vol * Math.max(0, 1 - Math.abs(pos - i))); });
    if (audio.v8) { set(audio.v8.s.playbackRate, clamp(ft / 70, .3, 4)); set(audio.v8.g.gain, useV8 ? vol * 1.6 : 0); }
    set(audio.eg.gain, on * .025 * (1 + th));
  } else set(audio.eg.gain, on * (.1 + th * .2 + audio.rpm * .08));
  set(audio.exh.f.frequency, f * 2.2); set(audio.exh.g.gain, on * th * (.05 + audio.rpm * .1));
  set(audio.wind.g.gain, on * Math.min(.13, speed / 85 * .13));
  set(audio.tyre.f.frequency, 1700 + speed * 22); set(audio.tyre.g.gain, on * (me.drifting ? .08 : 0));
  set(audio.rainN.g.gain, muted ? 0 : state.wet ? .05 : 0);
}
function beep() {
  if (!audio || !audio.ctx || muted) return;
  const c = audio.ctx, t = c.currentTime;
  for (const [dt, fq] of [[0, 1250], [.09, 1650]]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = fq; g.gain.setValueAtTime(.09, t + dt); g.gain.setTargetAtTime(0, t + dt + .05, .01); o.connect(g); g.connect(c.destination); o.start(t + dt); o.stop(t + dt + .12); }
}
// race engineer: on-screen radio line + spoken with the browser's built-in voice
let radioT = 0, radioBusy = 0;
function radio(text) {
  const now = performance.now(); if (now < radioBusy || state.screen !== 'play') return; radioBusy = now + 3200;
  const el = $('radio'); el.textContent = 'ENGINEER: ' + text; el.classList.add('on'); clearTimeout(radioT); radioT = setTimeout(() => el.classList.remove('on'), 4600);
  if (muted || !opt.voice) return;
  beep();
  try {
    const u = new SpeechSynthesisUtterance(text), vs = speechSynthesis.getVoices();
    u.rate = 1.15; u.pitch = .9; u.volume = .95; const v = vs.find(v => /en[-_]GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)); if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { }
}
function pickTyre(c, quiet) {
  if (!TYRES[c]) return; me.nextComp = c;
  if (race.phase !== 'run') { me.compound = c; me.tyre = 1; }
  document.querySelectorAll('#tyreSel button').forEach(b => b.classList.toggle('on', b.dataset.ty === c));
  if (!quiet) toast(race.phase === 'run' ? TYRES[c].name + ' tyres will go on at your next pit stop' : TYRES[c].name + ' tyres fitted');
}
function penalty(sec, why) { me.penalty += sec; toast('+' + sec + 's penalty — ' + why); radioBusy = 0; radio(sec + ' second penalty for ' + why + '.'); }
function lapRadio() {
  const L = MODES[state.mode].laps; if (race.phase !== 'run' || !L) return; const left = L - me.lap;
  if (left === 1) radio('Final lap. You are P' + me.rank + '. Bring it home.');
  else if (left > 1) radio('Lap ' + (me.lap + 1) + ' of ' + L + '. You are P' + me.rank + '.' + (me.tyre < .4 && isGP(state.mode) ? ' Tyres are worn. Box this lap.' : ''));
}

/* ───────────────────────── driving ───────────────────────── */
function placeAtSpawn(slot) { const s = world.spawn(slot); Object.assign(me, { x: s.x, z: s.z, h: s.h, vx: 0, vz: 0, steer: 0, vy: 0, air: false, y: world.height ? world.height(s.x, s.z) : 0 }); camH = s.h; }
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
  const max = s.max * (boost ? 1.22 : 1) * (onRoad ? 1 : (s.off ? .85 : .42)) * (1 - .35 * me.dmg), acc = s.acc * (boost ? 1.9 : 1);

  // longitudinal
  let sin = Math.sin(me.h), cos = Math.cos(me.h);
  let vf = me.vx * sin + me.vz * cos, vl = me.vx * cos - me.vz * sin;
  if (me.air) { } else if (thr > 0) { if (vf < 0) vf += 40 * dt; else if (vf < max) vf += acc * dt * (1 - (vf / max) ** 2); }
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
  me.h += me.steer * s.steer * sf * hs * (hb ? 1.5 : 1) * (me.air ? .25 : 1) * dt;

  // lateral grip (this is where the drift comes from)
  sin = Math.sin(me.h); cos = Math.cos(me.h);
  vf = me.vx * sin + me.vz * cos; vl = me.vx * cos - me.vz * sin;
  const gpm = isGP(state.mode);
  const TY = TYRES[me.compound], wetGrip = gpm ? (state.wet ? TY.wet : TY.dry) : (state.wet ? .74 : 1);
  let grip = s.grip * (onRoad ? 1 : (s.off ? .92 : .6)) * (world.loose ? (s.off ? .8 : .5) : 1) * (.68 + .32 * me.tyre) * wetGrip;
  if (hb) grip = 1.0; else if (Math.abs(vl) > 7) grip *= .45;
  if (me.air) grip = 0;
  vl *= Math.exp(-grip * dt);
  me.vx = sin * vf + cos * vl; me.vz = cos * vf - sin * vl; me.vl = vl;

  me.x += me.vx * dt; me.z += me.vz * dt;

  // collisions: buildings, world edge, other cars
  let hit = false, impact = 0; const CR = s.big ? 2.3 : 1.5;
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
    const rad = 2.8 + (s.big ? .9 : 0);
    if (d < rad && d > .01 && !(r.d[10] >= 100)) {
      dx /= d; dz /= d; me.x += dx * (rad - d) * .5; me.z += dz * (rad - d) * .5;
      const closing = -((me.vx - Math.sin(r.h) * r.d[3]) * dx + (me.vz - Math.cos(r.h) * r.d[3]) * dz);
      if (closing > 0) { const k = closing * (s.big ? .3 : .6); me.vx += dx * k; me.vz += dz * k; } else { me.vx += dx * 1.5; me.vz += dz * 1.5; }
      if (closing > 9) {
        hit = true; impact = Math.max(impact, closing * (s.big ? .45 : .9));
        if (race.phase === 'run' && closing > 14 && now > me.penCd && Math.sin(me.h) * dx + Math.cos(me.h) * dz < -.6) { me.penCd = now + 6000; penalty(5, 'causing a collision'); }
      }
    }
  }

  // height: follow the ground, take off over crests, land
  if (world.height) {
    const gh = world.height(me.x, me.z);
    if (me.air) {
      me.vy -= 26 * dt; me.y += me.vy * dt; me.airT += dt;
      if (me.y <= gh) {
        if (me.vy < -15) impact = Math.max(impact, 9.5 + (-me.vy - 15) * (s.off ? .5 : 1.6));
        if (me.airT > .45) { const pts = Math.round(me.airT * 100); me.score += pts; toast('Air time ' + me.airT.toFixed(1) + ' s   +' + pts); }
        me.y = gh; me.air = false; me.vy = 0; me.shake = Math.max(me.shake, .25);
      }
    } else {
      const vg = clamp((gh - me.y) / dt, -40, 40);
      if (me.vy - 26 * dt > vg + .15 && speed > 7) { me.air = true; me.airT = 0; me.y += me.vy * dt; } else { me.y = gh; me.vy = vg; }
    }
  } else { me.y = 0; me.air = false; }

  // drift scoring
  const slip = Math.atan2(Math.abs(vl), Math.abs(vf));
  me.drifting = speed > 10 && slip > .28 && vf > 0;
  if (hit) me.combo = 0;
  if (me.drifting) { me.combo += speed * slip * dt * 9; me.comboT = 1.1; }
  else if (me.comboT > 0) { me.comboT -= dt; if (me.comboT <= 0) bankCombo(); }

  // crash damage
  if (impact > 9 && now > me.crashCd) {
    const d0 = me.dmg; me.crashCd = now + 400; me.dmg = Math.min(1, me.dmg + (.03 + (impact - 9) * .012) * (s.big ? .4 : 1));
    if (d0 < .4 && me.dmg >= .4 && me.dmg < 1 && me.mesh.userData.wing) radio('Front wing damage. Box for repairs.'); me.shake = Math.min(1.2, impact * .03);
    for (let i = 0; i < 14; i++) puff(me.x + (Math.random() - .5) * 3, me.z + (Math.random() - .5) * 3);
    crashSound(impact / 60);
    if (me.dmg >= 1 && me.wreckT <= 0) { me.wreckT = 3.2; explode(me.x, me.z, me.color, me.vx, me.vz); me.vx = me.vz = 0; radioBusy = 0; radio('Car is destroyed. Are you okay?'); }
    else if (impact > 25) toast('Big crash! Car damage ' + Math.round(me.dmg * 100) + '%');
  }
  // tyre wear + pit stops (Grand Prix only)
  if (gpm) me.tyre = Math.max(0, me.tyre - speed * dt * (me.drifting ? 4 : 1) * TY.wear * (me.compound === 'wet' && !state.wet ? 3 : 1) / 9000);
  if (gpm && me.tyre < .3 && !me.tyreWarn) { me.tyreWarn = true; radio('Tyres are finished. Box, box.'); } else if (me.tyre > .9) me.tyreWarn = false;
  // penalties: track limits (3 warnings), pit lane speeding
  if (race.phase === 'run') {
    if (world.grassy && !onRoad && speed > 18) {
      me.offT += dt;
      if (me.offT > 1 && !me.offFlag) { me.offFlag = true; me.strikes++; if (me.strikes >= 3) { me.strikes = 0; penalty(5, 'track limits'); } else { toast('Track limits warning ' + me.strikes + ' of 3'); radio('Track limits. Warning ' + me.strikes + '.'); } }
    } else if (onRoad) { me.offT = 0; me.offFlag = false; }
  }
  if (world.pitLane && world.pitLane(me.x, me.z)) {
    if (!me.pitSpeed) { me.pitSpeed = true; toast('Pit limiter on — 100 km/h'); }
    const v2 = Math.hypot(me.vx, me.vz); if (v2 > 27.8) { const k = Math.max(27.8 / v2, 1 - 3 * dt); me.vx *= k; me.vz *= k; }
  } else me.pitSpeed = false;
  if (world.pitBox) {
    const inBox = world.pitBox(me.x, me.z);
    if (inBox && speed < 2 && !me.pitDone) {
      me.pitT += dt; me.pitMsg = 'PIT ' + Math.max(0, 2.5 - me.pitT).toFixed(1);
      if (me.pitT >= 2.5) { me.tyre = 1; me.dmg = 0; me.nitro = 1; me.pitDone = true; me.pitMsg = ''; me.compound = me.nextComp; toast('Pit stop done — ' + TYRES[me.compound].name + ' tyres fitted, car repaired. Go!'); radio('Tyres are on. Go, go, go!'); }
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
      const lt = now - me.lapStart; me.lapStart = now; me.last = lt; lapRadio();
      if (state.mode !== 'drift') { if (me.best == null || lt < me.best) { me.best = lt; saveRecord(state.mode, Math.round(lt)); toast('New best lap  ' + fmt(lt)); } else toast('Lap  ' + fmt(lt)); }
      if (race.phase === 'run' && MODES[state.mode].laps && me.lap >= MODES[state.mode].laps) finish(now - race.t0 + me.penalty * 1000);
    }
  }
  const nc = cps[me.cp]; me.prog = me.passed + 1 - Math.min(Math.hypot(me.x - nc.x, me.z - nc.z), 999) / 1000;

  // visuals
  let tp = 0;
  if (world.height) { if (me.air) tp = -Math.atan2(me.vy, Math.max(speed, 8)) * .7; else { const sn = Math.sin(me.h), cs = Math.cos(me.h); tp = -Math.atan((world.height(me.x + sn * 1.6, me.z + cs * 1.6) - world.height(me.x - sn * 1.6, me.z - cs * 1.6)) / 3.2); } }
  me.pitch += (tp - me.pitch) * Math.min(1, dt * 10);
  me.mesh.position.set(me.x, me.y, me.z); me.mesh.rotation.y = me.h; me.mesh.rotation.x = me.pitch; me.mesh.rotation.z = clamp(vl * .012, -.12, .12) * (me.spec.type === 'formula' ? .3 : 1);
  if (me.mesh.userData.fw) for (const w of me.mesh.userData.fw) w.rotation.y = me.steer * .32;
  if (world.showCps) { cpMarker.visible = true; cpMarker.position.set(nc.x, world.height ? world.height(nc.x, nc.z) : 0, nc.z); } else cpMarker.visible = false;
  updateAudio(speed, thr);
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
  const cm = me.wreckT > 0 ? 'chase' : camMode; me.mesh.visible = cm !== 'cockpit' && me.wreckT <= 0;
  if (cm === 'cockpit') {
    const sp = Math.hypot(me.vx, me.vz), s = Math.sin(me.h), c = Math.cos(me.h);
    camera.position.set(me.x + s * cock.eyeZ, cock.eyeY + me.y, me.z + c * cock.eyeZ);
    camera.rotation.set(-.035 - me.pitch, me.h + Math.PI + me.steer * .07, clamp((me.vl || 0) * .004, -.05, .05));
    const fov = 72 + sp * .12 + (me.boosting ? 6 : 0);
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
    cock.wheel.rotation.z = me.steer * .85;
    for (const g of cock.fw) g.rotation.y = me.steer * .32;
    cock.root.position.y = Math.sin(performance.now() * .06) * sp * .00012;
    camH = me.h;
    return;
  }
  camH += angDiff(me.h, camH) * Math.min(1, dt * 4.5);
  const sp = Math.hypot(me.vx, me.vz), dist = 8.5 + sp * .04 + (me.spec.big ? 4.5 : 0), hgt = 3.6 + sp * .012 + (me.spec.big ? 2.2 : 0);
  camera.position.set(me.x - Math.sin(camH) * dist, hgt + me.y, me.z - Math.cos(camH) * dist);
  if (world.height) camera.position.y = Math.max(camera.position.y, world.height(camera.position.x, camera.position.z) + 1.8);
  camera.lookAt(me.x + Math.sin(me.h) * 3, 1.3 + me.y, me.z + Math.cos(me.h) * 3);
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
  placeAtSpawn(mySlot()); resetProgress(); me.score = 0; me.dmg = 0; me.tyre = 1; me.wreckT = 0; me.pitMsg = ''; me.compound = me.nextComp; me.penalty = 0; me.strikes = 0; me.offT = 0; me.tyreWarn = false;
  race.phase = 'count'; race.t0 = performance.now() + 4000; race.results = []; $('results').hidden = true;
}
function updateRace(now) {
  const msg = $('msg');
  if (race.phase === 'count') {
    const rem = race.t0 - now;
    if (rem <= 0) { race.phase = 'run'; me.lapStart = race.t0; race.goUntil = now + 900; radio('Go, go, go!'); }
    else msg.textContent = rem > 3000 ? 'READY' : String(Math.ceil(rem / 1000));
  }
  if (race.phase === 'run') {
    msg.textContent = now < race.goUntil ? 'GO!' : '';
    if (state.mode === 'drift' && now - race.t0 >= MODES.drift.time * 1000) { bankCombo(); saveRecord('drift', me.score, true); finish(me.score); }
  } else if (race.phase === 'free') msg.textContent = now < (race.msgUntil || 0) ? race.msgText : '';
  if (me.pitMsg && race.phase !== 'count') msg.textContent = me.pitMsg;
}
function finish(val) {
  race.phase = 'free'; radioBusy = 0;
  radio(state.mode === 'drift' ? 'Session over. ' + val + ' points.' : me.rank === 1 ? 'P1! Fantastic drive, well done!' : 'P' + me.rank + '. Good job, nice race.' + (me.penalty ? ' ' + me.penalty + ' seconds of penalties were added.' : ''));
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
const myData = () => [+me.x.toFixed(2), +me.z.toFixed(2), +me.h.toFixed(3), Math.round(Math.hypot(me.vx, me.vz)), me.drifting ? 1 : 0, +me.prog.toFixed(3), me.score + Math.round(me.combo), me.lap, Math.round(me.last || 0), Math.round(me.best || 0), Math.round(me.dmg * 100), +me.y.toFixed(2)];
const setStatus = t => $('status').textContent = t;
function broadcast(m) { for (const c of net.conns.values()) if (c.open) c.send(m); }
function sendRoster() { broadcast({ t: 'roster', list: net.roster, mode: state.mode, cat: state.cat, wet: state.wet }); syncRemotes(); }

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
    const was = net.roster.some(p => p.id === c.peer);
    net.roster = net.roster.filter(p => p.id !== c.peer);
    const car = CARS.some(k => k.id === d.car) ? d.car : 'vento';
    const color = /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : '#ffffff';
    const name = String(d.name || 'Driver').slice(0, 14);
    const color2 = /^#[0-9a-f]{6}$/i.test(d.color2) ? d.color2 : color;
    net.roster.push({ id: c.peer, name, car, color, color2 });
    sendRoster(); if (!was) toast(name + ' joined');
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
    const newCat = CATS[d.cat] ? d.cat : state.cat, catChanged = newCat !== state.cat; state.cat = newCat;
    if (catChanged && state.screen === 'play' && d.mode === state.mode) fitCar();
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
    r.mesh.position.set(r.x, r.d[11] || 0, r.z); r.mesh.rotation.y = r.h;
    const dead = r.d[10] >= 100; if (dead && !r.dead) explode(r.x, r.z, r.color); r.dead = dead; r.mesh.visible = !dead;
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
  $('dmgBar').style.width = (me.dmg * 100) + '%'; $('pen').textContent = me.penalty ? '+' + me.penalty + 's' : '—';
  $('tyreLbl').textContent = isGP(state.mode) ? TYRES[me.compound].name.toUpperCase() + (me.nextComp !== me.compound ? ' > ' + TYRES[me.nextComp].name[0] : '') : 'TYRES';
  const tcol = TYRES[me.compound].col; if (me.mesh.userData.stripe) me.mesh.userData.stripe.color.setHex(tcol); if (cock && cock.stripe) cock.stripe.color.setHex(tcol);
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
  const pr = me.rank; me.rank = list.findIndex(p => p.me) + 1;
  if (race.phase === 'run' && list.length > 1 && pr !== me.rank && performance.now() - race.t0 > 6000) radio(me.rank < pr ? 'Great move. You are up to P' + me.rank + '.' : 'You lost a place. P' + me.rank + '.');
  $('pos').textContent = me.rank + '/' + list.length;
  drawDash(Math.hypot(me.vx, me.vz), me.spec.max, me.nitro);
  $('board').innerHTML = '<table><tr><th>#</th><th>Driver</th>' + (dr ? '<th>Score</th>' : '<th>Laps</th><th>Last lap</th><th>Best lap</th>') + '</tr>' +
    list.map((p, i) => `<tr class="${p.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.name)}</td>` + (dr ? `<td>${p.score}</td>` : `<td>${p.lap}</td><td>${fmt(p.last)}</td><td>${fmt(p.best)}</td>`) + '</tr>').join('') + '</table>';
}
function updateRoomUI() {
  const boss = !net.online || net.host;
  $('roomCode').innerHTML = net.online ? `ROOM<b>${net.code}</b>` : 'SOLO SESSION';
  $('copy').hidden = !net.online; $('modeSel').hidden = !boss; $('startBtn').hidden = !boss; $('wxSel').hidden = !boss; $('wxSel').value = state.wx; $('tyreSel').hidden = !isGP(state.mode);
  $('modeSel').value = state.cat + ':' + state.mode;
}

function fitCar() {
  const want = me.pick[state.cat]; if (!me.mesh || me.spec.id === want) return;
  me.spec = CARS.find(c => c.id === want); scene.remove(me.mesh); me.mesh = buildCar(me.spec, me.color, me.color2); scene.add(me.mesh); buildCockpit(me.spec, me.color, me.color2);
  if (net.host) { const p = net.roster.find(p => p.id === net.id); if (p) p.car = me.spec.id; }
  else if (net.hostConn && net.hostConn.open) net.hostConn.send({ t: 'hello', name: me.name, car: me.spec.id, color: me.color, color2: me.color2 });
}
function setMode(mode) {
  if (world) { scene.remove(world.group); world.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  state.mode = mode; world = mode === 'city' ? cityWorld() : (mode === 'monster' || mode === 'dunes') ? terrainWorld(mode) : trackWorld(mode); scene.add(world.group);
  const c = mapBg.getContext('2d'); c.clearRect(0, 0, 170, 170); world.drawMap(c, M);
  applyWeather(); if (state.screen === 'play') fitCar();
  clearSkids(); race.phase = 'free'; race.results = []; race.msgUntil = 0; $('results').hidden = true;
  me.best = null; me.last = null; me.score = 0; me.dmg = 0; me.tyre = 1; me.wreckT = 0; me.pitMsg = ''; me.compound = me.nextComp; resetProgress(); placeAtSpawn(mySlot());
  for (const r of remotes.values()) r.init = false;
  if (state.screen === 'play') { updateRoomUI(); toast(MODES[mode].name + (MODES[mode].laps ? ' — ' + MODES[mode].laps + ' laps' : ' — 90 s drift battle')); }
}
function enterGame() {
  state.screen = 'play'; $('menu').hidden = true; $('hud').hidden = false;
  if (menuCar) { scene.remove(menuCar); menuCar = null; } camera.clearViewOffset();
  me.spec = CARS.find(c => c.id === me.pick[state.cat]) || me.spec;
  if (me.mesh) scene.remove(me.mesh);
  me.mesh = buildCar(me.spec, me.color, me.color2); scene.add(me.mesh); buildCockpit(me.spec, me.color, me.color2);
  setMode(state.mode); syncRemotes(); updateRoomUI(); initAudio();
  toast(net.online ? (net.host ? 'Room ' + net.code + ' created — share the invite link!' : 'Joined room ' + net.code) : 'Free roam — press Enter to start a race');
}

// menu wiring
const carsEl = $('cars');
function renderCars(cat) {
  carsEl.innerHTML = '';
  const bar = (l, v) => `<span>${l}</span><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div>`;
  CATS[cat].cars.forEach(id => {
    const c = CARS.find(k => k.id === id), d = document.createElement('div'); d.className = 'car' + (me.pick[cat] === id ? ' sel' : '');
    d.innerHTML = `<b>${c.name}</b><small>${c.desc}</small><div class="bars">${bar('Speed', c.max / 92)}${bar('Grip', c.grip / 10)}${bar('Drift', 1 - c.grip / 12)}</div>`;
    d.onclick = () => { me.pick[cat] = id; me.spec = c; if ($('team').value === '') $('color').value = c.color; renderCars(cat); refreshPreview(); };
    carsEl.appendChild(d);
  });
}
try { $('name').value = localStorage.getItem('dd-name') || ''; } catch (e) { }
TEAMS.forEach((t, i) => { const o = document.createElement('option'); o.value = i; o.textContent = t.name; $('team').appendChild(o); });
$('team').onchange = e => { const t = TEAMS[e.target.value]; if (t) $('color').value = t.c1; };
function readMenu() {
  me.name = ($('name').value.trim() || 'Driver' + (Math.random() * 90 + 10 | 0)).slice(0, 14);
  state.cat = me.cat; me.color = $('color').value; const tm = TEAMS[$('team').value]; me.color2 = tm && tm.c1 === me.color ? tm.c2 : me.color; state.mode = menuMode;
  try { localStorage.setItem('dd-name', $('name').value.trim()); } catch (e) { }
}
$('solo').onclick = () => { readMenu(); enterGame(); };
$('create').onclick = () => { readMenu(); createRoom(); };
$('join').onclick = () => { readMenu(); joinRoom($('code').value); };
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') $('join').click(); });
$('startBtn').onclick = e => { e.target.blur(); requestStart(); };
$('modeSel').onchange = e => { e.target.blur(); const [cat, m] = e.target.value.split(':'); state.cat = cat; setMode(m); if (net.host) sendRoster(); };
$('wxSel').onchange = e => { e.target.blur(); setWeather(e.target.value); };
document.querySelectorAll('#tyreSel button').forEach(b => b.onclick = e => { e.target.blur(); pickTyre(b.dataset.ty); }); pickTyre('medium', true);
for (const [k, id] of [['music', 'oMusic'], ['engine', 'oEngine'], ['voice', 'oVoice'], ['shadows', 'oShadows']]) { const el = $(id); el.checked = opt[k]; el.onchange = () => { opt[k] = el.checked; saveOpt(); el.blur(); }; }
$('oVol').value = opt.master * 100; $('oVol').oninput = e => { opt.master = e.target.value / 100; saveOpt(); };
$('setBtn').onclick = e => { e.target.blur(); $('settings').hidden = !$('settings').hidden; }; $('setClose').onclick = () => { $('settings').hidden = true; };
$('camBtn').onclick = e => { e.target.blur(); toggleCam(); };
$('leave').onclick = () => { location.href = location.pathname; };
$('copy').onclick = async () => {
  const url = location.origin + location.pathname + '?room=' + net.code;
  try { await navigator.clipboard.writeText(url); toast('Invite link copied'); } catch (e) { prompt('Send this link to your friends:', url); }
};
// website-style menu: mode pills, team cards, clock, personal records
const modeNames = { gp: 'Austria Ring', gp4: 'Japan Circuit', gp5: 'Singapore Night Streets', rally: 'Rally Stage', gp2: 'São Paulo Circuit', gp3: 'Monte Carlo Streets', city: 'Neon City Street Race', drift: 'Drift Arena' };
let menuMode = 'gp';
function mapOutline(m) {
  if (m === 'city') return [[-160, -240], [0, -240], [160, -240], [160, -80], [0, -80], [0, 80], [120, 80], [240, 80], [240, 240], [0, 240], [-240, 240], [-240, 0], [-160, 0], [-160, -120]];
  if (m === 'monster') return Array.from({ length: 48 }, (_, k) => [Math.cos(k / 48 * TAU) * 122, Math.sin(k / 48 * TAU) * 82]);
  const pts = m === 'dunes' ? DUNE_PTS : TRACKS[m].pts;
  return new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(q[0], 0, q[1])), true, 'centripetal').getPoints(240).map(v => [v.x, v.z]);
}
function drawMini(m) {
  const c = $('mapPrev'), x = c.getContext('2d'), o = mapOutline(m), xs = o.map(q => q[0]), zs = o.map(q => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), sc = Math.min((c.width - 36) / (x1 - x0), (c.height - 36) / (z1 - z0));
  const P = q => [c.width / 2 + (q[0] - (x0 + x1) / 2) * sc, c.height / 2 + (q[1] - (z0 + z1) / 2) * sc];
  x.clearRect(0, 0, c.width, c.height); x.lineJoin = x.lineCap = 'round';
  for (const [w, col] of [[9, '#3a3d4d'], [4, '#ffffff']]) { x.lineWidth = w; x.strokeStyle = col; x.beginPath(); o.forEach((q, i) => { const [a, b] = P(q); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath(); x.stroke(); }
  const [sx, sy] = P(o[0]); x.fillStyle = '#e10600'; x.beginPath(); x.arc(sx, sy, 6, 0, TAU); x.fill();
  $('mapName').textContent = MODES[m].name; $('mapInfo').textContent = MODES[m].laps ? MODES[m].laps + ' laps · red dot = start' : '90 second drift battle';
}
function showTab(id) { document.querySelectorAll('section.tab').forEach(e => e.classList.toggle('on', e.id === id)); document.querySelectorAll('#tabStrip .pill').forEach(b => b.classList.toggle('on', b.dataset.tab === id)); }
document.querySelectorAll('#tabStrip .pill').forEach(b => b.onclick = () => showTab(b.dataset.tab));
document.querySelectorAll('nav a').forEach(a => a.onclick = e => { e.preventDefault(); const id = a.dataset.go; if (id === 'race') $('menu').scrollTo({ top: 0, behavior: 'smooth' }); else { showTab(id); $('tabStrip').scrollIntoView({ behavior: 'smooth' }); } });
showTab('teams');
function pickMode(m) { menuMode = m; drawMini(m); document.querySelectorAll('#mapPills .pill').forEach(b => b.classList.toggle('on', b.dataset.mode === m)); $('roundName').textContent = CATS[me.cat].name + ' — ' + MODES[m].name; }
function pickCat(cat) {
  me.cat = cat; document.querySelectorAll('#catPills .pill').forEach(b => b.classList.toggle('on', b.dataset.cat === cat));
  $('mapPills').innerHTML = CATS[cat].maps.map(m => `<span class="pill" data-mode="${m}">${MODES[m].name}</span>`).join('');
  document.querySelectorAll('#mapPills .pill').forEach(b => b.onclick = () => pickMode(b.dataset.mode));
  me.spec = CARS.find(c => c.id === me.pick[cat]); if ($('team').value === '') $('color').value = me.spec.color;
  renderCars(cat); pickMode(CATS[cat].maps[0]); refreshPreview();
}
$('catPills').innerHTML = Object.keys(CATS).map(k => `<span class="pill" data-cat="${k}">${CATS[k].name}</span>`).join('');
document.querySelectorAll('#catPills .pill').forEach(b => b.onclick = () => pickCat(b.dataset.cat));
$('modeSel').innerHTML = Object.keys(CATS).map(k => `<option value="" disabled>── ${CATS[k].name} ──</option>` + CATS[k].maps.map(m => `<option value="${k}:${m}">${MODES[m].name}</option>`).join('')).join('');
pickCat('f1');
const teamsEl = $('teamCards');
const markTeam = i => teamsEl.querySelectorAll('.team').forEach((e, k) => e.classList.toggle('sel', k === i));
TEAMS.forEach((t, i) => {
  const d = document.createElement('div'); d.className = 'team';
  d.innerHTML = `<i style="background:linear-gradient(100deg,${t.c1} 62%,${t.c2} 62%)"></i><b>${t.name}</b>`;
  d.onclick = () => { $('team').value = i; $('color').value = t.c1; markTeam(i); refreshPreview(); };
  teamsEl.appendChild(d);
});
$('color').oninput = () => { $('team').value = ''; markTeam(-1); refreshPreview(); };
const tick = () => $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); tick(); setInterval(tick, 20000);
function saveRecord(k, v, higher) { try { const r = JSON.parse(localStorage.getItem('dd-rec') || '{}'); if (r[k] == null || (higher ? v > r[k] : v < r[k])) { r[k] = v; localStorage.setItem('dd-rec', JSON.stringify(r)); } } catch (e) { } }
{ let r = {}; try { r = JSON.parse(localStorage.getItem('dd-rec') || '{}'); } catch (e) { }
  $('recBody').innerHTML = `<tr><td>Austria Ring — best lap</td><td>${fmt(r.gp)}</td></tr><tr><td>São Paulo Circuit — best lap</td><td>${fmt(r.gp2)}</td></tr><tr><td>Monte Carlo Streets — best lap</td><td>${fmt(r.gp3)}</td></tr><tr><td>Japan Circuit — best lap</td><td>${fmt(r.gp4)}</td></tr><tr><td>Singapore Night Streets — best lap</td><td>${fmt(r.gp5)}</td></tr><tr><td>Rally Stage — best lap</td><td>${fmt(r.rally)}</td></tr><tr><td>Neon City — best lap</td><td>${fmt(r.city)}</td></tr><tr><td>Drift Arena — best score</td><td>${r.drift != null ? r.drift + ' pts' : '—'}</td></tr>`; }
const qRoom = new URLSearchParams(location.search).get('room');
if (qRoom) { $('code').value = qRoom.slice(0, 4).toUpperCase(); setStatus('Enter your username, then press “Join lobby”.'); }

/* ───────────────────────── main loop ───────────────────────── */
setMode('gp'); cpMarker.visible = false; refreshPreview();
let last = performance.now(), uiAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state.screen === 'play') {
    updateRace(now); stepCar(dt, now); updateRemotes(dt); updateFx(dt); updateCamera(dt); updateRain(dt);
    if (me.shake > 0) { camera.position.x += (Math.random() - .5) * me.shake; camera.position.y += (Math.random() - .5) * me.shake * .5; me.shake = Math.max(0, me.shake - dt * 2); }
    fastUI(now); drawMap(); uiAcc += dt; if (uiAcc > .2) { uiAcc = 0; slowUI(); }
  } else {
    const t = now / 5200, rad = me.spec.big ? 11 : 7.6, pv = previewPos;
    camera.position.set(pv.x + Math.cos(t) * rad, me.spec.big ? 3.6 : 2.3, pv.z + Math.sin(t) * rad); camera.lookAt(pv.x, me.spec.big ? 1.5 : .7, pv.z);
    const hr = $('heroBox').getBoundingClientRect(); camera.fov = 42;
    camera.setViewOffset(innerWidth, innerHeight, innerWidth / 2 - (hr.left + hr.width / 2), innerHeight / 2 - (hr.top + hr.height * .3), innerWidth, innerHeight);
  }
  const ud = world.group.userData, fx = state.screen === 'play' ? me.x : previewPos.x, fz = state.screen === 'play' ? me.z : previewPos.z;
  ud.sun.castShadow = opt.shadows; ud.sky.position.copy(camera.position); ud.sun.target.position.set(fx, 0, fz); ud.sun.position.set(fx + ud.sunDir.x * 220, ud.sunDir.y * 220, fz + ud.sunDir.z * 220);
  frameNo++;
  if (state.screen === 'play' && camMode === 'cockpit' && frameNo > 5 && frameNo % 3 === 0) {
    mirrorCam.position.set(me.x, 1.1, me.z); mirrorCam.rotation.set(0, me.h, 0);
    renderer.shadowMap.autoUpdate = false; renderer.setRenderTarget(mirrorRT); renderer.render(scene, mirrorCam); renderer.setRenderTarget(null); renderer.shadowMap.autoUpdate = true;
  }
  renderer.render(scene, camera);
  if (state.screen === 'play' && camMode === 'cockpit' && me.wreckT <= 0) {
    cockCam.fov = camera.fov; cockCam.aspect = camera.aspect; cockCam.updateProjectionMatrix();
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(cockScene, cockCam); renderer.autoClear = true;
  }
}
requestAnimationFrame(frame);
window.__dd = { get audio() { return audio; }, me, net, race, state, remotes, get world() { return world; } };
