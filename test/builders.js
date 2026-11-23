// Comprueba que los constructores 3D del cliente se ejecutan sin errores (sin WebGL, con un canvas falso).
const ctx = new Proxy({}, { get: (_t, k) => (k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => ({ width: 50 })), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const { buildLevel } = await import('../public/js/game/levelBuilder.js');
const { createAvatar } = await import('../public/js/game/characterModels.js');
await import('../public/js/game/game.js'); // verifica imports/exports
const { CHARACTER_IDS } = await import('../shared/characters.js');
const { getLevel, DEFAULT_LEVEL } = await import('../shared/worlds/index.js');
const { world, level } = getLevel(DEFAULT_LEVEL.world, DEFAULT_LEVEL.level);
const lv = buildLevel(level, world); lv.update(1.5, 2); lv.setCheckpoint(0);
for (const id of CHARACTER_IDS) { const a = createAvatar(id, 'Test'); a.update(1, 'run', 0); a.update(1, 'air', 5); }
console.log('builders OK:', lv.group.children.length, 'objetos de nivel,', CHARACTER_IDS.length, 'personajes');
