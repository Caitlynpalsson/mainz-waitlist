import { Image } from 'react-native';

const stock = {
  peach: require('../../assets/photos/peach.jpg'),
  strawberry: require('../../assets/photos/strawberry.jpg'),
  carrot: require('../../assets/photos/carrot.jpg'),
  honey: require('../../assets/photos/honey.jpg'),
  eggs: require('../../assets/photos/eggs.jpg'),
  tomato: require('../../assets/photos/tomato.jpg'),
  beets: require('../../assets/photos/beets.jpg'),
  comb: require('../../assets/photos/comb.jpg'),
  cow: require('../../assets/photos/cow.jpg'),
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
