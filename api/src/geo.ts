// Distance and Utah place lookup. The table is the U.S. Census Bureau 2023 Gazetteer
// (places and ZIP Code Tabulation Areas), which is a U.S. government work and public domain.
// See api/data/utah-places.json.
import data from '../data/utah-places.json' with { type: 'json' };

export type LatLng = { lat: number; lng: number };

export type Place = {
  name: string;
  lat: number;
  lng: number;
  /** zip when the shopper typed a ZIP. The name is still the nearest town. */
  zip?: string;
};

type Row = { n: string; lat: number; lng: number };

const towns = (data as { towns: Row[] }).towns;
const zips = (data as { zips: Row[] }).zips;

/** Farms at or inside this many miles count as "near you". */
export const NEAR_MILES = 40;

const EARTH_MILES = 3958.7613;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function roundMiles(miles: number): number {
  return Math.round(miles * 10) / 10;
}

export function nearestTown(point: LatLng): Place {
  let best = towns[0];
  let bestMiles = Infinity;
  for (const town of towns) {
    const miles = haversineMiles(point, town);
    if (miles < bestMiles) {
      best = town;
      bestMiles = miles;
    }
  }
  return { name: best.n, lat: point.lat, lng: point.lng };
}

export function lookupPlace(raw: string): { ok: true; place: Place } | { ok: false; error: string } {
  const query = normalize(raw);
  if (!query) return { ok: false, error: 'type a utah zip or city.' };
  if (/^\d{5}$/.test(query)) {
    const zip = zips.find((row) => row.n === query);
    if (!zip) return { ok: false, error: 'that zip is not in utah. try a city, or another zip.' };
    const town = nearestTown(zip);
    return { ok: true, place: { name: town.name, lat: zip.lat, lng: zip.lng, zip: query } };
  }
  const exact = towns.filter((town) => normalize(town.n) === query);
  if (exact.length === 1) return { ok: true, place: { name: exact[0].n, lat: exact[0].lat, lng: exact[0].lng } };
  const starts = towns.filter((town) => normalize(town.n).startsWith(query));
  if (starts.length === 1) return { ok: true, place: { name: starts[0].n, lat: starts[0].lat, lng: starts[0].lng } };
  if (starts.length > 1) {
    return { ok: false, error: 'a few towns start that way. add the rest of the name, or use a zip.' };
  }
  const includes = towns.filter((town) => normalize(town.n).includes(query));
  if (includes.length === 1) return { ok: true, place: { name: includes[0].n, lat: includes[0].lat, lng: includes[0].lng } };
  if (includes.length > 1) {
    return { ok: false, error: 'a few towns match. add more of the name, or use a zip.' };
  }
  return { ok: false, error: 'no utah town or zip by that name.' };
}

export function defaultPlace(): Place {
  const found = lookupPlace('Spanish Fork');
  if (!found.ok) throw new Error('spanish fork missing from the place table');
  return found.place;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
