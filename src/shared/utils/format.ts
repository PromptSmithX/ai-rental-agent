import { Amenity, LocationAccuracy } from '@/domain/contracts';
export { formatDistanceVi } from './distance';

export function formatVnd(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return 'Chưa rõ giá';
  }
  return `${amount.toLocaleString('vi-VN')} ₫`;
}

export function formatPriceMonthly(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return 'Chưa rõ giá';
  }
  return `${amount.toLocaleString('vi-VN')} ₫/tháng`;
}

export function formatPriceCompact(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return 'Chưa rõ';
  }
  if (amount >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(1).replace('.0', '');
    return `${millions.replace('.', ',')}tr`;
  }
  return `${(amount / 1_000).toLocaleString('vi-VN')}k`;
}

export function formatArea(areaM2: number | null): string {
  if (areaM2 === null || areaM2 === undefined) {
    return 'Chưa có thông tin';
  }
  return `${areaM2} m²`;
}

export const AMENITY_LABELS: Record<Amenity, string> = {
  air_conditioner: 'Máy lạnh',
  wifi: 'Wifi',
  parking: 'Chỗ để xe',
  private_bathroom: 'WC riêng',
  balcony: 'Ban công',
  kitchen: 'Bếp',
};

export const LOCATION_ACCURACY_LABELS: Record<LocationAccuracy, { label: string; badgeClass: string; description: string }> = {
  verified: {
    label: 'Địa chỉ xác minh',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Tọa độ đã được xác minh độc lập',
  },
  approximate: {
    label: 'Vị trí ước lượng',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Vị trí giả lập gần khu vực thực tế, sai số đường chim bay',
  },
  unknown: {
    label: 'Chưa có tọa độ',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    description: 'Tin đăng chưa có tọa độ chính xác, không hiển thị trên bản đồ',
  },
};
