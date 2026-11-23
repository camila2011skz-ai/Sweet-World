// Cliente de red: Socket.IO (global `io`, servido por el propio servidor) + sincronización de reloj.
export const socket = io();
export const call = (event, data) => new Promise((res) => {
  const t = setTimeout(() => res({ ok: false, error: 'Sin respuesta del servidor.' }), 6000);
  socket.emit(event, data, (r) => { clearTimeout(t); res(r); });
});

let offset = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function syncClock() {
  let best = null;
  for (let i = 0; i < 6; i++) {
    const t0 = Date.now();
    const s = await new Promise((r) => socket.emit('sync', r));
    const t1 = Date.now(), rtt = t1 - t0;
    if (!best || rtt < best.rtt) best = { rtt, off: s + rtt / 2 - t1 };
    await sleep(60);
  }
  offset = best.off;
}
export const serverNow = () => Date.now() + offset;
