import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Windows } from './types';
import type { Fulfillment } from './orderMath';

const KEY = 'mainz.store.v1';

export type CartLine = {
  key: string;
  productId: number;
  optionId: number | null;
  qty: number;
  farmId: number;
  farmName: string;
  farmSlug: string;
  farmCity: string;
  offersPickup: boolean;
  offersDelivery: boolean;
  pickupSummary: string;
  deliverySummary: string;
  windows: Windows;
  name: string;
  optionLabel: string;
  unit: string;
  unitPriceCents: number;
  photo: string;
  note: string;
  stockQty: number;
};

export type FarmChoice = { fulfillment: Fulfillment; windowLabel: string };

type State = {
  lines: CartLine[];
  choices: Record<string, FarmChoice>;
  address1: string;
  cityZip: string;
  customerName: string;
  customerEmail: string;
  saved: number[];
  follows: string[];
};

const empty: State = {
  lines: [],
  choices: {},
  address1: '1420 e canyon rd',
  cityZip: 'spanish fork, ut 84660',
  customerName: '',
  customerEmail: '',
  saved: [],
  follows: [],
};

type Store = State & {
  ready: boolean;
  add: (line: Omit<CartLine, 'key' | 'qty'> & { qty?: number }) => void;
  setQty: (key: string, qty: number) => void;
  setFulfillment: (farmId: number, fulfillment: Fulfillment) => void;
  setAllFulfillment: (fulfillment: Fulfillment) => void;
  setWindow: (farmId: number, windowLabel: string) => void;
  setAddress: (address1: string, cityZip: string) => void;
  setCustomer: (customerName: string, customerEmail: string) => void;
  clearLines: () => void;
  toggleSaved: (productId: number) => void;
  toggleFollow: (slug: string) => void;
};

const Ctx = createContext<Store | null>(null);

function choiceFor(line: Omit<CartLine, 'key' | 'qty'>, current?: FarmChoice): FarmChoice {
  if (current) return current;
  const fulfillment: Fulfillment = line.offersDelivery ? 'delivery' : 'pickup';
  const slots = fulfillment === 'delivery' ? line.windows.delivery : line.windows.pickup;
  return { fulfillment, windowLabel: slots[0]?.label || '' };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<State>;
        setState({ ...empty, ...parsed, lines: parsed.lines || [], choices: parsed.choices || {} });
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, ready]);

  const api = useMemo<Store>(() => ({
    ...state,
    ready,
    add: (line) => {
      const qty = Math.max(1, Math.floor(line.qty || 1));
      const key = `${line.productId}:${line.optionId ?? 'base'}`;
      setState((current) => {
        const exists = current.lines.some((item) => item.key === key);
        const lines = exists
          ? current.lines.map((item) => item.key === key ? { ...item, qty: Math.min(item.stockQty, item.qty + qty) } : item)
          : [...current.lines, { ...line, key, qty: Math.min(line.stockQty, qty) }];
        const id = String(line.farmId);
        return {
          ...current,
          lines,
          choices: { ...current.choices, [id]: choiceFor(line, current.choices[id]) },
        };
      });
    },
    setQty: (key, qty) => {
      setState((current) => ({
        ...current,
        lines: qty < 1
          ? current.lines.filter((line) => line.key !== key)
          : current.lines.map((line) => (line.key === key ? { ...line, qty: Math.min(line.stockQty, qty) } : line)),
      }));
    },
    setFulfillment: (farmId, fulfillment) => {
      setState((current) => {
        const line = current.lines.find((item) => item.farmId === farmId);
        if (!line) return current;
        if (fulfillment === 'delivery' && !line.offersDelivery) return current;
        if (fulfillment === 'pickup' && !line.offersPickup) return current;
        const slots = fulfillment === 'delivery' ? line.windows.delivery : line.windows.pickup;
        return {
          ...current,
          choices: { ...current.choices, [String(farmId)]: { fulfillment, windowLabel: slots[0]?.label || '' } },
        };
      });
    },
    setAllFulfillment: (fulfillment) => {
      setState((current) => {
        const choices = { ...current.choices };
        const seen = new Set<number>();
        for (const line of current.lines) {
          if (seen.has(line.farmId)) continue;
          seen.add(line.farmId);
          if (fulfillment === 'delivery' && !line.offersDelivery) continue;
          if (fulfillment === 'pickup' && !line.offersPickup) continue;
          const slots = fulfillment === 'delivery' ? line.windows.delivery : line.windows.pickup;
          choices[String(line.farmId)] = { fulfillment, windowLabel: slots[0]?.label || '' };
        }
        return { ...current, choices };
      });
    },
    setWindow: (farmId, windowLabel) => {
      setState((current) => {
        const prev = current.choices[String(farmId)];
        if (!prev) return current;
        return { ...current, choices: { ...current.choices, [String(farmId)]: { ...prev, windowLabel } } };
      });
    },
    setAddress: (address1, cityZip) => setState((current) => ({ ...current, address1, cityZip })),
    setCustomer: (customerName, customerEmail) => setState((current) => ({ ...current, customerName, customerEmail })),
    clearLines: () => setState((current) => ({ ...current, lines: [], choices: {} })),
    toggleSaved: (productId) => setState((current) => ({
      ...current,
      saved: current.saved.includes(productId)
        ? current.saved.filter((id) => id !== productId)
        : [...current.saved, productId],
    })),
    toggleFollow: (slug) => setState((current) => ({
      ...current,
      follows: current.follows.includes(slug)
        ? current.follows.filter((item) => item !== slug)
        : [...current.follows, slug],
    })),
  }), [state, ready]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const value = useContext(Ctx);
  if (!value) throw new Error('store missing');
  return value;
}
