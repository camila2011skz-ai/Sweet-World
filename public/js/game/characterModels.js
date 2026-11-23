import * as THREE from 'three';
import { CHARACTERS } from '../../../shared/characters.js';
import { stripeTex, canvasTex } from './textures.js';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o });
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };

function face(g, y, z) {
  const white = M(0xffffff, { roughness: 0.2 }), black = M(0x222222), pink = M(0xff9ab8, { roughness: 0.8 });
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(0.09, 12, 12), white, s * 0.14, y + 0.08, z));
    g.add(mesh(new THREE.SphereGeometry(0.05, 10, 10), black, s * 0.14, y + 0.08, z + 0.065));
    g.add(mesh(new THREE.SphereGeometry(0.06, 10, 10), pink, s * 0.26, y - 0.06, z - 0.05));
  }
  const smile = mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 16, Math.PI), black, 0, y - 0.08, z + 0.03);
  smile.rotation.z = Math.PI;
  g.add(smile);
}
const feet = (g, c) => { for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.13, 12, 12), M(c), s * 0.2, 0.07, 0.05)); };

// Cada "shape" construye el cuerpo (origen en los pies, mira hacia +Z). Añadir una shape = nuevo personaje visual.
export const SHAPES = {
  gummy(c) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CapsuleGeometry(0.38, 0.24, 6, 16), M(c, { transparent: true, opacity: 0.93, roughness: 0.15 }), 0, 0.52));
    g.add(mesh(new THREE.ConeGeometry(0.13, 0.3, 8), M(0x4ecb5a), 0, 1.15));
    for (const [x, y] of [[-0.25, 0.4], [0.27, 0.35], [-0.2, 0.75], [0.22, 0.72]]) g.add(mesh(new THREE.SphereGeometry(0.035, 6, 6), M(0xffe27a), x, y, 0.33));
    feet(g, c); face(g, 0.58, 0.36); return g;
  },
  choco(c) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.8, 0.95, 0.6), M(c, { roughness: 0.35 }), 0, 0.52));
    for (const x of [-0.2, 0.2]) for (const z of [-0.12, 0.12]) g.add(mesh(new THREE.BoxGeometry(0.3, 0.1, 0.22), M(0x5a3320), x, 1.03, z));
    g.add(mesh(new THREE.BoxGeometry(0.83, 0.18, 0.63), M(0xdfe6ee, { metalness: 0.6, roughness: 0.3 }), 0, 0.12));
    feet(g, 0x5a3320); face(g, 0.62, 0.31); return g;
  },
  candy(c) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.43, 24, 24), M(0xffffff, { map: stripeTex('#ff4d8d', '#ffe14d', 5), roughness: 0.25 }), 0, 0.52));
    for (const s of [-1, 1]) {
      const w = mesh(new THREE.ConeGeometry(0.22, 0.4, 12), M(s > 0 ? 0x4dc3ff : 0xff7ad9), s * 0.58, 0.52);
      w.rotation.z = -s * Math.PI / 2; g.add(w);
    }
    feet(g, c); face(g, 0.58, 0.39); return g;
  },
  mallow(c) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.85, 28), M(c, { roughness: 0.9 }), 0, 0.52));
    for (const y of [0.1, 0.94]) g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.13, 28), M(0xffd9e8, { roughness: 0.9 }), 0, y));
    feet(g, 0xffe9f2); face(g, 0.6, 0.38); return g;
  },
};

export function makeLabel(text, { w = 256, h = 64, scale = 2.2, font = 'bold 34px Fredoka, system-ui, sans-serif' } = {}) {
  const tex = canvasTex(w, h, (g) => {
    g.fillStyle = 'rgba(255,255,255,0.88)';
    g.beginPath(); g.roundRect ? g.roundRect(4, 4, w - 8, h - 8, 28) : g.rect(4, 4, w - 8, h - 8); g.fill();
    g.fillStyle = '#7a2a55'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2, w - 24);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(scale, scale * h / w, 1);
  return s;
}

// Avatar: root (posición) > model (rotación/animación) + label (nombre, siempre de cara a la cámara).
export function createAvatar(characterId, name) {
  const ch = CHARACTERS[characterId] || CHARACTERS.berry;
  const root = new THREE.Group(), model = (SHAPES[ch.shape] || SHAPES.gummy)(ch.color);
  const label = makeLabel(name); label.position.y = 1.75;
  root.add(model, label);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return {
    root, model,
    update(time, anim, vy = 0) {
      let sy = 1, sx = 1, by = 0;
      if (anim === 'air') { const s = THREE.MathUtils.clamp(vy * 0.012, -0.15, 0.2); sy = 1 + s; sx = 1 - s * 0.6; }
      else if (anim === 'run') { const b = Math.sin(time * 16) * 0.06; sy = 1 + b; sx = 1 - b * 0.5; by = Math.abs(Math.sin(time * 8)) * 0.06; }
      else { sy = 1 + Math.sin(time * 3) * 0.02; sx = 2 - sy; }
      model.scale.set(sx, sy, sx); model.position.y = by;
    },
  };
}
