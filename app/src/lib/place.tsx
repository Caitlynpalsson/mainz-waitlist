import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultPlace, lookupPlace, nearestTown, type Place } from '../../../api/src/geo';
import { requestDeviceLocation } from './geolocation';

const KEY = 'mainz.place.v1';

type PlaceState = {
  place: Place;
  ready: boolean;
  open: boolean;
  error: string;
  busy: boolean;
  openPicker: () => void;
  closePicker: () => void;
  useDevice: () => void;
  useQuery: (raw: string) => void;
};

const Ctx = createContext<PlaceState | null>(null);

export function PlaceProvider({ children }: { children: ReactNode }) {
  const [place, setPlace] = useState<Place>(defaultPlace());
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Place;
        if (saved && typeof saved.lat === 'number' && typeof saved.lng === 'number' && saved.name) setPlace(saved);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const choose = useCallback((next: Place) => {
    setPlace(next);
    setError('');
    setOpen(false);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const api = useMemo<PlaceState>(() => ({
    place,
    ready,
    open,
    error,
    busy,
    openPicker: () => {
      setError('');
      setOpen(true);
    },
    closePicker: () => {
      setBusy(false);
      setOpen(false);
    },
    useDevice: () => {
      setError('');
      setBusy(true);
      // No await before the geolocation call. iOS Safari drops the gesture otherwise.
      requestDeviceLocation()
        .then((point) => {
          const town = nearestTown(point);
          choose({ name: town.name, lat: point.lat, lng: point.lng });
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setBusy(false));
    },
    useQuery: (raw: string) => {
      const found = lookupPlace(raw);
      if (!found.ok) {
        setError(found.error);
        return;
      }
      choose(found.place);
    },
  }), [place, ready, open, error, busy, choose]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePlace(): PlaceState {
  const value = useContext(Ctx);
  if (!value) throw new Error('place missing');
  return value;
}

export function originQuery(place: Place): string {
  return `lat=${encodeURIComponent(place.lat)}&lng=${encodeURIComponent(place.lng)}`;
}
