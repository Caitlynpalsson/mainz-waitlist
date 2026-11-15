// Draft listings a farm can approve before launch.
// Approving a listing never puts it on the public shop. Browse only reads farms.

export const LISTING_PHOTO_KEYS = [
  'peach',
  'strawberry',
  'carrot',
  'honey',
  'eggs',
  'tomato',
  'beets',
  'comb',
  'cow',
  'placeholder',
] as const;

export const SAMPLE_LISTING_TOKEN = 'lk_4c8e91ab7d2f60e3a15b84c0';

export type ListingStatus = 'draft' | 'sent' | 'farm_approved' | 'changes_requested';

export type ListingProductInput = {
  name: string;
  priceCents: number;
  unit: string;
  photoKey: string;
};

const STATUSES = new Set<string>(['draft', 'sent', 'farm_approved', 'changes_requested']);

export function listingStatusLabel(status: string): string {
  if (status === 'farm_approved') return 'approved';
  if (status === 'changes_requested') return 'changes requested';
  if (status === 'sent') return 'sent';
  return 'draft';
}

export function isListingStatus(value: string): value is ListingStatus {
  return STATUSES.has(value);
}

/** A listing approval is not a shop listing. Sample or not, it stays out of browse. */
export function listingAppearsInBrowse(_status: string, _isSample: boolean): boolean {
  return false;
}

export function approveListing(nowIso: string): { status: 'farm_approved'; approvedAt: string; shopVisible: false } {
  return { status: 'farm_approved', approvedAt: nowIso, shopVisible: false };
}

export function requestListingChanges(note: string): { status: 'changes_requested'; changeNote: string; shopVisible: false } {
  const changeNote = note.trim();
  if (!changeNote) throw new Error('tell us what to change.');
  if (changeNote.length > 400) throw new Error('keep the note short.');
  return { status: 'changes_requested', changeNote, shopVisible: false };
}

export function cleanListingProduct(raw: {
  name?: unknown;
  priceCents?: unknown;
  unit?: unknown;
  photoKey?: unknown;
}): ListingProductInput {
  const name = String(raw.name ?? '').trim().slice(0, 80);
  const unit = String(raw.unit ?? '').trim().slice(0, 24);
  const photoKey = String(raw.photoKey ?? 'placeholder').trim();
  const priceCents = Math.round(Number(raw.priceCents));
  if (!name) throw new Error('each product needs a name.');
  if (!unit) throw new Error('each product needs a unit.');
  if (!Number.isFinite(priceCents) || priceCents < 50 || priceCents > 500_000) {
    throw new Error('use a price between $0.50 and $5,000.');
  }
  if (!LISTING_PHOTO_KEYS.includes(photoKey as (typeof LISTING_PHOTO_KEYS)[number])) {
    throw new Error('pick a photo from the catalog.');
  }
  return { name, unit, priceCents, photoKey };
}

export function newListingToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `lk_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
