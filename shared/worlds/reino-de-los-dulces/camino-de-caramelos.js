// Nivel 1. Convención: plataforma (x,y,z) = centro de la cara SUPERIOR; w=ancho(x), d=largo(z), h=grosor.
// El nivel avanza hacia -Z. Para crear otro nivel copia este archivo y regístralo en el index del mundo.
const P = (x, y, z, w, d, extra = {}) => ({ x, y, z, w, d, ...extra });

const candies = [];
const line = (x1, y, z1, x2, z2, n) => {
  for (let i = 0; i < n; i++) { const f = n === 1 ? 0 : i / (n - 1); candies.push({ x: x1 + (x2 - x1) * f, y, z: z1 + (z2 - z1) * f }); }
};
line(0, 1.2, -9, 0, -19, 5);
candies.push({ x: 3, y: 2.3, z: -24 }, { x: -2, y: 3.3, z: -29 }, { x: 3, y: 4.3, z: -34 });
line(-3, 4.3, -39, 3, -53, 6);
candies.push({ x: 0, y: 4.3, z: -59 }, { x: 0, y: 5.3, z: -66 }, { x: 0, y: 5.3, z: -73 });
line(-5, 5.3, -83, -5, -93, 4); line(5, 5.3, -83, 5, -93, 4);
candies.push({ x: 3, y: 6.8, z: -101 }, { x: -2, y: 8.3, z: -107 }, { x: 2, y: 9.8, z: -112 });
line(0, 9.7, -116, 0, -130, 5);
line(-4, 9.7, -136, 4, -136, 5);

export default {
  id: 'camino-de-caramelos',
  name: 'Camino de Caramelos',
  fallY: -14,
  spawn: { x: 0, y: 0, z: 1.5, spread: 2.6 },
  platforms: [
    P(0, 0, 0, 14, 10, { kind: 'ground', color: 0xff9ccf }),                    // salida
    P(0, 0, -13, 3.2, 14, { kind: 'bridge', h: 0.5 }),                           // puente de chocolate
    P(3, 1, -24, 4, 4, { color: 0xff5fa2 }),                                     // plataformas flotantes
    P(-2, 2, -29, 4, 4, { color: 0x5fd0ff }),
    P(3, 3, -34, 4, 4, { color: 0xffd24d }),
    P(0, 3, -46, 12, 18, { kind: 'ground', color: 0xb9f27c }),                   // zona de deslizadores
    P(0, 3, -59, 4, 4, { color: 0xc58bff, move: { axis: 'x', amp: 3, speed: 1.2 } }),               // plataformas móviles
    P(0, 4, -66, 4, 4, { color: 0xff8a5f, move: { axis: 'x', amp: 3, speed: 1.2, phase: Math.PI } }),
    P(0, 4, -73, 4, 4, { color: 0x5fe0b5, move: { axis: 'z', amp: 2, speed: 1.5 } }),
    P(0, 4, -88, 14, 16, { kind: 'ground', color: 0xffe27a }),                   // zona del bastón giratorio
    P(3, 5.5, -101, 4, 4, { color: 0xff5fa2 }),                                  // escalera
    P(-2, 7, -107, 4, 4, { color: 0x5fd0ff }),
    P(2, 8.5, -112, 4, 4, { color: 0xffd24d }),
    P(0, 8.5, -123, 3.2, 18, { kind: 'bridge', h: 0.5 }),                        // puente final
    P(0, 8.5, -139, 14, 14, { kind: 'ground', color: 0xff9ccf }),                // meta
  ],
  hazards: [
    { type: 'slider', x: 0, y: 3, z: -43, w: 2.2, h: 1.4, d: 1.2, axis: 'x', amp: 4.2, speed: 1.8 },
    { type: 'slider', x: 0, y: 3, z: -50, w: 2.2, h: 1.4, d: 1.2, axis: 'x', amp: 4.2, speed: 2.3, phase: 1.6 },
    { type: 'spinner', x: 0, y: 4, z: -88, len: 11, h: 1.2, speed: 1.6 },
  ],
  candies,
  checkpoints: [{ x: 0, y: 3, z: -39 }, { x: 0, y: 4, z: -82 }],
  goal: { x: 0, y: 8.5, z: -140, r: 3.5 },
};
