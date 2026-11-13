# Mainz shop

This is the marketplace app. The website at the root of the repo is the live waitlist and is separate. Do not change those files from here.

The same screens run as a website and in the Expo Go app on an iPhone or Android phone. A store listing still needs a confirmed bundle id and a developer account. This repo does not use those.

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

That is the address of the API. No slash at the end. The app reads `EXPO_PUBLIC_API_URL` when it starts and when it builds the website. A phone cannot see `127.0.0.1`. For Expo Go, point it at the live API instead:

```bash
EXPO_PUBLIC_API_URL=https://mainz-api.guidedapp.workers.dev
```

5. Start the website:

```bash
npm run web
```

6. Open the address it prints (usually http://localhost:8081).

## Try it on a phone with Expo Go

This project is Expo SDK 58 (`expo` 58.0.x). That is the SDK in the Expo Go app currently on the Apple App Store and Google Play. Install Expo Go from the store. No Apple developer account, Google developer account, or Expo account is required.

1. In this `app` folder, install and set the live API (a phone cannot reach the API on your computer):

```bash
npm install
cp .env.example .env
```

Then set this line in `.env`:

```bash
EXPO_PUBLIC_API_URL=https://mainz-api.guidedapp.workers.dev
```

2. Start the dev server through a tunnel that does not ask you to log in:

```bash
npx expo start --tunnel ngrok
```

`@expo/ngrok` is already a dev dependency, so that command does not install anything extra and does not ask for an Expo account. Scan the QR code with the iPhone camera (it opens Expo Go) or with Expo Go on Android.

Do not use `npx expo start --tunnel` with no word after it. In SDK 58 that default tunnel is Expo's own, and it asks you to run `npx expo login`. Login, EAS Build, and EAS Update all need an Expo account. This project does not use them.

If the phone and the computer are on the same Wi-Fi, `npx expo start --lan` also works and needs no tunnel. A cloud machine is not on that Wi-Fi, so use the ngrok command above.

The bundle id and Android package are `co.themainz.app`. That string is a placeholder and needs confirmation before any App Store or Play listing. Expo Go ignores it.

Location uses the phone's location only after you tap "use my location". The zip or city field is the other way. The bag and the chosen town are saved on the phone.

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
