import type { Application, Conversation, Farmer, InventoryRow, Issue, Product, StaffCall } from "./types.ts";

export interface DeskItem {
  kind: "issue" | "needs_verification" | "catalog" | "application" | "call" | "missing_reply";
  urgency: number;
  at: string;
  title: string;
  detail: string;
  farmerId: number | null;
  refId: number;
  actionable: boolean;
}

const AWAITING = new Set(["awaiting_availability", "awaiting_price", "awaiting_confirm"]);
const WAITING_DECISION = new Set(["received", "in_review", "needs_info"]);

/** Routine confirmed work is omitted. Older items of the same urgency come first. */
export function buildDesk(input: {
  farmers: Farmer[];
  conversations: Conversation[];
  inventory: InventoryRow[];
  products: Product[];
  issues: Issue[];
  applications: Application[];
  calls: StaffCall[];
}): DeskItem[] {
  const items: DeskItem[] = [];
  const farmers = new Map(input.farmers.map((farmer) => [farmer.id, farmer]));

  for (const issue of input.issues) {
    if (issue.status !== "open") continue;
    items.push({
      kind: "issue",
      urgency: 1,
      at: issue.createdAt,
      title: issue.farmName,
      detail: issue.summary,
      farmerId: issue.farmerId,
      refId: issue.id,
      actionable: false,
    });
  }

  for (const row of input.inventory) {
    if (row.status !== "needs_verification") continue;
    items.push({
      kind: "needs_verification",
      urgency: 1,
      at: row.updatedAt,
      title: `${row.farmName} · ${row.productName}`,
      detail: "inventory needs a person to check it before it can be confirmed",
      farmerId: row.farmerId,
      refId: row.id,
      actionable: false,
    });
  }

  for (const product of input.products) {
    if (product.reviewStatus !== "needs_verification") continue;
    const farmer = farmers.get(product.farmerId);
    items.push({
      kind: "catalog",
      urgency: 1,
      at: product.updatedAt,
      title: `${farmer?.farmName ?? "farm"} · ${product.name}`,
      detail: "catalog change is waiting for staff approval",
      farmerId: product.farmerId,
      refId: product.id,
      actionable: false,
    });
  }

  for (const application of input.applications) {
    if (!WAITING_DECISION.has(application.status)) continue;
    items.push({
      kind: "application",
      urgency: 2,
      at: application.updatedAt,
      title: application.farmName,
      detail: `application ${application.status.replaceAll("_", " ")}`,
      farmerId: application.farmerId,
      refId: application.id,
      actionable: false,
    });
  }

  const callFarmers = new Set<number>();
  for (const call of input.calls) {
    if (call.status !== "open") continue;
    callFarmers.add(call.farmerId);
    const farmer = farmers.get(call.farmerId);
    items.push({
      kind: "call",
      urgency: 2,
      at: call.createdAt,
      title: farmer?.farmName ?? "farm",
      detail: call.reason,
      farmerId: call.farmerId,
      refId: call.id,
      actionable: true,
    });
  }
  for (const farmer of input.farmers) {
    if (farmer.contactMethod !== "call" || callFarmers.has(farmer.id)) continue;
    const confirmed = input.inventory.some((row) => row.farmerId === farmer.id && row.status === "confirmed" && row.sellable);
    if (confirmed) continue;
    items.push({
      kind: "call",
      urgency: 2,
      at: farmer.updatedAt,
      title: farmer.farmName,
      detail: "this farm asked for a call, not a text",
      farmerId: farmer.id,
      refId: farmer.id,
      actionable: false,
    });
  }

  for (const conversation of input.conversations) {
    if (!AWAITING.has(conversation.state)) continue;
    const farmer = farmers.get(conversation.farmerId);
    if (!farmer || farmer.automationPaused || conversation.takenOverByStaff) continue;
    if (farmer.smsConsent !== "granted" || farmer.contactMethod === "call") continue;
    items.push({
      kind: "missing_reply",
      urgency: 3,
      at: conversation.updatedAt || farmer.updatedAt,
      title: farmer.farmName,
      detail: `waiting on a reply · ${conversation.state.replaceAll("_", " ")}`,
      farmerId: farmer.id,
      refId: farmer.id,
      actionable: false,
    });
  }

  return items.sort((a, b) => a.urgency - b.urgency || a.at.localeCompare(b.at));
}
