import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatBits, qrMatrix } from '../src/qr.ts';

test('qr format bits for ecc M mask 0 match the spec', () => {
  assert.equal(formatBits(0).toString(2).padStart(15, '0'), '101010000010010');
  const grid = qrMatrix('https://themaincoursemarket.com/r/sample');
  assert.equal(grid.length, grid[0].length);
  assert.equal(grid.length >= 21 && grid.length <= 33, true);
  assert.equal(grid[0][0], true);
  assert.equal(grid[grid.length - 8][8], true);
});
