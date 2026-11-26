import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SEARCH_EMPTY, searchProducts, searchPublicFarms } from '../src/search.ts';
import { listingAppearsInBrowse } from '../src/listing.ts';

test('product search matches a name or a category', () => {
  const products = [
    { name: 'raw honey', category: 'honey' },
    { name: 'ribeye', category: 'meat' },
    { name: 'eggs', category: 'eggs' },
  ];
  assert.deepEqual(searchProducts(products, 'honey').map((item) => item.name), ['raw honey']);
  assert.deepEqual(searchProducts(products, 'meat').map((item) => item.name), ['ribeye']);
  assert.equal(searchProducts(products, '   ').length, 3);
  assert.equal(SEARCH_EMPTY, 'no match. try another word');
});

test('farm search matches name, town, and food words, and never returns a hidden draft', () => {
  const farms = [
    { name: 'cedar valley honey', city: 'eagle mountain', cardFoods: 'honey', shopVisible: true },
    { name: 'bar w beef', city: 'nephi', cardFoods: 'beef', shopVisible: true },
    { name: 'sample lane', city: 'provo', cardFoods: 'eggs', shopVisible: true },
    { name: 'hidden honey draft', city: 'provo', cardFoods: 'honey', shopVisible: false },
  ];
  assert.deepEqual(searchPublicFarms(farms, 'honey').map((farm) => farm.name), ['cedar valley honey']);
  assert.deepEqual(searchPublicFarms(farms, 'beef').map((farm) => farm.name), ['bar w beef']);
  assert.deepEqual(searchPublicFarms(farms, 'provo').map((farm) => farm.name), ['sample lane']);
  assert.equal(searchPublicFarms(farms, 'hidden honey').length, 0);
  assert.equal(searchPublicFarms(farms, '').some((farm) => farm.shopVisible === false), false);
  assert.equal(listingAppearsInBrowse('sent', false), false);
  const api = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  const listFarms = api.slice(api.indexOf('async function listFarms'), api.indexOf('async function farmDetail'));
  const browse = api.slice(api.indexOf('async function browse'), api.indexOf('async function listFarms'));
  assert.equal(listFarms.includes('listing_drafts'), false);
  assert.equal(browse.includes('listing_drafts'), false);
  assert.equal(listFarms.includes("status = 'approved'"), true);
});
