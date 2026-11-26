// Ends every staff shopper session. Reads ADMIN_TOKEN from the environment.
// It does not print the admin token.
const api = (process.env.MAINZ_API_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const admin = process.env.ADMIN_TOKEN || '';
if (!api || !admin) {
  console.error('usage: ADMIN_TOKEN=... MAINZ_API_URL=... node scripts/revoke-staff-sessions.mjs');
  process.exit(1);
}
const response = await fetch(`${api}/api/admin/staff-sessions/revoke`, {
  method: 'POST',
  headers: { authorization: `Bearer ${admin}` },
});
const data = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(data.error || 'could not revoke sessions');
  process.exit(1);
}
console.log(data.revoked);
