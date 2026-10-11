import { Bot, Check, Minus, Sparkles, X } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';
import { AMENITY_LABELS, formatArea, formatPriceMonthly, formatDistanceVi } from '@/shared/utils/format';
import { Amenity } from '@/domain/contracts';

const ALL_AMENITY_KEYS: Amenity[] = [
  'air_conditioner',
  'wifi',
  'parking',
  'private_bathroom',
  'balcony',
  'kitchen',
];

export const RoomCompareModal: React.FC = () => {
  const { comparingRoomIds, clearComparison, toggleCompareRoom, allRooms, lastSearchResult } =
    useSearchStore();

  if (comparingRoomIds.length < 2) {
    return null;
  }

  const selectedRooms = comparingRoomIds
    .map((id) => allRooms.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  if (selectedRooms.length < 2) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-panel border border-borderMuted shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-borderMuted flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-textPrimary leading-tight">
                So sánh chi tiết {selectedRooms.length} phòng trọ
              </h2>
              <p className="text-xs text-textMuted">
                Đối chiếu các thuộc tính đã biết dựa trên dữ liệu mẫu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearComparison}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
            aria-label="Đóng bảng so sánh"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          {/* AI Grounded Summary */}
          <div className="mb-6 p-4 rounded-card bg-brand-50/80 border border-brand-200 text-xs text-brand-950 leading-relaxed flex items-start gap-3">
            <Bot className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm mb-1 text-brand-900">
                AI Nhận định so sánh:
              </div>
              <p>
                Phòng{' '}
                <strong className="text-brand-900">{selectedRooms[0].id}</strong> có giá{' '}
                <strong>{formatPriceMonthly(selectedRooms[0].priceMonthlyVnd)}</strong>, trong khi phòng{' '}
                <strong className="text-brand-900">{selectedRooms[1].id}</strong> có giá{' '}
                <strong>{formatPriceMonthly(selectedRooms[1].priceMonthlyVnd)}</strong>.
                {selectedRooms[0].petAllowed === true && selectedRooms[1].petAllowed === false && (
                  <span> Đặc biệt, phòng {selectedRooms[0].id} cho phép nuôi thú cưng, còn phòng {selectedRooms[1].id} thì không.</span>
                )}
                {selectedRooms[0].areaM2 && selectedRooms[1].areaM2 && (
                  <span> Về diện tích: {selectedRooms[0].areaM2} m² so với {selectedRooms[1].areaM2} m².</span>
                )}
              </p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-3 font-semibold text-slate-500 w-36">Tiêu chí</th>
                {selectedRooms.map((room) => (
                  <th key={room.id} className="p-3 font-bold text-slate-900">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-brand-700 text-xs">[{room.id}]</span>
                      <button
                        type="button"
                        onClick={() => toggleCompareRoom(room.id)}
                        className="text-slate-400 hover:text-red-600 text-[10px]"
                        title="Bỏ phòng này"
                      >
                        Bỏ
                      </button>
                    </div>
                    <div className="font-semibold text-sm line-clamp-2 mt-1">{room.title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 font-medium text-slate-500">Giá thuê niêm yết</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3 font-extrabold text-brand-700 text-sm">
                    {formatPriceMonthly(r.priceMonthlyVnd)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-medium text-slate-500">Ước tính phụ phí</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3 text-slate-700">
                    {r.utilitiesMonthlyEstimateVnd
                      ? `~${(r.utilitiesMonthlyEstimateVnd / 1_000).toLocaleString('vi-VN')}k/tháng`
                      : 'Chưa có thông tin'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-medium text-slate-500">Diện tích</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3 text-slate-700 font-medium">
                    {formatArea(r.areaM2)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-medium text-slate-500">Vị trí & Khoảng cách</td>
                {selectedRooms.map((r) => {
                  const hit = lastSearchResult?.hits.find((h) => h.roomId === r.id);
                  return (
                    <td key={r.id} className="p-3 text-slate-700">
                      <div>{formatDistanceVi(hit?.distanceKm ?? null)}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{r.addressLabel}</div>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="p-3 font-medium text-slate-500">Chính sách thú cưng</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3">
                    {r.petAllowed === true ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Được nuôi thú cưng
                      </span>
                    ) : r.petAllowed === false ? (
                      <span className="text-red-700 font-semibold flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Không nuôi thú cưng
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Chưa có thông tin</span>
                    )}
                  </td>
                ))}
              </tr>

              {ALL_AMENITY_KEYS.map((amenity) => (
                <tr key={amenity}>
                  <td className="p-3 font-medium text-slate-500">{AMENITY_LABELS[amenity]}</td>
                  {selectedRooms.map((r) => (
                    <td key={r.id} className="p-3">
                      {r.amenities.includes(amenity) ? (
                        <Check className="w-4 h-4 text-emerald-600 font-bold" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-300" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-borderMuted bg-slate-50 flex items-center justify-between text-xs text-textMuted shrink-0">
          <span>* Các thông tin thiếu được giữ nguyên "Chưa có thông tin", không suy đoán.</span>
          <button
            type="button"
            onClick={clearComparison}
            className="px-4 py-2 bg-slate-900 text-white rounded-input font-medium hover:bg-slate-800 transition-colors"
          >
            Đóng bảng
          </button>
        </div>
      </div>
    </div>
  );
};
