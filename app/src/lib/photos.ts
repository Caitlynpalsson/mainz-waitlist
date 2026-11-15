import { Image } from 'react-native';

// Each batch is a static map of catalog slug to its jpeg.
// Add the next batch as its own object, then spread it into stock.

const originals = {
  peach: require('../../assets/photos/peach.jpg'),
  strawberry: require('../../assets/photos/strawberry.jpg'),
  carrot: require('../../assets/photos/carrot.jpg'),
  honey: require('../../assets/photos/honey.jpg'),
  eggs: require('../../assets/photos/eggs.jpg'),
  tomato: require('../../assets/photos/tomato.jpg'),
  beets: require('../../assets/photos/beets.jpg'),
  comb: require('../../assets/photos/comb.jpg'),
  cow: require('../../assets/photos/cow.jpg'),
  milk: require('../../assets/photos/cow.jpg'),
} as const;

const batch1 = {
  apples: require('../../assets/photos/apples.jpg'),
  nectarines: require('../../assets/photos/nectarines.jpg'),
  apricots: require('../../assets/photos/apricots.jpg'),
  cherries: require('../../assets/photos/cherries.jpg'),
  plums: require('../../assets/photos/plums.jpg'),
  pluots: require('../../assets/photos/pluots.jpg'),
  pears: require('../../assets/photos/pears.jpg'),
  'asian-pears': require('../../assets/photos/asian-pears.jpg'),
  raspberries: require('../../assets/photos/raspberries.jpg'),
  blackberries: require('../../assets/photos/blackberries.jpg'),
  blueberries: require('../../assets/photos/blueberries.jpg'),
  grapes: require('../../assets/photos/grapes.jpg'),
  watermelon: require('../../assets/photos/watermelon.jpg'),
  cantaloupe: require('../../assets/photos/cantaloupe.jpg'),
  honeydew: require('../../assets/photos/honeydew.jpg'),
  'cherry-tomatoes': require('../../assets/photos/cherry-tomatoes.jpg'),
  tomatillos: require('../../assets/photos/tomatillos.jpg'),
  'sweet-corn': require('../../assets/photos/sweet-corn.jpg'),
  potatoes: require('../../assets/photos/potatoes.jpg'),
  'sweet-potatoes': require('../../assets/photos/sweet-potatoes.jpg'),
  onions: require('../../assets/photos/onions.jpg'),
  'green-onions': require('../../assets/photos/green-onions.jpg'),
  garlic: require('../../assets/photos/garlic.jpg'),
  shallots: require('../../assets/photos/shallots.jpg'),
  leeks: require('../../assets/photos/leeks.jpg'),
} as const;

const stock = {
  ...originals,
  ...batch1,
} as const;

export type StockKey = keyof typeof stock;

export function photoSource(photo: string | null | undefined): number | { uri: string } | null {
  if (!photo || photo === 'placeholder') return null;
  if (photo.startsWith('data:') || photo.startsWith('http')) return { uri: photo };
  if (photo in stock) return stock[photo as StockKey];
  return null;
}

export function photoAspect(photo: string | null | undefined): number | null {
  const source = photoSource(photo);
  if (!source || typeof source === 'object') return null;
  const resolved = Image.resolveAssetSource(source);
  if (!resolved?.width || !resolved?.height) return null;
  return resolved.width / resolved.height;
}
