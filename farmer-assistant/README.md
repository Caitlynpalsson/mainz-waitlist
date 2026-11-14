# mainz farmer assistant

Farmers keep their weekly Mainz inventory up to date by text. Staff use one dashboard. Phase 1 is a closed simulator for about five real farms later. Nothing is texted out. There is no marketplace, checkout, or payment code in this folder.

The live waitlist and the `app/` and `api/` marketplace are separate. This worker does not import them.

## Phase 1

- One Cloudflare Worker (`mainz-assistant`) and one D1 database (`mainz-assistant`).
- JSON API under `/api`.
- Staff dashboard as static HTML, CSS, and vanilla JS, served by the same worker.
- Farmers, products, market weeks, inventory, conversations, messages, an audit log, and issues.
- A simulator: staff pick a sample farm and chat as that farmer. A weekly check runs the scripted flow.
- Rule-based parsing only. No Twilio and no paid AI.
- Staff sign-in compares a Bearer token with the `STAFF_TOKEN` secret. The token is typed once and kept in `localStorage`. It is not in the repo.

Timestamps are stored as UTC ISO strings and shown in America/Denver. The active market week is the Monday of the next calendar week in Denver. The bot calls that week "next week".

### Hard rules

- The bot never invents a quantity, a price, or an order. A vague line becomes an issue.
- No reply means no inventory row.
- Inventory becomes `confirmed` only after an explicit YES, or after a staff approval.
- The bot's first line says it is Mainz's automated assistant.
- Paused automation and a staff takeover both keep the bot silent. Inbound text is still stored.
- `STOP` sets sms consent to `revoked` and the bot does not send anything further.
- A repeated `provider_message_id` is ignored. That is the dedupe key the SMS webhook will use.

The phase 1 script:

1. `hi sarah! this is mainz's automated assistant. are your strawberries available for next week's mainz market?`
2. `yeah probably 40 boxes` saves an estimate of 40 boxes, with no price.
3. `$6 each`
4. `please confirm: 40 boxes at $6 each for next week. reply YES to publish or CHANGE to edit.`
5. `YES` saves 40 confirmed boxes at $6, linked to the farm, the product, and the week.

`nothing this week` and `not available` mark the product unavailable. `CHANGE` asks again and does not publish the old estimate. Anything else opens a `needs_verification` issue and tells the farmer someone from Mainz will follow up.

A product's usual price is a staff note. The bot does not copy it.

## Local development

```bash
cd farmer-assistant
npm install
cp .dev.vars.example .dev.vars
```

Put a long random string in `.dev.vars` as `STAFF_TOKEN`. Wrangler reads that file locally and does not upload it.

```bash
npx wrangler d1 migrations apply mainz-assistant --local
npm run dev
```

Open `http://localhost:8787`, enter your name and the same token, then use **simulator**. Sample farms are labeled Sample Orchard, Sample Honey Co, Sample Greens, Sample Dairy, and Sample Grain. Contacts are names like `Sarah (sample)` with `555` phone numbers.

```bash
npm test
npm run typecheck
```

## Deploy

Deployment is a separate step. The `database_id` in `wrangler.toml` is a placeholder.

```bash
cd farmer-assistant
npm install
npx wrangler d1 create mainz-assistant
```

Copy the printed database id into `wrangler.toml`, replacing `00000000-0000-0000-0000-000000000000`.

```bash
npx wrangler d1 migrations apply mainz-assistant --remote
npx wrangler secret put STAFF_TOKEN
npx wrangler deploy
```

`wrangler secret put` prompts for the token. Do not pass it on the command line if it would land in shell history. After deploy, open the worker URL and sign in with that token.

The worker fits the free tier: one Worker, one D1 database, static assets, and no paid third-party APIs.

## Layout

| Path | Role |
| --- | --- |
| `src/parser.ts` | Rule parser. Phase 2 can replace this file. |
| `src/machine.ts` | Pure state machine. YES is the only bot path to `confirmed`. |
| `src/service.ts` | `handleInbound`. Phase 3 calls this after a Twilio signature check. |
| `src/d1.ts` | D1 adapter. |
| `src/schedule.ts` | Disabled weekly-rhythm seam. |
| `src/api.ts` | HTTP routes, including the disabled `/api/sms/inbound` stub. |
| `public/` | Staff dashboard. |
| `migrations/` | D1 schema and sample seed. |

## Email

Every thank-you, application status note, and magic link is inserted into `email_outbox` and shown on the outbox page. Staff can copy a magic link from that preview.

Sending is off. `disabledEmailSender` throws if called, and `dispatchEmail` leaves every note `queued`. A real provider would implement `EmailSender` in `src/email.ts`, keep its credential in a worker secret, and still require an explicit enable flag before `dispatchEmail` could do anything. This worker does not include that provider, a domain, or a secret. Do not turn delivery on until that exists. No email leaves the dashboard.

## Phase plan

### Phase 2 — richer replies, still no live SMS

- Natural-language parsing for lines like "same as last week" and "20 jars".
- A 1 / 2 / 3 menu: same as last week, change quantities, not available.
- One reminder, then escalate to staff for a phone call.
- Weekly rhythm: Monday check, Tuesday one follow-up, Wednesday escalate, Thursday close with one summary per farm, Friday pickup confirmation.
- Enable the cron in `wrangler.toml` and implement `runScheduled`. It is disabled now.

### Phase 3 — live SMS, only after the compliance work

- Twilio adapter in front of `handleInbound(farmerId, body, providerMessageId, channel)`.
- Turn on `POST /api/sms/inbound` only after consent records, STOP opt-out, A2P 10DLC registration, and rate limits are in place.
- The route is a 501 stub today and stores nothing.

### Phase 4 — summaries

- Simulated consolidated order summaries and reporting.
- Still no checkout and no payments in this system.

## What is real, and what is a placeholder

Real in this phase: the schema, the five sample farms, the rule-based flow, dedupe, STOP, pause, takeover, the audit log, issues, staff approval, and the dashboard.

Placeholders: `database_id` in `wrangler.toml`, the `STAFF_TOKEN` secret (set at deploy, not committed), the SMS webhook, the cron, natural-language parsing, and order summaries.
