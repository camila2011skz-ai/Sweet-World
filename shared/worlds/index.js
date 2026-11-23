// Registro de mundos. Para añadir un mundo: crea su carpeta (index.js con sus niveles) e impórtalo aquí.
import reino from './reino-de-los-dulces/index.js';

export const WORLDS = { [reino.id]: reino };
export const DEFAULT_LEVEL = { world: reino.id, level: 'camino-de-caramelos' };

export function getLevel(worldId, levelId) {
  const world = WORLDS[worldId];
  const level = world && world.levels[levelId];
  if (!level) throw new Error(`Nivel no encontrado: ${worldId}/${levelId}`);
  return { world, level };
}
