import { expect, test, type Page } from '@playwright/test';

// iPhone-sized WebKit. Geolocation is mocked by Playwright, never prompted for real.
// The site is http://127.0.0.1:4173 and the API is http://127.0.0.1:8787.

const provo = { latitude: 40.23384, longitude: -111.65853 };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('mainz.place.v1'));
});

test('does not ask on load, then uses a granted location', async ({ page, context }) => {
  await context.setGeolocation(provo);
  await context.grantPermissions(['geolocation']);
  await page.goto('/');
  const line = page.getByRole('button', { name: 'change location' });
  await expect(line).toContainText(/spanish fork, ut/i);
  await expect(line).not.toContainText(/provo/i);

  await line.click();
  await page.getByRole('button', { name: 'use my location' }).click();
  await expect(line).toContainText(/provo, ut/i);
  await expect(page.getByText(/willow creek farm/i).first()).toBeVisible();
  const miles = page.getByText(/mi/).first();
  await expect(miles).toBeVisible();
});

test('a denied location offers a zip, and the header follows it', async ({ page, context }) => {
  await context.clearPermissions();
  await page.goto('/');
  const line = page.getByRole('button', { name: 'change location' });
  await line.click();
  await page.getByRole('button', { name: 'use my location' }).click();
  await expect(page.getByText(/type a zip or city/i)).toBeVisible();
  await page.getByLabel('zip or city').fill('84601');
  await page.getByRole('button', { name: 'use this place' }).click();
  await expect(line).toContainText(/provo, ut/i);
});

test('typing a city updates the header and the distances', async ({ page }) => {
  await page.goto('/');
  const line = page.getByRole('button', { name: 'change location' });
  await expect(line).toContainText(/spanish fork, ut/i);
  const card = page.getByRole('link', { name: /^willow creek farm/i });
  await expect(card).toContainText(/0 mi/);

  await page.getByRole('button', { name: 'location pin' }).click();
  await page.getByLabel('zip or city').fill('Payson');
  await page.getByRole('button', { name: 'use this place' }).click();
  await expect(line).toContainText(/payson, ut/i);
  await expect(card).toContainText(/7\.3 mi/);
  await expect(page.getByRole('link', { name: /^bee loud honey/i })).toContainText(/0 mi/);
});

async function dump(page: Page) {
  return page.locator('body').innerText();
}

test('the location pin opens the same sheet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'location pin' }).click();
  await expect(page.getByRole('button', { name: 'use my location' })).toBeVisible();
  expect((await dump(page)).toLowerCase()).toContain('where are you');
});
