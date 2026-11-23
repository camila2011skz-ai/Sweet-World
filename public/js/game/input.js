// Entradas: teclado (WASD/flechas/espacio), arrastre de ratón o dedo para la cámara, joystick virtual y botón de salto.
export class Input {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.keys = new Set(); this.jumpQ = false; this.enabled = false;
    this.look = { dx: 0, dy: 0 }; this.joy = { x: 0, y: 0 };

    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.code === 'Space' && !e.repeat) this.jumpQ = true;
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    const lookEl = $('look'); let lp = null, lx = 0, ly = 0;
    lookEl.addEventListener('pointerdown', (e) => { lp = e.pointerId; lx = e.clientX; ly = e.clientY; lookEl.setPointerCapture(e.pointerId); });
    lookEl.addEventListener('pointermove', (e) => { if (e.pointerId !== lp) return; this.look.dx += e.clientX - lx; this.look.dy += e.clientY - ly; lx = e.clientX; ly = e.clientY; });
    const endLook = (e) => { if (e.pointerId === lp) lp = null; };
    lookEl.addEventListener('pointerup', endLook); lookEl.addEventListener('pointercancel', endLook);

    const joy = $('joy'), knob = $('knob'); let jp = null, cx = 0, cy = 0, R = 1;
    const moveJoy = (e) => {
      let x = (e.clientX - cx) / R, y = (cy - e.clientY) / R; const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      this.joy.x = x; this.joy.y = y; knob.style.transform = `translate(${x * R * 0.6}px,${-y * R * 0.6}px)`;
    };
    joy.addEventListener('pointerdown', (e) => {
      jp = e.pointerId; joy.setPointerCapture(e.pointerId);
      const b = joy.getBoundingClientRect(); cx = b.left + b.width / 2; cy = b.top + b.height / 2; R = b.width / 2; moveJoy(e);
    });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId === jp) moveJoy(e); });
    const endJoy = (e) => { if (e.pointerId !== jp) return; jp = null; this.joy.x = this.joy.y = 0; knob.style.transform = ''; };
    joy.addEventListener('pointerup', endJoy); joy.addEventListener('pointercancel', endJoy);
    $('jump').addEventListener('pointerdown', (e) => { e.preventDefault(); if (this.enabled) this.jumpQ = true; });
  }

  // Devuelve el movimiento en coordenadas de mundo relativo a la cámara (yaw) y consume el salto.
  read(yaw) {
    const k = (c) => this.keys.has(c);
    let ix = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0) + this.joy.x;
    let iy = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0) + this.joy.y;
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const jump = this.jumpQ; this.jumpQ = false;
    return { mx: fx * iy + rx * ix, mz: fz * iy + rz * ix, jump, moving: m > 0.05 };
  }
  takeLook() { const l = { ...this.look }; this.look.dx = this.look.dy = 0; return l; }
}
