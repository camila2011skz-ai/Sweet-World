import { CHARACTERS, CHARACTER_IDS } from '../../shared/characters.js';
export const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let current = 'menu';

export function show(name) {
  current = name;
  document.querySelectorAll('[data-screen]').forEach((el) => el.classList.toggle('hidden', el.id !== 's-' + name));
  document.body.classList.toggle('in-match', name === 'hud');
}
export const currentScreen = () => current;

export function buildCards(selected, onPick) {
  const wrap = $('cards'); wrap.innerHTML = '';
  CHARACTER_IDS.forEach((id) => {
    const c = CHARACTERS[id], el = document.createElement('button');
    el.className = 'card' + (id === selected ? ' sel' : ''); el.dataset.id = id;
    el.innerHTML = `<span class="chip" style="background:${c.color}"><i></i><i></i></span><b>${c.name}</b><small>${c.desc}</small>`;
    el.onclick = () => { wrap.querySelectorAll('.card').forEach((x) => x.classList.toggle('sel', x === el)); onPick(id); };
    wrap.appendChild(el);
  });
}

let toastTimer;
export function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}
export const setError = (msg) => { $('sel-error').textContent = msg || ''; };
export const banner = (html) => { const b = $('banner'); b.innerHTML = html; b.classList.toggle('on', !!html); };

export function renderLobby(room, myId) {
  $('lobby-code').textContent = room.code;
  $('lobby-level').textContent = `${room.worldName} · ${room.levelName}`;
  $('lobby-players').innerHTML = room.players.map((p) =>
    `<li><span class="chip sm" style="background:${CHARACTERS[p.character].color}"><i></i><i></i></span>${esc(p.name)}` +
    `${p.id === room.hostId ? ' <em>👑 anfitrión</em>' : ''}${p.id === myId ? ' <em>(tú)</em>' : ''}</li>`).join('') +
    Array.from({ length: room.maxPlayers - room.players.length }, () => '<li class="empty">Esperando jugador…</li>').join('');
  const host = room.hostId === myId, enough = room.players.length >= room.minPlayers;
  $('btn-start').classList.toggle('hidden', !host);
  $('btn-start').disabled = !enough;
  $('lobby-hint').textContent = host ? (enough ? '¡Todo listo! Pulsa para empezar.' : `Necesitas al menos ${room.minPlayers} jugadores para empezar.`)
                                     : 'Esperando a que el anfitrión inicie la partida…';
}

export function setHud(h) {
  $('h-time').textContent = h.time.toFixed(1) + 's';
  $('h-candies').textContent = `🍬 ${h.candies}/${h.total}`;
  $('h-place').textContent = `${h.place}.º / ${h.count}`;
  const cd = $('countdown'); cd.textContent = h.countdown; cd.classList.toggle('on', !!h.countdown);
  const bar = $('h-prog');
  h.bars.forEach((b) => {
    let d = bar.querySelector(`[data-id="${CSS.escape(b.id)}"]`);
    if (!d) { d = document.createElement('i'); d.dataset.id = b.id; bar.appendChild(d); }
    d.style.left = (b.p * 100).toFixed(1) + '%'; d.style.background = b.color; d.classList.toggle('me', b.me);
  });
  bar.querySelectorAll('i').forEach((d) => { if (!h.bars.some((b) => b.id === d.dataset.id)) d.remove(); });
}
export const resetHud = () => { $('h-prog').innerHTML = ''; banner(''); };

export function renderResults(rows, myId) {
  const medal = ['🥇', '🥈', '🥉', '4.º'];
  $('res-list').innerHTML = rows.map((r) =>
    `<li class="${r.id === myId ? 'me' : ''}"><span class="pl">${medal[r.place - 1] || r.place + '.º'}</span>` +
    `<span class="chip sm" style="background:${CHARACTERS[r.character].color}"><i></i><i></i></span>` +
    `<span class="nm">${esc(r.name)}</span><span class="tm">${r.finished ? r.time.toFixed(1) + 's' : 'No llegó'}</span><span class="cd">🍬 ${r.candies}</span></li>`).join('');
}
