import assert from "node:assert/strict";
import { test } from "node:test";
import { handleApi, type Env } from "../src/api.ts";

test("health is public and the sms webhook is a disabled stub", async () => {
  const health = await handleApi(new Request("https://mainz.test/api/health"), {} as Env);
  assert.equal(health.status, 200);
  const healthBody = (await health.json()) as { ok: boolean };
  assert.equal(healthBody.ok, true);

  const sms = await handleApi(new Request("https://mainz.test/api/sms/inbound", { method: "POST", body: "{}" }), {} as Env);
  assert.equal(sms.status, 501);
  const smsBody = (await sms.json()) as { enabled: boolean; error: string };
  assert.equal(smsBody.enabled, false);
  assert.match(smsBody.error, /phase 3/);
});

test("staff routes reject a missing token", async () => {
  const res = await handleApi(new Request("https://mainz.test/api/overview"), { STAFF_TOKEN: "secret" } as Env);
  assert.equal(res.status, 401);
  const wrong = await handleApi(
    new Request("https://mainz.test/api/overview", { headers: { Authorization: "Bearer no" } }),
    { STAFF_TOKEN: "secret" } as Env,
  );
  assert.equal(wrong.status, 401);
});
