export function dollars(cents: number, mode: 'auto' | 'cents' = 'cents'): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  if (mode === 'auto' && abs % 100 === 0) return `${sign}$${abs / 100}`;
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function miles(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} mi`;
}

export function stockLabel(qty: number, unit: string): string {
  return `${qty} ${plural(unit, qty)}`;
}

function plural(unit: string, qty: number): string {
  if (qty === 1) return unit;
  if (unit === 'bunch') return 'bunches';
  if (unit === 'dozen' || unit === 'lb' || unit === 'oz' || unit.includes(' ') || unit.endsWith('s')) return unit;
  return `${unit}s`;
}

export function cityLine(city: string, state?: string): string {
  return [city, state].filter(Boolean).join(', ').toLowerCase();
}
