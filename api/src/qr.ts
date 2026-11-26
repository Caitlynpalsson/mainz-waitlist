/**
 * Local byte-mode QR, error correction M, versions 1 to 4.
 * Drawn by the app. No network, no image service.
 */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = value;
    LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function reedSolomon(data: number[], eccLen: number): number[] {
  let gen = [1];
  for (let i = 0; i < eccLen; i += 1) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j += 1) {
      next[j] ^= gen[j];
      next[j + 1] ^= mul(gen[j], EXP[i]);
    }
    gen = next;
  }
  const out = data.concat(new Array(eccLen).fill(0));
  for (let i = 0; i < data.length; i += 1) {
    const coef = out[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j += 1) out[i + j] ^= mul(gen[j], coef);
  }
  return out.slice(data.length);
}

type Version = { version: number; size: number; data: number; ecc: number; blocks: number; align: number[] };

const VERSIONS: Version[] = [
  { version: 1, size: 21, data: 16, ecc: 10, blocks: 1, align: [] },
  { version: 2, size: 25, data: 28, ecc: 16, blocks: 1, align: [6, 18] },
  { version: 3, size: 29, data: 44, ecc: 26, blocks: 1, align: [6, 22] },
  { version: 4, size: 33, data: 64, ecc: 18, blocks: 2, align: [6, 26] },
];

export function formatBits(mask: number): number {
  const data = mask & 7;
  let rem = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}

function codewords(text: string, version: Version): number[] {
  const bytes = [...new TextEncoder().encode(text)];
  let bits = `0100${bytes.length.toString(2).padStart(8, '0')}`;
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  const cap = version.data * 8;
  bits += '0'.repeat(Math.min(4, Math.max(0, cap - bits.length)));
  while (bits.length % 8) bits += '0';
  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8) words.push(Number.parseInt(bits.slice(i, i + 8), 2));
  let pad = 0xec;
  while (words.length < version.data) {
    words.push(pad);
    pad = pad === 0xec ? 0x11 : 0xec;
  }
  return words;
}

function interleave(words: number[], version: Version): number[] {
  const per = version.data / version.blocks;
  const blocks = [];
  for (let i = 0; i < version.blocks; i += 1) {
    const data = words.slice(i * per, (i + 1) * per);
    blocks.push({ data, ecc: reedSolomon(data, version.ecc) });
  }
  const out: number[] = [];
  for (let i = 0; i < per; i += 1) for (const block of blocks) out.push(block.data[i]);
  for (let i = 0; i < version.ecc; i += 1) for (const block of blocks) out.push(block.ecc[i]);
  return out;
}

function maskBit(row: number, col: number, mask: number): boolean {
  switch (mask) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return (row * col) % 2 + (row * col) % 3 === 0;
    case 6: return ((row * col) % 2 + (row * col) % 3) % 2 === 0;
    default: return ((row + col) % 2 + (row * col) % 3) % 2 === 0;
  }
}

function paint(size: number, version: Version, stream: number[], mask: number): boolean[][] {
  const grid: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const set = (row: number, col: number, on: boolean) => {
    grid[row][col] = on;
    reserved[row][col] = true;
  };
  const finder = (row: number, col: number) => {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const yy = row + y;
        const xx = col + x;
        if (yy < 0 || xx < 0 || yy >= size || xx >= size) continue;
        const edge = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        set(yy, xx, x >= 0 && x <= 6 && y >= 0 && y <= 6 && (edge || core));
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);
  for (let i = 8; i < size - 8; i += 1) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const row of version.align) {
    for (const col of version.align) {
      if (reserved[row][col]) continue;
      for (let y = -2; y <= 2; y += 1) {
        for (let x = -2; x <= 2; x += 1) set(row + y, col + x, Math.max(Math.abs(x), Math.abs(y)) !== 1);
      }
    }
  }
  set(size - 8, 8, true);
  for (let i = 0; i < 9; i += 1) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }

  let bit = 0;
  const take = () => {
    if (bit >= stream.length * 8) return false;
    const on = ((stream[bit >> 3] >> (7 - (bit & 7))) & 1) === 1;
    bit += 1;
    return on;
  };
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (const dx of [0, 1]) {
        const xx = col - dx;
        if (reserved[row][xx]) continue;
        const on = take();
        grid[row][xx] = maskBit(row, xx, mask) ? !on : on;
      }
    }
    upward = !upward;
  }

  const bits = formatBits(mask);
  const on = (i: number) => ((bits >> i) & 1) === 1;
  for (let i = 0; i < 15; i += 1) {
    const mod = on(i);
    if (i < 6) grid[i][8] = mod;
    else if (i < 8) grid[i + 1][8] = mod;
    else grid[size - 15 + i][8] = mod;
    if (i < 8) grid[8][size - i - 1] = mod;
    else if (i < 9) grid[8][15 - i] = mod;
    else grid[8][14 - i] = mod;
  }
  grid[size - 8][8] = true;
  return grid.map((row) => row.map((cell) => cell === true));
}

function penalty(grid: boolean[][]): number {
  const size = grid.length;
  let score = 0;
  const run = (dark: boolean, length: number) => {
    if (length >= 5) score += 3 + (length - 5);
    return dark;
  };
  for (let row = 0; row < size; row += 1) {
    let dark = grid[row][0];
    let length = 1;
    for (let col = 1; col < size; col += 1) {
      if (grid[row][col] === dark) length += 1;
      else { run(dark, length); dark = grid[row][col]; length = 1; }
    }
    run(dark, length);
  }
  for (let col = 0; col < size; col += 1) {
    let dark = grid[0][col];
    let length = 1;
    for (let row = 1; row < size; row += 1) {
      if (grid[row][col] === dark) length += 1;
      else { run(dark, length); dark = grid[row][col]; length = 1; }
    }
    run(dark, length);
  }
  let darks = 0;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (grid[row][col]) darks += 1;
      if (row < size - 1 && col < size - 1) {
        const bit = grid[row][col];
        if (bit === grid[row][col + 1] && bit === grid[row + 1][col] && bit === grid[row + 1][col + 1]) score += 3;
      }
    }
  }
  const percent = Math.abs((darks * 100) / (size * size) - 50);
  score += Math.floor(percent / 5) * 10;
  return score;
}

export function qrMatrix(text: string): boolean[][] {
  const clean = String(text || '');
  const version = VERSIONS.find((item) => 4 + 8 + clean.length * 8 <= item.data * 8);
  if (!version) throw new Error('that link is too long for a code');
  const stream = interleave(codewords(clean, version), version);
  let best = paint(version.size, version, stream, 0);
  let bestScore = penalty(best);
  for (let mask = 1; mask < 8; mask += 1) {
    const grid = paint(version.size, version, stream, mask);
    const score = penalty(grid);
    if (score < bestScore) {
      best = grid;
      bestScore = score;
    }
  }
  return best;
}
