import { Amenity, LocationAccuracy } from '@/domain/contracts';
export { formatDistanceVi } from './distance';

export function formatVnd(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return 'Chưa rõ';
  }
  return `${amount.toLocaleString('vi-VN')} ₫`;
}

export function formatPriceMonthly(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return 'Liên hệ thuê';
  }
  return `${amount.toLocaleString('vi-VN')} ₫/tháng`;
}

export function formatPriceCompact(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }
  if (amount >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(1).replace('.0', '');
    return `${millions.replace('.', ',')} tr`;
  }
  return `${(amount / 1_000).toLocaleString('vi-VN')}k ₫`;
}

export function formatArea(areaM2: number | null): string {
  if (areaM2 === null || areaM2 === undefined) {
    return 'Chưa rõ diện tích';
  }
  return `${areaM2} m²`;
}

export function formatDistanceEn(distanceKm: number | null): string {
  if (distanceKm === null || distanceKm === undefined) {
    return 'Gần trường';
  }
  return `~${distanceKm} km từ trường`;
}

export const AMENITY_LABELS: Record<Amenity, string> = {
  air_conditioner: 'Máy lạnh',
  wifi: 'Wifi tốc độ cao',
  parking: 'Chỗ để xe',
  private_bathroom: 'WC riêng',
  balcony: 'Ban công thoáng',
  kitchen: 'Khu bếp',
};

export const LOCATION_ACCURACY_LABELS: Record<
  LocationAccuracy,
  { label: string; badgeClass: string; description: string }
> = {
  verified: {
    label: 'Địa chỉ xác minh',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    description: 'Tọa độ và thông tin phòng đã được kiểm chứng',
  },
  approximate: {
    label: 'Vị trí ước lượng',
    badgeClass: 'bg-amber-50/90 text-amber-800 border-amber-200/80',
    description: 'Vị trí lân cận trường, sai số đường chim bay',
  },
  unknown: {
    label: 'Chưa có tọa độ',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    description: 'Thuộc khu vực trường học, hiển thị trong danh sách',
  },
};
