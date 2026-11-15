import React, { useState } from 'react';
import { FilterX, LayoutGrid, LayoutList, Layers, RefreshCw, FileSpreadsheet } from 'lucide-react';
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
    <div className="flex flex-col h-full w-full min-w-0 bg-slate-50/70">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="text-xs font-bold text-slate-900 truncate">
            Danh sách: <span className="font-semibold text-slate-900">{rooms.length} phòng trọ</span>
          </span>
          {unknownCoordCount > 0 && (
            <span
              className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium truncate"
              title={`${unknownCoordCount} phòng trọ chưa có tọa độ chính xác, hiển thị đầy đủ trong danh sách`}
            >
              {unknownCoordCount} vị trí khu vực
            </span>
          )}
        </div>

        {/* View Mode & Sorting Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Card / Compact Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => setCardVariant('card')}
              className={`p-1.5 rounded-md transition-all ${
                cardVariant === 'card'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Dạng thẻ lớn"
              aria-label="Chuyển sang dạng thẻ lớn"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCardVariant('compact')}
              className={`p-1.5 rounded-md transition-all ${
                cardVariant === 'compact'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Dạng danh sách thu gọn"
              aria-label="Chuyển sang dạng thu gọn"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Sort */}
          <select
            value={currentFilters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value as SortByOption })}
            className="text-xs bg-white border border-slate-200/90 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-300 cursor-pointer shadow-xs"
            aria-label="Sắp xếp danh sách phòng"
          >
            <option value="recommended">Phù hợp nhất</option>
            <option value="price_asc">Giá: Thấp đến cao</option>
            <option value="distance_asc">Gần trường nhất</option>
          </select>
        </div>
      </div>

      {/* Compare Banner Shortcut */}
      {comparingRoomIds.length > 0 && (
        <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between text-xs shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">
              Đang chọn so sánh <strong className="text-amber-300">{comparingRoomIds.length}</strong> phòng
            </span>
          </div>
          <button
            type="button"
            onClick={clearComparison}
            className="text-[11px] text-slate-300 hover:text-white underline font-medium cursor-pointer"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-w-0">
        {rooms.length === 0 ? (
          /* Empty state */
          <div className="p-6 text-center bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center my-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <FilterX className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 mb-1">
              Chưa có phòng nào khớp với toàn bộ tiêu chí
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mb-5 leading-relaxed">
              Bạn có thể linh hoạt nới lỏng ngân sách hoặc mở rộng bán kính tìm kiếm quanh cơ sở trường.
            </p>

            {/* Contextual Relaxation Actions */}
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {currentFilters.maxPriceVnd !== null && (
                <button
                  type="button"
                  onClick={() =>
                    updateFilters({ maxPriceVnd: (currentFilters.maxPriceVnd ?? 3000000) + 500000 })
                  }
                  className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 px-3 rounded-lg font-medium transition-colors"
                >
                  + Tăng mức ngân sách (+500.000 ₫)
                </button>
              )}

              {currentFilters.maxDistanceKm !== null && (
                <button
                  type="button"
                  onClick={() =>
                    updateFilters({ maxDistanceKm: (currentFilters.maxDistanceKm ?? 2) + 1 })
                  }
                  className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 px-3 rounded-lg font-medium transition-colors"
                >
                  + Mở rộng bán kính tìm kiếm (+1 km)
                </button>
              )}

              {currentFilters.petAllowed !== null && (
                <button
                  type="button"
                  onClick={() => removeFilter('petAllowed')}
                  className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 px-3 rounded-lg font-medium transition-colors"
                >
                  Bỏ ràng buộc nuôi thú cưng
                </button>
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 mt-1 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đặt lại toàn bộ tiêu chí</span>
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
