// Registro de personajes. Para añadir uno: nueva entrada aquí + (opcional) nueva "shape" en
// public/js/game/characterModels.js. Las shapes existentes se pueden reutilizar con otro color.
export const CHARACTERS = {
  berry:  { id: 'berry',  name: 'Berry',  desc: 'Gomita de fresa',  color: '#ff6fa5', shape: 'gummy' },
  choco:  { id: 'choco',  name: 'Choco',  desc: 'Chocolate',        color: '#7b4a2d', shape: 'choco' },
  candy:  { id: 'candy',  name: 'Candy',  desc: 'Caramelo colorido', color: '#ffb52e', shape: 'candy' },
  mallow: { id: 'mallow', name: 'Mallow', desc: 'Malvavisco',       color: '#ffffff', shape: 'mallow' },
};
export const CHARACTER_IDS = Object.keys(CHARACTERS);
