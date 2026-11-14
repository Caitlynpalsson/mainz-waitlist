// Farmer photo check. If a photo fails, the catalog stock photo stays.
//
// A photo is rejected when any of these are true:
// 1. The short side is under 800 pixels (too small to fill the arch).
// 2. The file is under 50 KB (usually a tiny or wrecked export).
// 3. Bytes per pixel are under 0.04 (heavy compression; soft, blocky detail).
// 4. On the web app only, a blur check: variance of a Laplacian on a 64px
//    preview under PHOTO_RULES.blurVarianceMin. Native skips this and uses 1–3.
//
// The server repeats 1–3 using the dimensions and file size the app reports,
// and it also reads the stored JPEG so the saved file really is at least 800px
// on the short side. The blur number is computed in the browser because the
// worker does not decode pixels. A person who hand-crafts the request could
// lie about the original file size; the stored JPEG size check still holds.

export const PHOTO_RULES = {
  minEdge: 800,
  minBytes: 50_000,
  minBytesPerPixel: 0.04,
  maxStoredChars: 350_000,
  blurVarianceMin: 60,
};

export function assessPhoto(input: { width: number; height: number; byteSize: number }): { ok: true } | { ok: false; reason: string } {
  const width = Math.floor(Number(input.width));
  const height = Math.floor(Number(input.height));
  const byteSize = Math.floor(Number(input.byteSize));
  if (!width || !height || width < 1 || height < 1) {
    return { ok: false, reason: 'could not read the photo size. stock photo kept.' };
  }
  const edge = Math.min(width, height);
  if (edge < PHOTO_RULES.minEdge) {
    return {
      ok: false,
      reason: `too small. need at least ${PHOTO_RULES.minEdge}px on the short side. stock photo kept.`,
    };
  }
  if (!byteSize || byteSize < PHOTO_RULES.minBytes) {
    return { ok: false, reason: 'file is too small to be sharp. stock photo kept.' };
  }
  const bytesPerPixel = byteSize / (width * height);
  if (bytesPerPixel < PHOTO_RULES.minBytesPerPixel) {
    return { ok: false, reason: 'looks over-compressed or soft. stock photo kept.' };
  }
  return { ok: true };
}

/** Read width and height from a baseline or progressive JPEG. Returns null if it is not one. */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 10 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    if (i + 3 >= bytes.length) return null;
    const len = (bytes[i + 2] << 8) + bytes[i + 3];
    if (len < 2) return null;
    // SOF0 and SOF2 hold the frame size. Other SOF markers are rare for phone photos.
    if (marker === 0xc0 || marker === 0xc2) {
      if (i + 8 >= bytes.length) return null;
      const height = (bytes[i + 5] << 8) + bytes[i + 6];
      const width = (bytes[i + 7] << 8) + bytes[i + 8];
      if (!width || !height) return null;
      return { width, height };
    }
    i += 2 + len;
  }
  return null;
}

export function decodeJpegDataUrl(dataUrl: string): Uint8Array {
  const match = /^data:image\/jpeg;base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) throw new Error('photo must be a jpeg');
  const clean = match[1].replace(/\s/g, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}
