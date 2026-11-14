import type {
  AuditEntry,
  AuditWrite,
  Conversation,
  Farmer,
  FarmerListItem,
  InventoryRow,
  InventoryWrite,
  Issue,
  IssueKind,
  MarketWeek,
  Message,
  NewFarmer,
  NewProduct,
  Product,
} from "./types.ts";

export interface InventoryAudit {
  actor: string;
  action: string;
  at: string;
}

export interface NewMessage {
  farmerId: number;
  direction: "in" | "out";
  channel: "simulator" | "sms";
  providerMessageId: string | null;
  body: string;
  author: string;
  createdAt: string;
}

export interface NewIssue {
  farmerId: number;
  kind: IssueKind;
  summary: string;
  messageId: number | null;
  at: string;
}

export interface OverviewCounts {
  totalFarmers: number;
  awaitingReply: number;
  confirmedThisWeek: number;
  needsVerification: number;
  unresolvedIssues: number;
}

/**
 * Storage seam. The worker uses D1. Tests use an in-memory repo with the
 * same unique provider_message_id rule.
 */
export interface Repo {
  listFarmers(): Promise<FarmerListItem[]>;
  getFarmer(id: number): Promise<Farmer | null>;
  findFarmerByPhone(phone: string): Promise<Farmer | null>;
  insertFarmer(input: NewFarmer, at: string): Promise<Farmer>;
  updateFarmer(id: number, input: NewFarmer, at: string): Promise<Farmer>;

  listProducts(farmerId: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | null>;
  insertProduct(input: NewProduct, at: string): Promise<Product>;
  updateProduct(id: number, patch: Omit<NewProduct, "farmerId">, at: string): Promise<Product>;

  getConversation(farmerId: number): Promise<Conversation>;
  saveConversation(conv: Omit<Conversation, "updatedAt">, at: string): Promise<void>;

  ensureWeek(weekStart: string, at: string): Promise<MarketWeek>;

  getInventoryById(id: number): Promise<InventoryRow | null>;
  listInventoryByWeek(weekStart: string): Promise<InventoryRow[]>;
  listInventoryForFarmerWeek(farmerId: number, weekStart: string): Promise<InventoryRow[]>;
  saveInventory(write: InventoryWrite, audit: InventoryAudit): Promise<InventoryRow>;

  insertMessage(msg: NewMessage): Promise<{ message: Message; deduped: boolean }>;
  listMessages(farmerId: number): Promise<Message[]>;

  createIssue(input: NewIssue): Promise<Issue>;
  getIssue(id: number): Promise<Issue | null>;
  listIssues(status: "open" | "resolved" | "all"): Promise<Issue[]>;
  listIssuesForFarmer(farmerId: number): Promise<Issue[]>;
  resolveIssue(id: number, actor: string, at: string): Promise<Issue>;

  listAudit(farmerId: number): Promise<AuditEntry[]>;
  addAudit(entry: AuditWrite): Promise<void>;

  overview(weekStart: string): Promise<OverviewCounts>;
  deleteSampleFarmers(): Promise<void>;
}
