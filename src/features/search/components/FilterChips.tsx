import React from 'react';
import {
  ArrowUpDown,
  Compass,
  DollarSign,
  GraduationCap,
  Maximize2,
  PawPrint,
  Sparkles,
  Wind,
  X,
} from 'lucide-react';
import { SearchFilters } from '@/domain/contracts';
import { useSearchStore } from '@/app/store/searchStore';
import { AMENITY_LABELS } from '@/shared/utils/format';

export const FilterChips: React.FC = () => {
  const { currentFilters, removeFilter, updateFilters, allCampuses, resetFilters } = useSearchStore();

  const activeCampus = allCampuses.find((c) => c.id === currentFilters.campusId);

  const hasAnyFilter =
    Boolean(currentFilters.campusId) ||
    currentFilters.maxPriceVnd !== null ||
    currentFilters.maxDistanceKm !== null ||
    currentFilters.minAreaM2 !== null ||
    currentFilters.requiredAmenities.length > 0 ||
    currentFilters.petAllowed !== null;

  return (
    <div className="w-full bg-slate-50/80 border-b border-borderMuted p-2.5 sm:px-4">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-textPrimary">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Bộ lọc trích xuất từ hội thoại (Canonical Filters):</span>
        </div>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-brand-600 hover:text-brand-800 font-medium hover:underline"
          >
            Đặt lại mặc định
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* Campus Chip */}
        {currentFilters.campusId && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip text-xs bg-brand-50 text-brand-800 border border-brand-200">
            <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
            <span className="font-medium">{activeCampus?.campusName ?? currentFilters.campusId}</span>
            <button
              type="button"
              onClick={() => removeFilter('campusId')}
              className="text-brand-600 hover:text-brand-900 ml-0.5 rounded-full hover:bg-brand-100 p-0.5"
              aria-label="Xóa bộ lọc trường"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Max Price Chip */}
        {currentFilters.maxPriceVnd !== null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">
              ≤ {(currentFilters.maxPriceVnd / 1_000_000).toLocaleString('vi-VN')} triệu/tháng
            </span>
            <button
              type="button"
              onClick={() => removeFilter('maxPriceVnd')}
              className="text-emerald-600 hover:text-emerald-900 ml-0.5 rounded-full hover:bg-emerald-100 p-0.5"
              aria-label="Xóa bộ lọc giá"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Max Distance Chip */}
        {currentFilters.maxDistanceKm !== null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip text-xs bg-blue-50 text-blue-800 border border-blue-200">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-medium">Bán kính ≤ {currentFilters.maxDistanceKm} km</span>
            <button
              type="button"
              onClick={() => removeFilter('maxDistanceKm')}
              className="text-blue-600 hover:text-blue-900 ml-0.5 rounded-full hover:bg-blue-100 p-0.5"
              aria-label="Xóa bộ lọc bán kính"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Min Area Chip */}
        {currentFilters.minAreaM2 !== null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip text-xs bg-purple-50 text-purple-800 border border-purple-200">
            <Maximize2 className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-medium">Diện tích ≥ {currentFilters.minAreaM2} m²</span>
            <button
              type="button"
              onClick={() => removeFilter('minAreaM2')}
              className="text-purple-600 hover:text-purple-900 ml-0.5 rounded-full hover:bg-purple-100 p-0.5"
              aria-label="Xóa bộ lọc diện tích"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Pet Allowed Chip */}
        {currentFilters.petAllowed !== null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip text-xs bg-amber-50 text-amber-800 border border-amber-200">
            <PawPrint className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-medium">
              {currentFilters.petAllowed ? 'Cho nuôi thú cưng' : 'Không thú cưng'}
            </span>
            <button
              type="button"
              onClick={() => removeFilter('petAllowed')}
              className="text-amber-600 hover:text-amber-900 ml-0.5 rounded-full hover:bg-amber-100 p-0.5"
              aria-label="Xóa bộ lọc thú cưng"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Required Amenities Chips */}
        {currentFilters.requiredAmenities.map((amenity) => (
          <span
            key={amenity}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip text-xs bg-teal-50 text-teal-800 border border-teal-200"
          >
            <Wind className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-medium">{AMENITY_LABELS[amenity]}</span>
            <button
              type="button"
              onClick={() => removeFilter('requiredAmenities', amenity)}
              className="text-teal-600 hover:text-teal-900 ml-0.5 rounded-full hover:bg-teal-100 p-0.5"
              aria-label={`Xóa tiện ích ${AMENITY_LABELS[amenity]}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Sort selector */}
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-chip text-xs bg-white text-slate-700 border border-borderMuted">
          <ArrowUpDown className="w-3 h-3 text-slate-500" />
          <select
            value={currentFilters.sortBy}
            onChange={(e) =>
              updateFilters({ sortBy: e.target.value as SearchFilters['sortBy'] })
            }
            className="bg-transparent font-medium cursor-pointer focus:outline-none"
            aria-label="Thứ tự sắp xếp"
          >
            <option value="recommended">Sắp xếp: Phù hợp nhất</option>
            <option value="price_asc">Sắp xếp: Giá thấp nhất</option>
            <option value="distance_asc">Sắp xếp: Gần trường nhất</option>
          </select>
        </div>

        {!hasAnyFilter && (
          <span className="text-xs text-textMuted italic">
            Chưa có bộ lọc nào được áp dụng. Hãy nhập yêu cầu vào chat!
          </span>
        )}
      </div>
    </div>
  );
};
