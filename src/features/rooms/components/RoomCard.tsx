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
  formatDistanceVi,
  formatPriceMonthly,
  formatVnd,
  LOCATION_ACCURACY_LABELS,
} from '@/shared/utils/format';

interface RoomCardProps {
  room: RoomView & { hit: RoomSearchHit };
  variant?: 'card' | 'compact';
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
        className={`group relative flex items-center gap-3 p-2.5 rounded-card border transition-all cursor-pointer bg-white ${
          isSelected
            ? 'border-brand-600 ring-2 ring-brand-500/25 bg-brand-50/20 shadow-xs'
            : 'border-borderMuted hover:border-slate-300 hover:shadow-2xs'
        }`}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected}
        aria-label={`Phòng trọ ${room.title}`}
      >
        {/* Compact 72x72 Thumbnail */}
        <div className="relative w-20 h-20 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
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
              <ImageOff className="w-5 h-5 mb-0.5" />
              <span className="text-[9px]">Demo</span>
            </div>
          )}
        </div>

        {/* Compact Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="font-extrabold text-brand-700 text-xs truncate">
              {formatPriceMonthly(room.priceMonthlyVnd)}
            </span>
            <span className="text-[10px] text-slate-500 shrink-0">
              {formatDistanceVi(room.hit.distanceKm)}
            </span>
          </div>

          <h3 className="font-bold text-xs text-textPrimary truncate group-hover:text-brand-700">
            {room.title}
          </h3>

          <p className="text-[11px] text-slate-400 truncate mt-0.5">{room.addressLabel}</p>

          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 text-[10px]">
            <span className="text-slate-500">{formatArea(room.areaM2)}</span>
            <Link
              to={`/rooms/${room.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-brand-700 hover:text-brand-900 font-semibold"
            >
              Chi tiết &rarr;
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // Full Vertical Card (Designed for Sidebar Width)
  return (
    <article
      onClick={() => setSelectedRoomId(room.id)}
      className={`group relative flex flex-col bg-surface rounded-card border transition-all cursor-pointer overflow-hidden w-full ${
        isSelected
          ? 'border-brand-600 ring-2 ring-brand-500/30 shadow-md bg-brand-50/10'
          : 'border-borderMuted hover:border-slate-300 hover:shadow-xs'
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
      {/* 16:9 Image Area */}
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
            <ImageOff className="w-8 h-8 mb-1 text-slate-400" />
            <span className="text-xs font-medium">Chưa có ảnh</span>
            {room.sourceKind === 'demo' && (
              <span className="text-[10px] text-slate-400">Tin mẫu mô phỏng</span>
            )}
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs backdrop-blur-md bg-white/95 ${accuracy.badgeClass}`}
            title={accuracy.description}
          >
            {accuracy.label}
          </span>
        </div>

        {/* Compare Button on Image */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleCompareRoom(room.id);
          }}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full shadow-xs backdrop-blur-md transition-all ${
            isComparing
              ? 'bg-amber-500 text-white font-bold'
              : 'bg-white/90 text-slate-700 hover:bg-white hover:text-amber-600'
          }`}
          title={isComparing ? 'Đã chọn so sánh' : 'Thêm vào so sánh'}
          aria-label="So sánh phòng này"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </button>

        {/* Prominent Price Bar at Bottom of Image */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md text-white px-2.5 py-1 rounded-lg shadow-xs">
            <span className="text-sm font-black tracking-tight">
              {formatPriceMonthly(room.priceMonthlyVnd)}
            </span>
          </div>

          {room.utilitiesMonthlyEstimateVnd ? (
            <div className="bg-slate-900/80 backdrop-blur-md text-slate-200 text-[10px] px-2 py-0.5 rounded-md font-medium">
              +~{formatVnd(room.utilitiesMonthlyEstimateVnd)} điện nước
            </div>
          ) : (
            <div className="bg-amber-950/80 backdrop-blur-md text-amber-200 text-[10px] px-2 py-0.5 rounded-md font-medium">
              Chưa rõ phụ phí
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 sm:p-3.5 flex flex-col gap-2">
        {/* Title & Address */}
        <div>
          <h3 className="font-bold text-sm text-textPrimary group-hover:text-brand-700 transition-colors line-clamp-2 leading-snug">
            {room.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
            {room.addressLabel}
          </p>
        </div>

        {/* Key Metrics: Area, Distance, Pet */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-textMuted py-1 border-y border-slate-100">
          <div className="flex items-center gap-1 font-medium text-slate-700">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatArea(room.areaM2)}</span>
          </div>

          <span className="text-slate-300">&bull;</span>

          <div className="flex items-center gap-1 text-brand-700 font-semibold" title="Khoảng cách đường chim bay">
            <Compass className="w-3.5 h-3.5 text-brand-600" />
            <span>{formatDistanceVi(room.hit.distanceKm)}</span>
          </div>

          {room.petAllowed === true && (
            <>
              <span className="text-slate-300">&bull;</span>
              <div className="flex items-center gap-1 text-emerald-700 font-medium">
                <PawPrint className="w-3 h-3 text-emerald-600" />
                <span>Cho nuôi pet</span>
              </div>
            </>
          )}
        </div>

        {/* Amenities Chips */}
        <div className="flex flex-wrap gap-1">
          {room.amenities.slice(0, 4).map((amenity) => (
            <span
              key={amenity}
              className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
            >
              {AMENITY_LABELS[amenity]}
            </span>
          ))}
          {room.amenities.length > 4 && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              +{room.amenities.length - 4}
            </span>
          )}
        </div>

        {/* AI Match Reasons */}
        {room.hit.matchReasons.length > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-brand-800 bg-brand-50/80 rounded-lg px-2 py-1 font-medium">
            <Sparkles className="w-3 h-3 text-brand-600 shrink-0" />
            <span className="truncate">{room.hit.matchReasons.join(' · ')}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-[11px] font-mono text-slate-400">ID: {room.id}</span>

          <Link
            to={`/rooms/${room.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors text-xs"
          >
            <span>Chi tiết & AI Insight</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </article>
  );
};
