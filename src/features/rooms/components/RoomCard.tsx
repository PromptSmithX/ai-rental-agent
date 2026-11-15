import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Compass,
  FileSpreadsheet,
  ImageOff,
  Maximize2,
  PawPrint,
  Sparkles,
} from 'lucide-react';
import { RoomSearchHit, RoomView } from '@/domain/contracts';
import { useSearchStore } from '@/app/store/searchStore';
import {
  AMENITY_LABELS,
  formatArea,
  formatDistanceEn,
  formatPriceMonthly,
  formatVnd,
  LOCATION_ACCURACY_LABELS,
} from '@/shared/utils/format';

interface RoomCardProps {
  room: RoomView & { hit: RoomSearchHit };
  variant?: 'card' | 'compact';
}

function formatRoomRef(id: string): string {
  if (id.startsWith('demo-room-')) {
    return `#${id.replace('demo-room-', '')}`;
  }
  if (id.startsWith('hanoi-room-')) {
    return `#HN${id.replace('hanoi-room-', '')}`;
  }
  return `#${id.slice(-4)}`;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, variant = 'card' }) => {
  const { selectedRoomId, setSelectedRoomId, comparingRoomIds, toggleCompareRoom } =
    useSearchStore();
  const [imageError, setImageError] = useState(false);

  const isSelected = selectedRoomId === room.id;
  const isComparing = comparingRoomIds.includes(room.id);
  const accuracy = LOCATION_ACCURACY_LABELS[room.locationAccuracy];

  if (variant === 'compact') {
    return (
      <article
        onClick={() => setSelectedRoomId(room.id)}
        className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer bg-white ${
          isSelected
            ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
            : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
        }`}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected}
        aria-label={`Phòng trọ ${room.title}`}
      >
        {/* Compact Thumbnail */}
        <div className="relative w-20 h-20 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-slate-100">
          {room.imageUrls.length > 0 && !imageError ? (
            <img
              src={room.imageUrls[0]}
              alt={room.title}
              loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <ImageOff className="w-4 h-4 mb-0.5" />
              <span className="text-[9px]">Ảnh minh họa</span>
            </div>
          )}
        </div>

        {/* Compact Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="font-bold text-slate-900 text-xs truncate">
              {formatPriceMonthly(room.priceMonthlyVnd)}
            </span>
            <span className="text-[10px] text-teal-700 font-medium bg-teal-50 px-1.5 py-0.2 rounded border border-teal-100 shrink-0">
              {formatDistanceEn(room.hit.distanceKm)}
            </span>
          </div>

          <h3 className="font-semibold text-xs text-slate-900 truncate group-hover:text-teal-700 transition-colors">
            {room.title}
          </h3>

          <p className="text-[11px] text-slate-500 truncate mt-0.5">{room.addressLabel}</p>

          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-[10px]">
            <span className="text-slate-500 font-medium">{formatArea(room.areaM2)}</span>
            <Link
              to={`/rooms/${room.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-slate-900 hover:text-teal-700 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>Chi tiết</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // Full Card Variant
  return (
    <article
      onClick={() => setSelectedRoomId(room.id)}
      className={`group relative flex flex-col bg-white rounded-xl border transition-all cursor-pointer overflow-hidden w-full ${
        isSelected
          ? 'border-slate-900 ring-2 ring-slate-900/15 shadow-md'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
      }`}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Phòng trọ ${room.title}, giá ${formatPriceMonthly(room.priceMonthlyVnd)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setSelectedRoomId(room.id);
        }
      }}
    >
      {/* 16:10 Aspect Ratio Image Area */}
      <div className="relative w-full aspect-[16/10] bg-slate-100 overflow-hidden">
        {room.imageUrls.length > 0 && !imageError ? (
          <img
            src={room.imageUrls[0]}
            alt={room.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
            <ImageOff className="w-7 h-7 mb-1 text-slate-400" />
            <span className="text-xs font-medium">Ảnh mô phỏng đang cập nhật</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border shadow-xs backdrop-blur-md bg-white/95 ${accuracy.badgeClass}`}
            title={accuracy.description}
          >
            {accuracy.label}
          </span>
        </div>

        {/* Compare Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleCompareRoom(room.id);
          }}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-md shadow-xs backdrop-blur-md transition-all ${
            isComparing
              ? 'bg-amber-500 text-white font-bold ring-2 ring-amber-400/50'
              : 'bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/60'
          }`}
          title={isComparing ? 'Đang chọn so sánh' : 'Thêm vào so sánh'}
          aria-label="Thêm phòng này vào danh sách so sánh"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Card Content Body */}
      <div className="p-3.5 sm:p-4 flex flex-col gap-2.5">
        {/* Price & Utilities Row */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-base font-bold text-slate-900 tracking-tight">
            {formatPriceMonthly(room.priceMonthlyVnd)}
          </div>
          {room.utilitiesMonthlyEstimateVnd ? (
            <span className="text-[11px] text-slate-500 font-medium">
              +~{formatVnd(room.utilitiesMonthlyEstimateVnd)} điện nước
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-normal">
              Điện nước theo giá nhà nước
            </span>
          )}
        </div>

        {/* Title & Address */}
        <div>
          <h3 className="font-semibold text-xs text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug">
            {room.title}
          </h3>
          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
            {room.addressLabel}
          </p>
        </div>

        {/* Key Metrics: Area, Distance, Pets */}
        <div className="flex flex-wrap items-center gap-2 text-xs py-1.5 border-y border-slate-100">
          <div className="flex items-center gap-1 font-medium text-slate-700">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px]">{formatArea(room.areaM2)}</span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1 text-slate-800 font-medium" title="Khoảng cách đường chim bay đến cơ sở trường">
            <Compass className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px] font-medium text-teal-700">{formatDistanceEn(room.hit.distanceKm)}</span>
          </div>

          {room.petAllowed === true && (
            <>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 text-emerald-700 font-medium">
                <PawPrint className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px]">Nuôi pet OK</span>
              </div>
            </>
          )}
        </div>

        {/* Amenities Chips */}
        <div className="flex flex-wrap gap-1">
          {room.amenities.slice(0, 4).map((amenity) => (
            <span
              key={amenity}
              className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
            >
              {AMENITY_LABELS[amenity]}
            </span>
          ))}
          {room.amenities.length > 4 && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-medium">
              +{room.amenities.length - 4}
            </span>
          )}
        </div>

        {/* Match Reason Summary */}
        {room.hit.matchReasons.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-teal-800 bg-teal-50/80 rounded-md p-2 font-medium border border-teal-100/70">
            <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
            <span className="truncate">{room.hit.matchReasons.join(' · ')}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-[11px] font-mono text-slate-400">Mã: {formatRoomRef(room.id)}</span>

          <Link
            to={`/rooms/${room.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 font-semibold text-slate-900 hover:text-white bg-slate-100 hover:bg-slate-900 px-3 py-1.5 rounded-lg text-xs transition-all shadow-xs"
          >
            <span>Xem chi tiết</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </article>
  );
};
