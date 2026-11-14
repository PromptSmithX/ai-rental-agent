import React, { useState } from 'react';
import { FilterX, LayoutGrid, LayoutList, Layers, RefreshCw } from 'lucide-react';
import { RoomSearchHit, RoomView, SortByOption } from '@/domain/contracts';
import { useSearchStore } from '@/app/store/searchStore';
import { RoomCard } from './RoomCard';

interface RoomListProps {
  rooms: (RoomView & { hit: RoomSearchHit })[];
}

export const RoomList: React.FC<RoomListProps> = ({ rooms }) => {
  const {
    currentFilters,
    updateFilters,
    removeFilter,
    resetFilters,
    comparingRoomIds,
    clearComparison,
  } = useSearchStore();

  const [cardVariant, setCardVariant] = useState<'card' | 'compact'>('card');

  const unknownCoordCount = rooms.filter((r) => r.latitude === null || r.longitude === null).length;

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-[#FAFAFA]">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-3.5 h-3.5 text-slate-700 shrink-0" />
          <span className="text-xs font-bold text-slate-900 truncate">
            Available: <span className="font-semibold text-slate-900">{rooms.length} rentals</span>
          </span>
          {unknownCoordCount > 0 && (
            <span
              className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium truncate"
              title={`${unknownCoordCount} listing(s) are located in the broader university district`}
            >
              {unknownCoordCount} district area
            </span>
          )}
        </div>

        {/* View Mode & Compare Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Card / Compact Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setCardVariant('card')}
              className={`p-1 rounded transition-colors ${
                cardVariant === 'card'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Full card view"
              aria-label="Switch to full card view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCardVariant('compact')}
              className={`p-1 rounded transition-colors ${
                cardVariant === 'compact'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Compact list view"
              aria-label="Switch to compact list view"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Sort */}
          <select
            value={currentFilters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value as SortByOption })}
            className="text-[11px] bg-white border border-slate-200 rounded-md px-1.5 py-1 text-slate-800 font-medium focus:outline-none cursor-pointer"
            aria-label="Sort listings"
          >
            <option value="recommended">Best Match</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="distance_asc">Nearest Campus</option>
          </select>
        </div>
      </div>

      {/* Compare Banner Shortcut */}
      {comparingRoomIds.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-900 text-white flex items-center justify-between text-xs shrink-0">
          <span className="font-medium">
            Comparing {comparingRoomIds.length} properties
          </span>
          <button
            type="button"
            onClick={clearComparison}
            className="text-[11px] text-slate-300 hover:text-white underline font-medium"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-w-0">
        {rooms.length === 0 ? (
          /* Empty state */
          <div className="p-6 text-center bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center my-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <FilterX className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-xs text-slate-900 mb-1">
              No rooms match all current filters
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xs mb-5 leading-relaxed">
              No listings currently satisfy all combined constraints. You can broaden your search without starting over.
            </p>

            {/* Contextual Relaxation Actions */}
            <div className="flex flex-col gap-1.5 w-full max-w-xs">
              {currentFilters.maxPriceVnd !== null && (
                <button
                  type="button"
                  onClick={() =>
                    updateFilters({ maxPriceVnd: (currentFilters.maxPriceVnd ?? 3000000) + 500000 })
                  }
                  className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-md font-medium transition-colors"
                >
                  + Increase Budget (+500,000 ₫)
                </button>
              )}

              {currentFilters.maxDistanceKm !== null && (
                <button
                  type="button"
                  onClick={() =>
                    updateFilters({ maxDistanceKm: (currentFilters.maxDistanceKm ?? 2) + 1 })
                  }
                  className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-md font-medium transition-colors"
                >
                  + Expand Search Radius (+1 km)
                </button>
              )}

              {currentFilters.petAllowed !== null && (
                <button
                  type="button"
                  onClick={() => removeFilter('petAllowed')}
                  className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-md font-medium transition-colors"
                >
                  Clear Pet Policy Constraint
                </button>
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomCard key={room.id} room={room} variant={cardVariant} />
          ))
        )}
      </div>
    </div>
  );
};
