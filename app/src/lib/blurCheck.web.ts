/** Laplacian variance on a 64px preview. A low number means the shot is blurry. */
export async function blurVariance(uri: string): Promise<number | null> {
  try {
    const img = new window.Image();
    img.src = uri;
    await img.decode();
    const w = 64;
    const h = 64;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    const { data } = ctx.getImageData(0, 0, w, h);
    const gray = new Float64Array(w * h);
    for (let i = 0; i < w * h; i += 1) {
      gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
    }
    const values: number[] = [];
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = y * w + x;
        values.push(gray[i - w] + gray[i - 1] + gray[i + 1] + gray[i + w] - 4 * gray[i]);
      }
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  } catch {
    return null;
  }
}
