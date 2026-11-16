import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessPhoto, jpegSize } from '../src/photoQuality.ts';

test('a large sharp-enough file passes', () => {
  const result = assessPhoto({ width: 1200, height: 1600, byteSize: 180_000 });
  assert.equal(result.ok, true);
});

test('a short side under 800 is rejected', () => {
  const result = assessPhoto({ width: 640, height: 800, byteSize: 200_000 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /too small/);
});

test('a tiny file is rejected', () => {
  const result = assessPhoto({ width: 1000, height: 1000, byteSize: 8_000 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /too small to be sharp/);
});

test('heavy compression is rejected even when the file clears 50 KB', () => {
  // 4000x4000 at 60 KB is 0.00375 bytes per pixel.
  const result = assessPhoto({ width: 4000, height: 4000, byteSize: 60_000 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /over-compressed/);
});

test('jpeg size is read from the start-of-frame marker', () => {
  const bytes = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x0b,
    0x08,
    0x03, 0x20, // height 800
    0x04, 0x00, // width 1024
    0x01, 0x01, 0x00,
    0xff, 0xd9,
  ]);
  assert.deepEqual(jpegSize(bytes), { width: 1024, height: 800 });
  assert.equal(jpegSize(new Uint8Array([1, 2, 3])), null);
});
