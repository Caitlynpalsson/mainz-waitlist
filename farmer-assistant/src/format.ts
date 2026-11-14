const CANON: Record<string, string> = {
  box: "box",
  boxes: "box",
  jar: "jar",
  jars: "jar",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  bag: "bag",
  bags: "bag",
  bunch: "bunch",
  bunches: "bunch",
  dozen: "dozen",
  dozens: "dozen",
  gallon: "gallon",
  gallons: "gallon",
  head: "head",
  heads: "head",
  pint: "pint",
  pints: "pint",
  quart: "quart",
  quarts: "quart",
  ounce: "oz",
  ounces: "oz",
  oz: "oz",
  loaf: "loaf",
  loaves: "loaf",
  carton: "carton",
  cartons: "carton",
};

const PLURAL: Record<string, string> = {
  box: "boxes",
  jar: "jars",
  lb: "lbs",
  bag: "bags",
  bunch: "bunches",
  dozen: "dozen",
  gallon: "gallons",
  head: "heads",
  pint: "pints",
  quart: "quarts",
  oz: "oz",
  loaf: "loaves",
  carton: "cartons",
};

export const UNIT_PATTERN = Object.keys(CANON).sort((a, b) => b.length - a.length).join("|");

export function canonUnit(unit: string): string {
  const key = unit.trim().toLowerCase();
  return CANON[key] || key;
}

export function pluralUnit(unit: string): string {
  const canon = canonUnit(unit);
  if (PLURAL[canon]) return PLURAL[canon];
  if (canon.endsWith("s")) return canon;
  return `${canon}s`;
}

export function formatQty(quantity: number, unit: string): string {
  const canon = canonUnit(unit);
  const shown = quantity === 1 ? canon : pluralUnit(canon);
  const qty = Number.isInteger(quantity) ? String(quantity) : String(Math.round(quantity * 100) / 100);
  return `${qty} ${shown}`;
}

export function formatPrice(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  if (rem === 0) return `${sign}$${dollars}`;
  return `${sign}$${dollars}.${String(rem).padStart(2, "0")}`;
}

export function dollarsToCents(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || value > 10000) return null;
  return Math.round(value * 100);
}

export function firstName(contactName: string): string {
  const token = contactName.trim().split(/\s+/)[0];
  return (token || "there").toLowerCase();
}

export function availabilityLine(productName: string): string {
  const name = productName.trim().toLowerCase();
  const verb = /s$/i.test(name) && !/ss$/i.test(name) ? "are" : "is";
  return `${verb} your ${name} available for next week's mainz market?`;
}

export function openingMessage(contactName: string, productName: string): string {
  return `hi ${firstName(contactName)}! this is mainz's automated assistant. ${availabilityLine(productName)}`;
}

export function estimatePrompt(quantity: number, unit: string): string {
  return `great! should i mark ${formatQty(quantity, unit)} as an estimate? what price?`;
}

export function confirmPrompt(quantity: number, unit: string, priceCents: number): string {
  return `please confirm: ${formatQty(quantity, unit)} at ${formatPrice(priceCents)} each for next week. reply YES to publish or CHANGE to edit.`;
}

export function confirmedReply(quantity: number, unit: string, priceCents: number): string {
  return `confirmed. ${formatQty(quantity, unit)} at ${formatPrice(priceCents)} each for next week.`;
}

export function unavailableReply(productName: string): string {
  return `got it. i'll mark ${productName.trim().toLowerCase()} unavailable for next week.`;
}

export function changeReply(productName: string): string {
  return `ok. let's start over. how many ${productName.trim().toLowerCase()} are available for next week?`;
}

export function needQuantityReply(): string {
  return "how many are available? i won't save a quantity until you send one.";
}

export function needPriceReply(): string {
  return "i still need a price before that can be confirmed. what price?";
}

export function priceWithoutQuantityReply(): string {
  return "how many are available? i need a quantity before i can save a price.";
}

export function unknownReply(): string {
  return "i didn't understand that. someone from mainz will follow up.";
}

export function stopReply(): string {
  return "you're unsubscribed. this is mainz's automated assistant, and you won't get more messages.";
}
