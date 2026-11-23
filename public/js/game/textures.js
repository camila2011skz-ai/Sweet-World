import * as THREE from 'three';

export function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Rayas diagonales (bastón de caramelo / menta).
export function stripeTex(c1, c2, n = 4) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = c1; g.fillRect(0, 0, w, h);
    g.fillStyle = c2;
    const k = w / n;
    for (let i = -n; i < n * 2; i++) {
      const s = k * i;
      g.beginPath(); g.moveTo(s, 0); g.lineTo(s + k / 2, 0); g.lineTo(s + k / 2 - h, h); g.lineTo(s - h, h); g.fill();
    }
  }, true);
}

export function skyTex(top, bottom) {
  return canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
