export const REP_PAGE_TITLE = 'sell with us';
export const REP_PAGE_LINES = [
  'bring farms you know.',
  'when they sell here, you earn a share.',
  'share your link. they apply. we review them like every other farm.',
] as const;

export const RATE_COMING = 'rate coming soon';
/** Caty's default. Paid from the platform's 10%, not taken again from the farm. */
export const DEFAULT_REP_PERCENT = 3;
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

/** Shopper-facing standing for a credited farm. No phone, no extra fee. */
export function portalStanding(input: {
  kind: 'farm' | 'listing';
  status: string;
  active?: boolean;
  stage?: string;
  decision?: string;
  removed?: boolean;
  bank?: boolean;
}): string {
  if (input.removed || input.decision === 'decline') return 'not this time';
  if (input.kind === 'farm' && input.active) return 'selling';
  if (input.bank) return 'bank connected';
  if (input.status === 'approved' || input.status === 'farm_approved') return 'approved';
  if (input.kind === 'listing' && (input.status === 'sent' || input.status === 'changes_requested')) return 'in approval';
  if (input.kind === 'farm' && input.stage && input.stage !== 'application_received') return 'in approval';
  return 'applied';
}

/** Friendlier words for the rep desk. No phone numbers. */
export function friendlyStanding(status: string): 'invited' | 'applied' | 'in review' | 'approved' | 'selling' | 'not this time' {
  const value = status.toLowerCase();
  if (value.includes('not this time') || value.includes('removed') || value.includes('denied')) return 'not this time';
  if (value === 'selling' || value.includes('on the shop')) return 'selling';
  if (value === 'approved' || value.includes('bank connected')) return 'approved';
  if (value.includes('approval') || value.includes('review') || value.includes('onboarding') || value.includes('changes')) return 'in review';
  if (value === 'applied' || value.includes('application')) return 'applied';
  return 'invited';
}

export function repPublicName(name: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'a rep';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].slice(0, 1)}`;
}

export const MILESTONES = [
  { id: 'farm-1', kind: 'farms' as const, n: 1, label: 'first farm' },
  { id: 'farm-5', kind: 'farms' as const, n: 5, label: '5 farms' },
  { id: 'shop-25', kind: 'shoppers' as const, n: 25, label: '25 shoppers' },
  { id: 'farm-10', kind: 'farms' as const, n: 10, label: '10 farms' },
  { id: 'shop-100', kind: 'shoppers' as const, n: 100, label: '100 shoppers' },
  { id: 'shop-250', kind: 'shoppers' as const, n: 250, label: '250 shoppers' },
];

export function milestoneProgress(farms: number, shoppers: number): {
  earned: { id: string; label: string }[];
  next: { id: string; label: string; current: number; target: number } | null;
} {
  const earned = MILESTONES.filter((item) => (item.kind === 'farms' ? farms : shoppers) >= item.n).map((item) => ({ id: item.id, label: item.label }));
  const next = MILESTONES.find((item) => (item.kind === 'farms' ? farms : shoppers) < item.n);
  return {
    earned,
    next: next ? { id: next.id, label: next.label, current: next.kind === 'farms' ? farms : shoppers, target: next.n } : null,
  };
}

export function countSince(dates: string[], from: string | null): number {
  return dates.filter((date) => !from || date >= from).length;
}

export function monthStart(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01 00:00:00`;
}

export function weekStart(now = new Date()): string {
  const day = now.getUTCDay();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7)));
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')} 00:00:00`;
}

export const FARM_PITCH = 'i would love your farm on the main course. you set the price. apply here:';
export const SHOPPER_PITCH = 'real food from people with names. get a note when you can order:';
export const PAYOUT_PLACEHOLDER = "we'll set this up with you";
