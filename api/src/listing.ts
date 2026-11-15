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

export const KNOWN_UNITS = [
  'bag', 'bar', 'box', 'bunch', 'dozen', 'each', 'half gallon', 'head', 'jar', 'lb', 'log', 'pint', 'quart', 'root', 'square', 'tub',
] as const;

export type CatalogMatch = { name: string; synonyms: string; photoKey: string };

export type CsvProblem = { row: number; farm: string; product: string; problems: string[] };

export type CsvProduct = {
  name: string;
  unit: string;
  priceCents: number | null;
  sourceUrl: string;
  photoKey: string;
  matchedName: string;
  problems: string[];
};

export type CsvFarm = {
  farm: string;
  farmerNames: string;
  town: string;
  story: string;
  products: CsvProduct[];
};

export type CsvPreview = {
  farms: CsvFarm[];
  rowProblems: CsvProblem[];
  unmatched: string[];
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((line) => line.some((value) => value.trim()));
}

export function parsePriceToCents(raw: string): number | null {
  const text = raw.trim().replace(/[$,\s]/g, '');
  if (!text || !/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return null;
  return cents;
}

export function matchCatalogFood(productName: string, foods: CatalogMatch[]): CatalogMatch | null {
  const needle = productName.trim().toLowerCase();
  if (!needle) return null;
  const exact = foods.find((food) => food.name.trim().toLowerCase() === needle);
  if (exact) return exact;
  return foods.find((food) => food.synonyms.split(',').some((part) => part.trim().toLowerCase() === needle)) || null;
}

export function previewFarmCsv(text: string, foods: CatalogMatch[]): CsvPreview {
  const table = parseCsv(text);
  if (!table.length) return { farms: [], rowProblems: [{ row: 1, farm: '', product: '', problems: ['the csv is empty.'] }], unmatched: [] };
  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const need = ['farm', 'farmer_names', 'town', 'story', 'product', 'unit', 'price', 'source_url'];
  const missing = need.filter((column) => !header.includes(column));
  if (missing.length) {
    return { farms: [], rowProblems: [{ row: 1, farm: '', product: '', problems: [`missing columns: ${missing.join(', ')}`] }], unmatched: [] };
  }
  const index = Object.fromEntries(need.map((column) => [column, header.indexOf(column)]));
  const groups = new Map<string, CsvFarm>();
  const rowProblems: CsvProblem[] = [];
  const unmatched = new Set<string>();
  for (let i = 1; i < table.length; i += 1) {
    const line = table[i];
    const farm = (line[index.farm] || '').trim();
    const product = (line[index.product] || '').trim();
    const unit = (line[index.unit] || '').trim().toLowerCase();
    const priceCents = parsePriceToCents(line[index.price] || '');
    const problems: string[] = [];
    if (!farm) problems.push('missing farm');
    if (!product) problems.push('missing product');
    if (priceCents == null) problems.push('missing price');
    if (!unit) problems.push('missing unit');
    else if (!KNOWN_UNITS.includes(unit as (typeof KNOWN_UNITS)[number])) problems.push(`unknown unit: ${unit}`);
    if (problems.length) rowProblems.push({ row: i + 1, farm, product, problems });
    if (!farm || !product) continue;
    const key = farm.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = {
        farm,
        farmerNames: (line[index.farmer_names] || '').trim(),
        town: (line[index.town] || '').trim(),
        story: (line[index.story] || '').trim(),
        products: [],
      };
      groups.set(key, group);
    }
    if (!group.farmerNames) group.farmerNames = (line[index.farmer_names] || '').trim();
    if (!group.town) group.town = (line[index.town] || '').trim();
    if (!group.story) group.story = (line[index.story] || '').trim();
    const match = matchCatalogFood(product, foods);
    if (!match) unmatched.add(product);
    group.products.push({
      name: product,
      unit,
      priceCents,
      sourceUrl: (line[index.source_url] || '').trim().slice(0, 300),
      photoKey: match?.photoKey || 'placeholder',
      matchedName: match?.name || '',
      problems,
    });
  }
  return { farms: [...groups.values()], rowProblems, unmatched: [...unmatched] };
}

export function listingShowsForm(productCount: number): boolean {
  return productCount === 0;
}

export function canFarmEditListing(status: string): boolean {
  return status !== 'farm_approved';
}

export function listingInvite(input: { farmerNames: string; farmName: string; link: string }): string {
  const first = input.farmerNames.trim().split(/\s+/)[0] || input.farmName.trim() || 'there';
  return `hi ${first}, it's caty from mainz. we love what you grow and made your farm its own page. take a peek and tap approve if it feels right. if anything's off, just tell us and we'll fix it: ${input.link}`;
}

export function cleanFarmProduct(raw: {
  name?: unknown;
  priceCents?: unknown;
  unit?: unknown;
  photoKey?: unknown;
  sourceUrl?: unknown;
}): ListingProductInput & { sourceUrl: string } {
  const name = String(raw.name ?? '').trim().slice(0, 80);
  const unit = String(raw.unit ?? '').trim().toLowerCase().slice(0, 24);
  const photoKey = String(raw.photoKey ?? 'placeholder').trim() || 'placeholder';
  const priceCents = Math.round(Number(raw.priceCents));
  if (!name) throw new Error('each product needs a name.');
  if (!LISTING_PHOTO_KEYS.includes(photoKey as (typeof LISTING_PHOTO_KEYS)[number]) && photoKey !== 'placeholder') {
    throw new Error('pick a photo from the catalog.');
  }
  const cents = Number.isFinite(priceCents) && priceCents > 0 ? priceCents : 0;
  if (cents > 500_000) throw new Error('use a price between $0.50 and $5,000.');
  return {
    name,
    unit,
    priceCents: cents > 0 && cents < 50 ? 0 : cents,
    photoKey: LISTING_PHOTO_KEYS.includes(photoKey as (typeof LISTING_PHOTO_KEYS)[number]) ? photoKey : 'placeholder',
    sourceUrl: String(raw.sourceUrl ?? '').trim().slice(0, 300),
  };
}
