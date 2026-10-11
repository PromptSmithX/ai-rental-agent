import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Heart,
  ImageOff,
  ShieldAlert,
  Sparkles,
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-canvas">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Không tìm thấy thông tin phòng</h2>
        <p className="text-xs text-textMuted mb-4">Mã phòng [{id}] không tồn tại trong dữ liệu mẫu.</p>
        <button
          onClick={() => navigate('/workspace')}
          className="px-4 py-2 bg-brand-600 text-white rounded-input text-xs font-medium"
        >
          Quay lại Workspace
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

  // Generate grounded AI insights based on actual room data & currentFilters
  const aiInsights: string[] = [];
  if (currentFilters.maxPriceVnd && room.priceMonthlyVnd <= currentFilters.maxPriceVnd) {
    aiInsights.push(
      `Phù hợp với ngân sách bạn đang tìm (giá ${formatPriceMonthly(room.priceMonthlyVnd)} ≤ ${(currentFilters.maxPriceVnd / 1_000_000).toLocaleString('vi-VN')}tr).`
    );
  }
  if (distanceKm !== null && currentFilters.maxDistanceKm && distanceKm <= currentFilters.maxDistanceKm) {
    aiInsights.push(
      `Nằm trong bán kính tìm kiếm (~${distanceKm} km đường chim bay so với ${campus?.campusName}).`
    );
  }
  if (room.petAllowed === true) {
    aiInsights.push('Cho phép nuôi thú cưng (phù hợp nếu bạn cần mang theo chó/mèo).');
  }
  if (room.amenities.includes('air_conditioner')) {
    aiInsights.push('Đã trang bị sẵn máy lạnh.');
  }
  if (room.utilitiesMonthlyEstimateVnd === null) {
    aiInsights.push('Lưu ý: Tin đăng chưa niêm yết rõ chi phí điện, nước, internet; bạn nên hỏi kỹ chủ nhà trước khi cọc.');
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Navigation bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-700 bg-white px-3 py-1.5 rounded-lg border border-borderMuted shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại kết quả tìm kiếm</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCompareRoom(room.id)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                isComparing
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                  : 'bg-white text-slate-700 border-borderMuted hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>{isComparing ? 'Đã chọn so sánh' : 'Thêm vào so sánh'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSaved(!isSaved)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                isSaved
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-white text-slate-700 border-borderMuted hover:bg-slate-50'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
              <span>{isSaved ? 'Đã lưu' : 'Lưu tin'}</span>
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="bg-white rounded-panel border border-borderMuted shadow-sm overflow-hidden">
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
                <ImageOff className="w-12 h-12 mb-2 text-slate-500" />
                <span className="text-sm font-medium">Chưa có ảnh trong tin mẫu</span>
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
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      activeImageIdx === idx ? 'bg-white scale-125' : 'bg-white/50'
                    }`}
                    aria-label={`Xem ảnh ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-6">
            {/* Title & Price Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-borderMuted">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs text-brand-700 font-bold bg-brand-50 px-2 py-0.5 rounded">
                    Mã phòng: {room.id}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${accuracy.badgeClass}`}>
                    {accuracy.label}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-textPrimary leading-snug">
                  {room.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1">
                  <span>{room.addressLabel}</span>
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-2xl font-black text-brand-700 block">
                  {formatPriceMonthly(room.priceMonthlyVnd)}
                </span>
                <span className="text-xs text-textMuted block mt-0.5">
                  {room.utilitiesMonthlyEstimateVnd
                    ? `Ước tính phụ phí: ~${formatVnd(room.utilitiesMonthlyEstimateVnd)}/tháng`
                    : 'Phụ phí điện nước: Chưa rõ'}
                </span>
              </div>
            </div>

            {/* AI Grounded Insight Panel */}
            <section className="my-6 p-4 rounded-card bg-brand-50/70 border border-brand-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-bold text-brand-900">
                  AI Giải thích vì sao phòng này phù hợp với bạn
                </h2>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                  Grounded
                </span>
              </div>

              <ul className="space-y-1.5 text-xs text-brand-950 pl-7 list-disc">
                {aiInsights.map((insight, idx) => (
                  <li key={idx}>{insight}</li>
                ))}
              </ul>
            </section>

            {/* Key Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-borderMuted text-xs">
              <div className="p-3 rounded-card bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block mb-1">Diện tích</span>
                <span className="font-bold text-slate-800 text-sm">{formatArea(room.areaM2)}</span>
              </div>

              <div className="p-3 rounded-card bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block mb-1">Khoảng cách tới trường</span>
                <span className="font-bold text-brand-700 text-sm">
                  {distanceKm !== null ? `~${distanceKm} km` : 'Chưa rõ'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Đường chim bay</span>
              </div>

              <div className="p-3 rounded-card bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block mb-1">Thú cưng</span>
                <span className="font-bold text-slate-800 text-sm">
                  {room.petAllowed === true ? 'Cho phép nuôi' : room.petAllowed === false ? 'Không cho nuôi' : 'Chưa rõ'}
                </span>
              </div>

              <div className="p-3 rounded-card bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block mb-1">Tình trạng tin</span>
                <span className="font-bold text-slate-800 text-sm">Tin mẫu (Demo)</span>
                <span className="text-[10px] text-amber-700 block mt-0.5">Chưa xác minh</span>
              </div>
            </div>

            {/* Amenities Section */}
            <div className="py-6 border-b border-borderMuted">
              <h2 className="text-sm font-bold text-textPrimary mb-3">Tiện nghi phòng</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {room.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 p-2.5 rounded-card bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{AMENITY_LABELS[amenity]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source & Trust Verification Block */}
            <div className="pt-6 text-xs text-textMuted space-y-2">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                Nguồn dữ liệu & Minh bạch thông tin
              </h3>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-card space-y-1">
                <div className="flex items-start gap-1.5 text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Cảnh báo an toàn:</strong> Đây là bản prototype thử nghiệm công nghệ. 
                    Tất cả các tin đăng, hình ảnh và vị trí đều là <strong>dữ liệu giả lập</strong>.
                    Hệ thống không cung cấp tính năng liên hệ chủ nhà hoặc đặt cọc giữ chỗ.
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Kiểm tra lần cuối: {room.lastCheckedAt ? new Date(room.lastCheckedAt).toLocaleDateString('vi-VN') : 'Chưa rõ'} · Nguồn tin: {room.sourceKind}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
