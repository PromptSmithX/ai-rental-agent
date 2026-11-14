import { Amenity, LocationAccuracy } from '@/domain/contracts';
export { formatDistanceVi } from './distance';

export function formatVnd(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return 'Contact for price';
  }
  return `${amount.toLocaleString('en-US')} ₫`;
}

export function formatPriceMonthly(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return 'Contact for rent';
  }
  return `${amount.toLocaleString('en-US')} ₫/month`;
}

export function formatPriceCompact(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }
  if (amount >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(1).replace('.0', '');
    return `${millions}M ₫`;
  }
  return `${(amount / 1_000).toLocaleString('en-US')}k ₫`;
}

export function formatArea(areaM2: number | null): string {
  if (areaM2 === null || areaM2 === undefined) {
    return 'Standard room';
  }
  return `${areaM2} m²`;
}

export function formatDistanceEn(distanceKm: number | null): string {
  if (distanceKm === null || distanceKm === undefined) {
    return 'Near campus';
  }
  return `~${distanceKm} km from campus`;
}

export const AMENITY_LABELS: Record<Amenity, string> = {
  air_conditioner: 'Air Conditioning',
  wifi: 'High-speed Wifi',
  parking: 'Motorbike Parking',
  private_bathroom: 'Private Bathroom',
  balcony: 'Balcony',
  kitchen: 'Kitchen Area',
};

export const LOCATION_ACCURACY_LABELS: Record<
  LocationAccuracy,
  { label: string; badgeClass: string; description: string }
> = {
  verified: {
    label: 'Verified Listing',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Address and listing details verified',
  },
  approximate: {
    label: 'Campus Area',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Located in the immediate campus neighborhood',
  },
  unknown: {
    label: 'District Area',
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    description: 'Located in university district',
  },
};
