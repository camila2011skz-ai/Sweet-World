// Registro de obstáculos. Cada tipo define su pose en el tiempo t (segundos desde el inicio)
// y su colisión. El cliente los dibuja con HAZARD_VIEWS (public/js/game/levelBuilder.js).
// Añadir un obstáculo nuevo = una entrada aquí + una vista allá.
const S = (h, t) => Math.sin(t * h.speed + (h.phase || 0));

export const OBSTACLES = {
  // Bloque que se desliza en un eje (x por defecto, o z).
  slider: {
    pose(h, t) {
      const o = S(h, t) * h.amp;
      return { x: h.x + (h.axis === 'z' ? 0 : o), y: h.y, z: h.z + (h.axis === 'z' ? o : 0) };
    },
    hits(h, t, b, r, H) {
      const p = OBSTACLES.slider.pose(h, t);
      return Math.abs(b.x - p.x) < h.w / 2 + r && Math.abs(b.z - p.z) < h.d / 2 + r &&
             b.y < p.y + h.h && b.y + H > p.y;
    },
  },
  // Barra giratoria (bastón de caramelo) alrededor de un pilar.
  spinner: {
    pose(h, t) { return { x: h.x, y: h.y, z: h.z, angle: t * h.speed + (h.phase || 0) }; },
    hits(h, t, b, r, H) {
      const a = t * h.speed + (h.phase || 0), dx = b.x - h.x, dz = b.z - h.z;
      const u = dx * Math.cos(a) + dz * Math.sin(a), v = -dx * Math.sin(a) + dz * Math.cos(a);
      return Math.abs(u) < h.len / 2 + r && Math.abs(v) < 0.35 + r && b.y < h.y + h.h && b.y + H > h.y;
    },
  },
};
