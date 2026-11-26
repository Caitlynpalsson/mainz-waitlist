export const REP_PAGE_TITLE = 'sell with us';
export const REP_PAGE_LINES = [
  'bring farms you know.',
  'when they sell here, you earn a share.',
  'share your link. they apply. we review them like every other farm.',
] as const;

export const RATE_COMING = 'rate coming soon';
export const REP_CODE_KEY = 'main.repCode';
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function referralCode(bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(6))): string {
  return [...bytes].slice(0, 6).map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export function isReferralCode(code: string): boolean {
  return /^[a-z0-9]{4,12}$/.test(code.trim().toLowerCase());
}

/** Empty or missing means the rate is not set. Never invent a number. */
export function parseCommissionPercent(raw: string | number | null | undefined): number | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

export function commissionCents(soldCents: number, percent: number | null): number | null {
  if (percent == null) return null;
  const sold = Math.max(0, Math.round(soldCents));
  return Math.round((sold * percent) / 100);
}

export function farmApprovalLine(input: { status: string; active: boolean; decision: string; stage: string; removed: boolean }): string {
  if (input.removed) return 'closed';
  if (input.decision === 'decline') return 'not this time';
  if (input.decision === 'waitlist') return 'on the list';
  if (input.status === 'approved' && input.active) return 'approved and on the shop';
  if (input.status === 'approved') return 'approved';
  const stages: Record<string, string> = {
    application_received: 'application received',
    quick_screen: 'quick screen',
    intro_call: 'intro call',
    documents: 'documents',
    sample_review: 'sample or photo review',
    score: 'scoring',
    decision: 'decision',
    onboarding: 'onboarding',
    ongoing: 'ongoing checks',
  };
  return stages[input.stage] || 'application received';
}

export function listingApprovalLine(status: string): string {
  if (status === 'farm_approved') return 'farm approved, team is looking';
  if (status === 'farm_denied') return 'page removed';
  if (status === 'changes_requested') return 'changes requested';
  if (status === 'sent') return 'waiting on the farm';
  return 'page in progress';
}
