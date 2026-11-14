/**
 * Phase 2 weekly rhythm, disabled.
 * Mon — send the weekly check.
 * Tue — one follow-up if there is still no reply.
 * Wed — escalate to staff for a phone call.
 * Thu — close the week and leave one summary per farm.
 * Fri — pickup confirmation.
 * No cron is configured in wrangler.toml. This function is the seam.
 */
export async function runScheduled(): Promise<{ ran: false; reason: string }> {
  return { ran: false, reason: "weekly rhythm disabled until phase 2" };
}
