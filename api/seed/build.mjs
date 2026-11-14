// Builds migrations/0002_seed.sql and PHOTO-GAPS.md from the catalog and the demo farms.
// Demo farms are fictional. Distances are sample miles from Spanish Fork, not live geo.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { foods } from './catalog.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const q = (value) => `'${String(value ?? '').replace(/'/g, "''")}'`;
const slug = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const lines = [];
lines.push('-- Demo seed. Farms, farmers, and prices are made up for this preview.');
lines.push('-- Foods with photo_key = placeholder still need a licensed stock photo.');
lines.push('-- Demo dashboard tokens below are fixtures. Rotate them before a public deploy.');

const byName = new Map();
foods.forEach((food, index) => {
  const id = index + 1;
  byName.set(food.name, id);
  const needs = food.photo === 'placeholder' ? 1 : 0;
  lines.push(
    `INSERT INTO catalog_foods (id, slug, name, category, unit, synonyms, photo_key, needs_licensed_photo) VALUES (${id}, ${q(slug(food.name))}, ${q(food.name)}, ${q(food.category)}, ${q(food.unit)}, ${q(food.synonyms)}, ${q(food.photo)}, ${needs});`,
  );
  food.varieties.forEach((name, sort) => {
    lines.push(
      `INSERT INTO catalog_varieties (food_id, name, sort_order) VALUES (${id}, ${q(name)}, ${sort});`,
    );
  });
});

function days(list) {
  return [...new Set(list.map((item) => item.day))].join(',');
}

let farmId = 1;
let productId = 1;

function farm(row) {
  const id = farmId++;
  const pickupDays = days(row.windows.pickup);
  const deliveryDays = days(row.windows.delivery);
  lines.push(`INSERT INTO farms (
    id, slug, name, farmer_names, email, phone, city, state, zip, since_year,
    stat_value, stat_label, bio, about, miles_away, hero_photo, card_foods,
    offers_pickup, offers_delivery, pickup_summary, delivery_summary, pickup_days, delivery_days,
    pickup_address, pickup_spot, windows_json, status, active, is_demo, access_token,
    what_you_sell, sell_now, fulfillment_pref, link
  ) VALUES (
    ${id}, ${q(row.slug)}, ${q(row.name)}, ${q(row.farmerNames)}, ${q(row.email)}, ${q(row.phone || '')},
    ${q(row.city)}, 'UT', ${q(row.zip || '')}, ${row.sinceYear ?? 'NULL'},
    ${q(row.statValue)}, ${q(row.statLabel)}, ${q(row.bio)}, ${q(row.about)}, ${row.milesAway ?? 'NULL'},
    ${q(row.heroPhoto)}, ${q(row.cardFoods)},
    ${row.offersPickup ? 1 : 0}, ${row.offersDelivery ? 1 : 0}, ${q(row.pickupSummary)}, ${q(row.deliverySummary)},
    ${q(pickupDays)}, ${q(deliveryDays)},
    ${q(row.pickupAddress)}, ${q(row.pickupSpot)}, ${q(JSON.stringify(row.windows))},
    ${q(row.status)}, ${row.active ? 1 : 0}, 1, ${row.token ? q(row.token) : 'NULL'},
    ${q(row.whatYouSell)}, ${q(row.sellNow || '')}, ${q(row.fulfillment)}, ${q(row.link || '')}
  );`);
  for (const product of row.products || []) addProduct(id, product);
  return id;
}

function addProduct(ownerId, product) {
  const foodId = byName.get(product.food);
  if (!foodId) throw new Error(`unknown food ${product.food}`);
  const id = productId++;
  const food = foods[foodId - 1];
  lines.push(`INSERT INTO products (
    id, farm_id, food_id, headline, note, dek, price_cents, unit, price_setter,
    grown_note, picked_label, stock_qty, in_season, sort_order, shop_order, active
  ) VALUES (
    ${id}, ${ownerId}, ${foodId}, ${q(product.headline)}, ${q(product.note)}, ${q(product.dek)},
    ${product.price}, ${q(product.unit)}, ${q(product.setter)},
    ${q(product.grown || '')}, ${q(product.picked || '')}, ${product.stock},
    ${product.season ? 1 : 0}, ${product.sort}, ${product.shop ?? product.sort}, 1
  );`);
  (product.options || []).forEach((option, sort) => {
    lines.push(
      `INSERT INTO product_options (product_id, kind, name, price_cents, unit, sort_order) VALUES (${id}, ${q(option.kind)}, ${q(option.name)}, ${option.price}, ${q(option.unit)}, ${sort});`,
    );
  });
  const stock = food.photo === 'placeholder' ? 'placeholder' : food.photo;
  const shots = [
    ['hero', stock],
    ['hands', stock],
    ['farm', 'placeholder'],
    ['packaging', 'placeholder'],
  ];
  shots.forEach(([role, photo], sort) => {
    const isStock = photo === 'placeholder' || photo === stock ? 1 : 0;
    lines.push(
      `INSERT INTO product_photos (product_id, sort_order, role, photo_key, is_stock) VALUES (${id}, ${sort}, ${q(role)}, ${q(photo)}, ${isStock});`,
    );
  });
}

const willowWindows = {
  pickup: [{ day: 'sat', label: 'sat · 9 am–12 pm' }],
  delivery: [
    { day: 'wed', label: 'wed · 9–11 am' },
    { day: 'wed', label: 'wed · 4–6 pm' },
    { day: 'thu', label: 'thu · 9–11 am' },
  ],
};

farm({
  slug: 'willow-creek-farm',
  name: 'Willow Creek Farm',
  farmerNames: 'sam and jo hale',
  email: 'sam@willowcreek.example',
  city: 'Spanish Fork',
  zip: '84660',
  sinceYear: 1994,
  statValue: '38',
  statLabel: 'acres',
  milesAway: 4.2,
  heroPhoto: 'beets',
  cardFoods: 'beets, eggs',
  bio: 'sam and jo hale. beets, carrots, eggs.\nno sprays. no warehouse. no story about it.',
  about: 'sam and jo hale farm 38 acres in spanish fork. beets, carrots, eggs, strawberries, tomatoes. no sprays. no warehouse. no story about it. prices are theirs.',
  offersPickup: true,
  offersDelivery: true,
  pickupSummary: 'sat',
  deliverySummary: 'wed',
  pickupAddress: '4100 s 1700 w, spanish fork',
  pickupSpot: 'saturday at the stand, end of the lane. 4100 s 1700 w, spanish fork. 9 am to noon. honk if the dog is out. it\'s free.',
  windows: willowWindows,
  status: 'approved',
  active: true,
  token: 'demo-willow-creek',
  whatYouSell: 'beets, carrots, eggs, strawberries, tomatoes',
  sellNow: 'farm stand, farmers market',
  fulfillment: 'both',
  products: [
    {
      food: 'carrots',
      headline: 'carrots, dug tuesday',
      note: 'dug tuesday',
      dek: 'dug tuesday. still dusty.',
      price: 400,
      unit: 'bunch',
      setter: 'sam',
      grown: 'no sprays. just dirt.',
      picked: 'tue, 7:40 am',
      stock: 22,
      season: 1,
      sort: 4,
      shop: 1,
    },
    {
      food: 'eggs',
      headline: 'eggs',
      note: 'the hens did this',
      dek: 'the hens did this.',
      price: 700,
      unit: 'dozen',
      setter: 'jo',
      grown: 'hens on pasture.',
      picked: 'this morning',
      stock: 16,
      season: 0,
      sort: 20,
      shop: 2,
    },
    {
      food: 'strawberries',
      headline: 'strawberries, picked this morning',
      note: 'picked this morning',
      dek: 'picked this morning. not in march.',
      price: 600,
      unit: 'pint',
      setter: 'sam',
      grown: 'no sprays. just dirt.',
      picked: 'thu, 6:10 am',
      stock: 14,
      season: 1,
      sort: 2,
      shop: 3,
      options: [
        { kind: 'pack', name: 'pint', price: 600, unit: 'pint' },
        { kind: 'pack', name: 'half flat', price: 2200, unit: 'half flat' },
        { kind: 'pack', name: 'flat', price: 4000, unit: 'flat' },
      ],
    },
    {
      food: 'tomatoes',
      headline: 'tomatoes',
      note: 'ugly. very good.',
      dek: 'ugly. very good.',
      price: 500,
      unit: 'lb',
      setter: 'sam',
      grown: 'no sprays. just dirt.',
      picked: 'wed, 8:00 am',
      stock: 18,
      season: 0,
      sort: 30,
      shop: 4,
    },
    {
      food: 'beets',
      headline: 'beets',
      note: 'dirt included',
      dek: 'dirt included.',
      price: 400,
      unit: 'bunch',
      setter: 'jo',
      grown: 'no sprays. just dirt.',
      picked: 'tue, 7:40 am',
      stock: 15,
      season: 0,
      sort: 40,
      shop: 5,
    },
  ],
});

farm({
  slug: 'east-bench-orchard',
  name: 'East Bench Orchard',
  farmerNames: 'may lewis',
  email: 'may@eastbench.example',
  city: 'Santaquin',
  zip: '84655',
  sinceYear: 1978,
  statValue: '12',
  statLabel: 'acres',
  milesAway: 9.1,
  heroPhoto: 'peach',
  cardFoods: 'peaches, cherries',
  bio: 'may lewis. peaches, mostly.\nthe last good ones are the point.',
  about: 'east bench is a small orchard above santaquin. may lewis picks peaches, cherries, and apples when they are actually ready. no warehouse.',
  offersPickup: true,
  offersDelivery: false,
  pickupSummary: 'sat',
  deliverySummary: '',
  pickupAddress: '120 e bench rd, santaquin',
  pickupSpot: 'saturday and sunday, 9 am to 1 pm, at the shed. 120 e bench rd, santaquin. bring a box or use ours.',
  windows: {
    pickup: [
      { day: 'sat', label: 'sat · 9 am–1 pm' },
      { day: 'sun', label: 'sun · 9 am–1 pm' },
    ],
    delivery: [],
  },
  status: 'approved',
  active: true,
  token: 'demo-east-bench',
  whatYouSell: 'peaches, cherries, apples',
  sellNow: 'farm stand',
  fulfillment: 'pickup',
  products: [
    {
      food: 'peaches',
      headline: 'peaches. the last good ones.',
      note: 'the last good ones.',
      dek: 'the last good ones.',
      price: 300,
      unit: 'lb',
      setter: 'may',
      grown: 'the bench. no sprays this block.',
      picked: 'fri, 6:30 am',
      stock: 40,
      season: 1,
      sort: 1,
      options: [
        { kind: 'variety', name: 'redhaven', price: 300, unit: 'lb' },
        { kind: 'variety', name: 'elberta', price: 300, unit: 'lb' },
        { kind: 'variety', name: 'white lady', price: 300, unit: 'lb' },
      ],
    },
    {
      food: 'cherries',
      headline: 'cherries',
      note: 'bing, this week',
      dek: 'dark and almost gone.',
      price: 600,
      unit: 'lb',
      setter: 'may',
      grown: 'the bench.',
      picked: 'thu, 7:00 am',
      stock: 12,
      season: 0,
      sort: 50,
      options: [
        { kind: 'variety', name: 'bing', price: 600, unit: 'lb' },
        { kind: 'variety', name: 'rainier', price: 800, unit: 'lb' },
      ],
    },
    {
      food: 'apples',
      headline: 'apples',
      note: 'first of the season',
      dek: 'first of the season.',
      price: 250,
      unit: 'lb',
      setter: 'may',
      grown: 'the bench.',
      picked: 'this week',
      stock: 30,
      season: 0,
      sort: 60,
      options: [
        { kind: 'variety', name: 'honeycrisp', price: 300, unit: 'lb' },
        { kind: 'variety', name: 'gala', price: 250, unit: 'lb' },
        { kind: 'variety', name: 'fuji', price: 250, unit: 'lb' },
      ],
    },
  ],
});

farm({
  slug: 'red-butte-eggs',
  name: 'Red Butte Eggs',
  farmerNames: 'ruth kimball',
  email: 'ruth@redbutte.example',
  city: 'Mapleton',
  zip: '84664',
  sinceYear: 2011,
  statValue: '200',
  statLabel: 'hens',
  milesAway: 6.8,
  heroPhoto: 'eggs',
  cardFoods: 'eggs, chicken',
  bio: 'ruth kimball. eggs and a few hens.\nmapleton. pickup only.',
  about: 'ruth keeps about 200 hens in mapleton. eggs most days, and a stewing hen when she has one. pickup at the gate. she does not deliver.',
  offersPickup: true,
  offersDelivery: false,
  pickupSummary: 'thu',
  deliverySummary: '',
  pickupAddress: '880 n 1600 w, mapleton',
  pickupSpot: 'the gate on 1600 west. wed through sat. eggs are in the cooler with your name on the lid.',
  windows: {
    pickup: [
      { day: 'wed', label: 'wed · 4–6 pm' },
      { day: 'thu', label: 'thu · 4–6 pm' },
      { day: 'fri', label: 'fri · 4–6 pm' },
      { day: 'sat', label: 'sat · 9 am–12 pm' },
    ],
    delivery: [],
  },
  status: 'approved',
  active: true,
  token: 'demo-red-butte',
  whatYouSell: 'eggs, chicken',
  sellNow: 'farm stand',
  fulfillment: 'pickup',
  products: [
    {
      food: 'eggs',
      headline: 'eggs',
      note: 'the hens did this',
      dek: 'brown, blue, and ordinary. all of them real.',
      price: 700,
      unit: 'dozen',
      setter: 'ruth',
      grown: 'pasture, when the mud allows.',
      picked: 'this morning',
      stock: 24,
      season: 0,
      sort: 21,
    },
    {
      food: 'whole chicken',
      headline: 'whole chicken',
      note: 'a stewing hen',
      dek: 'a stewing hen. not a tiny grocery bird.',
      price: 2200,
      unit: 'each',
      setter: 'ruth',
      grown: 'the same hens, when they retire.',
      picked: 'this week',
      stock: 4,
      season: 0,
      sort: 70,
    },
  ],
});

farm({
  slug: 'bee-loud-honey-co',
  name: 'Bee Loud Honey Co.',
  farmerNames: 'ada moss',
  email: 'ada@beeloud.example',
  city: 'Payson',
  zip: '84651',
  sinceYear: 2004,
  statValue: '80',
  statLabel: 'hives',
  milesAway: 11,
  heroPhoto: 'comb',
  cardFoods: 'honey, comb',
  bio: 'ada moss. honey and comb.\nnot from a bear bottle.',
  about: 'ada moss keeps about 80 hives around payson. the honey is from those yards. she will not put it in a plastic bear. pickup friday, delivery wednesday.',
  offersPickup: true,
  offersDelivery: true,
  pickupSummary: 'fri',
  deliverySummary: 'wed',
  pickupAddress: '40 w utah ave, payson',
  pickupSpot: 'friday, 10 am to 4 pm, side door on utah ave. 40 w utah ave, payson.',
  windows: {
    pickup: [{ day: 'fri', label: 'fri · 10 am–4 pm' }],
    delivery: [{ day: 'wed', label: 'wed · 12–4 pm' }],
  },
  status: 'approved',
  active: true,
  token: 'demo-bee-loud',
  whatYouSell: 'honey, comb',
  sellNow: 'farmers market, online',
  fulfillment: 'both',
  products: [
    {
      food: 'raw honey',
      headline: 'raw honey',
      note: 'not from a bear bottle',
      dek: 'not from a bear bottle.',
      price: 1400,
      unit: '16 oz',
      setter: 'ada',
      grown: 'payson yards. clover and whatever the ditch grows.',
      picked: 'extracted this week',
      stock: 20,
      season: 1,
      sort: 3,
    },
    {
      food: 'comb honey',
      headline: 'comb honey',
      note: 'a square of the hive',
      dek: 'a square of the hive. chew it.',
      price: 1200,
      unit: 'square',
      setter: 'ada',
      grown: 'the same yards.',
      picked: 'this week',
      stock: 10,
      season: 0,
      sort: 35,
    },
  ],
});

// Pending on purpose, so the admin queue is not empty and browse does not show it.
farm({
  slug: 'wasatch-dairy',
  name: 'Wasatch Dairy',
  farmerNames: 'elena frost',
  email: 'elena@wasatchdairy.example',
  phone: '801-555-0148',
  city: 'Spanish Fork',
  zip: '84660',
  sinceYear: 2016,
  statValue: '40',
  statLabel: 'cows',
  milesAway: 5.4,
  heroPhoto: 'cow',
  cardFoods: 'milk, cheese',
  bio: 'elena frost. a small dairy. not approved yet.',
  about: 'this application is still pending. it should not appear in browse.',
  offersPickup: true,
  offersDelivery: true,
  pickupSummary: 'sat',
  deliverySummary: 'wed',
  pickupAddress: '',
  pickupSpot: '',
  windows: { pickup: [{ day: 'sat', label: 'sat · 10 am–1 pm' }], delivery: [] },
  status: 'pending',
  active: false,
  token: null,
  whatYouSell: 'milk, cheese',
  sellNow: 'farmers market, just starting',
  fulfillment: 'both',
  products: [],
});

const sqlPath = join(root, '../migrations/0002_seed.sql');
writeFileSync(sqlPath, `${lines.join('\n')}\n`);

const gaps = foods.filter((food) => food.photo === 'placeholder');
const covered = foods.filter((food) => food.photo !== 'placeholder');
const byCategory = new Map();
for (const food of gaps) {
  const list = byCategory.get(food.category) || [];
  list.push(food.name);
  byCategory.set(food.category, list);
}
const gapLines = [];
gapLines.push('# Foods that still need a licensed stock photo');
gapLines.push('');
gapLines.push('These catalog foods use the branded placeholder. Do not pull random images from the web.');
gapLines.push('The foods below already use the attached photos:');
gapLines.push('');
for (const food of covered) {
  gapLines.push(`- ${food.name} (${food.photo})`);
}
gapLines.push('');
gapLines.push(`${gaps.length} foods still need a photo:`);
gapLines.push('');
for (const [category, names] of byCategory) {
  gapLines.push(`## ${category}`);
  gapLines.push('');
  gapLines.push(names.join(', '));
  gapLines.push('');
}
writeFileSync(join(root, '../PHOTO-GAPS.md'), `${gapLines.join('\n')}\n`);

console.log(`foods ${foods.length}, gaps ${gaps.length}, farms ${farmId - 1}, products ${productId - 1}`);
