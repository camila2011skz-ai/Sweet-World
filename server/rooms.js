import { getLevel, DEFAULT_LEVEL } from '../shared/worlds/index.js';
import { CHARACTERS } from '../shared/characters.js';

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = Number(process.env.MIN_PLAYERS || 2);
const COUNTDOWN_MS = 4000;      // cuenta atrás antes de correr
const GRACE_MS = 30000;         // tiempo extra para los demás cuando alguien llega a la meta
const MAX_MATCH_MS = 240000;    // duración máxima de una partida
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ANIMS = new Set(['idle', 'run', 'air']);

const cleanName = (n) => String(n ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) || 'Jugador';
const num = (v) => Number.isFinite(v) && Math.abs(v) < 1000;

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    setInterval(() => this.tick(), 50); // 20 snapshots/s
  }

  info(room) {
    const { world, level } = getLevel(room.level.world, room.level.level);
    return {
      code: room.code, state: room.state, hostId: room.hostId, minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS,
      world: world.id, worldName: world.name, level: level.id, levelName: level.name,
      players: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, character: p.character, slot: p.slot })),
    };
  }
  broadcast(room) { this.io.to(room.code).emit('room:update', this.info(room)); }

  create(socket, data) {
    this.leave(socket);
    let code;
    do { code = Array.from({ length: 4 }, () => ALPHABET[(Math.random() * ALPHABET.length) | 0]).join(''); }
    while (this.rooms.has(code));
    const room = { code, state: 'lobby', hostId: socket.id, players: new Map(), level: { ...DEFAULT_LEVEL },
                   startAt: 0, finishCount: 0, timers: {} };
    this.rooms.set(code, room);
    return this.addPlayer(room, socket, data);
  }

  join(socket, data) {
    const room = this.rooms.get(String(data?.code ?? '').toUpperCase().trim());
    if (!room) return { ok: false, error: 'No existe ninguna sala con ese código.' };
    if (room.players.has(socket.id)) return { ok: true, id: socket.id, room: this.info(room) };
    if (room.state !== 'lobby') return { ok: false, error: 'Esa partida ya empezó.' };
    if (room.players.size >= MAX_PLAYERS) return { ok: false, error: 'La sala está llena (máximo 4 jugadores).' };
    this.leave(socket);
    return this.addPlayer(room, socket, data);
  }

  addPlayer(room, socket, data) {
    const used = new Set([...room.players.values()].map((p) => p.slot));
    const slot = [0, 1, 2, 3].find((s) => !used.has(s));
    room.players.set(socket.id, {
      id: socket.id, name: cleanName(data?.name), character: CHARACTERS[data?.character] ? data.character : 'berry',
      slot, x: 0, y: 0, z: 0, ry: 0, anim: 'idle', candies: 0, got: new Set(), finishTime: null, place: 0,
    });
    socket.join(room.code);
    socket.data.room = room.code;
    this.broadcast(room);
    return { ok: true, id: socket.id, room: this.info(room) };
  }

  roomOf(socket) { return this.rooms.get(socket.data.room); }

  leave(socket) {
    const room = this.roomOf(socket);
    if (!room) return;
    room.players.delete(socket.id);
    socket.leave(room.code);
    socket.data.room = null;
    if (room.players.size === 0) { this.clearTimers(room); this.rooms.delete(room.code); return; }
    if (room.hostId === socket.id) room.hostId = room.players.keys().next().value;
    this.broadcast(room);
    if (room.state === 'playing') this.checkAllDone(room);
  }

  start(socket) {
    const room = this.roomOf(socket);
    if (!room) return { ok: false, error: 'No estás en una sala.' };
    if (room.hostId !== socket.id) return { ok: false, error: 'Solo el anfitrión puede empezar.' };
    if (room.state !== 'lobby') return { ok: false, error: 'La partida ya empezó.' };
    if (room.players.size < MIN_PLAYERS) return { ok: false, error: `Se necesitan al menos ${MIN_PLAYERS} jugadores.` };
    room.state = 'playing';
    room.startAt = Date.now() + COUNTDOWN_MS;
    room.finishCount = 0;
    for (const p of room.players.values()) { p.candies = 0; p.got = new Set(); p.finishTime = null; p.place = 0; p.anim = 'idle'; }
    const i = this.info(room);
    this.io.to(room.code).emit('game:start', { startAt: room.startAt, world: i.world, level: i.level, players: i.players });
    this.broadcast(room);
    room.timers.max = setTimeout(() => this.end(room), COUNTDOWN_MS + MAX_MATCH_MS);
    return { ok: true };
  }

  state(socket, s) {
    const room = this.roomOf(socket), p = room?.players.get(socket.id);
    if (!p || room.state !== 'playing' || p.finishTime != null || !s) return;
    if (!num(s.x) || !num(s.y) || !num(s.z) || !num(s.ry)) return;
    p.x = s.x; p.y = s.y; p.z = s.z; p.ry = s.ry; p.anim = ANIMS.has(s.anim) ? s.anim : 'idle';
  }

  collect(socket, id) {
    const room = this.roomOf(socket), p = room?.players.get(socket.id);
    if (!p || room.state !== 'playing' || Date.now() < room.startAt) return;
    const { level } = getLevel(room.level.world, room.level.level);
    if (!Number.isInteger(id) || id < 0 || id >= level.candies.length || p.got.has(id)) return;
    p.got.add(id); p.candies = p.got.size;
  }

  finish(socket, pos) {
    const room = this.roomOf(socket), p = room?.players.get(socket.id);
    if (!p || room.state !== 'playing' || Date.now() < room.startAt) return { ok: false };
    if (p.finishTime != null) return { ok: true, place: p.place, time: p.finishTime };
    const g = getLevel(room.level.world, room.level.level).level.goal;
    const near = pos && Math.hypot(pos.x - g.x, pos.z - g.z) < g.r + 4 && Math.abs(pos.y - g.y) < 6;
    if (!near) return { ok: false };
    p.x = pos.x; p.y = pos.y; p.z = pos.z;
    p.finishTime = (Date.now() - room.startAt) / 1000;
    p.place = ++room.finishCount;
    if (room.finishCount === 1 && !room.timers.grace) room.timers.grace = setTimeout(() => this.end(room), GRACE_MS);
    this.checkAllDone(room);
    return { ok: true, place: p.place, time: p.finishTime };
  }

  checkAllDone(room) {
    if (room.state !== 'playing' || room.timers.done) return;
    if ([...room.players.values()].every((p) => p.finishTime != null)) room.timers.done = setTimeout(() => this.end(room), 1500);
  }

  end(room) {
    if (room.state !== 'playing') return;
    this.clearTimers(room);
    room.state = 'results';
    const g = getLevel(room.level.world, room.level.level).level.goal;
    const rows = [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, character: p.character, candies: p.candies,
      finished: p.finishTime != null, time: p.finishTime, dist: Math.hypot(p.x - g.x, p.z - g.z) + Math.abs(p.y - g.y),
    }));
    rows.sort((a, b) => (a.finished && b.finished ? a.time - b.time : a.finished ? -1 : b.finished ? 1 : a.dist - b.dist));
    rows.forEach((r, i) => { r.place = i + 1; delete r.dist; });
    this.io.to(room.code).emit('game:results', { rows });
    this.broadcast(room);
  }

  again(socket) {
    const room = this.roomOf(socket);
    if (room && room.state === 'results') { room.state = 'lobby'; this.broadcast(room); }
  }

  clearTimers(room) { for (const k of Object.keys(room.timers)) { clearTimeout(room.timers[k]); delete room.timers[k]; } }

  tick() {
    for (const room of this.rooms.values()) {
      if (room.state !== 'playing') continue;
      this.io.to(room.code).volatile.emit('snapshot', {
        p: [...room.players.values()].map((p) => ({ id: p.id, x: p.x, y: p.y, z: p.z, ry: p.ry, anim: p.anim, c: p.candies, f: p.place })),
      });
    }
  }
}
