import * as THREE from 'three';
import { platformPos } from '../../../shared/physics.js';
import { OBSTACLES } from '../../../shared/obstacles.js';
import { stripeTex } from './textures.js';
import { makeLabel } from './characterModels.js';

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const SPRINKLES = [0xff4d8d, 0xffe14d, 0x4dc3ff, 0x7dff9b, 0xc58bff];
const CANDY_COLORS = [0xff4d8d, 0xffd24d, 0x4dc3ff, 0x7dff9b, 0xc58bff];

function slab(p, r, bodyColor, topColor, th, sprinkles) {
  const g = new THREE.Group();
  const body = box(p.w, th, p.d, mat(bodyColor)); body.position.y = -th / 2;
  const top = box(p.w + 0.12, 0.22, p.d + 0.12, mat(topColor, { roughness: 0.35 })); top.position.y = -0.11;
  g.add(body, top);
  if (sprinkles) for (let i = 0; i < Math.ceil((p.w * p.d) / 3); i++) {
    const s = box(0.3, 0.08, 0.1, mat(SPRINKLES[i % SPRINKLES.length]));
    s.position.set((r() - 0.5) * (p.w - 0.6), 0.04, (r() - 0.5) * (p.d - 0.6)); s.rotation.y = r() * 6.28; g.add(s);
  }
  return g;
}

// Estilos de plataforma según `kind`. Añadir un estilo nuevo = una función aquí.
export const PLATFORM_STYLES = {
  candy: (p, r) => slab(p, r, p.color, new THREE.Color(p.color).lerp(new THREE.Color(0xffffff), 0.55), p.h ?? 1, true),
  ground: (p, r) => slab(p, r, 0xd9a05b, p.color ?? 0xff9ccf, p.h ?? 1.2, true),
  bridge: (p) => {
    const g = new THREE.Group(), th = p.h ?? 0.5, n = Math.round(p.d / 1.1), seg = p.d / n;
    for (let i = 0; i < n; i++) {
      const pl = box(p.w, th, seg * 0.88, mat(i % 2 ? 0x7a4426 : 0x6b3a1f, { roughness: 0.4 }));
      pl.position.set(0, -th / 2, -p.d / 2 + seg * (i + 0.5)); g.add(pl);
    }
    for (const s of [-1, 1]) { const rail = box(0.18, 0.28, p.d, mat(0xffc2de)); rail.position.set(s * (p.w / 2 - 0.1), 0.14, 0); g.add(rail); }
    return g;
  },
};

// Vistas de obstáculos (par de shared/obstacles.js). Devuelven { obj, update(t) }.
export const HAZARD_VIEWS = {
  slider(h) {
    const obj = box(h.w, h.h, h.d, mat(0xffffff, { map: stripeTex('#ff3b5c', '#ffffff', 3) }));
    return { obj, update(t) { const p = OBSTACLES.slider.pose(h, t); obj.position.set(p.x, p.y + h.h / 2, p.z); } };
  },
  spinner(h) {
    const obj = new THREE.Group();
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, h.h + 0.4, 16), mat(0xff3b5c));
    pillar.position.y = (h.h + 0.4) / 2;
    const bar = box(h.len, h.h * 0.55, 0.7, mat(0xffffff, { map: stripeTex('#ff3b5c', '#ffffff', 5) }));
    bar.position.y = h.h * 0.55;
    obj.add(pillar, bar); obj.position.set(h.x, h.y, h.z);
    return { obj, update(t) { bar.rotation.y = -OBSTACLES.spinner.pose(h, t).angle; } };
  },
};

function decor(group, world, r) {
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mat(world.theme.syrup, { roughness: 0.2, metalness: 0.1 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -8; group.add(sea);
  const heads = [0xff4d8d, 0xffd24d, 0x4dc3ff, 0xc58bff, 0x7dff9b];
  for (let i = 0; i < 36; i++) {
    const side = i % 2 ? 1 : -1, hgt = 14 + r() * 20, rad = 3 + r() * 3, c = heads[(r() * heads.length) | 0];
    const lolly = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, hgt, 8), mat(0xffffff)); stick.position.y = hgt / 2;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.5, 28), mat(0xffffff, { map: stripeTex('#' + new THREE.Color(c).getHexString(), '#ffffff', 6) }));
    head.rotation.z = Math.PI / 2; head.position.y = hgt + rad * 0.6;
    lolly.add(stick, head); lolly.position.set(side * (17 + r() * 28), -8, 18 - (i / 36) * 190); group.add(lolly);
  }
  for (let i = 0; i < 16; i++) {
    const cl = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(3 + r() * 3, 12, 12), mat(j % 2 ? 0xffffff : 0xffe0f2, { roughness: 1 }));
      s.position.set(j * 4 - 6, r() * 2, r() * 3); cl.add(s);
    }
    cl.position.set((r() - 0.5) * 160, 22 + r() * 22, 20 - r() * 200); group.add(cl);
  }
}

export function buildLevel(level, world) {
  const group = new THREE.Group(), r = rng(7), dyn = [];
  decor(group, world, r);

  for (const p of level.platforms) {
    const obj = (PLATFORM_STYLES[p.kind || 'candy'] || PLATFORM_STYLES.candy)(p, r);
    const c = platformPos(p, 0); obj.position.set(c.x, c.y, c.z); group.add(obj);
    if (p.move) dyn.push((t) => { const q = platformPos(p, t); obj.position.set(q.x, q.y, q.z); });
  }
  for (const h of level.hazards || []) {
    const v = HAZARD_VIEWS[h.type]; if (!v) continue;
    const { obj, update } = v(h); group.add(obj); update(0); dyn.push(update);
  }

  const candyGeo = new THREE.SphereGeometry(0.26, 14, 14), wrapGeo = new THREE.ConeGeometry(0.14, 0.26, 8);
  const candyMeshes = level.candies.map((c, i) => {
    const m = mat(CANDY_COLORS[i % CANDY_COLORS.length], { roughness: 0.2, emissive: CANDY_COLORS[i % CANDY_COLORS.length], emissiveIntensity: 0.25 });
    const o = new THREE.Group(); o.add(new THREE.Mesh(candyGeo, m));
    for (const s of [-1, 1]) { const w = new THREE.Mesh(wrapGeo, m); w.position.x = s * 0.33; w.rotation.z = -s * Math.PI / 2; o.add(w); }
    o.position.set(c.x, c.y, c.z); group.add(o); return o;
  });

  const flags = (level.checkpoints || []).map((c) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), mat(0xffffff)); pole.position.set(c.x - 2, c.y + 1.2, c.z);
    const flagMat = mat(0xff7ac8, { side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), flagMat); flag.position.set(c.x - 1.45, c.y + 2.0, c.z);
    group.add(pole, flag); return flagMat;
  });

  const gl = level.goal, arch = new THREE.Group(), stripes = stripeTex('#ff3b5c', '#ffffff', 4);
  for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 14), mat(0xffffff, { map: stripes })); pl.position.set(s * 3.2, 2.5, 0); arch.add(pl); }
  [[3.2, 0xff4d8d], [2.8, 0xffd24d], [2.4, 0x4dc3ff]].forEach(([rad, c]) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.22, 10, 36, Math.PI), mat(c, { emissive: c, emissiveIntensity: 0.3 })); t.position.y = 5; arch.add(t);
  });
  const banner = makeLabel('META', { w: 256, h: 96, scale: 4 }); banner.position.y = 9.3; arch.add(banner);
  const ring = new THREE.Mesh(new THREE.RingGeometry(gl.r - 0.35, gl.r, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; arch.add(ring);
  arch.position.set(gl.x, gl.y, gl.z); group.add(arch);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.children[0].castShadow = false; // el mar de almíbar no proyecta sombra

  return {
    group, candyMeshes,
    update(t, time) {
      dyn.forEach((f) => f(t));
      candyMeshes.forEach((m, i) => { m.rotation.y = time * 2 + i; m.position.y = level.candies[i].y + Math.sin(time * 3 + i) * 0.1; });
    },
    setCheckpoint(i) { flags.forEach((m, k) => m.color.set(k <= i ? 0x7dff9b : 0xff7ac8)); },
  };
}
