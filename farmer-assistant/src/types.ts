export type Consent = "none" | "pending" | "granted" | "revoked";

export type InventoryStatus = "estimate" | "confirmed" | "needs_verification" | "unavailable";

export type ConvState =
  | "idle"
  | "awaiting_availability"
  | "awaiting_price"
  | "awaiting_confirm"
  | "taken_over"
  | "stopped";

export type Channel = "simulator" | "sms";

export interface Farmer {
  id: number;
  farmName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContactTimes: string;
  pickupLocation: string;
  pickupAvailability: string;
  smsConsent: Consent;
  smsConsentAt: string | null;
  smsConsentSource: string | null;
  assignedStaff: string;
  automationPaused: boolean;
  isSample: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FarmerListItem extends Farmer {
  conversationState: ConvState;
  takenOverByStaff: string | null;
  openIssues: number;
}

export interface Product {
  id: number;
  farmerId: number;
  name: string;
  unit: string;
  defaultPriceCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketWeek {
  id: number;
  weekStart: string;
  createdAt: string;
}

export interface InventoryRow {
  id: number;
  farmerId: number;
  productId: number;
  marketWeekId: number;
  weekStart: string;
  productName: string;
  farmName: string;
  quantity: number | null;
  unit: string | null;
  priceCents: number | null;
  status: InventoryStatus;
  sourceMessageId: number | null;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  farmerId: number;
  state: ConvState;
  productId: number | null;
  marketWeekId: number | null;
  pendingQuantity: number | null;
  pendingUnit: string | null;
  pendingPriceCents: number | null;
  takenOverByStaff: string | null;
  updatedAt: string;
}

export interface Message {
  id: number;
  farmerId: number;
  direction: "in" | "out";
  channel: Channel;
  providerMessageId: string | null;
  body: string;
  author: string;
  createdAt: string;
}

export type IssueKind = "needs_verification" | "staff";

export interface Issue {
  id: number;
  farmerId: number;
  farmName: string;
  status: "open" | "resolved";
  kind: IssueKind;
  summary: string;
  messageId: number | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface AuditEntry {
  id: number;
  farmerId: number | null;
  actor: string;
  action: string;
  entity: string;
  entityId: number | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface Overview {
  totalFarmers: number;
  awaitingReply: number;
  confirmedThisWeek: number;
  needsVerification: number;
  unresolvedIssues: number;
  weekStart: string;
  weekLabel: string;
}

export interface NewFarmer {
  farmName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContactTimes: string;
  pickupLocation: string;
  pickupAvailability: string;
  smsConsent: Consent;
  smsConsentAt: string | null;
  smsConsentSource: string | null;
  assignedStaff: string;
  automationPaused: boolean;
  isSample: boolean;
  notes: string;
}

export interface NewProduct {
  farmerId: number;
  name: string;
  unit: string;
  defaultPriceCents: number | null;
}

export interface InventoryWrite {
  farmerId: number;
  productId: number;
  marketWeekId: number;
  quantity: number | null;
  unit: string | null;
  priceCents: number | null;
  status: InventoryStatus;
  sourceMessageId: number | null;
  updatedBy: string;
}

export interface AuditWrite {
  farmerId: number | null;
  actor: string;
  action: string;
  entity: string;
  entityId: number | null;
  before: unknown;
  after: unknown;
  at: string;
}
