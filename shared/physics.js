// Física compartida (cliente y pruebas en Node). Cada jugador simula su propio cuerpo
// contra los datos del nivel; los obstáculos móviles dependen solo del tiempo `t`.
import { OBSTACLES } from './obstacles.js';

export const CFG = { speed: 9, accel: 70, airAccel: 35, gravity: -34, jump: 13, maxFall: -45,
                     radius: 0.45, height: 1.0, coyote: 0.12, buffer: 0.12 };

const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));

export function platformPos(p, t) {
  const m = p.move;
  if (!m) return p;
  const o = Math.sin(t * m.speed + (m.phase || 0)) * m.amp;
  return { x: p.x + (m.axis === 'x' ? o : 0), y: p.y + (m.axis === 'y' ? o : 0), z: p.z + (m.axis === 'z' ? o : 0) };
}

// (x,y,z) de la plataforma = centro de su cara superior.
export function platformBox(p, t) {
  const c = platformPos(p, t), th = p.h ?? 1;
  return { minX: c.x - p.w / 2, maxX: c.x + p.w / 2, minY: c.y - th, maxY: c.y, minZ: c.z - p.d / 2, maxZ: c.z + p.d / 2 };
}

export function createBody(x, y, z) {
  return { x, y, z, vx: 0, vy: 0, vz: 0, onGround: false, ground: null, coyote: 0, buffer: 0, jumped: false };
}

function overlaps(b, bx) {
  const r = CFG.radius;
  return b.x + r > bx.minX && b.x - r < bx.maxX && b.z + r > bx.minZ && b.z - r < bx.maxZ &&
         b.y + CFG.height > bx.minY && b.y < bx.maxY;
}

function collide(b, boxes, axis, prevY) {
  const r = CFG.radius;
  for (const [p, bx] of boxes) {
    if (!overlaps(b, bx)) continue;
    if (axis === 'y') {
      if (b.vy <= 0 && prevY >= bx.maxY - 0.35) { b.y = bx.maxY; b.vy = 0; b.onGround = true; b.ground = p; }
      else if (b.vy > 0) { b.y = bx.minY - CFG.height - 0.001; b.vy = 0; }
    } else if (b.y < bx.maxY - 0.3) { // pared lateral (los escalones < 0.3 se suben solos)
      if (axis === 'x') {
        b.x = (b.vx > 0 || (b.vx === 0 && b.x < (bx.minX + bx.maxX) / 2)) ? bx.minX - r - 0.001 : bx.maxX + r + 0.001;
        b.vx = 0;
      } else {
        b.z = (b.vz > 0 || (b.vz === 0 && b.z < (bx.minZ + bx.maxZ) / 2)) ? bx.minZ - r - 0.001 : bx.maxZ + r + 0.001;
        b.vz = 0;
      }
    }
  }
}

// inp = { mx, mz, jump } (mx/mz: dirección en mundo, magnitud <= 1; jump: true en el frame de pulsación)
export function stepBody(b, inp, dt, level, t) {
  b.jumped = false;
  if (b.ground && b.ground.move) { // viajar con la plataforma móvil
    const a = platformPos(b.ground, t - dt), c = platformPos(b.ground, t);
    b.x += c.x - a.x; b.y += c.y - a.y; b.z += c.z - a.z;
  }
  const acc = (b.onGround ? CFG.accel : CFG.airAccel) * dt;
  b.vx = approach(b.vx, inp.mx * CFG.speed, acc);
  b.vz = approach(b.vz, inp.mz * CFG.speed, acc);
  b.coyote = b.onGround ? CFG.coyote : b.coyote - dt;
  b.buffer = inp.jump ? CFG.buffer : b.buffer - dt;
  if (b.buffer > 0 && b.coyote > 0) {
    b.vy = CFG.jump; b.coyote = 0; b.buffer = 0; b.onGround = false; b.ground = null; b.jumped = true;
  }
  b.vy = Math.max(b.vy + CFG.gravity * dt, CFG.maxFall);
  const boxes = level.platforms.map((p) => [p, platformBox(p, t)]);
  b.x += b.vx * dt; collide(b, boxes, 'x');
  b.z += b.vz * dt; collide(b, boxes, 'z');
  const prevY = b.y;
  b.y += b.vy * dt; b.onGround = false; b.ground = null;
  collide(b, boxes, 'y', prevY);
}

export function hitsHazard(level, t, b) {
  for (const h of level.hazards || []) {
    const T = OBSTACLES[h.type];
    if (T && T.hits(h, t, b, CFG.radius, CFG.height)) return true;
  }
  return false;
}

export const spawnPoint = (level, slot, cp = -1) => {
  if (cp < 0) { const s = level.spawn; return { x: (slot - 1.5) * s.spread, y: s.y + 0.3, z: s.z }; }
  const c = level.checkpoints[cp];
  return { x: c.x + (slot - 1.5) * 0.9, y: c.y + 0.3, z: c.z };
};
