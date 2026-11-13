# Mainz shop

This is the marketplace app. The website at the root of the repo is the live waitlist and is separate. Do not change those files from here.

The same screens are meant to ship later to the App Store and Google Play. This slice runs as a website.

## What you need

- Node.js 22
- The API running (see `../api/README.md`)

## Run it on your computer

1. Open a terminal in this `app` folder.
2. Install the pieces:

```bash
npm install
```

3. Copy the example settings:

```bash
cp .env.example .env
```

4. `.env` should say:

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:8787
```

That is the address of the API. No slash at the end. The app reads this when it starts and when it builds the website. Change it to the real Worker address before you publish.

5. Start the website:

```bash
npm run web
```

6. Open the address it prints (usually http://localhost:8081).

## Make the static website

```bash
npx expo export -p web
```

The site is written to `dist/`. It is a single-page site, so Cloudflare Pages needs the `_redirects` file that is already in `public/`. The export copies it into `dist/`.

## Publish a preview on Cloudflare Pages

Build with the real API address baked in, then upload `dist` as a preview branch. A branch that is not the production branch stays a preview.

```bash
cd app
EXPO_PUBLIC_API_URL=https://mainz-api.<your-subdomain>.workers.dev npx expo export -p web
cd ..
npx wrangler pages project create mainz --production-branch main
npx wrangler pages deploy app/dist --project-name mainz --branch preview
```

The `pages deploy` command prints a preview URL. You only create the project once. Later deploys are just the `export` line and the `pages deploy` line.

Do not point the live waitlist (caitlynpalsson.github.io/mainz-waitlist) at this site until you mean to replace it.

## Pages in the app

- Browse, a farm, a product, and the bag
- Apply to sell (saves to the new database, not the old email form)
- Admin at `/admin` (asks for the admin token)
- Farm dashboard at `/dashboard` (asks for a farm token)

Payments are not real. The bag says the order is a test.
