import { Image } from 'react-native';

// Each batch is a static map of catalog slug to its jpeg.
// Add the next batch as its own object, then spread it into stock.

const profiles = {
  'profile-87-farms': require('../../assets/photos/profile-87-farms.jpg'),
  'profile-gilgen-farm': require('../../assets/photos/profile-gilgen-farm.jpg'),
  'profile-bar-w-beef': require('../../assets/photos/profile-bar-w-beef.jpg'),
  'profile-cedar-valley-honey': require('../../assets/photos/profile-cedar-valley-honey.jpg'),
  'profile-poor-boy-farms': require('../../assets/photos/profile-poor-boy-farms.jpg'),
  'profile-mcarthur-farms': require('../../assets/photos/profile-mcarthur-farms.jpg'),
  'profile-knight-family-honey': require('../../assets/photos/profile-knight-family-honey.jpg'),
  'profile-mosida-market': require('../../assets/photos/profile-mosida-market.jpg'),
  'profile-hidden-hillside-honey': require('../../assets/photos/profile-hidden-hillside-honey.jpg'),
  'profile-the-lavender-hive': require('../../assets/photos/profile-the-lavender-hive.jpg'),
  'profile-homers-honeybee': require('../../assets/photos/profile-homers-honeybee.jpg'),
  'profile-papa-bears-honey': require('../../assets/photos/profile-papa-bears-honey.jpg'),
  'profile-hollow-tree-honey': require('../../assets/photos/profile-hollow-tree-honey.jpg'),
  'profile-keeper-of-the-b': require('../../assets/photos/profile-keeper-of-the-b.jpg'),
  'profile-utah-natural-meat': require('../../assets/photos/profile-utah-natural-meat.jpg'),
  'profile-christiansens-family-farm': require('../../assets/photos/profile-christiansens-family-farm.jpg'),
} as const;

const originals = {
  peach: require('../../assets/photos/peach.jpg'),
  strawberry: require('../../assets/photos/strawberry.jpg'),
  carrot: require('../../assets/photos/carrot.jpg'),
  honey: require('../../assets/photos/honey.jpg'),
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

const batch2 = {
  lettuce: require('../../assets/photos/lettuce.jpg'),
  spinach: require('../../assets/photos/spinach.jpg'),
  kale: require('../../assets/photos/kale.jpg'),
  'swiss-chard': require('../../assets/photos/swiss-chard.jpg'),
  arugula: require('../../assets/photos/arugula.jpg'),
  cabbage: require('../../assets/photos/cabbage.jpg'),
  broccoli: require('../../assets/photos/broccoli.jpg'),
  cauliflower: require('../../assets/photos/cauliflower.jpg'),
  'brussels-sprouts': require('../../assets/photos/brussels-sprouts.jpg'),
  'green-beans': require('../../assets/photos/green-beans.jpg'),
  'snap-peas': require('../../assets/photos/snap-peas.jpg'),
  'snow-peas': require('../../assets/photos/snow-peas.jpg'),
  cucumbers: require('../../assets/photos/cucumbers.jpg'),
  'pickling-cucumbers': require('../../assets/photos/pickling-cucumbers.jpg'),
  zucchini: require('../../assets/photos/zucchini.jpg'),
  'yellow-squash': require('../../assets/photos/yellow-squash.jpg'),
  'pattypan-squash': require('../../assets/photos/pattypan-squash.jpg'),
  'butternut-squash': require('../../assets/photos/butternut-squash.jpg'),
  'acorn-squash': require('../../assets/photos/acorn-squash.jpg'),
  'delicata-squash': require('../../assets/photos/delicata-squash.jpg'),
  'spaghetti-squash': require('../../assets/photos/spaghetti-squash.jpg'),
  pumpkin: require('../../assets/photos/pumpkin.jpg'),
  radishes: require('../../assets/photos/radishes.jpg'),
  turnips: require('../../assets/photos/turnips.jpg'),
  rutabaga: require('../../assets/photos/rutabaga.jpg'),
} as const;

const batch3 = {
  parsnips: require('../../assets/photos/parsnips.jpg'),
  kohlrabi: require('../../assets/photos/kohlrabi.jpg'),
  asparagus: require('../../assets/photos/asparagus.jpg'),
  rhubarb: require('../../assets/photos/rhubarb.jpg'),
  celery: require('../../assets/photos/celery.jpg'),
  celeriac: require('../../assets/photos/celeriac.jpg'),
  fennel: require('../../assets/photos/fennel.jpg'),
  'bell-peppers': require('../../assets/photos/bell-peppers.jpg'),
  jalapenos: require('../../assets/photos/jalapenos.jpg'),
  poblanos: require('../../assets/photos/poblanos.jpg'),
  'hot-peppers': require('../../assets/photos/hot-peppers.jpg'),
  eggplant: require('../../assets/photos/eggplant.jpg'),
  okra: require('../../assets/photos/okra.jpg'),
  artichokes: require('../../assets/photos/artichokes.jpg'),
  basil: require('../../assets/photos/basil.jpg'),
  cilantro: require('../../assets/photos/cilantro.jpg'),
  parsley: require('../../assets/photos/parsley.jpg'),
  dill: require('../../assets/photos/dill.jpg'),
  mint: require('../../assets/photos/mint.jpg'),
  rosemary: require('../../assets/photos/rosemary.jpg'),
  thyme: require('../../assets/photos/thyme.jpg'),
  chives: require('../../assets/photos/chives.jpg'),
  oregano: require('../../assets/photos/oregano.jpg'),
  sage: require('../../assets/photos/sage.jpg'),
  microgreens: require('../../assets/photos/microgreens.jpg'),
} as const;

const farm87 = {
  '87-eggs': require('../../assets/photos/87-eggs.jpg'),
  '87-ground-beef': require('../../assets/photos/87-ground-beef.jpg'),
  '87-steak': require('../../assets/photos/87-steak.jpg'),
  'ribeye-steak': require('../../assets/photos/ribeye-steak.jpg'),
  '87-beef-roast': require('../../assets/photos/87-beef-roast.jpg'),
  '87-stew-meat': require('../../assets/photos/87-stew-meat.jpg'),
  '87-beef-bones': require('../../assets/photos/87-beef-bones.jpg'),
  '87-beef-ribs': require('../../assets/photos/87-beef-ribs.jpg'),
  '87-short-ribs': require('../../assets/photos/87-short-ribs.jpg'),
  '87-beef-liver': require('../../assets/photos/87-beef-liver.jpg'),
  '87-oxtail': require('../../assets/photos/87-oxtail.jpg'),
  '87-beef-heart': require('../../assets/photos/87-beef-heart.jpg'),
  '87-tallow': require('../../assets/photos/87-tallow.jpg'),
  '87-beef-jerky': require('../../assets/photos/87-beef-jerky.jpg'),
  '87-chicken-breast': require('../../assets/photos/87-chicken-breast.jpg'),
  '87-chicken-thighs': require('../../assets/photos/87-chicken-thighs.jpg'),
  '87-whole-chicken': require('../../assets/photos/87-whole-chicken.jpg'),
  '87-chicken-drumsticks': require('../../assets/photos/87-chicken-drumsticks.jpg'),
  '87-chicken-tenders': require('../../assets/photos/87-chicken-tenders.jpg'),
  '87-chicken-wings': require('../../assets/photos/87-chicken-wings.jpg'),
  '87-milk': require('../../assets/photos/87-milk.jpg'),
  '87-cream': require('../../assets/photos/87-cream.jpg'),
  '87-ice-cream': require('../../assets/photos/87-ice-cream.jpg'),
} as const;

const farmGilgen = {
  'gilgen-raw-honey': require('../../assets/photos/gilgen-raw-honey.jpg'),
  'gilgen-whole-chicken': require('../../assets/photos/gilgen-whole-chicken.jpg'),
} as const;

const farmBarW = {
  'bar-w-ground-beef': require('../../assets/photos/bar-w-ground-beef.jpg'),
  'bar-w-steak': require('../../assets/photos/bar-w-steak.jpg'),
  'bar-w-beef-roast': require('../../assets/photos/bar-w-beef-roast.jpg'),
  'bar-w-tallow': require('../../assets/photos/bar-w-tallow.jpg'),
} as const;

const farmCedarValley = {
  'cedar-valley-raw-honey': require('../../assets/photos/cedar-valley-raw-honey.jpg'),
  'cedar-valley-creamed-honey': require('../../assets/photos/cedar-valley-creamed-honey.jpg'),
} as const;

const farmPoorBoy = {
  'poor-boy-eggs': require('../../assets/photos/poor-boy-eggs.jpg'),
  'poor-boy-raw-honey': require('../../assets/photos/poor-boy-raw-honey.jpg'),
} as const;

const farmMcarthur = {
  'mcarthur-tallow': require('../../assets/photos/mcarthur-tallow.jpg'),
} as const;

const farmKnight = {
  'knight-raw-honey': require('../../assets/photos/knight-raw-honey.jpg'),
} as const;

const farmMosida = {
  'mosida-steak': require('../../assets/photos/mosida-steak.jpg'),
} as const;

const farmHiddenHillside = {
  'hidden-hillside-raw-honey': require('../../assets/photos/hidden-hillside-raw-honey.jpg'),
  'hidden-hillside-comb-honey': require('../../assets/photos/hidden-hillside-comb-honey.jpg'),
} as const;

const farmLavenderHive = {
  'lavender-hive-raw-honey': require('../../assets/photos/lavender-hive-raw-honey.jpg'),
} as const;

const farmHomers = {
  'homers-raw-honey': require('../../assets/photos/homers-raw-honey.jpg'),
  'homers-creamed-honey': require('../../assets/photos/homers-creamed-honey.jpg'),
} as const;

const farmPapaBears = {
  'papa-bears-raw-honey': require('../../assets/photos/papa-bears-raw-honey.jpg'),
} as const;

const farmHollowTree = {
  'hollow-tree-raw-honey': require('../../assets/photos/hollow-tree-raw-honey.jpg'),
  'hollow-tree-comb-honey': require('../../assets/photos/hollow-tree-comb-honey.jpg'),
  'hollow-tree-creamed-honey': require('../../assets/photos/hollow-tree-creamed-honey.jpg'),
} as const;

const farmKeeper = {
  'keeper-raw-honey': require('../../assets/photos/keeper-raw-honey.jpg'),
  'keeper-creamed-honey': require('../../assets/photos/keeper-creamed-honey.jpg'),
} as const;


const farmChristiansen = {
  'christiansen-steak': require('../../assets/photos/christiansen-steak.jpg'),
  'christiansen-beef-roast': require('../../assets/photos/christiansen-beef-roast.jpg'),
} as const;

const stockFills = {
  'stock-ground-beef': require('../../assets/photos/stock-ground-beef.jpg'),
  'stock-steak': require('../../assets/photos/stock-steak.jpg'),
  'stock-pork-belly': require('../../assets/photos/stock-pork-belly.jpg'),
  'stock-comb-honey': require('../../assets/photos/stock-comb-honey.jpg'),
  'stock-milk': require('../../assets/photos/stock-milk.jpg'),
  'stock-butter': require('../../assets/photos/stock-butter.jpg'),
} as const;

const stock = {
  ...profiles,
  ...originals,
  ...batch1,
  ...batch2,
  ...batch3,
  ...farm87,
  ...farmGilgen,
  ...farmBarW,
  ...farmCedarValley,
  ...farmPoorBoy,
  ...farmMcarthur,
  ...farmKnight,
  ...farmMosida,
  ...farmHiddenHillside,
  ...farmLavenderHive,
  ...farmHomers,
  ...farmPapaBears,
  ...farmHollowTree,
  ...farmKeeper,
  ...farmChristiansen,
  ...stockFills,
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
