import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NEAR_MILES, defaultPlace, haversineMiles, lookupPlace, nearestTown, roundMiles } from '../src/geo.ts';

const spanishFork = { lat: 40.11039, lng: -111.64106 };
const payson = { lat: 40.03588, lng: -111.7388 };

test('haversine is zero at the same point and matches a known utah hop', () => {
  assert.equal(haversineMiles(spanishFork, spanishFork), 0);
  const miles = haversineMiles(spanishFork, payson);
  // Spanish Fork to Payson is a short hop down the valley, about 7 miles.
  assert.ok(miles > 6 && miles < 9, `expected ~7 miles, got ${miles}`);
  assert.equal(roundMiles(4.24), 4.2);
  assert.equal(roundMiles(4.25), 4.3);
});

test('a point inside the radius counts as near and salt lake does not reach payson', () => {
  const saltLake = { lat: 40.77693, lng: -111.93099 };
  assert.ok(haversineMiles(spanishFork, payson) <= NEAR_MILES);
  assert.ok(haversineMiles(saltLake, payson) > NEAR_MILES);
});

test('city lookup finds spanish fork, a prefix, and rejects junk', () => {
  const exact = lookupPlace('  Spanish Fork ');
  assert.equal(exact.ok, true);
  if (exact.ok) {
    assert.equal(exact.place.name, 'Spanish Fork');
    assert.equal(exact.place.lat, spanishFork.lat);
  }
  const prefix = lookupPlace('pays');
  assert.equal(prefix.ok, true);
  if (prefix.ok) assert.equal(prefix.place.name, 'Payson');
  const missing = lookupPlace('atlantis');
  assert.equal(missing.ok, false);
});

test('a utah zip resolves to the nearest town name and the zip centroid', () => {
  const zip = lookupPlace('84660');
  assert.equal(zip.ok, true);
  if (!zip.ok) return;
  assert.equal(zip.place.zip, '84660');
  assert.equal(zip.place.lat, 40.04064);
  assert.equal(zip.place.lng, -111.41911);
  assert.equal(zip.place.name, nearestTown({ lat: zip.place.lat, lng: zip.place.lng }).name);
  assert.ok(zip.place.name.length > 1);
});

test('reverse geolocation names the nearest bundled town without moving the point', () => {
  const point = { lat: 40.24531, lng: -111.64506 };
  const town = nearestTown(point);
  assert.equal(town.name, 'Provo');
  assert.equal(town.lat, point.lat);
  assert.equal(town.lng, point.lng);
});

test('the default place is spanish fork', () => {
  assert.equal(defaultPlace().name, 'Spanish Fork');
});
