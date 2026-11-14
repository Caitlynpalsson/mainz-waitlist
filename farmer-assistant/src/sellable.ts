import { HttpError } from "./http.ts";
import type { InventoryStatus, ReviewStatus } from "./types.ts";

/**
 * Hard rule: a row is sellable only when it is confirmed, the message that
 * wrote it was not hedged, and the catalog item is approved and published.
 * Hedge words can create an estimate. They cannot create a confirmed row.
 */
export function assertInventoryWrite(input: { status: InventoryStatus; sourceHedged: boolean }): void {
  if (input.status === "confirmed" && input.sourceHedged) {
    throw new HttpError(409, "a hedged message cannot confirm inventory");
  }
}

export function isSellable(input: {
  status: InventoryStatus;
  sourceHedged: boolean;
  published: boolean;
  reviewStatus: ReviewStatus;
}): boolean {
  return input.status === "confirmed" && !input.sourceHedged && input.published && input.reviewStatus === "approved";
}
