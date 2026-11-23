import assert from 'node:assert/strict';
import { createBody, stepBody, hitsHazard, spawnPoint, platformPos } from '../shared/physics.js';
import { getLevel, DEFAULT_LEVEL } from '../shared/worlds/index.js';
const { level } = getLevel(DEFAULT_LEVEL.world, DEFAULT_LEVEL.level);
const DT = 1 / 60, none = { mx: 0, mz: 0, jump: false };
const run = (b, inp, secs, t0 = 0) => { let t = t0; for (let i = 0; i < secs * 60; i++) { t += DT; stepBody(b, typeof inp === 'function' ? inp(t, b) : inp, DT, level, t); } return t; };

// 1) cae y aterriza en la salida
let s = spawnPoint(level, 0), b = createBody(s.x, s.y, s.z);
run(b, none, 1); assert.ok(b.onGround && Math.abs(b.y) < 0.01, 'aterriza en la salida');

// 2) saltar el hueco hacia el puente (correr -Z con salto en el borde)
b = createBody(0, 0.3, -3);
run(b, (t, p) => ({ mx: 0, mz: -1, jump: p.z < -4.4 && p.onGround }), 1.5);
assert.ok(b.z < -7 && b.y > -0.5, 'avanza sobre el puente, z=' + b.z.toFixed(2));

// 3) caer al vacío
b = createBody(8, 1, 0); run(b, none, 1.5); assert.ok(b.y < level.fallY || b.y < -10, 'cae al vacío');

// 4) una plataforma móvil transporta al jugador (el desfase respecto a ella se mantiene tras aterrizar)
const mover = level.platforms.find((p) => p.move);
let t = 0.3, c = platformPos(mover, t); b = createBody(c.x, c.y + 0.5, c.z);
t = run(b, none, 0.4, t); assert.ok(b.onGround, 'aterriza en la plataforma móvil');
const off1 = b.x - platformPos(mover, t).x;
t = run(b, none, 0.5, t); const off2 = b.x - platformPos(mover, t).x;
assert.ok(b.onGround && Math.abs(off1 - off2) < 0.05, 'viaja con la plataforma móvil');

// 5) hazards: spinner golpea, y deja de golpear lejos; slider golpea al cruzar
const sp = level.hazards.find((h) => h.type === 'spinner');
assert.ok(hitsHazard(level, 0, { x: sp.x + 2, y: sp.y, z: sp.z }), 'spinner golpea al jugador');
assert.ok(!hitsHazard(level, 0, { x: sp.x + 2, y: sp.y + 3, z: sp.z }), 'saltando por encima no golpea');
assert.ok(!hitsHazard(level, 0, { x: 0, y: 0, z: -10 }), 'sin hazard en el puente');

// 6) todos los checkpoints/meta/candies están sobre alguna plataforma
const on = (q) => level.platforms.some((p) => Math.abs(q.x - p.x) <= p.w / 2 + 4 && Math.abs(q.z - p.z) <= p.d / 2 + 4);
assert.ok(level.checkpoints.every(on) && on(level.goal), 'checkpoints y meta cerca de plataformas');
console.log('physics OK (' + level.candies.length + ' caramelos)');
