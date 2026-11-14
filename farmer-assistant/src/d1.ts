import { HttpError } from "./http.ts";
import type { InventoryAudit, NewIssue, NewMessage, OverviewCounts, Repo } from "./repo.ts";
import type {
  AuditEntry,
  AuditWrite,
  Consent,
  Conversation,
  ConvState,
  Farmer,
  FarmerListItem,
  InventoryRow,
  InventoryStatus,
  InventoryWrite,
  Issue,
  IssueKind,
  MarketWeek,
  Message,
  NewFarmer,
  NewProduct,
  Product,
} from "./types.ts";

type Sql = string | number | null;
type Row = Record<string, unknown>;

const CONSENTS = new Set<Consent>(["none", "pending", "granted", "revoked"]);
const STATES = new Set<ConvState>(["idle", "awaiting_availability", "awaiting_price", "awaiting_confirm", "taken_over", "stopped"]);
const INVENTORY = new Set<InventoryStatus>(["estimate", "confirmed", "needs_verification", "unavailable"]);

export class D1Repo implements Repo {
  constructor(private readonly db: D1Database) {}

  async listFarmers(): Promise<FarmerListItem[]> {
    const rows = await this.many(
      `SELECT f.*,
        COALESCE(c.state, 'idle') AS conversation_state,
        c.taken_over_by_staff AS taken_over_by_staff,
        (SELECT COUNT(*) FROM issues i WHERE i.farmer_id = f.id AND i.status = 'open') AS open_issues
      FROM farmers f
      LEFT JOIN conversations c ON c.farmer_id = f.id
      ORDER BY f.farm_name COLLATE NOCASE`,
    );
    return rows.map((row) => ({
      ...farmerFrom(row),
      conversationState: stateFrom(str(row, "conversation_state")),
      takenOverByStaff: row.taken_over_by_staff == null ? null : str(row, "taken_over_by_staff"),
      openIssues: num(row, "open_issues"),
    }));
  }

  async getFarmer(id: number): Promise<Farmer | null> {
    const row = await this.one("SELECT * FROM farmers WHERE id = ?", [id]);
    return row ? farmerFrom(row) : null;
  }

  async findFarmerByPhone(phone: string): Promise<Farmer | null> {
    const row = await this.one("SELECT * FROM farmers WHERE phone = ?", [phone]);
    return row ? farmerFrom(row) : null;
  }

  async insertFarmer(input: NewFarmer, at: string): Promise<Farmer> {
    try {
      const result = await this.run(
        `INSERT INTO farmers (
          farm_name, contact_name, phone, email, preferred_contact_times, pickup_location,
          pickup_availability, sms_consent, sms_consent_at, sms_consent_source, assigned_staff,
          automation_paused, is_sample, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        farmerBinds(input, at, at),
      );
      const farmer = await this.getFarmer(result);
      if (!farmer) throw new HttpError(500, "farmer was not saved");
      return farmer;
    } catch (err) {
      if (isUnique(err)) throw new HttpError(409, "a farm with that phone already exists");
      throw err;
    }
  }

  async updateFarmer(id: number, input: NewFarmer, at: string): Promise<Farmer> {
    const existing = await this.getFarmer(id);
    if (!existing) throw new HttpError(404, "farmer not found");
    try {
      await this.run(
        `UPDATE farmers SET
          farm_name = ?, contact_name = ?, phone = ?, email = ?, preferred_contact_times = ?,
          pickup_location = ?, pickup_availability = ?, sms_consent = ?, sms_consent_at = ?,
          sms_consent_source = ?, assigned_staff = ?, automation_paused = ?, is_sample = ?,
          notes = ?, updated_at = ?
        WHERE id = ?`,
        [...farmerBinds(input, existing.createdAt, at).slice(0, 14), at, id],
      );
    } catch (err) {
      if (isUnique(err)) throw new HttpError(409, "a farm with that phone already exists");
      throw err;
    }
    const farmer = await this.getFarmer(id);
    if (!farmer) throw new HttpError(404, "farmer not found");
    return farmer;
  }

  async listProducts(farmerId: number): Promise<Product[]> {
    const rows = await this.many("SELECT * FROM products WHERE farmer_id = ? ORDER BY name COLLATE NOCASE", [farmerId]);
    return rows.map(productFrom);
  }

  async getProduct(id: number): Promise<Product | null> {
    const row = await this.one("SELECT * FROM products WHERE id = ?", [id]);
    return row ? productFrom(row) : null;
  }

  async insertProduct(input: NewProduct, at: string): Promise<Product> {
    const id = await this.run(
      `INSERT INTO products (farmer_id, name, unit, default_price_cents, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [input.farmerId, input.name, input.unit, input.defaultPriceCents, at, at],
    );
    const product = await this.getProduct(id);
    if (!product) throw new HttpError(500, "product was not saved");
    return product;
  }

  async updateProduct(id: number, patch: Omit<NewProduct, "farmerId">, at: string): Promise<Product> {
    await this.run(
      `UPDATE products SET name = ?, unit = ?, default_price_cents = ?, updated_at = ? WHERE id = ?`,
      [patch.name, patch.unit, patch.defaultPriceCents, at, id],
    );
    const product = await this.getProduct(id);
    if (!product) throw new HttpError(404, "product not found");
    return product;
  }

  async getConversation(farmerId: number): Promise<Conversation> {
    const row = await this.one("SELECT * FROM conversations WHERE farmer_id = ?", [farmerId]);
    if (!row) {
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
    return conversationFrom(row);
  }

  async saveConversation(conv: Omit<Conversation, "updatedAt">, at: string): Promise<void> {
    await this.run(
      `INSERT INTO conversations (
        farmer_id, state, product_id, market_week_id, pending_quantity, pending_unit,
        pending_price_cents, taken_over_by_staff, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(farmer_id) DO UPDATE SET
        state = excluded.state,
        product_id = excluded.product_id,
        market_week_id = excluded.market_week_id,
        pending_quantity = excluded.pending_quantity,
        pending_unit = excluded.pending_unit,
        pending_price_cents = excluded.pending_price_cents,
        taken_over_by_staff = excluded.taken_over_by_staff,
        updated_at = excluded.updated_at`,
      [
        conv.farmerId,
        conv.state,
        conv.productId,
        conv.marketWeekId,
        conv.pendingQuantity,
        conv.pendingUnit,
        conv.pendingPriceCents,
        conv.takenOverByStaff,
        at,
      ],
    );
  }

  async ensureWeek(weekStart: string, at: string): Promise<MarketWeek> {
    await this.run(
      `INSERT INTO market_weeks (week_start, created_at) VALUES (?, ?) ON CONFLICT(week_start) DO NOTHING`,
      [weekStart, at],
    );
    const row = await this.one("SELECT * FROM market_weeks WHERE week_start = ?", [weekStart]);
    if (!row) throw new HttpError(500, "market week was not saved");
    return { id: num(row, "id"), weekStart: str(row, "week_start"), createdAt: str(row, "created_at") };
  }

  async getInventoryById(id: number): Promise<InventoryRow | null> {
    const row = await this.one(`${INVENTORY_SELECT} WHERE i.id = ?`, [id]);
    return row ? inventoryFrom(row) : null;
  }

  async listInventoryByWeek(weekStart: string): Promise<InventoryRow[]> {
    const rows = await this.many(`${INVENTORY_SELECT} WHERE w.week_start = ? ORDER BY f.farm_name, p.name`, [weekStart]);
    return rows.map(inventoryFrom);
  }

  async listInventoryForFarmerWeek(farmerId: number, weekStart: string): Promise<InventoryRow[]> {
    const rows = await this.many(
      `${INVENTORY_SELECT} WHERE i.farmer_id = ? AND w.week_start = ? ORDER BY p.name`,
      [farmerId, weekStart],
    );
    return rows.map(inventoryFrom);
  }

  async saveInventory(write: InventoryWrite, audit: InventoryAudit): Promise<InventoryRow> {
    const existing = await this.one(
      "SELECT id, created_at FROM inventory WHERE farmer_id = ? AND product_id = ? AND market_week_id = ?",
      [write.farmerId, write.productId, write.marketWeekId],
    );
    const beforeRow = existing ? await this.getInventoryById(num(existing, "id")) : null;
    let id: number;
    if (!existing) {
      id = await this.run(
        `INSERT INTO inventory (
          farmer_id, product_id, market_week_id, quantity, unit, price_cents, status,
          source_message_id, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          write.farmerId,
          write.productId,
          write.marketWeekId,
          write.quantity,
          write.unit,
          write.priceCents,
          write.status,
          write.sourceMessageId,
          write.updatedBy,
          audit.at,
          audit.at,
        ],
      );
    } else {
      id = num(existing, "id");
      await this.run(
        `UPDATE inventory SET quantity = ?, unit = ?, price_cents = ?, status = ?, source_message_id = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
        [write.quantity, write.unit, write.priceCents, write.status, write.sourceMessageId, write.updatedBy, audit.at, id],
      );
    }
    const row = await this.getInventoryById(id);
    if (!row) throw new HttpError(500, "inventory was not saved");
    await this.addAudit({
      farmerId: write.farmerId,
      actor: audit.actor,
      action: audit.action,
      entity: "inventory",
      entityId: row.id,
      before: beforeRow ? inventorySnapshot(beforeRow) : null,
      after: inventorySnapshot(row),
      at: audit.at,
    });
    return row;
  }

  async insertMessage(msg: NewMessage): Promise<{ message: Message; deduped: boolean }> {
    try {
      const id = await this.run(
        `INSERT INTO messages (farmer_id, direction, channel, provider_message_id, body, author, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [msg.farmerId, msg.direction, msg.channel, msg.providerMessageId, msg.body, msg.author, msg.createdAt],
      );
      const row = await this.one("SELECT * FROM messages WHERE id = ?", [id]);
      if (!row) throw new HttpError(500, "message was not saved");
      return { message: messageFrom(row), deduped: false };
    } catch (err) {
      if (msg.providerMessageId && isUnique(err)) {
        const row = await this.one("SELECT * FROM messages WHERE provider_message_id = ?", [msg.providerMessageId]);
        if (!row) throw err;
        return { message: messageFrom(row), deduped: true };
      }
      throw err;
    }
  }

  async listMessages(farmerId: number): Promise<Message[]> {
    const rows = await this.many(
      `SELECT * FROM (
        SELECT * FROM messages WHERE farmer_id = ? ORDER BY id DESC LIMIT 200
      ) ORDER BY id ASC`,
      [farmerId],
    );
    return rows.map(messageFrom);
  }

  async createIssue(input: NewIssue): Promise<Issue> {
    const id = await this.run(
      `INSERT INTO issues (farmer_id, status, kind, summary, message_id, created_at) VALUES (?, 'open', ?, ?, ?, ?)`,
      [input.farmerId, input.kind, input.summary, input.messageId, input.at],
    );
    const issue = await this.getIssue(id);
    if (!issue) throw new HttpError(500, "issue was not saved");
    return issue;
  }

  async getIssue(id: number): Promise<Issue | null> {
    const row = await this.one(
      `SELECT i.*, f.farm_name FROM issues i JOIN farmers f ON f.id = i.farmer_id WHERE i.id = ?`,
      [id],
    );
    return row ? issueFrom(row) : null;
  }

  async listIssues(status: "open" | "resolved" | "all"): Promise<Issue[]> {
    const rows = await this.many(
      `SELECT i.*, f.farm_name FROM issues i JOIN farmers f ON f.id = i.farmer_id
       WHERE i.status = ? OR ? = 'all'
       ORDER BY i.id DESC`,
      [status, status],
    );
    return rows.map(issueFrom);
  }

  async listIssuesForFarmer(farmerId: number): Promise<Issue[]> {
    const rows = await this.many(
      `SELECT i.*, f.farm_name FROM issues i JOIN farmers f ON f.id = i.farmer_id
       WHERE i.farmer_id = ? ORDER BY i.id DESC`,
      [farmerId],
    );
    return rows.map(issueFrom);
  }

  async resolveIssue(id: number, actor: string, at: string): Promise<Issue> {
    const existing = await this.getIssue(id);
    if (!existing) throw new HttpError(404, "issue not found");
    if (existing.status === "resolved") throw new HttpError(409, "issue is already resolved");
    await this.run(`UPDATE issues SET status = 'resolved', resolved_at = ?, resolved_by = ? WHERE id = ?`, [at, actor, id]);
    const issue = await this.getIssue(id);
    if (!issue) throw new HttpError(404, "issue not found");
    return issue;
  }

  async listAudit(farmerId: number): Promise<AuditEntry[]> {
    const rows = await this.many(
      `SELECT * FROM change_log WHERE farmer_id = ? ORDER BY id DESC LIMIT 100`,
      [farmerId],
    );
    return rows.map(auditFrom);
  }

  async addAudit(entry: AuditWrite): Promise<void> {
    await this.run(
      `INSERT INTO change_log (farmer_id, actor, action, entity, entity_id, before_json, after_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.farmerId,
        entry.actor,
        entry.action,
        entry.entity,
        entry.entityId,
        entry.before == null ? null : JSON.stringify(entry.before),
        entry.after == null ? null : JSON.stringify(entry.after),
        entry.at,
      ],
    );
  }

  async overview(weekStart: string): Promise<OverviewCounts> {
    const total = await this.one("SELECT COUNT(*) AS n FROM farmers");
    const awaiting = await this.one(
      `SELECT COUNT(*) AS n FROM conversations c
       JOIN farmers f ON f.id = c.farmer_id
       WHERE c.state IN ('awaiting_availability', 'awaiting_price', 'awaiting_confirm')
         AND f.automation_paused = 0
         AND c.taken_over_by_staff IS NULL
         AND f.sms_consent = 'granted'`,
    );
    const confirmed = await this.one(
      `SELECT COUNT(*) AS n FROM inventory i
       JOIN market_weeks w ON w.id = i.market_week_id
       WHERE w.week_start = ? AND i.status = 'confirmed'`,
      [weekStart],
    );
    const needs = await this.one(
      `SELECT COUNT(*) AS n FROM inventory i
       JOIN market_weeks w ON w.id = i.market_week_id
       WHERE w.week_start = ? AND i.status = 'needs_verification'`,
      [weekStart],
    );
    const issues = await this.one("SELECT COUNT(*) AS n FROM issues WHERE status = 'open'");
    return {
      totalFarmers: total ? num(total, "n") : 0,
      awaitingReply: awaiting ? num(awaiting, "n") : 0,
      confirmedThisWeek: confirmed ? num(confirmed, "n") : 0,
      needsVerification: needs ? num(needs, "n") : 0,
      unresolvedIssues: issues ? num(issues, "n") : 0,
    };
  }

  async deleteSampleFarmers(): Promise<void> {
    const sample = "(SELECT id FROM farmers WHERE is_sample = 1)";
    await this.run(`DELETE FROM change_log WHERE farmer_id IN ${sample}`);
    await this.run(`DELETE FROM issues WHERE farmer_id IN ${sample}`);
    await this.run(`DELETE FROM messages WHERE farmer_id IN ${sample}`);
    await this.run(`DELETE FROM inventory WHERE farmer_id IN ${sample}`);
    await this.run(`DELETE FROM conversations WHERE farmer_id IN ${sample}`);
    await this.run(`DELETE FROM products WHERE farmer_id IN ${sample}`);
    await this.run(`DELETE FROM farmers WHERE is_sample = 1`);
  }

  private async one(sql: string, params: Sql[] = []): Promise<Row | null> {
    const row = await this.bind(sql, params).first<Row>();
    return row ?? null;
  }

  private async many(sql: string, params: Sql[] = []): Promise<Row[]> {
    const result = await this.bind(sql, params).all<Row>();
    return result.results ?? [];
  }

  private async run(sql: string, params: Sql[] = []): Promise<number> {
    const result = await this.bind(sql, params).run();
    return Number(result.meta.last_row_id ?? 0);
  }

  private bind(sql: string, params: Sql[]) {
    const stmt = this.db.prepare(sql);
    return params.length ? stmt.bind(...params) : stmt;
  }
}

const INVENTORY_SELECT = `SELECT i.*, w.week_start, p.name AS product_name, f.farm_name
  FROM inventory i
  JOIN market_weeks w ON w.id = i.market_week_id
  JOIN products p ON p.id = i.product_id
  JOIN farmers f ON f.id = i.farmer_id`;

function farmerBinds(input: NewFarmer, createdAt: string, updatedAt: string): Sql[] {
  return [
    input.farmName,
    input.contactName,
    input.phone,
    input.email,
    input.preferredContactTimes,
    input.pickupLocation,
    input.pickupAvailability,
    input.smsConsent,
    input.smsConsentAt,
    input.smsConsentSource,
    input.assignedStaff,
    input.automationPaused ? 1 : 0,
    input.isSample ? 1 : 0,
    input.notes,
    createdAt,
    updatedAt,
  ];
}

function inventorySnapshot(row: InventoryRow) {
  return {
    quantity: row.quantity,
    unit: row.unit,
    priceCents: row.priceCents,
    status: row.status,
    productId: row.productId,
    marketWeekId: row.marketWeekId,
  };
}

function farmerFrom(row: Row): Farmer {
  const consent = str(row, "sms_consent");
  if (!CONSENTS.has(consent as Consent)) throw new Error(`bad consent ${consent}`);
  return {
    id: num(row, "id"),
    farmName: str(row, "farm_name"),
    contactName: str(row, "contact_name"),
    phone: str(row, "phone"),
    email: str(row, "email"),
    preferredContactTimes: str(row, "preferred_contact_times"),
    pickupLocation: str(row, "pickup_location"),
    pickupAvailability: str(row, "pickup_availability"),
    smsConsent: consent as Consent,
    smsConsentAt: row.sms_consent_at == null ? null : str(row, "sms_consent_at"),
    smsConsentSource: row.sms_consent_source == null ? null : str(row, "sms_consent_source"),
    assignedStaff: str(row, "assigned_staff"),
    automationPaused: bool(row.automation_paused),
    isSample: bool(row.is_sample),
    notes: str(row, "notes"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

function productFrom(row: Row): Product {
  return {
    id: num(row, "id"),
    farmerId: num(row, "farmer_id"),
    name: str(row, "name"),
    unit: str(row, "unit"),
    defaultPriceCents: row.default_price_cents == null ? null : num(row, "default_price_cents"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

function conversationFrom(row: Row): Conversation {
  return {
    farmerId: num(row, "farmer_id"),
    state: stateFrom(str(row, "state")),
    productId: row.product_id == null ? null : num(row, "product_id"),
    marketWeekId: row.market_week_id == null ? null : num(row, "market_week_id"),
    pendingQuantity: row.pending_quantity == null ? null : num(row, "pending_quantity"),
    pendingUnit: row.pending_unit == null ? null : str(row, "pending_unit"),
    pendingPriceCents: row.pending_price_cents == null ? null : num(row, "pending_price_cents"),
    takenOverByStaff: row.taken_over_by_staff == null ? null : str(row, "taken_over_by_staff"),
    updatedAt: str(row, "updated_at"),
  };
}

function inventoryFrom(row: Row): InventoryRow {
  const status = str(row, "status");
  if (!INVENTORY.has(status as InventoryStatus)) throw new Error(`bad status ${status}`);
  return {
    id: num(row, "id"),
    farmerId: num(row, "farmer_id"),
    productId: num(row, "product_id"),
    marketWeekId: num(row, "market_week_id"),
    weekStart: str(row, "week_start"),
    productName: str(row, "product_name"),
    farmName: str(row, "farm_name"),
    quantity: row.quantity == null ? null : num(row, "quantity"),
    unit: row.unit == null ? null : str(row, "unit"),
    priceCents: row.price_cents == null ? null : num(row, "price_cents"),
    status: status as InventoryStatus,
    sourceMessageId: row.source_message_id == null ? null : num(row, "source_message_id"),
    updatedBy: str(row, "updated_by"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

function messageFrom(row: Row): Message {
  const direction = str(row, "direction");
  const channel = str(row, "channel");
  return {
    id: num(row, "id"),
    farmerId: num(row, "farmer_id"),
    direction: direction === "out" ? "out" : "in",
    channel: channel === "sms" ? "sms" : "simulator",
    providerMessageId: row.provider_message_id == null ? null : str(row, "provider_message_id"),
    body: str(row, "body"),
    author: str(row, "author"),
    createdAt: str(row, "created_at"),
  };
}

function issueFrom(row: Row): Issue {
  const kind = str(row, "kind");
  return {
    id: num(row, "id"),
    farmerId: num(row, "farmer_id"),
    farmName: str(row, "farm_name"),
    status: str(row, "status") === "resolved" ? "resolved" : "open",
    kind: kind === "staff" ? "staff" : ("needs_verification" as IssueKind),
    summary: str(row, "summary"),
    messageId: row.message_id == null ? null : num(row, "message_id"),
    createdAt: str(row, "created_at"),
    resolvedAt: row.resolved_at == null ? null : str(row, "resolved_at"),
    resolvedBy: row.resolved_by == null ? null : str(row, "resolved_by"),
  };
}

function auditFrom(row: Row): AuditEntry {
  return {
    id: num(row, "id"),
    farmerId: row.farmer_id == null ? null : num(row, "farmer_id"),
    actor: str(row, "actor"),
    action: str(row, "action"),
    entity: str(row, "entity"),
    entityId: row.entity_id == null ? null : num(row, "entity_id"),
    before: parseJson(row.before_json),
    after: parseJson(row.after_json),
    createdAt: str(row, "created_at"),
  };
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string" || !value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stateFrom(value: string): ConvState {
  if (!STATES.has(value as ConvState)) return "idle";
  return value as ConvState;
}

function str(row: Row, key: string): string {
  return String(row[key] ?? "");
}

function num(row: Row, key: string): number {
  return Number(row[key] ?? 0);
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function isUnique(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /unique constraint failed/i.test(message);
}
