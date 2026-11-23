import { CHARACTERS } from '../../shared/characters.js';
import { Game } from './game/game.js';
import { socket, call, syncClock, serverNow } from './net.js';
import * as ui from './ui.js';
const { $ } = ui;

if (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) document.body.classList.add('touch');

const sel = { name: '', character: 'berry' };
try { Object.assign(sel, JSON.parse(localStorage.getItem('sw-profile') || '{}')); } catch {}
if (!CHARACTERS[sel.character]) sel.character = 'berry';
const save = () => { try { localStorage.setItem('sw-profile', JSON.stringify(sel)); } catch {} };

let inRoom = false;
const game = new Game($('c'), {
  serverNow,
  onState: (s) => socket.emit('player:state', s),
  onCandy: (i) => socket.emit('player:collect', i),
  onToast: ui.toast,
  onHud: ui.setHud,
  async onFinish(pos) {
    const r = await call('player:finish', pos);
    if (r.ok) ui.banner(`🏁 ¡Llegaste en ${r.place}.º lugar!<small>${r.time.toFixed(1)} s · esperando a los demás…</small>`);
    else { game.retryFinish(); }
  },
});

const myName = () => ($('name').value.trim() || 'Jugador').slice(0, 12);
const previewSelf = () => game.showPreview([{ id: 'me', character: sel.character, name: myName() }]);

ui.buildCards(sel.character, (id) => { sel.character = id; save(); previewSelf(); });
$('name').value = sel.name;
$('name').addEventListener('input', () => { sel.name = $('name').value.trim(); save(); previewSelf(); });
previewSelf();

$('btn-play').onclick = () => { ui.setError(''); ui.show('select'); previewSelf(); };
$('btn-back').onclick = () => ui.show('menu');

async function enter(event, data) {
  ui.setError('');
  const r = await call(event, { ...data, name: myName(), character: sel.character });
  if (!r.ok) return ui.setError(r.error || 'No se pudo entrar a la sala.');
  inRoom = true; syncClock();
  ui.show('lobby'); ui.renderLobby(r.room, socket.id); game.showPreview(r.room.players);
}
$('btn-create').onclick = () => enter('room:create', {});
$('btn-join').onclick = () => {
  const code = $('code').value.trim().toUpperCase();
  if (code.length !== 4) return ui.setError('El código tiene 4 letras.');
  enter('room:join', { code });
};
$('code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });

$('btn-copy').onclick = async () => {
  const link = `${location.origin}/?sala=${$('lobby-code').textContent}`;
  try { await navigator.clipboard.writeText(link); ui.toast('Enlace copiado'); } catch { ui.toast(link); }
};
$('btn-start').onclick = async () => { const r = await call('room:start'); if (!r.ok) ui.toast(r.error); };
const leave = () => { socket.emit('room:leave'); inRoom = false; game.endMatch(); ui.resetHud(); previewSelf(); ui.show('menu'); };
$('btn-leave').onclick = leave;
$('btn-exit').onclick = leave;
$('btn-again').onclick = () => socket.emit('room:again');

socket.on('room:update', (room) => {
  if (!inRoom) return;
  if (room.state === 'lobby') {
    if (ui.currentScreen() !== 'lobby') { game.endMatch(); ui.resetHud(); ui.show('lobby'); }
    ui.renderLobby(room, socket.id); game.showPreview(room.players);
  }
});
socket.on('game:start', async (d) => {
  if (!inRoom) return;
  await syncClock();
  ui.resetHud(); ui.show('hud');
  game.startMatch({ ...d, myId: socket.id });
});
socket.on('snapshot', (s) => game.applySnapshot(s));
socket.on('game:results', ({ rows }) => {
  game.lock(); ui.renderResults(rows, socket.id); ui.show('results');
});
socket.on('disconnect', () => { if (inRoom) { inRoom = false; game.endMatch(); ui.resetHud(); ui.show('menu'); ui.toast('Se perdió la conexión con el servidor.'); } });
socket.on('connect', () => syncClock());

// Enlace de invitación: /?sala=ABCD
const pre = new URLSearchParams(location.search).get('sala');
if (pre) { $('code').value = pre.toUpperCase().slice(0, 4); ui.show('select'); } else ui.show('menu');
