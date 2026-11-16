// Makes a one-time staff shopper link. The code lasts 24 hours.
// The first open keeps that phone signed in for 30 days.
// Reads ADMIN_TOKEN from the environment. Prints the path only.
const token = process.argv[2] || '';
const api = (process.env.MAINZ_API_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const admin = process.env.ADMIN_TOKEN || '';
if (!token || !api || !admin) {
  console.error('usage: ADMIN_TOKEN=... MAINZ_API_URL=... node scripts/staff-preview-link.mjs <listing token>');
  process.exit(1);
}
const response = await fetch(`${api}/api/admin/listings/shopper-link`, {
  method: 'POST',
  headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' },
  body: JSON.stringify({ token }),
});
const data = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(data.error || 'could not make a link');
  process.exit(1);
}
console.log(data.path);
console.log(data.shopperPath);
console.log(data.expiresAt);
