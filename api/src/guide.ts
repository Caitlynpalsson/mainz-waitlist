/**
 * Setup helper copy and the answer layer.
 * The app uses canned answers only. workersAiAnswerer matches a Cloudflare
 * Workers AI binding so a model can be plugged in later. Nothing here calls one.
 */

export type GuideAudience = 'farm' | 'rep';

export type GuideStep = {
  id: string;
  title: string;
  tip: string;
  action: string;
};

export const FARM_STEPS: GuideStep[] = [
  { id: 'profile', title: 'your profile', tip: 'your name, your town, and one warm line about the farm.', action: 'fill in your profile' },
  { id: 'photos', title: 'photos', tip: 'a real photo helps people trust you. a stock photo is fine until you have one.', action: 'check your photos' },
  { id: 'products', title: 'products and prices', tip: 'add what you sell and the price you set.', action: 'add a price' },
  { id: 'bank', title: 'connect your bank', tip: "stripe's secure page takes the bank. we never see those details. rather get a check? that works too.", action: 'connect my bank' },
  { id: 'approval', title: 'approval', tip: 'our team gives the page a look. approval is a process. it does not go live by itself.', action: 'see the approval step' },
];

export const REP_STEPS: GuideStep[] = [
  { id: 'share', title: 'your share link', tip: 'send your link. farms apply. shoppers hop on the list.', action: 'copy your link' },
  { id: 'qr', title: 'your qr code', tip: 'the code is on this page. save the card if you want to hand it to someone.', action: 'show your qr' },
  { id: 'farm', title: 'your first farm', tip: 'one farm who uses your link starts your desk.', action: 'invite a farm' },
  { id: 'shoppers', title: 'your first shoppers', tip: 'shoppers you bring show on the board. no cash for shoppers.', action: 'invite a shopper' },
];

/** These two are done when the rep does them. The rest follow real account facts. */
export const GUIDE_VISIT_STEPS = ['share', 'qr'] as const;

export type FarmGuideFacts = {
  profile: boolean;
  photos: boolean;
  products: boolean;
  bank: boolean;
  approval: boolean;
};

export type RepGuideFacts = {
  share: boolean;
  qr: boolean;
  farm: boolean;
  shoppers: boolean;
};

export type GuideFacts = FarmGuideFacts | RepGuideFacts;

export function farmGuideFacts(input: {
  name?: string;
  town?: string;
  story?: string;
  photo?: string;
  photoIsLogo?: boolean;
  pricedProducts?: number;
  bankConnected?: boolean;
  payByCheck?: boolean;
  approvalStarted?: boolean;
}): FarmGuideFacts {
  const name = (input.name || '').trim();
  const town = (input.town || '').trim();
  const story = (input.story || '').trim();
  const photo = (input.photo || '').trim();
  return {
    profile: name.length > 1 && town.length > 1 && story.length > 1,
    photos: photo.length > 0 && !input.photoIsLogo,
    products: (input.pricedProducts || 0) > 0,
    bank: !!input.bankConnected || !!input.payByCheck,
    approval: !!input.approvalStarted,
  };
}

export function repGuideFacts(input: { farms?: number; shoppers?: number }): RepGuideFacts {
  return {
    share: false,
    qr: false,
    farm: (input.farms || 0) > 0,
    shoppers: (input.shoppers || 0) > 0,
  };
}

export type GuideState = {
  dismissed: boolean;
  stepId: string;
  done: string[];
};

export function emptyGuideState(audience: GuideAudience): GuideState {
  return { dismissed: false, stepId: stepsFor(audience)[0].id, done: [] };
}

export function guideStorageKey(audience: GuideAudience, accountId: string): string {
  const id = String(accountId || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80);
  return `mainz.guide.${audience}.${id || 'account'}`;
}

export function readGuideState(raw: string | null | undefined, audience: GuideAudience): GuideState {
  const fallback = emptyGuideState(audience);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<GuideState>;
    const known = new Set(stepsFor(audience).map((step) => step.id));
    const done = Array.isArray(parsed.done) ? parsed.done.map((id) => String(id)).filter((id) => known.has(id)) : [];
    const stepId = known.has(String(parsed.stepId || '')) ? String(parsed.stepId) : fallback.stepId;
    return { dismissed: parsed.dismissed === true, stepId, done };
  } catch {
    return fallback;
  }
}

export function stepsFor(audience: GuideAudience): GuideStep[] {
  return audience === 'farm' ? FARM_STEPS : REP_STEPS;
}

export type GuideViewStep = GuideStep & { done: boolean };

export function guideView(audience: GuideAudience, facts: GuideFacts, state: GuideState): {
  steps: GuideViewStep[];
  current: GuideViewStep;
  doneCount: number;
  total: number;
  complete: boolean;
} {
  const steps = stepsFor(audience).map((step) => ({
    ...step,
    done: !!(facts as Record<string, boolean>)[step.id] || state.done.includes(step.id),
  }));
  const picked = steps.find((step) => step.id === state.stepId);
  const current = (picked && !picked.done ? picked : null) || steps.find((step) => !step.done) || steps[steps.length - 1];
  const doneCount = steps.filter((step) => step.done).length;
  return { steps, current, doneCount, total: steps.length, complete: doneCount === steps.length };
}

export function markGuideStep(state: GuideState, stepId: string, audience: GuideAudience): GuideState {
  const known = stepsFor(audience).some((step) => step.id === stepId);
  if (!known) return state;
  const done = (GUIDE_VISIT_STEPS as readonly string[]).includes(stepId) && !state.done.includes(stepId)
    ? [...state.done, stepId]
    : state.done;
  return { ...state, dismissed: false, stepId, done };
}

export type GuideFaq = { id: string; q: string; a: string; audiences: GuideAudience[] };

export const GUIDE_FAQS: GuideFaq[] = [
  {
    id: 'keep',
    q: 'how much do i keep?',
    a: 'you keep 90% of your food sales. we keep 10%. shoppers pay the 5% and delivery on top. that 5% is not taken from you again.',
    audiences: ['farm'],
  },
  {
    id: 'monday',
    q: 'when do i get paid?',
    a: 'paid every monday, usually lands in 1 to 3 days.',
    audiences: ['farm'],
  },
  {
    id: 'bank',
    q: 'do you see my bank details?',
    a: "you'll connect your bank on stripe's secure page. we never see your bank details. secured by stripe.",
    audiences: ['farm'],
  },
  {
    id: 'check',
    q: 'can i get a check instead?',
    a: "rather get a check? yes. pick that on the pay step and we'll set it up with you.",
    audiences: ['farm'],
  },
  {
    id: 'rep',
    q: 'how much do reps earn?',
    a: "reps earn 3% of what their farms sell, for as long as those farms sell. it comes from our cut, not from the farm. shoppers do not pay a rep.",
    audiences: ['farm', 'rep'],
  },
];

export const GUIDE_TEXT_US = '972-510-3326';
export const GUIDE_SMS = 'sms:+19725103326';
export const GUIDE_FALLBACK = `i don't have that one yet. text the team at ${GUIDE_TEXT_US} and a person will help.`;

export function searchFaqs(audience: GuideAudience, query: string): GuideFaq[] {
  const q = query.trim().toLowerCase();
  const mine = GUIDE_FAQS.filter((item) => item.audiences.includes(audience));
  if (!q) return mine;
  return mine.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(q));
}

export type GuideQuestion = { audience: GuideAudience; question: string; stepId?: string };
export type GuideReply = { text: string; source: 'canned' | 'ai' };

/** The only answer shape the app and a future model both use. */
export interface GuideAnswerer {
  answer(input: GuideQuestion): Promise<GuideReply>;
}

export function cannedReply(input: GuideQuestion): GuideReply {
  const hits = searchFaqs(input.audience, input.question);
  if (!hits.length) return { text: GUIDE_FALLBACK, source: 'canned' };
  return { text: hits.map((item) => item.a).join(' '), source: 'canned' };
}

export function cannedAnswerer(): GuideAnswerer {
  return { async answer(input) { return cannedReply(input); } };
}

/** Same shape as Cloudflare Workers AI `env.AI.run`. */
export type WorkersAiBinding = {
  run(model: string, input: { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] }): Promise<{ response?: string }>;
};

export const WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

export function guideMessages(input: GuideQuestion): { role: 'system' | 'user'; content: string }[] {
  const facts = GUIDE_FAQS.filter((item) => item.audiences.includes(input.audience)).map((item) => `${item.q} ${item.a}`).join('\n');
  return [
    {
      role: 'system',
      content: `you help a ${input.audience} set up the main course. lowercase. warm. short. no em dashes. never invent a fee or a date. never share a farm phone number. the only phone you may name is ${GUIDE_TEXT_US}. if the facts do not answer it, tell them to text the team. facts:\n${facts}`,
    },
    { role: 'user', content: String(input.question || '').trim().slice(0, 400) },
  ];
}

/** Ready for a later Worker. The app does not call this. */
export function workersAiAnswerer(ai: WorkersAiBinding, model = WORKERS_AI_MODEL): GuideAnswerer {
  return {
    async answer(input) {
      const result = await ai.run(model, { messages: guideMessages(input) });
      const text = String(result?.response || '').replace(/\u2014/g, ',').trim();
      if (!text) return cannedReply(input);
      return { text: text.slice(0, 600), source: 'ai' };
    },
  };
}
