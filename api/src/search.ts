export const SEARCH_EMPTY = 'no match. try another word';

export function searchProducts<T extends { name: string; category?: string }>(products: T[], query: string): T[] {
  const words = wordsOf(query);
  if (!words.length) return products;
  return products.filter((product) => {
    const hay = `${product.name} ${product.category || ''}`.toLowerCase();
    return words.every((word) => hay.includes(word));
  });
}

/** Public farms only. A hidden draft, shopVisible false, never comes back. */
export function searchPublicFarms<T extends {
  name: string;
  city?: string;
  cardFoods?: string;
  shopVisible?: boolean;
}>(farms: T[], query: string): T[] {
  const visible = farms.filter((farm) => farm.shopVisible !== false);
  const words = wordsOf(query);
  if (!words.length) return visible;
  return visible.filter((farm) => {
    const hay = `${farm.name} ${farm.city || ''} ${farm.cardFoods || ''}`.toLowerCase();
    return words.every((word) => hay.includes(word));
  });
}

function wordsOf(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}
