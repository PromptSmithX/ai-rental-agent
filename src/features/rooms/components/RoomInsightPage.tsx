import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Heart,
  ImageOff,
  ShieldCheck,
} from 'lucide-react';
import { RoomView } from '@/domain/contracts';
import { roomRepository } from '@/services/rooms';
import { useSearchStore } from '@/app/store/searchStore';
import {
  AMENITY_LABELS,
  formatArea,
  formatPriceMonthly,
  formatVnd,
  LOCATION_ACCURACY_LABELS,
} from '@/shared/utils/format';
import { calculateAirDistanceKm } from '@/shared/utils/distance';

function formatRoomRef(id: string): string {
  if (id.startsWith('demo-room-')) {
    return `#${id.replace('demo-room-', '')}`;
  }
  if (id.startsWith('hanoi-room-')) {
    return `#HN${id.replace('hanoi-room-', '')}`;
  }
  return `#${id.slice(-4)}`;
}

export const RoomInsightPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentFilters, allCampuses, toggleCompareRoom, comparingRoomIds } = useSearchStore();

  const [room, setRoom] = useState<RoomView | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      roomRepository.getById(id).then((data) => {
        setRoom(data);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.75rem)] flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-[calc(100vh-3.75rem)] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-base font-bold text-slate-800 mb-1">Property Not Found</h2>
        <p className="text-xs text-slate-500 mb-4">The requested rental property is no longer available.</p>
        <button
          onClick={() => navigate('/workspace')}
          className="px-3.5 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium"
        >
          Browse All Rentals
        </button>
      </div>
    );
  }

  const campus = allCampuses.find((c) => c.id === currentFilters.campusId);
  const distanceKm =
    campus && room.latitude !== null && room.longitude !== null
      ? calculateAirDistanceKm(campus.latitude, campus.longitude, room.latitude, room.longitude)
      : null;

  const accuracy = LOCATION_ACCURACY_LABELS[room.locationAccuracy];
  const isComparing = comparingRoomIds.includes(room.id);

  // Generate grounded insights based on actual room data & currentFilters
  const matchHighlights: string[] = [];
  if (currentFilters.maxPriceVnd && room.priceMonthlyVnd <= currentFilters.maxPriceVnd) {
    matchHighlights.push(
      `Fits within your target budget (rent ${formatPriceMonthly(room.priceMonthlyVnd)} ≤ ${(currentFilters.maxPriceVnd / 1_000_000).toLocaleString('en-US')}M ₫/mo).`
    );
  }
  if (distanceKm !== null && currentFilters.maxDistanceKm && distanceKm <= currentFilters.maxDistanceKm) {
    matchHighlights.push(
      `Convenient commute: approximately ${distanceKm} km from ${campus?.campusName}.`
    );
  }
  if (room.petAllowed === true) {
    matchHighlights.push('Pet-friendly accommodation: cats and small pets are welcome.');
  }
  if (room.amenities.includes('air_conditioner')) {
    matchHighlights.push('Equipped with modern air conditioning.');
  }
  if (room.amenities.includes('private_bathroom')) {
    matchHighlights.push('Features an ensuite private bathroom.');
  }

  return (
    <div className="min-h-[calc(100vh-3.75rem)] bg-[#FAFAFA] py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Navigation bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Rentals</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCompareRoom(room.id)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                isComparing
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
              <span>{isComparing ? 'Comparing' : 'Compare'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSaved(!isSaved)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                isSaved
                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Gallery Section */}
          <div className="relative bg-slate-900 aspect-[16/9] max-h-[380px] overflow-hidden">
            {room.imageUrls.length > 0 ? (
              <img
                src={room.imageUrls[activeImageIdx] || room.imageUrls[0]}
                alt={room.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <ImageOff className="w-10 h-10 mb-2 text-slate-500" />
                <span className="text-xs font-medium">Photos being updated by host</span>
              </div>
            )}

            {/* Thumbnail dots if multiple */}
            {room.imageUrls.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {room.imageUrls.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      activeImageIdx === idx ? 'bg-white scale-125' : 'bg-white/50'
                    }`}
                    aria-label={`Show photo ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6">
            {/* Title & Price Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">
                    Ref: {formatRoomRef(room.id)}
                  </span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-md border font-medium ${accuracy.badgeClass}`}>
                    {accuracy.label}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {room.title}
                </h1>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <span>{room.addressLabel}</span>
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 block">
                  {formatPriceMonthly(room.priceMonthlyVnd)}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  {room.utilitiesMonthlyEstimateVnd
                    ? `Estimated utilities: ~${formatVnd(room.utilitiesMonthlyEstimateVnd)}/mo`
                    : 'Utilities: Inquire with host'}
                </span>
              </div>
            </div>

            {/* Match Highlights Panel */}
            {matchHighlights.length > 0 && (
              <section className="my-5 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                    Why This Property Fits Your Search
                  </h2>
                  <span className="text-[10px] bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium">
                    Matched Search
                  </span>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc leading-relaxed">
                  {matchHighlights.map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Key Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4 border-b border-slate-200 text-xs">
              <div className="p-3 rounded-lg bg-[#F8F9FA] border border-slate-200">
                <span className="text-slate-400 block mb-1 text-[11px]">Floor Area</span>
                <span className="font-semibold text-slate-900 text-xs">{formatArea(room.areaM2)}</span>
              </div>

              <div className="p-3 rounded-lg bg-[#F8F9FA] border border-slate-200">
                <span className="text-slate-400 block mb-1 text-[11px]">Distance to Campus</span>
                <span className="font-semibold font-mono text-slate-900 text-xs">
                  {distanceKm !== null ? `~${distanceKm} km` : 'Campus area'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Straight-line</span>
              </div>

              <div className="p-3 rounded-lg bg-[#F8F9FA] border border-slate-200">
                <span className="text-slate-400 block mb-1 text-[11px]">Pet Policy</span>
                <span className="font-semibold text-slate-900 text-xs">
                  {room.petAllowed === true ? 'Allowed' : room.petAllowed === false ? 'No Pets' : 'Ask Host'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#F8F9FA] border border-slate-200">
                <span className="text-slate-400 block mb-1 text-[11px]">Availability</span>
                <span className="font-semibold text-emerald-700 text-xs">Available Now</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Ready for move-in</span>
              </div>
            </div>

            {/* Amenities Section */}
            <div className="py-5 border-b border-slate-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Included Amenities
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {room.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 p-2 rounded-md bg-[#F8F9FA] border border-slate-200 text-slate-800 font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{AMENITY_LABELS[amenity]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Safety Tip */}
            <div className="pt-5 text-xs text-slate-500 space-y-2">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-slate-700">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="text-slate-900">Student Rental Tip:</strong> Always visit the property in person, confirm utility meters, and review lease terms thoroughly with your landlord before making deposit payments.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
