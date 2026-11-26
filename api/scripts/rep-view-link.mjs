// Mints a private view link for the sample rep.
// Prints the path only. Does not email or text anyone.
const api = (process.env.MAINZ_API_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const admin = process.env.ADMIN_TOKEN || '';
if (!api || !admin) {
  console.error('usage: ADMIN_TOKEN=... MAINZ_API_URL=https://mainz-api.guidedapp.workers.dev node scripts/rep-view-link.mjs');
  process.exit(1);
}
const response = await fetch(`${api}/api/admin/reps/view-link`, {
  method: 'POST',
  headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' },
  body: JSON.stringify({ code: 'sample' }),
});
const data = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(data.error || 'could not make a link');
  process.exit(1);
}
console.log(data.path);
