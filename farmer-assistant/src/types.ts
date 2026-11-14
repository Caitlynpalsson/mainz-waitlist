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

export type ContactMethod = "text" | "call" | "delegate";

export type ReviewStatus = "approved" | "needs_verification";

export type ApplicationStatus = "received" | "in_review" | "approved" | "needs_info" | "declined";

export interface Farmer {
  id: number;
  farmName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContactTimes: string;
  preferredContactDays: string;
  contactMethod: ContactMethod;
  delegateName: string;
  delegatePhone: string;
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
  reviewStatus: ReviewStatus;
  photoUrl: string;
  published: boolean;
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
  sourceHedged: boolean;
  sellable: boolean;
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
  preferredContactDays: string;
  contactMethod: ContactMethod;
  delegateName: string;
  delegatePhone: string;
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
  reviewStatus: ReviewStatus;
  photoUrl: string;
  published: boolean;
}

export interface InventoryWrite {
  farmerId: number;
  productId: number;
  marketWeekId: number;
  quantity: number | null;
  unit: string | null;
  priceCents: number | null;
  status: InventoryStatus;
  sourceHedged: boolean;
  sourceMessageId: number | null;
  updatedBy: string;
}

export interface Application {
  id: number;
  farmName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  whatYouSell: string;
  fulfillment: string;
  status: ApplicationStatus;
  farmerId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailMessage {
  id: number;
  toEmail: string;
  subject: string;
  body: string;
  kind: string;
  farmerId: number | null;
  applicationId: number | null;
  status: "queued" | "sent" | "failed";
  createdAt: string;
  sentAt: string | null;
}

export interface MagicLink {
  id: number;
  farmerId: number;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface StaffCall {
  id: number;
  farmerId: number;
  farmName: string;
  reason: string;
  status: "open" | "done";
  createdAt: string;
  completedAt: string | null;
  completedBy: string | null;
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
