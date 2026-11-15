import React from 'react';
import {
  ArrowUpDown,
  Compass,
  GraduationCap,
  Maximize2,
  PawPrint,
  SlidersHorizontal,
  Wallet,
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
    <div className="w-full bg-slate-50/80 border-b border-slate-200/80 px-4 py-2.5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
          <span>Tiêu chí đang áp dụng</span>
          {hasAnyFilter && (
            <span className="text-[10px] bg-teal-50 text-teal-700 font-semibold px-1.5 py-0.2 rounded-full border border-teal-200/60">
              Đang lọc
            </span>
          )}
        </div>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-slate-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
          >
            Đặt lại tất cả
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Campus Chip */}
        {currentFilters.campusId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white text-slate-800 border border-slate-200/90 shadow-xs font-medium">
            <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
            <span className="max-w-[200px] truncate">{activeCampus?.campusName ?? currentFilters.campusId}</span>
            <button
              type="button"
              onClick={() => removeFilter('campusId')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100 transition-colors"
              aria-label="Xóa bộ lọc cơ sở trường"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Max Price Chip */}
        {currentFilters.maxPriceVnd !== null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white text-slate-800 border border-slate-200/90 shadow-xs font-medium">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ngân sách ≤ {(currentFilters.maxPriceVnd / 1_000_000).toLocaleString('vi-VN')} tr/tháng</span>
            <button
              type="button"
              onClick={() => removeFilter('maxPriceVnd')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100 transition-colors"
              aria-label="Xóa bộ lọc giá"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Max Distance Chip */}
        {currentFilters.maxDistanceKm !== null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white text-slate-800 border border-slate-200/90 shadow-xs font-medium">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>Trong bán kính {currentFilters.maxDistanceKm} km</span>
            <button
              type="button"
              onClick={() => removeFilter('maxDistanceKm')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100 transition-colors"
              aria-label="Xóa bộ lọc khoảng cách"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Min Area Chip */}
        {currentFilters.minAreaM2 !== null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white text-slate-800 border border-slate-200/90 shadow-xs font-medium">
            <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Diện tích ≥ {currentFilters.minAreaM2} m²</span>
            <button
              type="button"
              onClick={() => removeFilter('minAreaM2')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100 transition-colors"
              aria-label="Xóa bộ lọc diện tích"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Pet Allowed Chip */}
        {currentFilters.petAllowed !== null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white text-slate-800 border border-slate-200/90 shadow-xs font-medium">
            <PawPrint className="w-3.5 h-3.5 text-amber-600" />
            <span>{currentFilters.petAllowed ? 'Cho nuôi thú cưng' : 'Không nuôi pet'}</span>
            <button
              type="button"
              onClick={() => removeFilter('petAllowed')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100 transition-colors"
              aria-label="Xóa điều kiện thú cưng"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Required Amenities Chips */}
        {currentFilters.requiredAmenities.map((amenity) => (
          <span
            key={amenity}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white text-slate-800 border border-slate-200/90 shadow-xs font-medium"
          >
            <Wind className="w-3.5 h-3.5 text-teal-600" />
            <span>{AMENITY_LABELS[amenity]}</span>
            <button
              type="button"
              onClick={() => removeFilter('requiredAmenities', amenity)}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100 transition-colors"
              aria-label={`Bỏ chọn ${AMENITY_LABELS[amenity]}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Sort selector */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white text-slate-700 border border-slate-200/90 shadow-xs ml-auto">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <select
            value={currentFilters.sortBy}
            onChange={(e) =>
              updateFilters({ sortBy: e.target.value as SearchFilters['sortBy'] })
            }
            className="bg-transparent font-medium cursor-pointer focus:outline-none text-slate-800 text-xs"
            aria-label="Thứ tự sắp xếp phòng"
          >
            <option value="recommended">Ưu tiên: Phù hợp nhất</option>
            <option value="price_asc">Giá: Thấp đến cao</option>
            <option value="distance_asc">Khoảng cách: Gần trường nhất</option>
          </select>
        </div>

        {!hasAnyFilter && (
          <span className="text-xs text-slate-400 italic">
            Chưa có bộ lọc nào. Bạn có thể trò chuyện với AI để tinh chỉnh hoặc chọn tiêu chí mong muốn.
          </span>
        )}
      </div>
    </div>
  );
};
