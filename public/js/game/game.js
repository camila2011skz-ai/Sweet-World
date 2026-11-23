import * as THREE from 'three';
import { getLevel, DEFAULT_LEVEL } from '../../../shared/worlds/index.js';
import { CHARACTERS } from '../../../shared/characters.js';
import { createBody, stepBody, hitsHazard, spawnPoint } from '../../../shared/physics.js';
import { buildLevel } from './levelBuilder.js';
import { createAvatar } from './characterModels.js';
import { skyTex } from './textures.js';
import { Input } from './input.js';

const STEP = 1 / 60;
const lerpAngle = (a, b, k) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };

export class Game {
  constructor(canvas, hooks) {
    this.hooks = hooks; this.mode = 'preview'; this.match = null; this.acc = 0;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xffc4e4, 1.6));
    const sun = this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
    sun.shadow.bias = -0.0005;
    sun.position.set(25, 40, 15); this.scene.add(sun, sun.target);
    this.setTheme(getLevel(DEFAULT_LEVEL.world, DEFAULT_LEVEL.level).world.theme);

    this.previewGroup = new THREE.Group(); this.scene.add(this.previewGroup);
    this.previewAvatars = [];
    this.input = new Input();
    this.camYaw = 0; this.camPitch = 0.35;
    this.clock = new THREE.Clock();
    addEventListener('resize', () => this.resize()); this.resize();
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }

  setTheme(th) { this.scene.background = skyTex(th.skyTop, th.skyBottom); this.scene.fog = new THREE.Fog(th.fog, 70, 240); }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.fov = w / h < 1 ? 75 : 60; this.camera.updateProjectionMatrix();
  }

  // ---------- Vista previa (menú / sala de espera) ----------
  showPreview(list) {
    this.previewGroup.clear(); this.previewAvatars = [];
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.3, 0.4, 40), new THREE.MeshStandardMaterial({ color: 0xff9ccf, roughness: 0.4 }));
    floor.position.y = -0.2; floor.receiveShadow = true; this.previewGroup.add(floor);
    list.forEach((p, i) => {
      const a = createAvatar(p.character, p.name);
      a.root.position.set((i - (list.length - 1) / 2) * 2.2, 0, 0); a.i = i;
      this.previewGroup.add(a.root); this.previewAvatars.push(a);
    });
  }

  // ---------- Partida ----------
  startMatch({ world, level, players, myId, startAt }) {
    this.endMatch();
    const { world: w, level: L } = getLevel(world, level);
    this.setTheme(w.theme); this.previewGroup.visible = false;
    const mg = new THREE.Group(); this.scene.add(mg);
    const lv = buildLevel(L, w); mg.add(lv.group);
    const me = players.find((p) => p.id === myId) || { slot: 0, character: 'berry', name: '?' };
    const M = this.match = { L, lv, mg, startAt, myId, slot: me.slot, body: createBody(0, 0, 0), cp: -1,
      collected: new Set(), candies: 0, finished: false, roster: new Map(), remotes: new Map(), finishOrder: [] };
    M.startDist = Math.hypot(L.spawn.x - L.goal.x, L.spawn.z - L.goal.z) + L.goal.y;
    for (const p of players) M.roster.set(p.id, p);
    M.local = createAvatar(me.character, me.name); mg.add(M.local.root);
    for (const p of players) if (p.id !== myId) {
      const a = createAvatar(p.character, p.name), s = spawnPoint(L, p.slot);
      a.root.position.set(s.x, s.y, s.z); mg.add(a.root);
      M.remotes.set(p.id, { avatar: a, target: { x: s.x, y: s.y, z: s.z, ry: 0 }, anim: 'idle' });
    }
    this.respawn(true);
    this.camYaw = 0; this.camPitch = 0.35; this.camPos = null;
    this.acc = 0; this.lastSend = 0; this.lastHud = 0; this.input.enabled = true; this.mode = 'match';
  }

  endMatch() {
    const M = this.match; if (!M) return;
    this.scene.remove(M.mg);
    M.mg.traverse((o) => { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
    this.match = null; this.mode = 'preview'; this.input.enabled = false; this.previewGroup.visible = true;
    this.setTheme(getLevel(DEFAULT_LEVEL.world, DEFAULT_LEVEL.level).world.theme);
  }

  lock() { if (this.match) { this.match.finished = true; this.input.enabled = false; } }
  retryFinish() { if (this.match) this.match.finished = false; }

  respawn(initial = false) {
    const M = this.match, b = M.body, s = spawnPoint(M.L, M.slot, M.cp);
    Object.assign(b, { x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 0, onGround: false, ground: null });
    if (!initial) this.hooks.onToast('¡Ups! Vuelves al último checkpoint');
  }

  applySnapshot(snap) {
    const M = this.match; if (!M) return;
    const seen = new Set();
    for (const e of snap.p) {
      seen.add(e.id);
      if (e.f && !M.finishOrder[e.f - 1]) {
        M.finishOrder[e.f - 1] = e.id;
        if (e.id !== M.myId) this.hooks.onToast(`${M.roster.get(e.id)?.name ?? 'Alguien'} llegó en ${e.f}.º lugar`);
      }
      const r = M.remotes.get(e.id); if (!r) continue;
      if (r.first === undefined) { r.avatar.root.position.set(e.x, e.y, e.z); r.first = false; }
      r.target = { x: e.x, y: e.y, z: e.z, ry: e.ry }; r.anim = e.anim;
    }
    for (const [id, r] of M.remotes) if (!seen.has(id)) { M.mg.remove(r.avatar.root); M.remotes.delete(id); }
  }

  standings() {
    const M = this.match, g = M.L.goal;
    return [...M.roster.values()].filter((p) => p.id === M.myId || M.remotes.has(p.id)).map((p) => {
      const pos = p.id === M.myId ? M.body : M.remotes.get(p.id).avatar.root.position;
      const dist = Math.hypot(pos.x - g.x, pos.z - g.z) + Math.abs(pos.y - g.y);
      return { id: p.id, character: p.character, dist, fin: M.finishOrder.indexOf(p.id) };
    }).sort((a, b) => (a.fin >= 0 && b.fin >= 0 ? a.fin - b.fin : a.fin >= 0 ? -1 : b.fin >= 0 ? 1 : a.dist - b.dist))
      .map((s) => ({ ...s, p: s.fin >= 0 ? 1 : Math.max(0, Math.min(1, 1 - s.dist / M.startDist)) }));
  }

  step(ts, running) {
    const M = this.match, b = M.body, L = M.L;
    const raw = this.input.read(this.camYaw);
    stepBody(b, running ? raw : { mx: 0, mz: 0, jump: false }, STEP, L, ts);
    if (b.y < L.fallY || hitsHazard(L, ts, b)) return this.respawn();
    if (!running) return;
    L.checkpoints.forEach((c, i) => {
      if (i > M.cp && Math.hypot(b.x - c.x, b.z - c.z) < 4 && Math.abs(b.y - c.y) < 2.5) { M.cp = i; M.lv.setCheckpoint(i); this.hooks.onToast('Checkpoint ✔'); }
    });
    L.candies.forEach((c, i) => {
      if (M.collected.has(i)) return;
      if (Math.hypot(b.x - c.x, b.z - c.z) < 0.9 && Math.abs(b.y + 0.5 - c.y) < 1.1) {
        M.collected.add(i); M.candies++; M.lv.candyMeshes[i].visible = false; this.hooks.onCandy(i);
      }
    });
    const g = L.goal;
    if (!M.finished && Math.hypot(b.x - g.x, b.z - g.z) < g.r && Math.abs(b.y - g.y) < 3) {
      M.finished = true; this.hooks.onFinish({ x: b.x, y: b.y, z: b.z });
    }
  }

  updateMatch(dt, time) {
    const M = this.match, b = M.body, now = this.hooks.serverNow();
    const t = Math.max(0, (now - M.startAt) / 1000), running = now >= M.startAt && !M.finished;
    this.acc = Math.min(this.acc + dt, 0.1);
    let ts = t - this.acc;
    while (this.acc >= STEP) { this.acc -= STEP; ts += STEP; this.step(Math.max(0, ts), running); }

    // cámara
    const l = this.input.takeLook();
    this.camYaw -= l.dx * 0.005; this.camPitch = THREE.MathUtils.clamp(this.camPitch + l.dy * 0.004, 0.05, 1.2);
    if (this.input.keys.has('KeyQ')) this.camYaw += dt * 1.8;
    if (this.input.keys.has('KeyE')) this.camYaw -= dt * 1.8;
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch), D = 7;
    const focus = new THREE.Vector3(b.x, b.y + 1.2, b.z);
    const want = new THREE.Vector3(b.x + Math.sin(this.camYaw) * cp * D, b.y + 1.2 + sp * D, b.z + Math.cos(this.camYaw) * cp * D);
    if (!this.camPos) this.camPos = want.clone(); else this.camPos.lerp(want, 1 - Math.exp(-dt * 10));
    this.camera.position.copy(this.camPos); this.camera.lookAt(focus);
    this.sun.position.set(b.x + 25, b.y + 40, b.z + 15); this.sun.target.position.set(b.x, b.y, b.z);

    // avatares
    const sp2 = Math.hypot(b.vx, b.vz), A = M.local;
    A.root.position.set(b.x, b.y, b.z);
    if (sp2 > 0.5) A.model.rotation.y = lerpAngle(A.model.rotation.y, Math.atan2(b.vx, b.vz), 1 - Math.exp(-dt * 14));
    const anim = !b.onGround ? 'air' : sp2 > 1 ? 'run' : 'idle';
    A.update(time, anim, b.vy);
    for (const r of M.remotes.values()) {
      const k = 1 - Math.exp(-dt * 12), p = r.avatar.root.position, T = r.target;
      const vy = (T.y - p.y) * 8;
      p.x += (T.x - p.x) * k; p.y += (T.y - p.y) * k; p.z += (T.z - p.z) * k;
      r.avatar.model.rotation.y = lerpAngle(r.avatar.model.rotation.y, T.ry, k);
      r.avatar.update(time, r.anim, vy);
    }
    M.lv.update(t, time);

    if (time - this.lastSend > 0.05) { this.lastSend = time; this.hooks.onState({ x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), ry: +A.model.rotation.y.toFixed(2), anim }); }
    if (time - this.lastHud > 0.1) {
      this.lastHud = time;
      const st = this.standings(), cd = Math.ceil((M.startAt - now) / 1000);
      this.hooks.onHud({
        time: t, candies: M.candies, total: M.L.candies.length, place: st.findIndex((s) => s.id === M.myId) + 1, count: st.length,
        countdown: cd > 0 ? String(cd) : now - M.startAt < 900 ? '¡YA!' : '',
        bars: st.map((s) => ({ id: s.id, color: CHARACTERS[s.character].color, p: s.p, me: s.id === M.myId })),
      });
    }
  }

  updatePreview(dt, time) {
    const n = this.previewAvatars.length;
    this.camera.position.set(0, 1.9, 4.5 + n * 1.1); this.camera.lookAt(0, 0.9, 0);
    this.sun.position.set(10, 20, 15); this.sun.target.position.set(0, 0, 0);
    this.previewAvatars.forEach((a) => {
      a.model.rotation.y = Math.sin(time * 1.2 + a.i) * 0.6;
      const hop = Math.max(0, Math.sin(time * 3 + a.i * 1.7)); a.root.position.y = hop * 0.5;
      a.update(time, hop > 0.05 ? 'air' : 'idle', Math.cos(time * 3 + a.i * 1.7) * 6);
    });
  }

  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05), time = this.clock.elapsedTime;
    if (this.mode === 'match' && this.match) this.updateMatch(dt, time); else this.updatePreview(dt, time);
    this.renderer.render(this.scene, this.camera);
  }
}
