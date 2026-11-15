// Draft listings a farm can confirm. Staff still have to approve before anything is public.
// Approving a listing never puts it on the public shop. Browse only reads farms.

export const LISTING_PHOTO_KEYS = [
  'peach',
  'strawberry',
  'carrot',
  'honey',
  'tomato',
  'beets',
  'comb',
  'cow',
  'placeholder',
  // 87 Farms store photos. Only used on that farm's draft; not in the shared catalog.
  '87-eggs',
  '87-ground-beef',
  '87-steak',
  '87-beef-roast',
  '87-stew-meat',
  '87-beef-bones',
  '87-beef-ribs',
  '87-short-ribs',
  '87-beef-liver',
  '87-oxtail',
  '87-beef-heart',
  '87-tallow',
  '87-beef-jerky',
  '87-chicken-breast',
  '87-chicken-thighs',
  '87-whole-chicken',
  '87-chicken-drumsticks',
  '87-chicken-tenders',
  '87-chicken-wings',
  '87-milk',
  '87-cream',
  '87-ice-cream',
  // Gilgen Farm store photos. Only used on that farm's draft; not in the shared catalog.
  'gilgen-raw-honey',
  'gilgen-whole-chicken',
  // Other farm-page photos. Only used on that farm's draft; not in the shared catalog.
  'bar-w-ground-beef',
  'bar-w-steak',
  'bar-w-beef-roast',
  'bar-w-tallow',
  'cedar-valley-raw-honey',
  'cedar-valley-creamed-honey',
  'poor-boy-eggs',
  'poor-boy-raw-honey',
  'mcarthur-tallow',
  'knight-raw-honey',
  'mosida-steak',
  'hidden-hillside-raw-honey',
  'hidden-hillside-comb-honey',
  'lavender-hive-raw-honey',
  'homers-raw-honey',
  'homers-creamed-honey',
  'papa-bears-raw-honey',
  'hollow-tree-raw-honey',
  'hollow-tree-comb-honey',
  'hollow-tree-creamed-honey',
  'keeper-raw-honey',
  'keeper-creamed-honey',
] as const;

export const SAMPLE_LISTING_TOKEN = 'lk_4c8e91ab7d2f60e3a15b84c0';

export type ListingStatus = 'draft' | 'sent' | 'farm_approved' | 'changes_requested' | 'farm_denied';

export const LISTING_REMOVED_LINE = "got it. we've removed your page. thank you for your time.";
export const LISTING_CONFIRM_LINE = "once you confirm, our team gives your page a final look. thank you for growing such good food.";
export const LISTING_THANKS_LINE = "thank you. we're so happy to have you. our team is giving your page a final look.";

export type ListingProductInput = {
  name: string;
  priceCents: number;
  unit: string;
  photoKey: string;
  sourceUrl?: string;
  priceStatus?: PriceStatus;
  needsUdafCheck?: boolean;
  availability?: string;
};

export const LISTING_NEXT_BATCH = 'next batch coming';
export const PREVIEW_PAY_LINE = 'this is a preview of what shoppers see';

export const ONBOARDING_STEPS = ['welcome', 'reach', 'pay', 'pickup', 'done'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_WELCOME = 'yay, welcome to mainz! 🌱';
export const ONBOARDING_DONE = "our team gives your page a final look. we'll text you when your first order comes in.";
/** Shown only to the farm. Nothing sends a text today. */
export const ONBOARDING_TEXT_US = '972-510-3326';
export const ONBOARDING_SMS = 'sms:+19725103326';
export const ONBOARDING_TEXT_LINE = 'text us at 972-510-3326 to stay in touch with the mainz team 💬';
export const PAY_PREFS = ['bank transfer', 'check', 'set this up later'] as const;
export type PayPref = (typeof PAY_PREFS)[number];
export const PAY_STEP_TITLE = 'how do you want to get paid?';
export const PAY_STEP_LINE = "we'll set this up right before your first order pays out. stripe keeps your bank info safe. we never see it.";
/** Farmer-facing words. The database keeps the short pay_pref values. */
export const PAY_PREF_LABELS: Record<PayPref, string> = {
  'bank transfer': 'direct deposit through stripe (set up later)',
  check: 'mail me a check',
  'set this up later': "i'll decide later",
};

/** Map a stored value or a farmer-facing label back to pay_pref. Anything else is dropped. */
export function payPrefFromChoice(raw: string): '' | PayPref {
  const value = String(raw || '').trim().toLowerCase();
  if ((PAY_PREFS as readonly string[]).includes(value)) return value as PayPref;
  const found = (PAY_PREFS as readonly PayPref[]).find((pref) => PAY_PREF_LABELS[pref] === value);
  return found || '';
}

export function payPrefLabel(raw: string): string {
  const pref = payPrefFromChoice(raw);
  return pref ? PAY_PREF_LABELS[pref] : '';
}

export function onboardingStep(raw: string | undefined | null): OnboardingStep | null {
  const value = String(raw || '').trim().toLowerCase();
  return (ONBOARDING_STEPS as readonly string[]).includes(value) ? value as OnboardingStep : null;
}

export function onboardingQuestions(): string {
  return ONBOARDING_TEXT_LINE;
}

/** What the page may show. A stored phone number is never included. */
export function publicOnboarding(row: {
  reach_via?: string;
  reach_email?: string;
  reach_phone?: string;
  pay_pref?: string;
  pickup_note?: string;
  pickup_ok?: number;
  onboarding_done?: number;
}): { reachVia: '' | 'text' | 'email'; reachEmail: string; payPref: '' | PayPref; pickupNote: string; pickupOk: boolean; done: boolean } {
  const via = row.reach_via === 'text' || row.reach_via === 'email' ? row.reach_via : '';
  const pay = payPrefFromChoice(String(row.pay_pref || ''));
  return {
    reachVia: via,
    reachEmail: String(row.reach_email || '').trim(),
    payPref: pay,
    pickupNote: String(row.pickup_note || ''),
    pickupOk: Number(row.pickup_ok) === 1,
    done: Number(row.onboarding_done) === 1,
  };
}

export const PICKUP_WORKS_LINE = "add your zip and we'll show the closest pickup spots at checkout.";

export const WHY_MAINZ_LINES = [
  'buy straight from the farmer.',
  'local and small batch.',
  'your money stays with utah farms.',
] as const;

function wordCount(line: string): number {
  return line.replace(/[.!?]/g, '').trim().split(/\s+/).filter(Boolean).length;
}

function warmLine(line: string): boolean {
  return wordCount(line) >= 4;
}

/**
 * One warm sentence for "meet the farm".
 * A staff meet_line wins when it is not already the header.
 * Otherwise the rest of the story, then one sentence built only from town and what they sell.
 * Never a one-word fragment.
 */
export function meetTheFarmLines(input: {
  story?: string;
  alreadyShown?: string;
  meetLine?: string;
  town?: string;
  grows?: string[];
  sinceYear?: number | null;
}): string[] {
  const shown = (input.alreadyShown || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const custom = (input.meetLine || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const customPlain = custom.replace(/[.!?]+$/g, '').trim();
  if (warmLine(custom) && customPlain && !shown.includes(customPlain)) return [custom.endsWith('.') ? custom : `${custom}.`];
  const fresh = storyLines(input.story || '').filter((line) => {
    const plain = line.replace(/[.!?]+$/g, '').trim();
    return warmLine(line) && plain.length > 0 && !shown.includes(plain);
  });
  if (fresh.length) return fresh.slice(0, 2);
  const town = (input.town || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const grows = [...new Set((input.grows || []).map((item) => item.replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean))].slice(0, 3);
  if (grows.length && town && !shown.includes(town)) {
    const food = grows.length === 1 ? grows[0] : `${grows.slice(0, -1).join(', ')} and ${grows[grows.length - 1]}`;
    const year = input.sinceYear && input.sinceYear > 1800 ? ` farming there since ${input.sinceYear}` : '';
    return [`${food} from ${town}${year}.`];
  }
  return [];
}

export function portraitIsLogo(photo: string | null | undefined): boolean {
  return (photo || '').trim().toLowerCase().startsWith('profile-');
}

/** Up to three sentences from the farm's own story. Empty when there is no story. */
export function storyLines(raw: string, max = 3): string[] {
  const text = raw.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!text) return [];
  const parts = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  return (parts.length ? parts : [text]).slice(0, Math.max(1, max));
}

/** A farm's own portrait. Skip placeholders and a copy of the hero photo. */
export function farmPortrait(profile: string | null | undefined, hero?: string | null): string {
  const photo = (profile || '').trim();
  if (!photo || photo === 'placeholder') return '';
  if (hero && photo === hero.trim()) return '';
  return photo;
}

/** A draft preview can be looked at. It cannot be bought. */
export function previewItemAddable(availability: string): boolean {
  return parseAvailability(availability) !== LISTING_NEXT_BATCH;
}

export function previewCheckout(): { createsOrder: false; charges: false; line: string } {
  return { createsOrder: false, charges: false, line: PREVIEW_PAY_LINE };
}

export function parseAvailability(raw: unknown): string {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return '';
  if (value === LISTING_NEXT_BATCH || value === 'next_batch' || value === 'next-batch') return LISTING_NEXT_BATCH;
  throw new Error('unknown availability');
}

export type PriceStatus = 'public' | 'converted' | 'suggested';

const STATUSES = new Set<string>(['draft', 'sent', 'farm_approved', 'changes_requested', 'farm_denied']);

export function listingStatusLabel(status: string): string {
  if (status === 'farm_approved') return 'approved';
  if (status === 'farm_denied') return 'denied';
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

/** A draft is never a shop listing. Denying it does not create a way to publish it. */
export function listingCanBePublished(_status: string): boolean {
  return false;
}

export function approveListing(nowIso: string): { status: 'farm_approved'; approvedAt: string; shopVisible: false } {
  return { status: 'farm_approved', approvedAt: nowIso, shopVisible: false };
}

/** Staff can record a final look. That still does not put the draft on the shop. */
export function staffApproveListing(status: string, nowIso: string): { staffApprovedAt: string; shopVisible: false } {
  if (status !== 'farm_approved') throw new Error('the farm confirms first.');
  return { staffApprovedAt: nowIso, shopVisible: false };
}

export function denyListing(nowIso: string, reason: string): { status: 'farm_denied'; deniedAt: string; denyReason: string; shopVisible: false } {
  const denyReason = reason.trim().replace(/\s+/g, ' ');
  if (denyReason.length > 160) throw new Error('keep it to one line.');
  return { status: 'farm_denied', deniedAt: nowIso, denyReason, shopVisible: false };
}

/** The only way back from a denial is a new link. The old one stays removed. */
export function resendDeniedListing(input: { status: string; nextToken: string }): { status: 'sent'; token: string } {
  if (input.status !== 'farm_denied') throw new Error('only a denied page gets a new link.');
  if (!/^lk_[0-9a-f]{32}$/.test(input.nextToken)) throw new Error('need a new token.');
  return { status: 'sent', token: input.nextToken };
}

/** Latest farm price on their own draft. The stored listing price stays until staff accept it. */
export function draftDisplayPrice(
  product: { id?: number | null; name: string; priceCents: number },
  fixes: { productId: number | null; productName: string; priceCents: number }[],
): { priceCents: number; updated: boolean } {
  const name = product.name.trim().toLowerCase();
  const match = [...fixes].reverse().find((fix) => (
    (product.id && fix.productId === product.id) || fix.productName.trim().toLowerCase() === name
  ));
  if (!match) return { priceCents: product.priceCents, updated: false };
  return { priceCents: match.priceCents, updated: true };
}

export function cleanPriceFix(raw: { productId?: unknown; productName?: unknown; price?: unknown }): { productId: number | null; productName: string; priceCents: number } {
  const productName = String(raw.productName ?? '').trim().slice(0, 80);
  if (!productName) throw new Error('that product needs a name.');
  const id = Number(raw.productId);
  const productId = Number.isInteger(id) && id > 0 ? id : null;
  const text = String(raw.price ?? '').trim().replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('add a price.');
  const priceCents = Math.round(Number(text) * 100);
  if (priceCents < 50 || priceCents > 500_000) throw new Error('use a price between $0.50 and $5,000.');
  return { productId, productName, priceCents };
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
  priceStatus: PriceStatus;
  needsUdafCheck: boolean;
  problems: string[];
};

export type CsvFarm = {
  farm: string;
  farmerNames: string;
  town: string;
  story: string;
  profilePhoto: string;
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

export function parsePriceStatus(raw: string): PriceStatus | null {
  const value = raw.trim().toLowerCase();
  if (!value) return 'public';
  if (value === 'public' || value === 'converted' || value === 'suggested') return value;
  return null;
}

export function parseUdafFlag(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (!value || value === 'no' || value === 'n') return false;
  if (value === 'yes' || value === 'y') return true;
  return null;
}

/** Converted and suggested prices need a note. Public prices do not. */
export function priceNote(status: string): string {
  if (status === 'converted' || status === 'suggested') return 'suggested price. tell us if it\'s different.';
  return '';
}

/** A draft product marked for a UDAF check stays off the shop until staff clear it. */
export function shopFlagsForUdafCheck(needsUdafCheck: boolean): { needsUdaf: 0 | 1; udafOn: 0; active: 0 | 1 } {
  if (needsUdafCheck) return { needsUdaf: 1, udafOn: 0, active: 0 };
  return { needsUdaf: 0, udafOn: 0, active: 1 };
}

export function parsePriceToCents(raw: string): number | null {
  const text = raw.trim().replace(/[$,\s]/g, '');
  if (!text || !/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return null;
  return cents;
}

export function cleanProfileKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
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
  const columns = [...need, 'price_status', 'needs_udaf_check', 'profile_photo'];
  const index = Object.fromEntries(columns.map((column) => [column, header.indexOf(column)]));
  const cell = (line: string[], column: string) => {
    const at = index[column];
    if (at == null || at < 0) return '';
    return line[at] || '';
  };
  const groups = new Map<string, CsvFarm>();
  const rowProblems: CsvProblem[] = [];
  const unmatched = new Set<string>();
  for (let i = 1; i < table.length; i += 1) {
    const line = table[i];
    const farm = cell(line, 'farm').trim();
    const product = cell(line, 'product').trim();
    const unit = cell(line, 'unit').trim().toLowerCase();
    const priceCents = parsePriceToCents(cell(line, 'price'));
    const priceStatus = parsePriceStatus(cell(line, 'price_status'));
    const needsUdafCheck = parseUdafFlag(cell(line, 'needs_udaf_check'));
    const problems: string[] = [];
    if (!farm) problems.push('missing farm');
    if (!product) problems.push('missing product');
    if (priceCents == null) problems.push('missing price');
    if (!unit) problems.push('missing unit');
    else if (!KNOWN_UNITS.includes(unit as (typeof KNOWN_UNITS)[number])) problems.push(`unknown unit: ${unit}`);
    if (!priceStatus) problems.push('unknown price status');
    if (needsUdafCheck == null) problems.push('unknown udaf check');
    if (problems.length) rowProblems.push({ row: i + 1, farm, product, problems });
    if (!farm || !product) continue;
    const key = farm.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = {
        farm,
        farmerNames: cell(line, 'farmer_names').trim(),
        town: cell(line, 'town').trim(),
        story: cell(line, 'story').trim(),
        profilePhoto: cleanProfileKey(cell(line, 'profile_photo')),
        products: [],
      };
      groups.set(key, group);
    }
    if (!group.farmerNames) group.farmerNames = cell(line, 'farmer_names').trim();
    if (!group.town) group.town = cell(line, 'town').trim();
    if (!group.story) group.story = cell(line, 'story').trim();
    if (!group.profilePhoto) group.profilePhoto = cleanProfileKey(cell(line, 'profile_photo'));
    const match = matchCatalogFood(product, foods);
    if (!match) unmatched.add(product);
    group.products.push({
      name: product,
      unit,
      priceCents,
      sourceUrl: cell(line, 'source_url').trim().slice(0, 300),
      photoKey: match?.photoKey || 'placeholder',
      matchedName: match?.name || '',
      priceStatus: priceStatus || 'public',
      needsUdafCheck: needsUdafCheck === true,
      problems,
    });
  }
  return { farms: [...groups.values()], rowProblems, unmatched: [...unmatched] };
}

export function listingShowsForm(productCount: number): boolean {
  return productCount === 0;
}

export function canFarmEditListing(status: string): boolean {
  return status !== 'farm_approved' && status !== 'farm_denied';
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
