import React from 'react';
import { Check, Minus, SlidersHorizontal, X, ArrowRight, Sparkles } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';
import { AMENITY_LABELS, formatArea, formatPriceMonthly, formatDistanceEn, formatVnd } from '@/shared/utils/format';
import { Amenity } from '@/domain/contracts';
import { Link } from 'react-router-dom';

const ALL_AMENITY_KEYS: Amenity[] = [
  'air_conditioner',
  'wifi',
  'parking',
  'private_bathroom',
  'balcony',
  'kitchen',
];

function formatRoomRef(id: string): string {
  if (id.startsWith('demo-room-')) {
    return `#${id.replace('demo-room-', '')}`;
  }
  if (id.startsWith('hanoi-room-')) {
    return `#HN${id.replace('hanoi-room-', '')}`;
  }
  return `#${id.slice(-4)}`;
}

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

  // Identify cheapest room
  const minPrice = Math.min(...selectedRooms.map((r) => r.priceMonthlyVnd));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in-50 duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <SlidersHorizontal className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                So sánh đối chiếu ({selectedRooms.length} phòng đã chọn)
              </h2>
              <p className="text-[11px] text-slate-500">
                So sánh trực tiếp giá thuê, khoảng cách tới trường và tiện ích đi kèm
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearComparison}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer"
            aria-label="Đóng bảng so sánh"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-5 sm:p-6">
          {/* Key Summary Highlights */}
          <div className="mb-5 p-4 rounded-xl bg-teal-50/60 border border-teal-200/70 text-xs text-slate-800 leading-relaxed space-y-1">
            <div className="font-bold text-xs text-teal-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Tóm tắt khác biệt chính từ AI TroMate:</span>
            </div>
            <p className="text-[11px] text-teal-900 leading-relaxed">
              Phòng <strong className="font-semibold">{selectedRooms[0].title}</strong> có giá{' '}
              <strong className="text-slate-950">{formatPriceMonthly(selectedRooms[0].priceMonthlyVnd)}</strong>, trong khi{' '}
              <strong className="font-semibold">{selectedRooms[1].title}</strong> có giá{' '}
              <strong className="text-slate-950">{formatPriceMonthly(selectedRooms[1].priceMonthlyVnd)}</strong>.
              {selectedRooms[0].petAllowed !== selectedRooms[1].petAllowed && (
                <span>
                  {' '}Về thú cưng: {selectedRooms[0].title} {selectedRooms[0].petAllowed ? 'cho phép nuôi' : 'không cho nuôi'}, khác với {selectedRooms[1].title}.
                </span>
              )}
            </p>
          </div>

          {/* Table */}
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-3 font-semibold text-slate-400 text-[11px] uppercase tracking-wider w-36 bg-slate-50/50 rounded-tl-lg">
                  Tiêu chí so sánh
                </th>
                {selectedRooms.map((room) => {
                  const isCheapest = room.priceMonthlyVnd === minPrice;
                  return (
                    <th key={room.id} className="p-3 font-bold text-slate-900 align-top">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 font-mono text-[11px]">Mã: {formatRoomRef(room.id)}</span>
                        <button
                          type="button"
                          onClick={() => toggleCompareRoom(room.id)}
                          className="text-slate-400 hover:text-rose-600 text-[11px] font-medium transition-colors cursor-pointer"
                          title="Bỏ khỏi bảng so sánh"
                        >
                          Xóa
                        </button>
                      </div>
                      <div className="font-semibold text-xs line-clamp-2 leading-snug">{room.title}</div>
                      {isCheapest && (
                        <span className="inline-block mt-1 text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.2 rounded-full">
                          Giá tốt nhất
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 font-semibold text-slate-600 bg-slate-50/50">Giá thuê hàng tháng</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3 font-extrabold text-slate-900 text-sm">
                    {formatPriceMonthly(r.priceMonthlyVnd)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-semibold text-slate-600 bg-slate-50/50">Phụ phí ước tính</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3 text-slate-700">
                    {r.utilitiesMonthlyEstimateVnd
                      ? `~${formatVnd(r.utilitiesMonthlyEstimateVnd)}/tháng`
                      : 'Hỏi trực tiếp chủ nhà'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-semibold text-slate-600 bg-slate-50/50">Diện tích phòng</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3 text-slate-800 font-medium">
                    {formatArea(r.areaM2)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-semibold text-slate-600 bg-slate-50/50">Khoảng cách tới trường</td>
                {selectedRooms.map((r) => {
                  const hit = lastSearchResult?.hits.find((h) => h.roomId === r.id);
                  return (
                    <td key={r.id} className="p-3 text-slate-700">
                      <div className="font-semibold text-teal-700 text-xs">{formatDistanceEn(hit?.distanceKm ?? null)}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{r.addressLabel}</div>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="p-3 font-semibold text-slate-600 bg-slate-50/50">Quy định thú cưng</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3">
                    {r.petAllowed === true ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Cho phép nuôi
                      </span>
                    ) : r.petAllowed === false ? (
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <X className="w-3.5 h-3.5 text-rose-500" /> Không nuôi thú cưng
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Thỏa thuận</span>
                    )}
                  </td>
                ))}
              </tr>

              {ALL_AMENITY_KEYS.map((amenity) => (
                <tr key={amenity}>
                  <td className="p-3 font-semibold text-slate-600 bg-slate-50/50">{AMENITY_LABELS[amenity]}</td>
                  {selectedRooms.map((r) => (
                    <td key={r.id} className="p-3">
                      {r.amenities.includes(amenity) ? (
                        <div className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Check className="w-4 h-4 text-emerald-600 font-bold" />
                          <span>Có</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Minus className="w-3.5 h-3.5 text-slate-300" />
                          <span>Không</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              <tr>
                <td className="p-3 font-semibold text-slate-600 bg-slate-50/50">Xem chi tiết</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3">
                    <Link
                      to={`/rooms/${r.id}`}
                      onClick={clearComparison}
                      className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold"
                    >
                      <span>Mở phòng {formatRoomRef(r.id)}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px]">* Dữ liệu đối chiếu trực tiếp từ hồ sơ phòng mẫu đã đăng tải.</span>
          <button
            type="button"
            onClick={clearComparison}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Hoàn tất xem
          </button>
        </div>
      </div>
    </div>
  );
};
