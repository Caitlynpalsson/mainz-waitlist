import { useSyncExternalStore } from 'react';
import { previewItemAddable } from '../../../api/src/listing';

export type PreviewLine = {
  key: string;
  productId: number;
  name: string;
  unit: string;
  qty: number;
  unitPriceCents: number;
  photo: string;
  availability: string;
};

type PreviewBag = {
  token: string;
  lines: PreviewLine[];
  fulfillment: 'pickup' | 'delivery';
  windowLabel: string;
  address1: string;
  cityZip: string;
};

const empty = (token = ''): PreviewBag => ({
  token,
  lines: [],
  fulfillment: 'delivery',
  windowLabel: '',
  address1: '',
  cityZip: '',
});

let state = empty();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function update(next: PreviewBag) {
  state = next;
  emit();
}

function forToken(token: string): PreviewBag {
  if (state.token !== token) state = empty(token);
  return state;
}

export function usePreviewBag(token: string) {
  const snap = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => forToken(token),
  );
  return {
    ...snap,
    add(line: Omit<PreviewLine, 'key' | 'qty'> & { qty: number }) {
      try {
        if (!previewItemAddable(line.availability || '')) return false;
      } catch {
        return false;
      }
      const current = forToken(token);
      const key = String(line.productId);
      const existing = current.lines.find((item) => item.key === key);
      const lines = existing
        ? current.lines.map((item) => item.key === key ? { ...item, qty: item.qty + line.qty } : item)
        : [...current.lines, { ...line, key, availability: line.availability || '' }];
      update({ ...current, token, lines });
      return true;
    },
    setQty(key: string, qty: number) {
      const current = forToken(token);
      update({
        ...current,
        lines: qty < 1 ? current.lines.filter((line) => line.key !== key) : current.lines.map((line) => line.key === key ? { ...line, qty } : line),
      });
    },
    setFulfillment(fulfillment: 'pickup' | 'delivery') {
      update({ ...forToken(token), fulfillment });
    },
    setWindow(windowLabel: string) {
      update({ ...forToken(token), windowLabel });
    },
    setAddress(address1: string, cityZip: string) {
      update({ ...forToken(token), address1, cityZip });
    },
  };
}
