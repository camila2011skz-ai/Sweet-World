import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import { getLevel, DEFAULT_LEVEL } from '../shared/worlds/index.js';

const PORT = 3999, URL = `http://localhost:${PORT}`;
const srv = spawn('node', ['server/index.js'], { env: { ...process.env, PORT, MIN_PLAYERS: 2 }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => srv.stdout.on('data', (d) => String(d).includes('listening') && r()));
const cli = () => new Promise((r) => { const s = io(URL, { transports: ['websocket'] }); s.on('connect', () => r(s)); });
const emit = (s, e, d) => new Promise((r) => s.emit(e, d, r));
const once = (s, e, ms = 4000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + e)), ms); s.once(e, (d) => { clearTimeout(t); res(d); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const goal = getLevel(DEFAULT_LEVEL.world, DEFAULT_LEVEL.level).level.goal;

try {
  const html = await (await fetch(URL + '/')).text(); assert.match(html, /Sweet Worlds/);
  assert.equal((await fetch(URL + '/vendor/three/three.module.js')).status, 200);
  assert.equal((await fetch(URL + '/shared/worlds/index.js')).status, 200);

  const a = await cli(), b = await cli(), c = await cli(), d = await cli(), e = await cli();
  const ra = await emit(a, 'room:create', { name: 'Ana', character: 'berry' });
  assert.ok(ra.ok && /^[A-Z]{4}$/.test(ra.room.code)); const code = ra.room.code;
  assert.equal((await emit(b, 'room:join', { code: 'ZZZZ', name: 'x' })).ok, false);
  assert.equal((await emit(a, 'room:start')).ok, false, 'no empieza con 1 jugador');
  const upd = once(a, 'room:update');
  const rb = await emit(b, 'room:join', { code: code.toLowerCase(), name: '<b>Beto</b>', character: 'choco' });
  assert.ok(rb.ok); assert.equal(rb.room.players.length, 2); assert.ok(!rb.room.players[1].name.includes('<'));
  assert.equal((await upd).players.length, 2);
  assert.ok((await emit(c, 'room:join', { code, name: 'C', character: 'candy' })).ok);
  assert.ok((await emit(d, 'room:join', { code, name: 'D', character: 'mallow' })).ok);
  assert.equal((await emit(e, 'room:join', { code, name: 'E' })).ok, false, 'sala llena (máx. 4)');
  assert.equal((await emit(b, 'room:start')).ok, false, 'solo el anfitrión empieza');

  d.disconnect(); await sleep(150); // un jugador se va antes de empezar
  const gs = once(b, 'game:start');
  assert.ok((await emit(a, 'room:start')).ok);
  const start = await gs; assert.equal(start.players.length, 3); assert.ok(start.startAt > Date.now());
  assert.equal((await emit(e, 'room:join', { code, name: 'tarde' })).ok, false, 'no se puede entrar a partida empezada');

  await sleep(start.startAt - Date.now() + 100);
  b.emit('player:state', { x: 1, y: 2, z: -3, ry: 0.5, anim: 'run' }); b.emit('player:state', { x: NaN, y: 0, z: 0, ry: 0 });
  a.emit('player:collect', 0); a.emit('player:collect', 0); a.emit('player:collect', 9999);
  let snap; for (let i = 0; i < 5; i++) { snap = await once(a, 'snapshot'); if (snap.p.find((p) => p.x === 1)) break; }
  const pb = snap.p.find((p) => p.id === b.id); assert.deepEqual([pb.x, pb.y, pb.z, pb.anim], [1, 2, -3, 'run']);
  assert.equal(snap.p.find((p) => p.id === a.id).c, 1, 'caramelo contado una sola vez');

  assert.equal((await emit(a, 'player:finish', { x: 0, y: 0, z: 0 })).ok, false, 'meta lejana rechazada');
  const fa = await emit(a, 'player:finish', { x: goal.x, y: goal.y, z: goal.z + 1 }); assert.ok(fa.ok && fa.place === 1);
  const res = once(a, 'game:results');
  const fb = await emit(b, 'player:finish', { x: goal.x + 1, y: goal.y, z: goal.z }); assert.ok(fb.ok && fb.place === 2);
  c.disconnect(); // el que falta se desconecta -> termina la partida
  const { rows } = await res;
  assert.deepEqual(rows.map((r) => [r.name, r.place]), [['Ana', 1], ['bBeto/b', 2]]);

  const back = new Promise((r) => b.on('room:update', (u) => u.state === 'lobby' && r(u)));
  await sleep(100); b.emit('room:again');
  assert.equal((await back).state, 'lobby');
  a.disconnect(); await sleep(150);
  assert.equal((await fetch(URL + '/health')).status, 200);
  console.log('smoke OK: salas, unión por código, límite 4, inicio, sincronización, caramelos, meta, resultados');
} catch (err) { console.error('FALLO:', err); process.exitCode = 1; }
finally { srv.kill(); setTimeout(() => process.exit(), 100); }
