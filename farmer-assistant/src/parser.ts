import { UNIT_PATTERN, canonUnit, dollarsToCents } from "./format.ts";

/**
 * Phase 1 rule parser. Phase 2 can replace this file.
 * The Parsed union is the seam: the state machine does not read raw text
 * except to quote an unknown message on a staff issue.
 *
 * Quantities and prices are taken only from explicit numbers.
 * "40 or 50", "same as last week", and "the usual" stay unknown.
 */

export type Parsed =
  | { type: "stop" }
  | { type: "yes" }
  | { type: "change" }
  | { type: "unavailable" }
  | { type: "quantity"; quantity: number; unit: string | null }
  | { type: "price"; priceCents: number }
  | { type: "quantity_price"; quantity: number; unit: string | null; priceCents: number }
  | { type: "unknown" };

const FILLER = new Set([
  "a", "an", "about", "and", "around", "available", "can", "do", "for", "get", "got",
  "have", "hey", "hi", "i", "i'd", "id", "i'll", "it's", "its", "just", "like", "mark",
  "maybe", "next", "of", "ok", "okay", "please", "probably", "roughly", "say", "some",
  "the", "them", "think", "this", "those", "we", "week", "yeah", "yep", "yes", "yup",
]);

const PRICE_DOLLAR = /\$\s*(\d+(?:\.\d{1,2})?)(?![\d.])/gi;
const PRICE_WORD = /(\d+(?:\.\d{1,2})?)(?![\d.])\s*(?:dollars|dollar|bucks|buck)\b/gi;
const PRICE_EACH = /(\d+(?:\.\d{1,2})?)(?![\d.])\s*(?:each|per\s+[a-z]+|\/\s*[a-z]+)\b/gi;
const QTY = new RegExp(String.raw`(\d+(?:\.\d+)?)(?![\d.])(?:\s*(${UNIT_PATTERN}))?\b`, "gi");

interface Span {
  cents: number;
  start: number;
  end: number;
}

const HEDGE = /\b(probably|maybe|about|around)\b/i;

/** Hedge words may become an estimate. They must never confirm a row. */
export function isHedgedMessage(raw: string): boolean {
  return HEDGE.test(raw);
}

export function parseMessage(raw: string): Parsed {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return { type: "unknown" };
  if (/^\s*stop(?:\s+all)?\s*[.!]?\s*$/i.test(text)) return { type: "stop" };
  if (/^\s*change(?:\s+(?:it|that|this))?\s*[.!]?\s*$/i.test(text)) return { type: "change" };
  if (/^\s*(yes|y|yep|yup|yeah|confirm)(?:\s+please)?\s*[.!]?\s*$/i.test(text)) return { type: "yes" };

  const unavailable =
    /\b(nothing this week|not available|unavailable|none this week|nothing available)\b/i.test(text) ||
    /^(nothing|none|no|nope|sold out)$/i.test(text);

  const price = findPrice(text);
  if (price === "ambiguous") return { type: "unknown" };

  const remaining = price ? `${text.slice(0, price.start)} ${text.slice(price.end)}` : text;
  const qty = findQuantity(remaining);
  if (qty === "ambiguous") return { type: "unknown" };

  if (unavailable && !qty && !price) return { type: "unavailable" };
  if (unavailable && (qty || price)) return { type: "unknown" };
  if (qty && qty.quantity === 0 && !price) return { type: "unavailable" };

  if (qty && price) {
    return { type: "quantity_price", quantity: qty.quantity, unit: qty.unit, priceCents: price.cents };
  }
  if (price) return { type: "price", priceCents: price.cents };
  if (qty) return { type: "quantity", quantity: qty.quantity, unit: qty.unit };
  return { type: "unknown" };
}

function findPrice(text: string): Span | "ambiguous" | null {
  const dollar = spans(text, PRICE_DOLLAR);
  if (dollar.length > 1) return "ambiguous";
  if (dollar.length === 1) return dollar[0];
  const words = spans(text, PRICE_WORD);
  if (words.length > 1) return "ambiguous";
  if (words.length === 1) return words[0];
  const each = spans(text, PRICE_EACH);
  if (each.length > 1) return "ambiguous";
  if (each.length === 1) return each[0];
  return null;
}

function spans(text: string, pattern: RegExp): Span[] {
  const found: Span[] = [];
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const cents = dollarsToCents(Number(match[1]));
    if (cents == null || cents === 0) continue;
    found.push({ cents, start: match.index, end: match.index + match[0].length });
  }
  return found;
}

function findQuantity(text: string): { quantity: number; unit: string | null } | "ambiguous" | null {
  const matches: Array<{ quantity: number; unit: string | null; index: number; raw: string }> = [];
  const re = new RegExp(QTY.source, QTY.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const quantity = Number(match[1]);
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > 100000) return "ambiguous";
    matches.push({
      quantity,
      unit: match[2] ? canonUnit(match[2]) : null,
      index: match.index,
      raw: match[0],
    });
  }
  if (matches.length > 1) return "ambiguous";
  if (matches.length === 0) return null;
  const only = matches[0];
  if (only.unit) return { quantity: only.quantity, unit: only.unit };

  const leftover = text
    .replace(only.raw, " ")
    .toLowerCase()
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (leftover.every((word) => FILLER.has(word))) {
    return { quantity: only.quantity, unit: null };
  }
  return "ambiguous";
}
