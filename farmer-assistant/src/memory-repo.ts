import { HttpError } from "./http.ts";
import type { InventoryAudit, NewIssue, NewMessage, OverviewCounts, Repo } from "./repo.ts";
import { assertInventoryWrite, isSellable } from "./sellable.ts";
import type {
  Application,
  ApplicationStatus,
  AuditEntry,
  AuditWrite,
  Conversation,
  ConvState,
  EmailMessage,
  Farmer,
  FarmerListItem,
  InventoryRow,
  InventoryStatus,
  InventoryWrite,
  Issue,
  MagicLink,
  MarketWeek,
  Message,
  NewFarmer,
  NewProduct,
  Product,
  StaffCall,
} from "./types.ts";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function idleConversation(farmerId: number): Conversation {
  return {
    farmerId,
    state: "idle",
    productId: null,
    marketWeekId: null,
    pendingQuantity: null,
    pendingUnit: null,
    pendingPriceCents: null,
    takenOverByStaff: null,
    updatedAt: "",
  };
}

/** In-memory repo for unit tests. Enforces the same provider message id dedupe. */
export class MemoryRepo implements Repo {
  private farmers: Farmer[] = [];
  private products: Product[] = [];
  private weeks: MarketWeek[] = [];
  private inventory: InventoryRow[] = [];
  private conversations: Conversation[] = [];
  private messages: Message[] = [];
  private issues: Issue[] = [];
  private audits: AuditEntry[] = [];
  private applications: Application[] = [];
  private emails: EmailMessage[] = [];
  private links: MagicLink[] = [];
  private calls: StaffCall[] = [];
  private seq = { farmer: 1, product: 1, week: 1, inventory: 1, message: 1, issue: 1, audit: 1, application: 1, email: 1, link: 1, call: 1 };

  async listFarmers(): Promise<FarmerListItem[]> {
    return this.farmers
      .map((farmer) => {
        const conversation = this.conversations.find((item) => item.farmerId === farmer.id);
        return {
          ...clone(farmer),
          conversationState: conversation?.state ?? "idle",
          takenOverByStaff: conversation?.takenOverByStaff ?? null,
          openIssues: this.issues.filter((issue) => issue.farmerId === farmer.id && issue.status === "open").length,
        };
      })
      .sort((a, b) => a.farmName.localeCompare(b.farmName));
  }

  async getFarmer(id: number): Promise<Farmer | null> {
    const farmer = this.farmers.find((item) => item.id === id);
    return farmer ? clone(farmer) : null;
  }

  async findFarmerByPhone(phone: string): Promise<Farmer | null> {
    const farmer = this.farmers.find((item) => item.phone === phone);
    return farmer ? clone(farmer) : null;
  }

  async insertFarmer(input: NewFarmer, at: string): Promise<Farmer> {
    if (this.farmers.some((item) => item.phone === input.phone)) {
      throw new HttpError(409, "a farm with that phone already exists");
    }
    const farmer: Farmer = { ...input, id: this.seq.farmer++, createdAt: at, updatedAt: at };
    this.farmers.push(farmer);
    return clone(farmer);
  }

  async updateFarmer(id: number, input: NewFarmer, at: string): Promise<Farmer> {
    const index = this.farmers.findIndex((item) => item.id === id);
    if (index < 0) throw new HttpError(404, "farmer not found");
    if (this.farmers.some((item) => item.phone === input.phone && item.id !== id)) {
      throw new HttpError(409, "a farm with that phone already exists");
    }
    const farmer: Farmer = { ...this.farmers[index], ...input, id, createdAt: this.farmers[index].createdAt, updatedAt: at };
    this.farmers[index] = farmer;
    return clone(farmer);
  }

  async listProducts(farmerId: number): Promise<Product[]> {
    return this.products
      .filter((item) => item.farmerId === farmerId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(clone);
  }

  async getProduct(id: number): Promise<Product | null> {
    const product = this.products.find((item) => item.id === id);
    return product ? clone(product) : null;
  }

  async insertProduct(input: NewProduct, at: string): Promise<Product> {
    const product: Product = { ...input, id: this.seq.product++, createdAt: at, updatedAt: at };
    this.products.push(product);
    return clone(product);
  }

  async updateProduct(id: number, patch: Omit<NewProduct, "farmerId">, at: string): Promise<Product> {
    const index = this.products.findIndex((item) => item.id === id);
    if (index < 0) throw new HttpError(404, "product not found");
    this.products[index] = { ...this.products[index], ...patch, updatedAt: at };
    return clone(this.products[index]);
  }

  async getConversation(farmerId: number): Promise<Conversation> {
    const found = this.conversations.find((item) => item.farmerId === farmerId);
    return clone(found ?? idleConversation(farmerId));
  }

  async saveConversation(conv: Omit<Conversation, "updatedAt">, at: string): Promise<void> {
    const next: Conversation = { ...conv, updatedAt: at };
    const index = this.conversations.findIndex((item) => item.farmerId === conv.farmerId);
    if (index < 0) this.conversations.push(next);
    else this.conversations[index] = next;
  }

  async ensureWeek(weekStart: string, at: string): Promise<MarketWeek> {
    const found = this.weeks.find((item) => item.weekStart === weekStart);
    if (found) return clone(found);
    const week: MarketWeek = { id: this.seq.week++, weekStart, createdAt: at };
    this.weeks.push(week);
    return clone(week);
  }

  async getInventoryById(id: number): Promise<InventoryRow | null> {
    const row = this.inventory.find((item) => item.id === id);
    return row ? clone(row) : null;
  }

  async listInventoryByWeek(weekStart: string): Promise<InventoryRow[]> {
    return this.inventory
      .filter((item) => item.weekStart === weekStart)
      .sort((a, b) => a.farmName.localeCompare(b.farmName) || a.productName.localeCompare(b.productName))
      .map(clone);
  }

  async listInventoryForFarmerWeek(farmerId: number, weekStart: string): Promise<InventoryRow[]> {
    return this.inventory
      .filter((item) => item.farmerId === farmerId && item.weekStart === weekStart)
      .sort((a, b) => a.productName.localeCompare(b.productName))
      .map(clone);
  }

  async saveInventory(write: InventoryWrite, audit: InventoryAudit): Promise<InventoryRow> {
    const farmer = this.farmers.find((item) => item.id === write.farmerId);
    const product = this.products.find((item) => item.id === write.productId);
    const week = this.weeks.find((item) => item.id === write.marketWeekId);
    if (!farmer || !product || !week) throw new HttpError(404, "inventory target not found");
    assertInventoryWrite(write);
    const sellable = isSellable({
      status: write.status,
      sourceHedged: write.sourceHedged,
      published: product.published,
      reviewStatus: product.reviewStatus,
    });
    const index = this.inventory.findIndex(
      (item) => item.farmerId === write.farmerId && item.productId === write.productId && item.marketWeekId === write.marketWeekId,
    );
    const before = index >= 0 ? snapshot(this.inventory[index]) : null;
    let row: InventoryRow;
    if (index < 0) {
      row = {
        id: this.seq.inventory++,
        farmerId: write.farmerId,
        productId: write.productId,
        marketWeekId: write.marketWeekId,
        weekStart: week.weekStart,
        productName: product.name,
        farmName: farmer.farmName,
        quantity: write.quantity,
        unit: write.unit,
        priceCents: write.priceCents,
        status: write.status,
        sourceHedged: write.sourceHedged,
        sellable,
        sourceMessageId: write.sourceMessageId,
        updatedBy: write.updatedBy,
        createdAt: audit.at,
        updatedAt: audit.at,
      };
      this.inventory.push(row);
    } else {
      row = {
        ...this.inventory[index],
        weekStart: week.weekStart,
        productName: product.name,
        farmName: farmer.farmName,
        quantity: write.quantity,
        unit: write.unit,
        priceCents: write.priceCents,
        status: write.status,
        sourceHedged: write.sourceHedged,
        sellable,
        sourceMessageId: write.sourceMessageId,
        updatedBy: write.updatedBy,
        updatedAt: audit.at,
      };
      this.inventory[index] = row;
    }
    await this.addAudit({
      farmerId: write.farmerId,
      actor: audit.actor,
      action: audit.action,
      entity: "inventory",
      entityId: row.id,
      before,
      after: snapshot(row),
      at: audit.at,
    });
    return clone(row);
  }

  async insertMessage(msg: NewMessage): Promise<{ message: Message; deduped: boolean }> {
    if (msg.providerMessageId) {
      const existing = this.messages.find((item) => item.providerMessageId === msg.providerMessageId);
      if (existing) return { message: clone(existing), deduped: true };
    }
    const message: Message = { ...msg, id: this.seq.message++ };
    this.messages.push(message);
    return { message: clone(message), deduped: false };
  }

  async listMessages(farmerId: number): Promise<Message[]> {
    return this.messages.filter((item) => item.farmerId === farmerId).map(clone);
  }

  async createIssue(input: NewIssue): Promise<Issue> {
    const farmer = this.farmers.find((item) => item.id === input.farmerId);
    if (!farmer) throw new HttpError(404, "farmer not found");
    const issue: Issue = {
      id: this.seq.issue++,
      farmerId: input.farmerId,
      farmName: farmer.farmName,
      status: "open",
      kind: input.kind,
      summary: input.summary,
      messageId: input.messageId,
      createdAt: input.at,
      resolvedAt: null,
      resolvedBy: null,
    };
    this.issues.push(issue);
    return clone(issue);
  }

  async getIssue(id: number): Promise<Issue | null> {
    const issue = this.issues.find((item) => item.id === id);
    return issue ? clone(issue) : null;
  }

  async listIssues(status: "open" | "resolved" | "all"): Promise<Issue[]> {
    return this.issues
      .filter((item) => status === "all" || item.status === status)
      .sort((a, b) => b.id - a.id)
      .map(clone);
  }

  async listIssuesForFarmer(farmerId: number): Promise<Issue[]> {
    return this.issues
      .filter((item) => item.farmerId === farmerId)
      .sort((a, b) => b.id - a.id)
      .map(clone);
  }

  async resolveIssue(id: number, actor: string, at: string): Promise<Issue> {
    const index = this.issues.findIndex((item) => item.id === id);
    if (index < 0) throw new HttpError(404, "issue not found");
    if (this.issues[index].status === "resolved") throw new HttpError(409, "issue is already resolved");
    this.issues[index] = { ...this.issues[index], status: "resolved", resolvedAt: at, resolvedBy: actor };
    return clone(this.issues[index]);
  }

  async listAudit(farmerId: number): Promise<AuditEntry[]> {
    return this.audits
      .filter((item) => item.farmerId === farmerId)
      .sort((a, b) => b.id - a.id)
      .slice(0, 100)
      .map(clone);
  }

  async addAudit(entry: AuditWrite): Promise<void> {
    this.audits.push({
      id: this.seq.audit++,
      farmerId: entry.farmerId,
      actor: entry.actor,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      createdAt: entry.at,
    });
  }

  async overview(weekStart: string): Promise<OverviewCounts> {
    const awaitingStates: ConvState[] = ["awaiting_availability", "awaiting_price", "awaiting_confirm"];
    return {
      totalFarmers: this.farmers.length,
      awaitingReply: this.conversations.filter((conversation) => {
        const farmer = this.farmers.find((item) => item.id === conversation.farmerId);
        return (
          !!farmer &&
          awaitingStates.includes(conversation.state) &&
          !farmer.automationPaused &&
          !conversation.takenOverByStaff &&
          farmer.smsConsent === "granted" &&
          farmer.contactMethod !== "call"
        );
      }).length,
      confirmedThisWeek: this.inventory.filter((item) => item.weekStart === weekStart && item.status === "confirmed").length,
      needsVerification: this.inventory.filter((item) => item.weekStart === weekStart && item.status === "needs_verification").length,
      unresolvedIssues: this.issues.filter((item) => item.status === "open").length,
    };
  }

  async deleteSampleFarmers(): Promise<void> {
    const ids = new Set(this.farmers.filter((item) => item.isSample).map((item) => item.id));
    this.farmers = this.farmers.filter((item) => !ids.has(item.id));
    this.products = this.products.filter((item) => !ids.has(item.farmerId));
    this.inventory = this.inventory.filter((item) => !ids.has(item.farmerId));
    this.conversations = this.conversations.filter((item) => !ids.has(item.farmerId));
    this.messages = this.messages.filter((item) => !ids.has(item.farmerId));
    this.issues = this.issues.filter((item) => !ids.has(item.farmerId));
    this.audits = this.audits.filter((item) => item.farmerId == null || !ids.has(item.farmerId));
    this.calls = this.calls.filter((item) => !ids.has(item.farmerId));
    this.links = this.links.filter((item) => !ids.has(item.farmerId));
    this.emails = this.emails.filter((item) => item.farmerId == null || !ids.has(item.farmerId));
    this.applications = this.applications.map((item) => (item.farmerId != null && ids.has(item.farmerId) ? { ...item, farmerId: null } : item));
  }

  async listConversations(): Promise<Conversation[]> {
    return this.conversations.map(clone);
  }

  async listAllProducts(): Promise<Product[]> {
    return this.products.map(clone);
  }

  async clearSellableForProduct(productId: number): Promise<void> {
    this.inventory = this.inventory.map((row) => (row.productId === productId ? { ...row, sellable: false } : row));
  }

  async markConfirmedSellable(productId: number): Promise<void> {
    const product = this.products.find((item) => item.id === productId);
    if (!product || !product.published || product.reviewStatus !== "approved") return;
    this.inventory = this.inventory.map((row) =>
      row.productId === productId && row.status === "confirmed" && !row.sourceHedged ? { ...row, sellable: true } : row,
    );
  }

  async addCall(input: { farmerId: number; reason: string; at: string }): Promise<StaffCall> {
    const farmer = this.farmers.find((item) => item.id === input.farmerId);
    if (!farmer) throw new HttpError(404, "farmer not found");
    const open = this.calls.find((item) => item.farmerId === input.farmerId && item.status === "open" && item.reason === input.reason);
    if (open) return clone(open);
    const call: StaffCall = {
      id: this.seq.call++,
      farmerId: input.farmerId,
      farmName: farmer.farmName,
      reason: input.reason,
      status: "open",
      createdAt: input.at,
      completedAt: null,
      completedBy: null,
    };
    this.calls.push(call);
    return clone(call);
  }

  async listCalls(status: "open" | "done" | "all"): Promise<StaffCall[]> {
    return this.calls.filter((item) => status === "all" || item.status === status).map(clone);
  }

  async completeCall(id: number, actor: string, at: string): Promise<StaffCall> {
    const index = this.calls.findIndex((item) => item.id === id);
    if (index < 0) throw new HttpError(404, "call not found");
    this.calls[index] = { ...this.calls[index], status: "done", completedAt: at, completedBy: actor };
    return clone(this.calls[index]);
  }

  async insertApplication(input: Omit<Application, "id" | "farmerId" | "createdAt" | "updatedAt"> & { at: string }): Promise<Application> {
    const application: Application = {
      id: this.seq.application++,
      farmName: input.farmName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      city: input.city,
      whatYouSell: input.whatYouSell,
      fulfillment: input.fulfillment,
      status: input.status,
      farmerId: null,
      createdAt: input.at,
      updatedAt: input.at,
    };
    this.applications.push(application);
    return clone(application);
  }

  async listApplications(): Promise<Application[]> {
    return [...this.applications].sort((a, b) => b.id - a.id).map(clone);
  }

  async getApplication(id: number): Promise<Application | null> {
    const found = this.applications.find((item) => item.id === id);
    return found ? clone(found) : null;
  }

  async updateApplication(id: number, patch: { status: ApplicationStatus; farmerId: number | null }, at: string): Promise<Application> {
    const index = this.applications.findIndex((item) => item.id === id);
    if (index < 0) throw new HttpError(404, "application not found");
    this.applications[index] = { ...this.applications[index], status: patch.status, farmerId: patch.farmerId, updatedAt: at };
    return clone(this.applications[index]);
  }

  async enqueueEmail(input: Omit<EmailMessage, "id" | "status" | "sentAt" | "createdAt"> & { at: string }): Promise<EmailMessage> {
    const email: EmailMessage = {
      id: this.seq.email++,
      toEmail: input.toEmail,
      subject: input.subject,
      body: input.body,
      kind: input.kind,
      farmerId: input.farmerId,
      applicationId: input.applicationId,
      status: "queued",
      createdAt: input.at,
      sentAt: null,
    };
    this.emails.push(email);
    return clone(email);
  }

  async listEmails(): Promise<EmailMessage[]> {
    return [...this.emails].sort((a, b) => b.id - a.id).map(clone);
  }

  async getEmail(id: number): Promise<EmailMessage | null> {
    const found = this.emails.find((item) => item.id === id);
    return found ? clone(found) : null;
  }

  async createMagicLink(farmerId: number, token: string, expiresAt: string, at: string): Promise<MagicLink> {
    const link: MagicLink = { id: this.seq.link++, farmerId, token, expiresAt, createdAt: at };
    this.links.push(link);
    return clone(link);
  }

  async findMagicLink(token: string): Promise<MagicLink | null> {
    const found = this.links.find((item) => item.token === token);
    return found ? clone(found) : null;
  }
}

function snapshot(row: InventoryRow) {
  return {
    quantity: row.quantity,
    unit: row.unit,
    priceCents: row.priceCents,
    status: row.status as InventoryStatus,
    productId: row.productId,
    marketWeekId: row.marketWeekId,
  };
}
