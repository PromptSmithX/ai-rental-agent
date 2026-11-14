import React from 'react';
import {
  ArrowUpDown,
  Compass,
  DollarSign,
  GraduationCap,
  Maximize2,
  PawPrint,
  SlidersHorizontal,
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
    <div className="w-full bg-[#FAFAFA] border-b border-slate-200/90 px-3.5 py-2.5 sm:px-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
          <span>Active Filters</span>
        </div>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* Campus Chip */}
        {currentFilters.campusId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white text-slate-800 border border-slate-200 shadow-2xs font-medium">
            <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
            <span>{activeCampus?.campusName ?? currentFilters.campusId}</span>
            <button
              type="button"
              onClick={() => removeFilter('campusId')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100"
              aria-label="Remove campus filter"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Max Price Chip */}
        {currentFilters.maxPriceVnd !== null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white text-slate-800 border border-slate-200 shadow-2xs font-medium">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Budget ≤ {(currentFilters.maxPriceVnd / 1_000_000).toLocaleString('en-US')}M ₫/mo</span>
            <button
              type="button"
              onClick={() => removeFilter('maxPriceVnd')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100"
              aria-label="Remove price filter"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Max Distance Chip */}
        {currentFilters.maxDistanceKm !== null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white text-slate-800 border border-slate-200 shadow-2xs font-medium">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>Within {currentFilters.maxDistanceKm} km</span>
            <button
              type="button"
              onClick={() => removeFilter('maxDistanceKm')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100"
              aria-label="Remove distance filter"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Min Area Chip */}
        {currentFilters.minAreaM2 !== null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white text-slate-800 border border-slate-200 shadow-2xs font-medium">
            <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Area ≥ {currentFilters.minAreaM2} m²</span>
            <button
              type="button"
              onClick={() => removeFilter('minAreaM2')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100"
              aria-label="Remove area filter"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Pet Allowed Chip */}
        {currentFilters.petAllowed !== null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white text-slate-800 border border-slate-200 shadow-2xs font-medium">
            <PawPrint className="w-3.5 h-3.5 text-amber-600" />
            <span>{currentFilters.petAllowed ? 'Pets Allowed' : 'No Pets'}</span>
            <button
              type="button"
              onClick={() => removeFilter('petAllowed')}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100"
              aria-label="Remove pet policy filter"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Required Amenities Chips */}
        {currentFilters.requiredAmenities.map((amenity) => (
          <span
            key={amenity}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white text-slate-800 border border-slate-200 shadow-2xs font-medium"
          >
            <Wind className="w-3.5 h-3.5 text-slate-500" />
            <span>{AMENITY_LABELS[amenity]}</span>
            <button
              type="button"
              onClick={() => removeFilter('requiredAmenities', amenity)}
              className="text-slate-400 hover:text-slate-800 ml-0.5 rounded p-0.5 hover:bg-slate-100"
              aria-label={`Remove ${AMENITY_LABELS[amenity]}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Sort selector */}
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-white text-slate-700 border border-slate-200 shadow-2xs">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <select
            value={currentFilters.sortBy}
            onChange={(e) =>
              updateFilters({ sortBy: e.target.value as SearchFilters['sortBy'] })
            }
            className="bg-transparent font-medium cursor-pointer focus:outline-none text-slate-800 text-xs"
            aria-label="Sort order selector"
          >
            <option value="recommended">Sort: Best Match</option>
            <option value="price_asc">Sort: Lowest Price</option>
            <option value="distance_asc">Sort: Nearest Campus</option>
          </select>
        </div>

        {!hasAnyFilter && (
          <span className="text-xs text-slate-400 italic">
            No active filters. Enter your requirements in chat or choose a campus to filter listings.
          </span>
        )}
      </div>
    </div>
  );
};
