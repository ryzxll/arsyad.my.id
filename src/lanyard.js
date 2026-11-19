/*
 * Lanyard 3D interaktif — Three.js + fisika tali (verlet) buatan sendiri.
 * Kartu hanya berisi nama + hiasan grafis. Bisa di-drag, dilempar, dan berputar/flip.
 *
 * Edit file ini lalu jalankan:  npm install && npm run build:lanyard
 * Hasilnya: js/lanyard.min.js (sudah disertakan, jadi tidak perlu build kalau tidak mengubah apa-apa).
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight,
  Shape, ShapeGeometry, ExtrudeGeometry, Mesh, MeshStandardMaterial, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, Group, BufferGeometry, BufferAttribute, DoubleSide,
  BoxGeometry, CylinderGeometry, Raycaster, Vector2, Vector3, CatmullRomCurve3,
  RepeatWrapping, Plane, MathUtils,
} from 'three';

/* ---------- parameter ---------- */
const VIEW_H = 6.2;          // tinggi area pandang (unit dunia)
const CARD_W = 1.7;
const CARD_H = 2.55;
const CARD_R = 0.16;         // radius sudut kartu
const HINGE = CARD_H / 2 - 0.14; // jarak klip -> pusat kartu
const STRAP_LEN = 2.55;
const STRAP_W = 0.36;
const SEGMENTS = 10;

/* ---------- util ---------- */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundedRectShape(w, h, r) {
  const s = new Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function planeFromShape(shape, w, h) {
  const g = new ShapeGeometry(shape, 14);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w;
    uv[i * 2 + 1] = (pos.getY(i) + h / 2) / h;
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  return g;
}

function hexPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i + Math.PI / 6;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- tekstur kartu (digambar dengan canvas 2D, semua orisinal) ---------- */
function drawBase(ctx, W, H, seed) {
  const rnd = mulberry32(seed);
  let g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0c1433');
  g.addColorStop(0.55, '#070a1f');
  g.addColorStop(1, '#050510');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  let r = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, W * 0.85);
  r.addColorStop(0, 'rgba(44,103,237,.50)');
  r.addColorStop(1, 'rgba(44,103,237,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);

  r = ctx.createRadialGradient(W * 0.05, H * 0.95, 0, W * 0.05, H * 0.95, W * 0.9);
  r.addColorStop(0, 'rgba(129,140,248,.40)');
  r.addColorStop(1, 'rgba(129,140,248,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);

  // grid halus
  ctx.strokeStyle = 'rgba(120,160,255,.075)';
  ctx.lineWidth = 1;
  const step = Math.round(W / 16);
  for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  return rnd;
}

function drawFrame(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#3c84f6'); g.addColorStop(0.5, '#38bdf8'); g.addColorStop(1, '#818cf8');
  ctx.strokeStyle = g; ctx.lineWidth = 6;
  roundRectPath(ctx, 14, 14, W - 28, H - 28, 44);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 2;
  roundRectPath(ctx, 30, 30, W - 60, H - 60, 32);
  ctx.stroke();
}

function drawSlot(ctx, W) {
  roundRectPath(ctx, W / 2 - 62, 52, 124, 30, 15);
  ctx.fillStyle = '#02030a'; ctx.fill();
  ctx.strokeStyle = 'rgba(192,192,220,.55)'; ctx.lineWidth = 3; ctx.stroke();
}

function drawBarcode(ctx, x, y, w, h, seed, color) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = color;
  let cx = x;
  while (cx < x + w) {
    const bw = 2 + Math.floor(rnd() * 7);
    if (rnd() > 0.28) ctx.fillRect(cx, y, bw, h);
    cx += bw + 2 + Math.floor(rnd() * 5);
  }
}

function drawCorners(ctx, W, H) {
  ctx.strokeStyle = 'rgba(192,192,220,.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const m = 64, l = 34;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + sy * l); ctx.lineTo(x, y); ctx.lineTo(x + sx * l, y); ctx.stroke();
  });
}

function fitFont(ctx, text, weight, maxW, startPx, family) {
  let px = startPx;
  do { ctx.font = `${weight} ${px}px ${family}`; px -= 2; } while (ctx.measureText(text).width > maxW && px > 20);
  return px + 2;
}

const LOGICAL_W = 768, LOGICAL_H = 1152; // semua gambar kartu memakai koordinat ini

function makeCanvas(scale) {
  const c = document.createElement('canvas');
  c.width = Math.round(LOGICAL_W * scale); c.height = Math.round(LOGICAL_H * scale);
  const ctx = c.getContext('2d'); ctx.scale(scale, scale);
  return { c, ctx };
}

function makeFrontTexture(name, scale) {
  const W = LOGICAL_W, H = LOGICAL_H;
  const { c, ctx } = makeCanvas(scale);
  const rnd = drawBase(ctx, W, H, 11);

  // cincin konsentris (kanan atas)
  for (let i = 0; i < 5; i++) {
    const rad = 90 + i * 62;
    ctx.beginPath(); ctx.arc(W * 0.86, H * 0.2, rad, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(56,189,248,${0.34 - i * 0.055})`; ctx.lineWidth = 3; ctx.stroke();
  }
  // titik orbit
  ctx.fillStyle = '#38bdf8';
  [[0.86 + 0.0, 0.2 - 0.07], [0.86 - 0.17, 0.2 + 0.04], [0.86 + 0.13, 0.2 + 0.15]].forEach(([fx, fy]) => {
    ctx.beginPath(); ctx.arc(W * fx, H * fy, 9, 0, Math.PI * 2); ctx.fill();
  });

  // heksagon (kiri atas)
  ctx.lineWidth = 2.5;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const hx = 104 + col * 64 + (row % 2) * 32, hy = 140 + row * 56;
      hexPath(ctx, hx, hy, 32);
      ctx.strokeStyle = `rgba(129,140,248,${0.55 - (row + col) * 0.09})`; ctx.stroke();
    }
  }

  // bar diagonal gradien (bawah-kiri) — di belakang teks nama
  ctx.save();
  ctx.translate(0, H * 0.46);
  ctx.rotate(-0.28);
  const bg = ctx.createLinearGradient(0, 0, W, 0);
  bg.addColorStop(0, 'rgba(44,103,237,0)'); bg.addColorStop(0.35, 'rgba(44,103,237,.55)');
  bg.addColorStop(0.7, 'rgba(56,189,248,.45)'); bg.addColorStop(1, 'rgba(129,140,248,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(-60, 0, W + 120, 14);
  ctx.fillRect(-60, 30, W + 120, 5);
  ctx.fillRect(-60, 50, W + 120, 2);
  ctx.restore();

  // nama
  const parts = name.toUpperCase().split(/\s+/).filter(Boolean);
  const family = '"Verdana","DejaVu Sans","Segoe UI",sans-serif';
  const maxW = W - 150;
  const sizes = parts.map((p) => fitFont(ctx, p, 800, maxW, 150, family));
  const size = Math.min(...sizes, 132);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let y = H * 0.665;
  parts.forEach((p, i) => {
    ctx.font = `800 ${size}px ${family}`;
    if (i === 0) {
      ctx.fillStyle = '#f0f0ff';
    } else {
      const tg = ctx.createLinearGradient(75, 0, 75 + ctx.measureText(p).width, 0);
      tg.addColorStop(0, '#60a5fa'); tg.addColorStop(0.5, '#38d4f8'); tg.addColorStop(1, '#a5b4fc');
      ctx.fillStyle = tg;
    }
    ctx.shadowColor = 'rgba(56,189,248,.35)'; ctx.shadowBlur = 26;
    ctx.fillText(p, 75, y);
    ctx.shadowBlur = 0;
    y += size * 1.04;
  });

  // titik-titik dekor
  ctx.fillStyle = 'rgba(192,192,220,.55)';
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(80 + i * 22, H * 0.585, 3.2, 0, Math.PI * 2); ctx.fill(); }

  drawBarcode(ctx, 75, H - 190, W - 150, 74, 7, 'rgba(192,192,220,.6)');
  drawCorners(ctx, W, H);
  drawSlot(ctx, W);
  drawFrame(ctx, W, H);
  return c;
}

function makeBackTexture(scale) {
  const W = LOGICAL_W, H = LOGICAL_H;
  const { c, ctx } = makeCanvas(scale);
  drawBase(ctx, W, H, 23);
  const cx = W / 2, cy = H * 0.46;

  // sinar radial
  ctx.save(); ctx.translate(cx, cy);
  for (let i = 0; i < 48; i++) {
    ctx.rotate((Math.PI * 2) / 48);
    ctx.strokeStyle = `rgba(120,160,255,${i % 4 === 0 ? 0.20 : 0.07})`;
    ctx.lineWidth = i % 4 === 0 ? 3 : 1.5;
    ctx.beginPath(); ctx.moveTo(130, 0); ctx.lineTo(W * 0.62, 0); ctx.stroke();
  }
  ctx.restore();

  // cincin + heksagon bertumpuk
  const rg = ctx.createLinearGradient(cx - 200, cy - 200, cx + 200, cy + 200);
  rg.addColorStop(0, '#2c67ed'); rg.addColorStop(0.55, '#38bdf8'); rg.addColorStop(1, '#818cf8');
  ctx.strokeStyle = rg;
  [200, 160, 120].forEach((rad, i) => { ctx.lineWidth = 6 - i * 1.5; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke(); });
  ctx.lineWidth = 5; hexPath(ctx, cx, cy, 98); ctx.stroke();

  // glyph prompt ">_"
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 22;
  ctx.strokeStyle = rg;
  ctx.beginPath(); ctx.moveTo(cx - 52, cy - 44); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx - 52, cy + 44); ctx.stroke();
  ctx.strokeStyle = '#f0f0ff';
  ctx.beginPath(); ctx.moveTo(cx + 14, cy + 48); ctx.lineTo(cx + 62, cy + 48); ctx.stroke();

  // garis & titik
  ctx.fillStyle = 'rgba(192,192,220,.55)';
  for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc(75 + i * ((W - 150) / 15), H * 0.78, 3.2, 0, Math.PI * 2); ctx.fill(); }
  drawBarcode(ctx, 75, H - 190, W - 150, 74, 31, 'rgba(192,192,220,.5)');
  drawCorners(ctx, W, H);
  drawSlot(ctx, W);
  drawFrame(ctx, W, H);
  return c;
}

function makeStrapTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0d1424'; ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = '#2c67ed'; ctx.fillRect(4, 0, 4, 128); ctx.fillRect(56, 0, 4, 128);
  ctx.fillStyle = 'rgba(56,189,248,.55)'; ctx.fillRect(31, 0, 2, 128);
  ctx.fillStyle = 'rgba(192,192,220,.28)';
  for (let y = 6; y < 128; y += 16) { ctx.fillRect(16, y, 10, 3); ctx.fillRect(38, y + 8, 10, 3); }
  return c;
}

/* ---------- inisialisasi ---------- */
function init(mount, options) {
  const opts = Object.assign({
    name: 'Arsyad Kariman', intro: true, reducedMotion: false,
    gravity: 1.2, damping: 0.45, breeze: 0.1, autoFlip: true,
  }, options || {});

  const isNarrow = window.matchMedia('(max-width: 767px)').matches;
  const lite = isNarrow || /Android|iPhone|iPad/i.test(navigator.userAgent);

  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: !lite, alpha: true, powerPreference: 'default' });
  } catch (e) {
    console.warn('[lanyard] WebGL tidak tersedia, pakai kartu cadangan.', e);
    mount.classList.add('lanyard-fallback-on');
    return null;
  }
  if (!renderer.getContext()) { mount.classList.add('lanyard-fallback-on'); return null; }

  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'lanyard-canvas';
  canvas.setAttribute('aria-label', 'Kartu lanyard 3D yang bisa digeser dan dilempar');
  canvas.setAttribute('role', 'img');
  mount.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 60);
  const camZ = (VIEW_H / 2) / Math.tan(MathUtils.degToRad(camera.fov / 2));
  camera.position.set(0, 0, camZ);

  scene.add(new AmbientLight(0xffffff, 1.3));
  const key = new DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 6); scene.add(key);
  const rim = new DirectionalLight(0x6ea8ff, 1.4); rim.position.set(-4, -1, 3); scene.add(rim);

  /* kartu */
  const texScale = lite ? 0.667 : 1;
  const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const mkTex = (cv) => { const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = maxAniso; return t; };
  const frontTex = mkTex(makeFrontTexture(opts.name, texScale));
  const backTex = mkTex(makeBackTexture(texScale));

  const shape = roundedRectShape(CARD_W, CARD_H, CARD_R);
  const bodyGeo = new ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: 14 });
  bodyGeo.translate(0, 0, -0.025);
  const body = new Mesh(bodyGeo, new MeshStandardMaterial({ color: 0x0a1024, metalness: 0.6, roughness: 0.4 }));

  const faceGeo = planeFromShape(shape, CARD_W, CARD_H);
  const faceMat = (t) => new MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.62, roughness: 0.35, metalness: 0.12 });
  const front = new Mesh(faceGeo, faceMat(frontTex)); front.position.z = 0.0255;
  const back = new Mesh(faceGeo, faceMat(backTex)); back.position.z = -0.0255; back.rotation.y = Math.PI;

  const swing = new Group();           // berputar (spin) pada sumbu Y kartu
  swing.add(body, front, back);
  swing.position.y = -HINGE;

  const pivot = new Group();           // berayun pada klip (rotasi Z)
  pivot.add(swing);

  // klip logam
  const metal = new MeshStandardMaterial({ color: 0xe3e9f7, emissive: 0x3a4466, metalness: 0.8, roughness: 0.3 });
  const clip = new Group();
  const plate = new Mesh(new BoxGeometry(0.46, 0.2, 0.09), metal); plate.position.set(0, 0.0, 0.0);
  const ring = new Mesh(new CylinderGeometry(0.075, 0.075, 0.1, 20), metal); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.17, 0);
  clip.add(plate, ring);
  clip.position.set(0, -0.02, 0.01);
  pivot.add(clip);
  scene.add(pivot);

  /* strap */
  const strapCv = makeStrapTexture();
  const strapTex = new CanvasTexture(strapCv); strapTex.colorSpace = SRGBColorSpace; strapTex.wrapT = RepeatWrapping; strapTex.anisotropy = maxAniso;
  const SAMPLES = lite ? 24 : 36;
  const strapGeo = new BufferGeometry();
  const sPos = new Float32Array(SAMPLES * 2 * 3);
  const sUv = new Float32Array(SAMPLES * 2 * 2);
  const sIdx = [];
  for (let i = 0; i < SAMPLES - 1; i++) { const a = i * 2; sIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  strapGeo.setAttribute('position', new BufferAttribute(sPos, 3));
  strapGeo.setAttribute('uv', new BufferAttribute(sUv, 2));
  strapGeo.setIndex(sIdx);
  const strap = new Mesh(strapGeo, new MeshBasicMaterial({ map: strapTex, side: DoubleSide }));
  strap.frustumCulled = false;
  scene.add(strap);

  /* ---------- fisika (verlet 2D pada bidang XY) ---------- */
  const anchorX = 0, anchorY = VIEW_H / 2 + 0.4;
  const N = lite ? 8 : SEGMENTS;
  const seg = STRAP_LEN / (N - 1);
  const G = 22 * opts.gravity;
  const P = [];
  const mk = (x, y, im) => ({ x, y, px: x, py: y, im });
  for (let i = 0; i < N; i++) P.push(mk(anchorX, anchorY - i * seg, i === 0 ? 0 : 1));
  P.push(mk(anchorX, anchorY - (N - 1) * seg - HINGE, 0.35)); // pusat kartu
  const Mi = N; // indeks partikel kartu
  const clipI = N - 1;

  if (opts.intro && !opts.reducedMotion) {
    // tali mulai menggulung di dekat jangkar lalu jatuh memanjang
    for (let i = 1; i <= Mi; i++) {
      const p = P[i];
      p.x = anchorX + Math.sin(i * 1.7) * 0.05; p.y = anchorY - 0.15 - i * 0.07;
      p.px = p.x; p.py = p.y;
    }
    P[Mi].px = P[Mi].x - 0.004; // sedikit dorongan ke samping
  } else {
    P[Mi].px = P[Mi].x - 0.010;
  }

  let dragging = false, tx = 0, ty = 0;
  let ry = 0, wy = 0;                // spin Y kartu
  let flipTimer = 5 + Math.random() * 3;
  let time = 0;

  function solve(a, b, len, equal) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    if (!equal && dist <= len) return;
    const w = a.im + b.im; if (w === 0) return;
    const k = (dist - len) / dist / w;
    a.x += dx * k * a.im; a.y += dy * k * a.im;
    b.x -= dx * k * b.im; b.y -= dy * k * b.im;
  }

  function physics(dt) {
    time += dt;
    const drag = 1 - opts.damping * dt;
    const sway = opts.reducedMotion ? 0 : opts.breeze;
    for (let i = 1; i <= Mi; i++) {
      const p = P[i];
      if (dragging && i === Mi) continue;
      const vx = (p.x - p.px) * drag, vy = (p.y - p.py) * drag;
      p.px = p.x; p.py = p.y;
      const wind = sway * Math.sin(time * 0.8 + i * 0.6) * 5.0;
      p.x += vx + wind * dt * dt;
      p.y += vy - G * dt * dt;
    }
    for (let it = 0; it < 14; it++) {
      for (let i = 0; i < N - 1; i++) solve(P[i], P[i + 1], seg, false);
      solve(P[clipI], P[Mi], HINGE, true);
      P[0].x = anchorX; P[0].y = anchorY;
      if (dragging) { P[Mi].x = tx; P[Mi].y = ty; }
    }
    if (dragging) { P[Mi].px = P[Mi].x; P[Mi].py = P[Mi].y; }

    // spin / flip
    const m = P[Mi];
    const vxm = (m.x - m.px);
    wy += vxm * 1.1;
    const target = Math.round(ry / Math.PI) * Math.PI;
    wy += (target - ry) * 8 * dt;
    wy *= 1 - 1.7 * dt;
    ry += wy * dt;
    if (opts.autoFlip && !opts.reducedMotion && !dragging) {
      flipTimer -= dt;
      if (flipTimer <= 0 && Math.abs(wy) < 0.6) { wy += 6.8 * (Math.random() > 0.5 ? 1 : -1); flipTimer = 7 + Math.random() * 4; }
    }
  }

  /* ---------- render ---------- */
  const curve = new CatmullRomCurve3(P.slice(0, N).map((p) => new Vector3(p.x, p.y, -0.012)), false, 'catmullrom', 0.5);
  const tmpPts = [];
  const STRAP_REPEAT = STRAP_LEN / 1.15;

  function updateScene() {
    for (let i = 0; i < N; i++) curve.points[i].set(P[i].x, P[i].y, -0.012);
    // ujung strap menyatu dengan klip
    curve.points[N - 1].set(P[clipI].x, P[clipI].y + 0.1, -0.012);
    curve.getPoints(SAMPLES - 1).forEach((v, i) => { tmpPts[i] = v; });
    for (let i = 0; i < SAMPLES; i++) {
      const a = tmpPts[Math.max(0, i - 1)], b = tmpPts[Math.min(SAMPLES - 1, i + 1)];
      let tx_ = b.x - a.x, ty_ = b.y - a.y; const l = Math.hypot(tx_, ty_) || 1; tx_ /= l; ty_ /= l;
      const nx = -ty_ * STRAP_W / 2, ny = tx_ * STRAP_W / 2;
      const p = tmpPts[i];
      sPos.set([p.x + nx, p.y + ny, p.z, p.x - nx, p.y - ny, p.z], i * 6);
      const v = (i / (SAMPLES - 1)) * STRAP_REPEAT;
      sUv.set([0, v, 1, v], i * 4);
    }
    strapGeo.attributes.position.needsUpdate = true;
    strapGeo.attributes.uv.needsUpdate = true;

    const c = P[clipI], m = P[Mi];
    pivot.position.set(c.x, c.y, 0);
    pivot.rotation.z = Math.atan2(m.x - c.x, -(m.y - c.y));
    swing.rotation.y = ry;
  }

  /* ---------- interaksi ---------- */
  const ray = new Raycaster(); const ndc = new Vector2(); const plane = new Plane(new Vector3(0, 0, 1), 0); const hit = new Vector3();
  let grab = { x: 0, y: 0 };
  const hist = [];
  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    ray.ray.intersectPlane(plane, hit);
    return { x: hit.x, y: hit.y };
  }
  function overCard(w) {
    const m = P[Mi], c = P[clipI];
    const th = Math.atan2(m.x - c.x, -(m.y - c.y));
    const dx = w.x - m.x, dy = w.y - m.y;
    const lx = dx * Math.cos(th) - dy * Math.sin(th);   // rotasi balik
    const ly = dx * Math.sin(th) + dy * Math.cos(th);
    return Math.abs(lx) < CARD_W / 2 + 0.05 && Math.abs(ly) < CARD_H / 2 + 0.05;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const w = toWorld(e);
    if (!overCard(w)) return;
    dragging = true;
    grab = { x: w.x - P[Mi].x, y: w.y - P[Mi].y };
    tx = P[Mi].x; ty = P[Mi].y;
    hist.length = 0; hist.push({ t: performance.now(), x: w.x, y: w.y });
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    canvas.style.cursor = 'grabbing';
    if (e.pointerType === 'mouse') e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    const w = toWorld(e);
    if (dragging) {
      tx = w.x - grab.x; ty = w.y - grab.y;
      // jaga agar kartu tidak ditarik keluar terlalu jauh dari jangkar
      const dx = tx - anchorX, dy = ty - anchorY, maxR = STRAP_LEN + HINGE;
      const d = Math.hypot(dx, dy);
      if (d > maxR) { tx = anchorX + dx / d * maxR; ty = anchorY + dy / d * maxR; }
      hist.push({ t: performance.now(), x: w.x, y: w.y });
      if (hist.length > 6) hist.shift();
    } else {
      canvas.style.cursor = overCard(w) ? 'grab' : 'default';
    }
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = 'grab';
    if (hist.length > 1) {
      const a = hist[0], b = hist[hist.length - 1];
      const dtv = Math.max((b.t - a.t) / 1000, 0.016);
      let vx = (b.x - a.x) / dtv, vy = (b.y - a.y) / dtv;
      const sp = Math.hypot(vx, vy), cap = 14;
      if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
      const step = 1 / 60;
      P[Mi].px = P[Mi].x - vx * step; P[Mi].py = P[Mi].y - vy * step;
      wy += vx * 0.5;
    }
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);

  /* ---------- loop, ukuran, visibilitas ---------- */
  function resize() {
    const w = Math.max(mount.clientWidth, 1), h = Math.max(mount.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  ro ? ro.observe(mount) : window.addEventListener('resize', resize);

  let raf = 0, last = 0, acc = 0, visible = true, running = false;
  const STEP = 1 / 120; // dua sub-langkah per frame 60fps
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000 || 0.016, 0.05); last = now;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 6) { physics(STEP); acc -= STEP; n++; }
    if (n === 6) acc = 0;
    updateScene();
    renderer.render(scene, camera);
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => {
    visible = en[0].isIntersecting; (visible && !document.hidden) ? start() : stop();
  }, { threshold: 0.01 }) : null;
  io && io.observe(mount);
  document.addEventListener('visibilitychange', () => { (visible && !document.hidden) ? start() : stop(); });
  canvas.style.cursor = 'grab';
  updateScene(); renderer.render(scene, camera);
  if (!io) start();
  mount.classList.add('lanyard-ready');

  return {
    state() { return { ry, wy, dragging, card: { x: P[Mi].x, y: P[Mi].y }, clip: { x: P[clipI].x, y: P[clipI].y }, stretch: Math.max(...P.slice(0, N - 1).map((p, i) => Math.hypot(P[i + 1].x - p.x, P[i + 1].y - p.y) / seg)) }; },
    project(x, y) { const v = new Vector3(x, y, 0).project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; },
    destroy() { stop(); ro && ro.disconnect(); io && io.disconnect(); renderer.dispose(); canvas.remove(); },
  };
}

window.PortfolioLanyard = {
  last: null,
  init(mount, options) { const inst = init(mount, options); window.PortfolioLanyard.last = inst; return inst; },
};
