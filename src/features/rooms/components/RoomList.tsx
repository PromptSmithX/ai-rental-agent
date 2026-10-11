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
    <div className="flex flex-col h-full w-full min-w-0 bg-canvas">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-borderMuted bg-white flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-4 h-4 text-brand-600 shrink-0" />
          <span className="text-xs font-bold text-textPrimary truncate">
            Kết quả: <span className="text-brand-700">{rooms.length} phòng</span>
          </span>
          {unknownCoordCount > 0 && (
            <span
              className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full truncate"
              title={`${unknownCoordCount} phòng chưa có tọa độ nên không xuất hiện trên bản đồ`}
            >
              {unknownCoordCount} chưa có tọa độ
            </span>
          )}
        </div>

        {/* View Mode & Compare Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Card / Compact Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setCardVariant('card')}
              className={`p-1 rounded-md transition-colors ${
                cardVariant === 'card'
                  ? 'bg-white text-brand-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Dạng thẻ ảnh lớn"
              aria-label="Xem dạng thẻ"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCardVariant('compact')}
              className={`p-1 rounded-md transition-colors ${
                cardVariant === 'compact'
                  ? 'bg-white text-brand-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Dạng danh sách thu gọn"
              aria-label="Xem dạng thu gọn"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Sort */}
          <select
            value={currentFilters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value as SortByOption })}
            className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-slate-700 font-medium focus:outline-none cursor-pointer"
            aria-label="Sắp xếp kết quả"
          >
            <option value="recommended">Phù hợp</option>
            <option value="price_asc">Giá tăng</option>
            <option value="distance_asc">Gần nhất</option>
          </select>
        </div>
      </div>

      {/* Compare Banner Shortcut */}
      {comparingRoomIds.length > 0 && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900 shrink-0">
          <span className="font-medium">
            Đang chọn {comparingRoomIds.length} phòng so sánh
          </span>
          <button
            type="button"
            onClick={clearComparison}
            className="text-[11px] text-amber-700 hover:underline font-bold"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-w-0">
        {rooms.length === 0 ? (
          /* Empty state */
          <div className="p-6 text-center bg-white rounded-panel border border-borderMuted flex flex-col items-center justify-center my-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <FilterX className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-textPrimary mb-1">
              Chưa tìm thấy phòng mẫu phù hợp
            </h3>
            <p className="text-xs text-textMuted max-w-xs mb-5 leading-relaxed">
              Không có phòng nào trong dữ liệu mẫu đáp ứng toàn bộ các tiêu chí đang chọn cùng lúc.
            </p>

            {/* Contextual Relaxation Actions */}
            <div className="flex flex-col gap-1.5 w-full max-w-xs">
              {currentFilters.maxPriceVnd !== null && (
                <button
                  type="button"
                  onClick={() =>
                    updateFilters({ maxPriceVnd: (currentFilters.maxPriceVnd ?? 3000000) + 500000 })
                  }
                  className="text-xs bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-borderMuted py-2 px-3 rounded-input font-medium transition-colors"
                >
                  + Tăng ngân sách (+500.000 ₫)
                </button>
              )}

              {currentFilters.maxDistanceKm !== null && (
                <button
                  type="button"
                  onClick={() =>
                    updateFilters({ maxDistanceKm: (currentFilters.maxDistanceKm ?? 2) + 1 })
                  }
                  className="text-xs bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-borderMuted py-2 px-3 rounded-input font-medium transition-colors"
                >
                  + Mở rộng bán kính (+1 km)
                </button>
              )}

              {currentFilters.petAllowed !== null && (
                <button
                  type="button"
                  onClick={() => removeFilter('petAllowed')}
                  className="text-xs bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-borderMuted py-2 px-3 rounded-input font-medium transition-colors"
                >
                  Bỏ tiêu chí thú cưng
                </button>
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="text-xs bg-brand-600 hover:bg-brand-700 text-white py-2 px-3 rounded-input font-medium transition-colors flex items-center justify-center gap-1.5 mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đặt lại tất cả bộ lọc</span>
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
