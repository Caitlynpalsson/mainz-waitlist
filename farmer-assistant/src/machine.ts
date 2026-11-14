import {
  changeReply,
  confirmPrompt,
  confirmedReply,
  estimatePrompt,
  needPriceReply,
  needQuantityReply,
  priceWithoutQuantityReply,
  unavailableReply,
  unknownReply,
} from "./format.ts";
import type { Parsed } from "./parser.ts";
import type { ConvState, InventoryStatus } from "./types";

/**
 * Pure conversation step. Confirmation happens only from an explicit YES
 * while the bot is waiting for that yes, and only when both a quantity
 * and a price were stated. Staff approval is a separate path.
 */

export interface MachineInput {
  state: ConvState;
  productName: string | null;
  productUnit: string | null;
  pendingQuantity: number | null;
  pendingUnit: string | null;
  pendingPriceCents: number | null;
  parsed: Parsed;
  rawText: string;
  hedged: boolean;
}

export interface InventoryEffect {
  status: InventoryStatus;
  quantity: number | null;
  unit: string | null;
  priceCents: number | null;
}

export interface MachineOutput {
  state: ConvState;
  pendingQuantity: number | null;
  pendingUnit: string | null;
  pendingPriceCents: number | null;
  clearProduct: boolean;
  replies: string[];
  inventory: InventoryEffect | null;
  revokeConsent: boolean;
  issueSummary: string | null;
}

export function step(input: MachineInput): MachineOutput {
  const base = carry(input);
  if (input.parsed.type === "stop") {
    return {
      ...cleared("stopped"),
      replies: [],
      inventory: null,
      revokeConsent: true,
      issueSummary: null,
    };
  }

  if (input.state === "awaiting_availability") return onAvailability(input, base);
  if (input.state === "awaiting_price") return onPrice(input, base);
  if (input.state === "awaiting_confirm") return onConfirm(input, base);
  return unknown(input, false);
}

function onAvailability(input: MachineInput, base: MachineOutput): MachineOutput {
  const parsed = input.parsed;
  const product = input.productName || "that";

  if (parsed.type === "unavailable") return markUnavailable(product);
  if (parsed.type === "change") {
    return { ...base, replies: [changeReply(product)] };
  }
  if (parsed.type === "yes") {
    return { ...base, replies: [needQuantityReply()] };
  }
  if (parsed.type === "price") {
    return { ...base, replies: [priceWithoutQuantityReply()] };
  }
  if (parsed.type === "quantity" || parsed.type === "quantity_price") {
    const unit = parsed.unit || input.productUnit;
    if (!unit) return unknown(input, false);
    const price = parsed.type === "quantity_price" ? parsed.priceCents : null;
    return saveEstimate(parsed.quantity, unit, price);
  }
  return unknown(input, false);
}

function onPrice(input: MachineInput, base: MachineOutput): MachineOutput {
  const parsed = input.parsed;
  const product = input.productName || "that";
  if (parsed.type === "unavailable") return markUnavailable(product);
  if (parsed.type === "change") return restart(product);
  if (parsed.type === "yes") return { ...base, replies: [needPriceReply()] };

  if (parsed.type === "quantity" && parsed.unit == null && input.pendingQuantity != null) {
    const cents = Math.round(parsed.quantity * 100);
    if (cents <= 0) return { ...base, replies: [needPriceReply()] };
    return saveEstimate(input.pendingQuantity, input.pendingUnit || input.productUnit || "each", cents);
  }

  if (parsed.type === "price" && input.pendingQuantity != null) {
    const unit = input.pendingUnit || input.productUnit;
    if (!unit) return unknown(input, true);
    return saveEstimate(input.pendingQuantity, unit, parsed.priceCents);
  }

  if (parsed.type === "quantity" && parsed.unit && parsed.quantity > 0) {
    return saveEstimate(parsed.quantity, parsed.unit, null);
  }

  if (parsed.type === "quantity_price") {
    const unit = parsed.unit || input.pendingUnit || input.productUnit;
    if (!unit) return unknown(input, true);
    return saveEstimate(parsed.quantity, unit, parsed.priceCents);
  }

  return unknown(input, input.pendingQuantity != null);
}

function onConfirm(input: MachineInput, base: MachineOutput): MachineOutput {
  const parsed = input.parsed;
  const product = input.productName || "that";
  if (parsed.type === "unavailable") return markUnavailable(product);
  if (parsed.type === "change") return restart(product);

  if (parsed.type === "yes" && input.hedged) {
    return {
      ...base,
      replies: ["i can only keep a hedge as an estimate. reply YES alone, with no probably, maybe, about, or around, to publish."],
    };
  }

  if (parsed.type === "yes") {
    const quantity = input.pendingQuantity;
    const unit = input.pendingUnit;
    const price = input.pendingPriceCents;
    if (quantity == null || !unit || price == null) {
      return { ...base, replies: [needPriceReply()] };
    }
    return {
      ...cleared("idle"),
      replies: [confirmedReply(quantity, unit, price)],
      inventory: { status: "confirmed", quantity, unit, priceCents: price },
      revokeConsent: false,
      issueSummary: null,
    };
  }

  if (parsed.type === "price" && input.pendingQuantity != null && input.pendingUnit) {
    return saveEstimate(input.pendingQuantity, input.pendingUnit, parsed.priceCents);
  }
  if (parsed.type === "quantity" && parsed.quantity > 0) {
    const unit = parsed.unit || input.pendingUnit || input.productUnit;
    if (!unit) return unknown(input, true);
    return saveEstimate(parsed.quantity, unit, null);
  }
  if (parsed.type === "quantity_price") {
    const unit = parsed.unit || input.productUnit;
    if (!unit) return unknown(input, true);
    return saveEstimate(parsed.quantity, unit, parsed.priceCents);
  }
  return unknown(input, input.pendingQuantity != null);
}

function saveEstimate(quantity: number, unit: string, priceCents: number | null): MachineOutput {
  const ready = priceCents != null;
  return {
    state: ready ? "awaiting_confirm" : "awaiting_price",
    pendingQuantity: quantity,
    pendingUnit: unit,
    pendingPriceCents: priceCents,
    clearProduct: false,
    replies: [ready ? confirmPrompt(quantity, unit, priceCents) : estimatePrompt(quantity, unit)],
    inventory: { status: "estimate", quantity, unit, priceCents },
    revokeConsent: false,
    issueSummary: null,
  };
}

function markUnavailable(product: string): MachineOutput {
  return {
    ...cleared("idle"),
    replies: [unavailableReply(product)],
    inventory: { status: "unavailable", quantity: null, unit: null, priceCents: null },
    revokeConsent: false,
    issueSummary: null,
  };
}

function restart(product: string): MachineOutput {
  return {
    state: "awaiting_availability",
    pendingQuantity: null,
    pendingUnit: null,
    pendingPriceCents: null,
    clearProduct: false,
    replies: [changeReply(product)],
    inventory: null,
    revokeConsent: false,
    issueSummary: null,
  };
}

function unknown(input: MachineInput, keepNumbers: boolean): MachineOutput {
  const snippet = input.rawText.trim().replace(/\s+/g, " ").slice(0, 180);
  const hasNumbers = keepNumbers && input.pendingQuantity != null;
  return {
    ...cleared("idle"),
    replies: [unknownReply()],
    inventory: hasNumbers
      ? {
          status: "needs_verification",
          quantity: input.pendingQuantity,
          unit: input.pendingUnit,
          priceCents: input.pendingPriceCents,
        }
      : null,
    revokeConsent: false,
    issueSummary: `needs verification. unparsed message: ${JSON.stringify(snippet)}`,
  };
}

function carry(input: MachineInput): MachineOutput {
  return {
    state: input.state,
    pendingQuantity: input.pendingQuantity,
    pendingUnit: input.pendingUnit,
    pendingPriceCents: input.pendingPriceCents,
    clearProduct: false,
    replies: [],
    inventory: null,
    revokeConsent: false,
    issueSummary: null,
  };
}

function cleared(state: ConvState): Omit<MachineOutput, "replies" | "inventory" | "revokeConsent" | "issueSummary"> {
  return {
    state,
    pendingQuantity: null,
    pendingUnit: null,
    pendingPriceCents: null,
    clearProduct: true,
  };
}
