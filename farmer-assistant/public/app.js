const TOKEN_KEY = "mainz.staffToken";
const NAME_KEY = "mainz.staffName";

const app = document.querySelector("#app");
const view = { name: "signin", error: "", notice: "" };
const sim = { farmerId: "", productId: "" };
let issueStatus = "open";
let week = "";

document.addEventListener("click", onClick);
document.addEventListener("submit", onSubmit);
document.addEventListener("change", onChange);
window.addEventListener("hashchange", route);
start();

function start() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    view.name = "signin";
    render();
    return;
  }
  if (!location.hash) location.hash = "#/overview";
  route();
}

function route() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    view.name = "signin";
    render();
    return;
  }
  const parts = (location.hash || "#/overview").replace(/^#\//, "").split("/");
  const page = parts[0] || "overview";
  if (page === "farmers" && parts[1]) return loadFarmer(Number(parts[1]));
  if (page === "farmers") return loadFarmers();
  if (page === "inventory") return loadInventory();
  if (page === "issues") return loadIssues();
  if (page === "simulator") return loadSimulator();
  return loadOverview();
}

async function api(path, opts = {}) {
  const headers = {
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`,
    "X-Staff-Name": localStorage.getItem(NAME_KEY) || "staff",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    view.name = "signin";
    view.error = "that token was not accepted";
    view.notice = "";
    render();
    const error = new Error("unauthorized");
    error.status = 401;
    throw error;
  }
  if (!res.ok) {
    const error = new Error(data.error || "request failed");
    error.status = res.status;
    throw error;
  }
  return data;
}

async function loadOverview() {
  try {
    const data = await api("/api/overview");
    if (!signedIn()) return;
    setView("overview", data);
  } catch (err) {
    fail(err, "overview");
  }
}

async function loadFarmers() {
  try {
    const data = await api("/api/farmers");
    if (!signedIn()) return;
    setView("farmers", data);
  } catch (err) {
    fail(err, "farmers");
  }
}

async function loadFarmer(id) {
  try {
    const data = await api(`/api/farmers/${id}`);
    if (!signedIn()) return;
    setView("farmer", data);
  } catch (err) {
    fail(err, "farmer");
  }
}

async function loadInventory() {
  try {
    const data = await api(week ? `/api/inventory?week=${encodeURIComponent(week)}` : "/api/inventory");
    if (!signedIn()) return;
    week = data.weekStart;
    setView("inventory", data);
  } catch (err) {
    fail(err, "inventory");
  }
}

async function loadIssues() {
  try {
    const data = await api(`/api/issues?status=${encodeURIComponent(issueStatus)}`);
    const farmers = await api("/api/farmers");
    if (!signedIn()) return;
    setView("issues", { issues: data, farmers });
  } catch (err) {
    fail(err, "issues");
  }
}

async function loadSimulator() {
  try {
    const farmers = await api("/api/farmers");
    if (!signedIn()) return;
    const samples = farmers.filter((farmer) => farmer.isSample);
    if (!sim.farmerId && samples[0]) sim.farmerId = String(samples[0].id);
    let detail = null;
    if (sim.farmerId) detail = await api(`/api/farmers/${sim.farmerId}`);
    if (detail && !detail.products.some((product) => String(product.id) === sim.productId)) {
      sim.productId = detail.products[0] ? String(detail.products[0].id) : "";
    }
    setView("simulator", { samples, detail });
  } catch (err) {
    fail(err, "simulator");
  }
}

function setView(name, data) {
  view.name = name;
  view.data = data;
  view.error = "";
  render();
}

function fail(err, name) {
  if (err.status === 401) return;
  view.name = name;
  view.data = null;
  view.error = err.message;
  render();
}

function signedIn() {
  return !!localStorage.getItem(TOKEN_KEY);
}

function render() {
  if (view.name === "signin" || !signedIn()) {
    app.innerHTML = signInHtml();
    return;
  }
  const pages = [
    ["overview", "overview"],
    ["farmers", "farmers"],
    ["inventory", "inventory"],
    ["issues", "issues"],
    ["simulator", "simulator"],
  ];
  const current = view.name === "farmer" ? "farmers" : view.name;
  app.innerHTML = `
    <header class="top">
      <div>
        <a class="mark" href="#/overview">mainz</a>
        <p class="eyebrow">farmer assistant</p>
      </div>
      <button type="button" class="text" data-action="sign-out">sign out</button>
    </header>
    <nav>${pages.map(([id, label]) => `<a href="#/${id}" class="${current === id ? "on" : ""}">${label}</a>`).join("")}</nav>
    ${view.error ? `<p class="banner bad" role="alert">${esc(view.error)}</p>` : ""}
    ${view.notice ? `<p class="banner ok">${esc(view.notice)}</p>` : ""}
    <main>${bodyHtml()}</main>
    <p class="foot">times are mountain time. nothing in this phase is sent by text.</p>
  `;
  view.notice = "";
  const thread = document.querySelector(".thread");
  if (thread) thread.scrollTop = thread.scrollHeight;
}

function bodyHtml() {
  if (!view.data && view.error) return `<p class="lede">could not load this page.</p>`;
  if (view.name === "overview") return overviewHtml(view.data);
  if (view.name === "farmers") return farmersHtml(view.data);
  if (view.name === "farmer") return farmerHtml(view.data);
  if (view.name === "inventory") return inventoryHtml(view.data);
  if (view.name === "issues") return issuesHtml(view.data);
  if (view.name === "simulator") return simulatorHtml(view.data);
  return "";
}

function overviewHtml(data) {
  const cards = [
    ["total farmers", data.totalFarmers, "#/farmers", false],
    ["awaiting reply", data.awaitingReply, "#/farmers", false],
    ["confirmed this week", data.confirmedThisWeek, "#/inventory", false],
    ["needs verification", data.needsVerification, "#/inventory", data.needsVerification > 0],
    ["open issues", data.unresolvedIssues, "#/issues", data.unresolvedIssues > 0],
  ];
  return `
    <h1>this week</h1>
    <p class="lede">market week of ${esc(data.weekLabel)}. a farmer with no reply has no inventory.</p>
    <div class="counts">
      ${cards
        .map(
          ([label, value, href, alert]) =>
            `<a class="count${alert ? " alert" : ""}" href="${href}"><b>${esc(value)}</b><span>${label}</span></a>`,
        )
        .join("")}
    </div>
  `;
}

function farmersHtml(farmers) {
  return `
    <h1>farmers</h1>
    <p class="lede">sample farms stay inside the simulator. add a real farm here when you are ready to keep a record.</p>
    <div class="list" style="margin-top:28px">
      ${(farmers || [])
        .map(
          (farmer) => `<a class="row" href="#/farmers/${farmer.id}">
            <strong>${esc(farmer.farmName)}</strong>
            <div class="meta">${esc(farmer.contactName)} · ${esc(farmer.phone)} · ${esc(stateLabel(farmer))}${farmer.isSample ? " · sample" : ""}</div>
          </a>`,
        )
        .join("") || `<p class="meta">no farms yet.</p>`}
    </div>
    <section class="block">
      <h2>add a farm</h2>
      <form data-form="create-farmer">
        ${farmerFields({})}
        <div class="actions"><button type="submit">save farm</button></div>
      </form>
    </section>
  `;
}

function farmerHtml(data) {
  const farmer = data.farmer;
  const taken = data.conversation.state === "taken_over" || data.conversation.takenOverByStaff;
  return `
    <h1>${esc(farmer.farmName)}</h1>
    <p class="lede">${esc(farmer.contactName)}. ${esc(stateLabel({ ...data.conversation, automationPaused: farmer.automationPaused }))}. consent ${esc(farmer.smsConsent)}.</p>
    <div class="actions">
      <button type="button" class="quiet" data-action="pause" data-id="${farmer.id}" data-paused="${farmer.automationPaused ? "0" : "1"}">${farmer.automationPaused ? "resume automation" : "pause automation"}</button>
      <button type="button" class="quiet" data-action="takeover" data-id="${farmer.id}" data-active="${taken ? "0" : "1"}">${taken ? "release conversation" : "take over conversation"}</button>
    </div>
    ${
      taken
        ? `<form class="block" data-form="reply" data-id="${farmer.id}">
            <h2>reply as staff</h2>
            <p class="hint">the bot stays silent while you have the conversation.</p>
            <label for="reply">message</label>
            <textarea id="reply" name="body" required></textarea>
            <div class="actions"><button type="submit">send inside mainz</button></div>
          </form>`
        : ""
    }
    <section class="block">
      <h2>profile</h2>
      <form data-form="save-farmer" data-id="${farmer.id}">
        ${farmerFields(farmer)}
        <div class="actions"><button type="submit">save profile</button></div>
      </form>
    </section>
    <section class="block">
      <h2>products</h2>
      <p class="hint">a usual price is a note for staff. the bot never copies it.</p>
      <div class="stack" style="margin-top:14px">
        ${data.products
          .map(
            (product) => `<form class="card" data-form="save-product" data-id="${product.id}">
              <div class="fields">
                <div><label>name</label><input name="name" value="${esc(product.name)}" required></div>
                <div><label>unit</label><input name="unit" value="${esc(product.unit)}" required></div>
                <div><label>usual price</label><input name="price" inputmode="decimal" value="${esc(dollars(product.defaultPriceCents))}" placeholder="6.00"></div>
              </div>
              <div class="actions"><button type="submit">save product</button></div>
            </form>`,
          )
          .join("")}
      </div>
      <form data-form="add-product" data-id="${farmer.id}">
        <div class="fields">
          <div><label>new product</label><input name="name" required></div>
          <div><label>unit</label><input name="unit" required placeholder="box"></div>
          <div><label>usual price</label><input name="price" inputmode="decimal" placeholder="6.00"></div>
        </div>
        <div class="actions"><button type="submit" class="quiet">add product</button></div>
      </form>
    </section>
    <section class="block">
      <h2>inventory · week of ${esc(data.weekLabel)}</h2>
      ${inventoryCards(data.inventory)}
    </section>
    <section class="block">
      <h2>messages</h2>
      ${threadHtml(data.messages)}
    </section>
    <section class="block">
      <h2>issues</h2>
      ${issueList(data.issues)}
    </section>
    <section class="block">
      <h2>audit</h2>
      <div class="stack">
        ${(data.audit || [])
          .map(
            (entry) => `<div class="card">
              <strong>${esc(entry.action.replaceAll("_", " "))}</strong>
              <div class="meta">${esc(denver(entry.createdAt))} · ${esc(entry.actor)}</div>
            </div>`,
          )
          .join("") || `<p class="meta">no edits yet.</p>`}
      </div>
    </section>
  `;
}

function inventoryHtml(data) {
  return `
    <h1>inventory</h1>
    <p class="lede">week of ${esc(data.weekLabel)}. confirmed rows got an explicit yes, or a staff approval.</p>
    <label for="week">week start</label>
    <input id="week" type="date" value="${esc(data.weekStart)}">
    <div class="stack" style="margin-top:22px">${inventoryCards(data.rows)}</div>
  `;
}

function inventoryCards(rows) {
  if (!rows || !rows.length) return `<p class="meta">no inventory for this week. silence is not a quantity.</p>`;
  return rows
    .map((row) => {
      const canApprove =
        (row.status === "estimate" || row.status === "needs_verification") && row.quantity != null && row.priceCents != null && row.unit;
      return `<form class="card" data-form="save-inventory" data-id="${row.id}">
        <div class="rowline">
          <strong>${esc(row.farmName)} · ${esc(row.productName)}</strong>
          <span class="tag ${esc(row.status)}">${esc(row.status.replaceAll("_", " "))}</span>
        </div>
        <div class="meta">${row.quantity == null ? "no quantity" : esc(String(row.quantity)) + " " + esc(row.unit || "")} · ${row.priceCents == null ? "no price" : esc(money(row.priceCents))} · ${esc(denver(row.updatedAt))} · ${esc(row.updatedBy)}</div>
        <div class="fields">
          <div><label>quantity</label><input name="quantity" inputmode="decimal" value="${row.quantity == null ? "" : esc(String(row.quantity))}"></div>
          <div><label>unit</label><input name="unit" value="${esc(row.unit || "")}"></div>
          <div><label>price</label><input name="price" inputmode="decimal" value="${esc(dollars(row.priceCents))}" placeholder="6.00"></div>
          <div><label>status</label><select name="status">${["estimate", "needs_verification", "confirmed", "unavailable"]
            .map((status) => `<option value="${status}"${status === row.status ? " selected" : ""}>${status.replaceAll("_", " ")}</option>`)
            .join("")}</select></div>
        </div>
        <div class="actions">
          <button type="submit" class="quiet">save edit</button>
          ${canApprove ? `<button type="button" data-action="approve" data-id="${row.id}">approve as confirmed</button>` : ""}
        </div>
        ${row.priceCents == null && row.status !== "unavailable" ? `<p class="hint">a price has to be stated before this can be confirmed.</p>` : ""}
      </form>`;
    })
    .join("");
}

function issuesHtml(data) {
  return `
    <h1>issues</h1>
    <label for="issue-filter">show</label>
    <select id="issue-filter">
      ${["open", "resolved", "all"].map((status) => `<option value="${status}"${issueStatus === status ? " selected" : ""}>${status}</option>`).join("")}
    </select>
    <div class="stack" style="margin-top:22px">${issueList(data.issues)}</div>
    <form class="block" data-form="create-issue">
      <h2>open an issue</h2>
      <label for="issue-farmer">farm</label>
      <select id="issue-farmer" name="farmerId" required>
        ${(data.farmers || []).map((farmer) => `<option value="${farmer.id}">${esc(farmer.farmName)}</option>`).join("")}
      </select>
      <label for="issue-summary">summary</label>
      <textarea id="issue-summary" name="summary" required></textarea>
      <div class="actions"><button type="submit">create issue</button></div>
    </form>
  `;
}

function issueList(issues) {
  if (!issues || !issues.length) return `<p class="meta">none.</p>`;
  return issues
    .map(
      (issue) => `<div class="card">
        <div class="rowline">
          <strong>${esc(issue.farmName || "farm")}</strong>
          <span class="tag ${esc(issue.status)}">${esc(issue.status)}</span>
        </div>
        <p style="margin-top:8px">${esc(issue.summary)}</p>
        <div class="meta">${esc(issue.kind.replaceAll("_", " "))} · ${esc(denver(issue.createdAt))}</div>
        ${issue.status === "open" ? `<div class="actions"><button type="button" class="quiet" data-action="resolve" data-id="${issue.id}">resolve</button></div>` : `<div class="meta">resolved ${esc(denver(issue.resolvedAt))} · ${esc(issue.resolvedBy || "")}</div>`}
      </div>`,
    )
    .join("");
}

function simulatorHtml(data) {
  const detail = data.detail;
  const samples = data.samples || [];
  return `
    <h1>simulator</h1>
    <p class="lede">chat as a sample farmer. messages stay in mainz. the same pipeline will take a text message later.</p>
    <label for="sim-farmer">sample farm</label>
    <select id="sim-farmer">
      ${samples
        .map((farmer) => `<option value="${farmer.id}"${String(farmer.id) === String(sim.farmerId) ? " selected" : ""}>${esc(farmer.farmName)} · ${esc(farmer.contactName)}</option>`)
        .join("")}
    </select>
    <label for="sim-product">product for the weekly check</label>
    <select id="sim-product">
      ${(detail?.products || [])
        .map((product) => `<option value="${product.id}"${String(product.id) === String(sim.productId) ? " selected" : ""}>${esc(product.name)}</option>`)
        .join("")}
    </select>
    <div class="actions">
      <button type="button" data-action="start-check">start weekly check</button>
      <button type="button" class="quiet" data-action="reset-samples">reset sample data</button>
    </div>
    ${
      detail
        ? `<p class="hint" style="margin-top:14px">${esc(stateLabel(detail.conversation))}${detail.farmer.automationPaused ? " · automation paused" : ""}${detail.conversation.takenOverByStaff ? ` · ${esc(detail.conversation.takenOverByStaff)} has the conversation` : ""}</p>`
        : ""
    }
    <section class="block">
      ${detail ? threadHtml(detail.messages) : ""}
      <form data-form="sim-send" style="margin-top:16px">
        <label for="sim-body">message as the farmer</label>
        <textarea id="sim-body" name="body" required placeholder="yeah probably 40 boxes"></textarea>
        <div class="actions"><button type="submit">send</button></div>
      </form>
    </section>
  `;
}

function threadHtml(messages) {
  if (!messages || !messages.length) return `<p class="meta">no messages yet.</p>`;
  return `<div class="thread">${messages
    .map((message) => {
      const kind = message.author === "bot" ? "bot" : message.direction === "in" ? "farmer" : "staff";
      const who = kind === "farmer" ? "farmer" : message.author;
      return `<div class="bubble ${kind}"><div class="who">${esc(who)} · ${esc(denver(message.createdAt))}</div>${esc(message.body)}</div>`;
    })
    .join("")}</div>`;
}

function signInHtml() {
  return `
    <form class="signin" data-form="sign-in">
      <a class="mark" href="#/overview">mainz</a>
      <p class="eyebrow">farmer assistant</p>
      <h1 style="margin-top:28px">staff sign in</h1>
      <p class="lede">the token is the worker secret. it stays in this browser.</p>
      ${view.error ? `<p class="banner bad" role="alert">${esc(view.error)}</p>` : ""}
      <label for="staff-name">your name</label>
      <input id="staff-name" name="name" autocomplete="name" value="${esc(localStorage.getItem(NAME_KEY) || "")}" required>
      <label for="staff-token">staff token</label>
      <input id="staff-token" name="token" type="password" autocomplete="current-password" required>
      <div class="actions"><button type="submit">continue</button></div>
    </form>
  `;
}

function farmerFields(farmer) {
  const consent = farmer.smsConsent || "none";
  return `<div class="fields">
    <div><label>farm name</label><input name="farmName" value="${esc(farmer.farmName || "")}" required></div>
    <div><label>contact name</label><input name="contactName" value="${esc(farmer.contactName || "")}" required></div>
    <div><label>phone</label><input name="phone" value="${esc(farmer.phone || "")}" required></div>
    <div><label>email</label><input name="email" type="email" value="${esc(farmer.email || "")}"></div>
    <div><label>preferred contact times</label><input name="preferredContactTimes" value="${esc(farmer.preferredContactTimes || "")}"></div>
    <div><label>assigned staff</label><input name="assignedStaff" value="${esc(farmer.assignedStaff || "")}"></div>
    <div><label>pickup location</label><input name="pickupLocation" value="${esc(farmer.pickupLocation || "")}"></div>
    <div><label>pickup availability</label><input name="pickupAvailability" value="${esc(farmer.pickupAvailability || "")}"></div>
    <div><label>sms consent</label><select name="smsConsent">${["none", "pending", "granted", "revoked"]
      .map((item) => `<option value="${item}"${item === consent ? " selected" : ""}>${item}</option>`)
      .join("")}</select></div>
    <div class="span2"><label>notes</label><textarea name="notes">${esc(farmer.notes || "")}</textarea></div>
  </div>`;
}

async function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    if (form.dataset.form === "sign-in") return signIn(data);
    if (form.dataset.form === "create-farmer") {
      await api("/api/farmers", { method: "POST", body: farmerBody(data) });
      noteSaved();
      return loadFarmers();
    }
    if (form.dataset.form === "save-farmer") {
      await api(`/api/farmers/${form.dataset.id}`, { method: "PATCH", body: farmerBody(data) });
      noteSaved();
      return loadFarmer(Number(form.dataset.id));
    }
    if (form.dataset.form === "add-product" || form.dataset.form === "save-product") {
      const body = { name: data.name, unit: data.unit, defaultPriceCents: cents(data.price) };
      if (form.dataset.form === "add-product") await api(`/api/farmers/${form.dataset.id}/products`, { method: "POST", body });
      else await api(`/api/products/${form.dataset.id}`, { method: "PATCH", body });
      noteSaved();
      return reload();
    }
    if (form.dataset.form === "save-inventory") {
      await api(`/api/inventory/${form.dataset.id}`, {
        method: "PATCH",
        body: {
          quantity: data.quantity === "" ? null : Number(data.quantity),
          unit: data.unit,
          priceCents: cents(data.price),
          status: data.status,
        },
      });
      noteSaved();
      return reload();
    }
    if (form.dataset.form === "create-issue") {
      await api("/api/issues", { method: "POST", body: { farmerId: Number(data.farmerId), summary: data.summary } });
      noteSaved();
      return loadIssues();
    }
    if (form.dataset.form === "reply") {
      await api(`/api/farmers/${form.dataset.id}/reply`, { method: "POST", body: { body: data.body } });
      return loadFarmer(Number(form.dataset.id));
    }
    if (form.dataset.form === "sim-send") {
      await api("/api/simulator/inbound", {
        method: "POST",
        body: { farmerId: Number(sim.farmerId), body: data.body, providerMessageId: simId() },
      });
      return loadSimulator();
    }
  } catch (err) {
    if (err.status === 401) return;
    view.error = err.message;
    render();
  }
}

async function onClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  try {
    if (action === "sign-out") {
      localStorage.removeItem(TOKEN_KEY);
      view.error = "";
      location.hash = "#/overview";
      start();
      return;
    }
    if (action === "pause") {
      await api(`/api/farmers/${target.dataset.id}/pause`, { method: "POST", body: { paused: target.dataset.paused === "1" } });
      noteSaved();
      return reload();
    }
    if (action === "takeover") {
      await api(`/api/farmers/${target.dataset.id}/takeover`, { method: "POST", body: { active: target.dataset.active === "1" } });
      noteSaved();
      return reload();
    }
    if (action === "approve") {
      await api(`/api/inventory/${target.dataset.id}/approve`, { method: "POST", body: {} });
      noteSaved();
      return reload();
    }
    if (action === "resolve") {
      await api(`/api/issues/${target.dataset.id}/resolve`, { method: "POST", body: {} });
      noteSaved();
      return reload();
    }
    if (action === "start-check") {
      await api("/api/simulator/start", { method: "POST", body: { farmerId: Number(sim.farmerId), productId: Number(sim.productId) } });
      return loadSimulator();
    }
    if (action === "reset-samples") {
      if (!window.confirm("reset sample farms? this clears their messages, inventory, and issues.")) return;
      await api("/api/simulator/reset", { method: "POST", body: {} });
      sim.farmerId = "";
      sim.productId = "";
      view.notice = "sample data reset";
      return loadSimulator();
    }
  } catch (err) {
    if (err.status === 401) return;
    view.error = err.message;
    render();
  }
}

function onChange(event) {
  const el = event.target;
  if (el.id === "sim-farmer") {
    sim.farmerId = el.value;
    sim.productId = "";
    loadSimulator();
  } else if (el.id === "sim-product") {
    sim.productId = el.value;
  } else if (el.id === "issue-filter") {
    issueStatus = el.value;
    loadIssues();
  } else if (el.id === "week") {
    week = el.value;
    loadInventory();
  }
}

async function signIn(data) {
  const token = String(data.token || "");
  const name = String(data.name || "staff");
  const res = await fetch("/api/session", { headers: { Authorization: `Bearer ${token}`, "X-Staff-Name": name } });
  if (!res.ok) {
    view.error = "that token was not accepted";
    render();
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, name);
  view.error = "";
  location.hash = "#/overview";
  route();
}

function reload() {
  if (view.name === "farmer" && view.data?.farmer) return loadFarmer(view.data.farmer.id);
  if (view.name === "inventory") return loadInventory();
  if (view.name === "issues") return loadIssues();
  if (view.name === "simulator") return loadSimulator();
  if (view.name === "farmers") return loadFarmers();
  return loadOverview();
}

function noteSaved() {
  view.notice = "saved";
}

function farmerBody(data) {
  return {
    farmName: data.farmName,
    contactName: data.contactName,
    phone: data.phone,
    email: data.email,
    preferredContactTimes: data.preferredContactTimes,
    pickupLocation: data.pickupLocation,
    pickupAvailability: data.pickupAvailability,
    smsConsent: data.smsConsent,
    assignedStaff: data.assignedStaff,
    notes: data.notes,
  };
}

function cents(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error("price needs to be a dollar amount");
  return Math.round(n * 100);
}

function stateLabel(record) {
  const state = record.conversationState || record.state || "idle";
  if (record.automationPaused) return "automation paused";
  if (record.takenOverByStaff) return `taken over by ${record.takenOverByStaff}`;
  return String(state).replaceAll("_", " ");
}

function money(centsValue) {
  const abs = Math.abs(centsValue);
  const dollarsPart = Math.floor(abs / 100);
  const rem = abs % 100;
  return rem === 0 ? `$${dollarsPart}` : `$${dollarsPart}.${String(rem).padStart(2, "0")}`;
}

function dollars(centsValue) {
  if (centsValue == null) return "";
  return (centsValue / 100).toFixed(2);
}

function denver(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .toLowerCase();
}

function simId() {
  return `sim-${sim.farmerId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
