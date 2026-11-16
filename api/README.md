# Mainz API

A Cloudflare Worker and a D1 database. The shop in `../app` talks to this.

No Stripe yet. Placing an order saves it and marks it unpaid. The amounts are ready for Stripe Connect later: each farm is its own sub-order, the farm keeps the food price (`farm_transfer_cents`), and Mainz keeps the transaction fee and the delivery fee.

## What you need

- Node.js 22
- A free Cloudflare account, only when you publish. Local run does not need one.

## Run it on your computer

1. Open a terminal in this `api` folder.
2. Install the pieces:

```bash
npm install
```

3. Make a local admin password file. This file is not committed.

```bash
cp .dev.vars.example .dev.vars
```

The name of the secret is `ADMIN_TOKEN`. The example uses `local-dev-token`. Use any private string you like for local testing.

4. Create the local database and load the sample farms:

```bash
npx wrangler d1 migrations apply mainz --local
```

5. Start the API:

```bash
npx wrangler dev --port 8787 --local
```

6. Check it: open http://127.0.0.1:8787/api/health. You should see `{"ok":true}`.

The shop reads `EXPO_PUBLIC_API_URL`. For local work that value is `http://127.0.0.1:8787`.

## Where the shopper is

Browse accepts `lat` and `lng`. Distances are miles as the crow flies, and farms are sorted nearest first. The count in the header is farms within 40 miles (`NEAR_MILES` in `src/geo.ts`). Towns and ZIPs come from the Census 2023 Gazetteer, which is public domain. See `data/README.md`. The phone asks for location only after a tap. A denied or failed lookup tells the shopper to type a zip or city.

## Admin review

The desk is `/admin` in the shop. The same `ADMIN_TOKEN` opens it.

`0004_review.sql` adds the pipeline, the scorecard, the Utah document list, and the activity log. It does not delete farms. An application you already submitted stays, and lands in the "new" stage. Approved sample farms are marked as already decided.

Apply it on the database you already have:

```bash
npx wrangler d1 migrations apply mainz --local
npx wrangler d1 migrations apply mainz --remote
```

The stages, the five standards, the document list, the goal times, and the message templates are in `src/review.ts`. Change them there.

`0005_approval_process.sql` renames the stage keys to the written checklist and adds due-date fields, pause, remove, and the UDAF flag. It does not delete farms. Apply it the same way:

```bash
npx wrangler d1 migrations apply mainz --remote
```

`0006_listing_approval.sql` adds private draft listings. A farm approves how the page looks. That does not publish the farm. The sample link is `/listing/lk_4c8e91ab7d2f60e3a15b84c0` after you apply the migration. It is also listed in the admin desk. Staff with the admin token can open `/listing/<token>/shopper` to see that draft the way a shopper would. It stays off the shop.

`0007_listing_import.sql` adds farmer names and a source link on draft products. Staff paste a csv on the admin desk, preview it, then create drafts. A sample file is `samples/farm-drafts-sample.csv`. The farm only fills a page in when that draft has no products yet.

`0009_price_status_udaf_foods.sql` adds an optional price status and a UDAF check on each draft product. A blank price status is public. Staff still see the status. The UDAF tag is staff-only. A product created with that check stays hidden until staff turn it on. The same migration adds honey, sourdough bread, jam, and the extra meat cuts, and skips any that already exist.

`0010_listing_deny.sql` lets a farm remove its private page. The link then shows only a short goodbye. Staff see the denial and can restore it by editing and resending, which makes a new link. The old link stays removed, and the draft is never published.

`0011_delivery_routes.sql` adds delivery routes. A run is one route on one date. It confirms at the cutoff only when it has the minimum orders (3 unless you edit it). Otherwise each order gets a note in the outbox and on the order page. Nothing is emailed or texted. The delivery fee stays $5 and is not charged. A cron in `wrangler.toml` closes due runs every 15 minutes. Staff can also press "close run now". Two sample routes are included: sample provo (tuesday, order by monday 6pm) and sample spanish fork (thursday, order by wednesday 6pm).

`0013_listing_price_fixes.sql` stores a price a farm types on its draft page. Staff see it on the admin desk. It does not publish the listing.

`0014_listing_staff_approve.sql` lets staff record a final look after the farm confirms. The draft stays off the shop.

`0015_eggs_placeholder.sql` points eggs at the placeholder. The old picture stays in the repo, but the shop no longer uses it.

`0016_eggs_in_season.sql` marks the sample egg products as in season so the eggs filter can show them.

`0017_farm_profile_photo.sql` adds an optional profile photo on farms and listing drafts. Only the 87 Farms draft is filled in.

`0019_farm_pickup_options.sql` stores each farm's own pickup options. The 87 Farms draft is filled from `samples/87-farms-fulfillment.json`. See `fulfillment.md`.

`0020_pickup_option_zips.sql` adds a ZIP to each 87 Farms stop so checkout can pick the nearest one.

`0021_pickup_line.sql` lets a farm replace the one pickup line on its page. Empty keeps the generated line.

`0022_listing_onboarding.sql` stores how a farm wants to be reached, paid, and when pickup looks right. No card is charged and no text is sent. A stored phone is never sent back to the page. The payout step stores only `bank transfer` or `check` for a new answer. `set this up later` is no longer saved. It never collects bank, routing, or address fields.

`0023_meet_line.sql` adds an optional meet-the-farm sentence. When a draft already has a full story, that story is copied in. It does not invent new facts.

`0024_meet_line_warm.sql` replaces thin meet lines with a sentence taken from that farm's own website. Farms without a readable site are left alone.

`0025_pickup_and_stock_photos.sql` fills Gilgen and Lavender Hive pickup from their own sites, and points a few placeholder products at stock photos.

`0026_meet_and_pickup_lines.sql` sets 87 Farms' pickup line from stops we already stored, and plain meet lines for McArthur and Papa Bear's. Those two sites belong to other farms, so the lines do not borrow their history.

`0027_payout_connected.sql` adds a mock flag for the payout stand-in. No bank account is stored. A real Stripe account link would replace `api/src/payout.ts` only.

`0029_listing_deny_note.sql` stores the optional note when a farm takes their page down and picks other. The one-tap reason stays in `deny_reason`.

## Sample data

Four approved farms and one pending application are loaded. They are made up. Distances are sample miles from Spanish Fork, not a live map.

Demo dashboard tokens, also made up and public in the seed. Change them before a public site:

- Willow Creek Farm: `demo-willow-creek`
- East Bench Orchard: `demo-east-bench`
- Red Butte Eggs: `demo-red-butte`
- Bee Loud Honey Co.: `demo-bee-loud`

Open `/dashboard?token=demo-willow-creek` in the shop to try the farm side.

Wasatch Dairy is pending on purpose. It does not show in browse until an admin approves it.

## Fees

- Transaction fee: 5% of each farm's food subtotal, rounded to the nearest cent, then added up. The setting is `PLATFORM_FEE_BPS` (`500` means 5%).
- Delivery fee: $5.00 for each farm sub-order the shopper marks as delivery. Pickup is free. The setting is `DELIVERY_FEE_CENTS` (`500`).

Both numbers are placeholders until Stripe.

Stock is checked (you cannot ask for more than the number listed) but it is not reduced, because no payment is taken yet.

## Admin

The admin page sends `Authorization: Bearer <token>`. The Worker compares it to the secret named `ADMIN_TOKEN`. If that secret is missing, admin routes stay closed.

Approve turns a farm on and creates a dashboard token. Reject keeps it off the shop. Approved farms can be switched off without deleting them. Only approved farms that are switched on appear in browse.

## Farmer photos

A farmer picks a food from the Mainz catalog. The catalog photo fills in. They can replace a shot (hero, hands, farm, or packaging). A photo is kept only if it passes these checks. Otherwise the stock photo stays.

1. The short side must be at least 800 pixels.
2. The file must be at least 50 KB.
3. The file must be at least 0.04 bytes per pixel. Below that, it is treated as over-compressed or soft.
4. On the website only, a blur check: variance of a Laplacian on a 64 pixel preview must be at least 60. The iOS and Android builds skip this one check and still enforce 1–3, because they do not decode pixels in the shared screen.

The server repeats 1–3 and also reads the saved JPEG so the stored file is really at least 800 pixels on the short side. Accepted photos in this slice are stored inside D1 as a JPEG data URL, capped around 350 KB. A later slice should move them to R2. Someone who forges the request could lie about the original file size. The stored JPEG size check still holds. The blur number is computed in the browser, not on the Worker.

Foods that still need a real licensed photo are listed in `PHOTO-GAPS.md`. Do not download random images to fill those.

## Tests

```bash
npm test
```

That checks cart grouping, the $39.65 sample (one farm on delivery, one on pickup), and the photo rules.

With the API running:

```bash
ADMIN_TOKEN=local-dev-token API_URL=http://127.0.0.1:8787 npm run smoke
```

That applies as a farm, checks it stays hidden, approves it, switches it off and on, and saves a two-farm test order.

## Publish the Worker and the database

Log in once with `npx wrangler login`.

```bash
cd api
npx wrangler d1 create mainz
```

Copy the `database_id` it prints into `wrangler.toml`, replacing the placeholder.

```bash
npx wrangler d1 migrations apply mainz --remote
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

`secret put` asks you to paste the token. It is not written into the repo. `deploy` prints a workers.dev URL. Put that URL in the shop's `EXPO_PUBLIC_API_URL` before you build the website. See `../app/README.md` for the Pages preview commands.

Before a public site, replace the demo farm tokens:

```bash
npx wrangler d1 execute mainz --remote --command "UPDATE farms SET access_token = lower(hex(randomblob(16))) WHERE is_demo = 1;"
```
