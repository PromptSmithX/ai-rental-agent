import React from 'react';
import { Check, Minus, SlidersHorizontal, X } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';
import { AMENITY_LABELS, formatArea, formatPriceMonthly, formatDistanceEn } from '@/shared/utils/format';
import { Amenity } from '@/domain/contracts';

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-[#F8F9FA] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Compare Properties ({selectedRooms.length} selected)
              </h2>
              <p className="text-[11px] text-slate-500">
                Direct comparison of monthly rent, location, and included features
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearComparison}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition-colors"
            aria-label="Close comparison modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comparison Table Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-5 sm:p-6">
          {/* Friendly Summary */}
          <div className="mb-5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
            <div className="font-semibold text-xs mb-1 text-slate-900">
              Key Highlights:
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Property <strong className="text-slate-900 font-medium">{selectedRooms[0].title}</strong> is listed at{' '}
              <strong>{formatPriceMonthly(selectedRooms[0].priceMonthlyVnd)}</strong>, while{' '}
              <strong className="text-slate-900 font-medium">{selectedRooms[1].title}</strong> is{' '}
              <strong>{formatPriceMonthly(selectedRooms[1].priceMonthlyVnd)}</strong>.
              {selectedRooms[0].petAllowed === true && selectedRooms[1].petAllowed === false && (
                <span> {selectedRooms[0].title} allows pets, whereas {selectedRooms[1].title} does not.</span>
              )}
              {selectedRooms[0].areaM2 && selectedRooms[1].areaM2 && (
                <span> Floor area: {selectedRooms[0].areaM2} m² vs {selectedRooms[1].areaM2} m².</span>
              )}
            </p>
          </div>

          {/* Table */}
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-3 font-semibold text-slate-400 text-[11px] uppercase tracking-wider w-36">
                  Features
                </th>
                {selectedRooms.map((room) => (
                  <th key={room.id} className="p-3 font-bold text-slate-900">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium text-xs">Ref: {formatRoomRef(room.id)}</span>
                      <button
                        type="button"
                        onClick={() => toggleCompareRoom(room.id)}
                        className="text-slate-400 hover:text-rose-600 text-[10px] font-normal"
                        title="Remove from comparison"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="font-semibold text-xs line-clamp-2 mt-1">{room.title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 font-medium text-slate-500">Monthly Rent</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3 font-bold font-mono text-slate-900 text-xs">
                    {formatPriceMonthly(r.priceMonthlyVnd)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-medium text-slate-500">Utilities</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3 text-slate-700">
                    {r.utilitiesMonthlyEstimateVnd
                      ? `~${(r.utilitiesMonthlyEstimateVnd / 1_000).toLocaleString('en-US')}k ₫/mo`
                      : 'Included / On request'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-medium text-slate-500">Floor Area</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3 text-slate-700 font-medium">
                    {formatArea(r.areaM2)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-medium text-slate-500">Campus Distance</td>
                {selectedRooms.map((r) => {
                  const hit = lastSearchResult?.hits.find((h) => h.roomId === r.id);
                  return (
                    <td key={r.id} className="p-3 text-slate-700">
                      <div className="font-mono text-xs">{formatDistanceEn(hit?.distanceKm ?? null)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.addressLabel}</div>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="p-3 font-medium text-slate-500">Pet Policy</td>
                {selectedRooms.map((r) => (
                  <td key={r.id} className="p-3">
                    {r.petAllowed === true ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Allowed
                      </span>
                    ) : r.petAllowed === false ? (
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> No Pets
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Inquire with host</span>
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
                        <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-[#F8F9FA] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px]">* All specifications provided directly by property hosts.</span>
          <button
            type="button"
            onClick={clearComparison}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
