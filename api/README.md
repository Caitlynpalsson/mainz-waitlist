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
