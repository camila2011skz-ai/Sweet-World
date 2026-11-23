import camino from './camino-de-caramelos.js';

export default {
  id: 'reino-de-los-dulces',
  name: 'Reino de los Dulces',
  theme: { skyTop: '#7fd3ff', skyBottom: '#ffd1ec', fog: '#ffd9f1', syrup: '#ff8fbd' },
  order: [camino.id],
  levels: { [camino.id]: camino },
};
