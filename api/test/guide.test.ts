import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ONBOARDING_SMS, ONBOARDING_TEXT_US } from '../src/listing.ts';
import {
  FARM_STEPS,
  GUIDE_FAQS,
  GUIDE_FALLBACK,
  GUIDE_SMS,
  GUIDE_TEXT_US,
  REP_STEPS,
  cannedAnswerer,
  cannedReply,
  farmGuideFacts,
  guideMessages,
  guideStorageKey,
  guideView,
  markGuideStep,
  readGuideState,
  repGuideFacts,
  searchFaqs,
  workersAiAnswerer,
  type WorkersAiBinding,
} from '../src/guide.ts';

test('the helper walks one farm step at a time and remembers a rep tap', () => {
  const facts = farmGuideFacts({
    name: 'Sample Lane',
    town: 'Spanish Fork',
    story: 'peaches and eggs',
    photo: 'profile-sample',
    pricedProducts: 0,
  });
  assert.equal(facts.profile, true);
  assert.equal(facts.photos, true);
  assert.equal(facts.products, false);
  assert.equal(facts.bank, false);
  const state = readGuideState(null, 'farm');
  const view = guideView('farm', facts, state);
  assert.equal(view.current.id, 'products');
  assert.equal(view.doneCount, 2);
  assert.equal(view.total, FARM_STEPS.length);
  const rep = guideView('rep', repGuideFacts({ farms: 0, shoppers: 1 }), markGuideStep(readGuideState(null, 'rep'), 'share', 'rep'));
  assert.equal(rep.steps.find((step) => step.id === 'share')?.done, true);
  assert.equal(rep.steps.find((step) => step.id === 'shoppers')?.done, true);
  assert.equal(rep.current.id, 'qr');
  assert.equal(REP_STEPS.length, 4);
});

test('faq search stays on the canned answers and never names a farm phone', async () => {
  const fees = searchFaqs('farm', 'keep');
  assert.equal(fees.some((item) => item.a.includes('90%')), true);
  assert.equal(searchFaqs('farm', 'monday')[0].a.includes('1 to 3 days'), true);
  assert.equal(searchFaqs('farm', 'bank')[0].a.includes('secured by stripe'), true);
  assert.equal(searchFaqs('farm', 'check')[0].a.toLowerCase().includes('rather get a check'), true);
  const earn = await cannedAnswerer().answer({ audience: 'rep', question: 'how much do reps earn?' });
  assert.equal(earn.source, 'canned');
  assert.equal(earn.text.includes('3%'), true);
  assert.equal(cannedReply({ audience: 'farm', question: 'what is the weather' }).text, GUIDE_FALLBACK);
  const blob = JSON.stringify(GUIDE_FAQS);
  assert.equal(blob.includes('\u2014'), false);
  assert.equal(blob.includes(GUIDE_TEXT_US), false);
  assert.equal(/\b\d{3}-\d{3}-\d{4}\b/.test(blob), false);
});

test('a workers ai binding can plug in later and the app does not call it', async () => {
  let called = 0;
  const ai: WorkersAiBinding = {
    async run(model, input) {
      called += 1;
      assert.equal(model, '@cf/meta/llama-3.1-8b-instruct');
      assert.equal(input.messages[0].role, 'system');
      assert.equal(input.messages[1].role, 'user');
      return { response: 'you keep 90%.' };
    },
  };
  const reply = await workersAiAnswerer(ai).answer({ audience: 'farm', question: 'fees?' });
  assert.equal(called, 1);
  assert.equal(reply.source, 'ai');
  assert.equal(guideMessages({ audience: 'farm', question: 'fees?' })[0].content.includes(GUIDE_TEXT_US), true);
  const app = join(process.cwd(), '..', 'app');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.expo') continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(name)) files.push(path);
    }
  };
  walk(app);
  const hit = files.filter((path) => readFileSync(path, 'utf8').includes('workersAiAnswerer'));
  assert.deepEqual(hit, []);
  assert.equal(guideStorageKey('farm', 'lk_ABC').startsWith('mainz.guide.farm.lk_'), true);
  assert.equal(GUIDE_TEXT_US, ONBOARDING_TEXT_US);
  assert.equal(GUIDE_SMS, ONBOARDING_SMS);
});
