export type WindowSlot = { day: string; label: string };
export type Windows = { pickup: WindowSlot[]; delivery: WindowSlot[] };

export type ProductCard = {
  id: number;
  name: string;
  headline: string;
  note: string;
  dek: string;
  priceCents: number;
  unit: string;
  stockQty: number;
  inSeason: boolean;
  category: string;
  photo: string;
  farmId: number;
  farmSlug: string;
  farmName: string;
  farmCity: string;
};

export type FarmCard = {
  id: number;
  slug: string;
  name: string;
  city: string;
  state: string;
  milesAway: number | null;
  offersPickup: boolean;
  offersDelivery: boolean;
  pickupSummary: string;
  deliverySummary: string;
  heroPhoto: string;
  cardFoods: string;
  isDemo: boolean;
  statValue: string;
  statLabel: string;
  sinceYear: number | null;
};

export type FarmDetail = FarmCard & {
  farmerNames: string;
  bio: string;
  about: string;
  pickupAddress: string;
  pickupSpot: string;
  windows: Windows;
  productCount: number;
};

export type ProductOption = {
  id: number;
  kind: string;
  name: string;
  priceCents: number;
  unit: string;
};

export type ProductPhoto = { role: string; photo: string; isStock: boolean };

export type ProductDetail = {
  id: number;
  name: string;
  headline: string;
  note: string;
  dek: string;
  priceCents: number;
  unit: string;
  priceSetter: string;
  grownNote: string;
  pickedLabel: string;
  stockQty: number;
  category: string;
  photos: ProductPhoto[];
  options: ProductOption[];
  farm: {
    id: number;
    slug: string;
    name: string;
    city: string;
    offersPickup: boolean;
    offersDelivery: boolean;
    pickupSummary: string;
    deliverySummary: string;
    windows: Windows;
  };
};

export type BrowseResponse = {
  place: string;
  farmCount: number;
  weekday: string;
  products: ProductCard[];
  farms: FarmCard[];
};

export type QuoteLine = {
  farmId: number;
  productId: number;
  optionId: number | null;
  qty: number;
  unitPriceCents: number;
  lineCents: number;
  name: string;
  optionLabel: string;
  unit: string;
  photo: string;
  note: string;
};

export type QuoteGroup = {
  farmId: number;
  farmName: string;
  farmSlug: string;
  farmCity: string;
  fulfillment: 'pickup' | 'delivery';
  windowLabel: string;
  offersPickup: boolean;
  offersDelivery: boolean;
  pickupSummary: string;
  deliverySummary: string;
  windows: Windows;
  merchandiseCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number;
  farmTransferCents: number;
  lines: QuoteLine[];
};

export type Quote = {
  groups: QuoteGroup[];
  merchandiseCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number;
  totalCents: number;
  currency: string;
};

export type CatalogFood = {
  id: number;
  slug: string;
  name: string;
  category: string;
  unit: string;
  photo: string;
  needsLicensedPhoto: boolean;
  varieties: string[];
};
