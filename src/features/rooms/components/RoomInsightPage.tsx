import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Compass,
  FileSpreadsheet,
  Heart,
  ImageOff,
  Info,
  MapPin,
  ShieldCheck,
  Sparkles,
  Zap,
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
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500">Đang tải thông tin chi tiết phòng...</span>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <h2 className="text-base font-bold text-slate-800 mb-1">Không tìm thấy phòng trọ</h2>
        <p className="text-xs text-slate-500 mb-4">Mã phòng này không tồn tại hoặc đã ngừng hiển thị.</p>
        <button
          onClick={() => navigate('/workspace')}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
        >
          Quay lại danh sách phòng
        </button>
      </div>
    );
  }

  const campus = allCampuses.find((c) => c.id === currentFilters.campusId) ?? allCampuses[0];
  const distanceKm =
    campus && room.latitude !== null && room.longitude !== null
      ? calculateAirDistanceKm(campus.latitude, campus.longitude, room.latitude, room.longitude)
      : null;

  const accuracy = LOCATION_ACCURACY_LABELS[room.locationAccuracy];
  const isComparing = comparingRoomIds.includes(room.id);

  // Generate grounded insights based on actual room data & currentFilters
  const matchHighlights: string[] = [];
  const caveats: string[] = [];

  if (currentFilters.maxPriceVnd && room.priceMonthlyVnd <= currentFilters.maxPriceVnd) {
    matchHighlights.push(
      `Phù hợp với ngân sách mục tiêu (giá thuê ${formatPriceMonthly(room.priceMonthlyVnd)} ≤ ${(currentFilters.maxPriceVnd / 1_000_000).toLocaleString('vi-VN')} tr/tháng).`
    );
  }
  if (distanceKm !== null && currentFilters.maxDistanceKm && distanceKm <= currentFilters.maxDistanceKm) {
    matchHighlights.push(
      `Khoảng cách thuận tiện: cách ${campus?.campusName} khoảng ~${distanceKm} km đường chim bay.`
    );
  }
  if (room.petAllowed === true) {
    matchHighlights.push('Cho phép nuôi thú cưng: phòng trọ chấp nhận nuôi mèo hoặc cún nhỏ.');
  }
  if (room.amenities.includes('air_conditioner')) {
    matchHighlights.push('Đã trang bị sẵn máy lạnh mát mẻ.');
  }
  if (room.amenities.includes('private_bathroom')) {
    matchHighlights.push('Nhà vệ sinh riêng biệt, đảm bảo sự riêng tư.');
  }
  if (room.amenities.includes('balcony')) {
    matchHighlights.push('Có ban công thoáng gió, đón ánh sáng tự nhiên.');
  }

  // Grounded Caveats
  if (room.locationAccuracy === 'approximate') {
    caveats.push('Tọa độ hiện tại là vị trí ước lượng theo khu vực hẻm/phường, chưa được định vị vệ tinh chính xác từng mét.');
  } else if (room.locationAccuracy === 'unknown') {
    caveats.push('Tin đăng chưa có tọa độ kinh độ/vĩ độ, khoảng cách đến trường chỉ mang tính tham khảo.');
  }
  if (!room.utilitiesMonthlyEstimateVnd) {
    caveats.push('Chi phí điện, nước, gửi xe và internet chưa được chủ trọ cung cấp số liệu cố định.');
  }
  caveats.push('Tin đăng là dữ liệu mô phỏng thử nghiệm (Demo) — hãy liên hệ xác nhận thực tế trước khi đặt cọc.');

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 py-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Top Breadcrumb & Action Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate('/workspace')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Bản đồ & Danh sách</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCompareRoom(room.id)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                isComparing
                  ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/40'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isComparing ? 'Đang so sánh' : 'Thêm vào so sánh'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSaved(!isSaved)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                isSaved
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
              <span>{isSaved ? 'Đã lưu' : 'Lưu tin'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (Primary Content - 7 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Gallery Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="relative bg-slate-900 aspect-[16/10] max-h-[420px] overflow-hidden">
                {room.imageUrls.length > 0 ? (
                  <img
                    src={room.imageUrls[activeImageIdx] || room.imageUrls[0]}
                    alt={room.title}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <ImageOff className="w-12 h-12 mb-2 text-slate-500" />
                    <span className="text-xs font-medium">Chưa có ảnh chụp thực tế</span>
                  </div>
                )}

                {/* Floating Tags */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-md border shadow-xs backdrop-blur-md bg-white/95 ${accuracy.badgeClass}`}>
                    {accuracy.label}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="text-xs text-white bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md font-mono font-bold shadow-xs">
                    Mã: {formatRoomRef(room.id)}
                  </span>
                </div>
              </div>

              {/* Thumbnails Bar */}
              {room.imageUrls.length > 1 && (
                <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
                  {room.imageUrls.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeImageIdx === idx
                          ? 'border-teal-600 ring-2 ring-teal-500/30'
                          : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Location Header Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200/70 px-2.5 py-0.5 rounded-full">
                  Phòng trọ sinh viên
                </span>
                <span className="text-xs text-slate-500">
                  Cập nhật gần nhất: {room.lastCheckedAt ? new Date(room.lastCheckedAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {room.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 mt-2 flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{room.addressLabel}</span>
              </p>
            </div>

            {/* AI Grounded Room Insight Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-tight">
                      Đánh giá độ phù hợp từ AI TroMate
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Phân tích đối chiếu theo thời gian thực dựa trên tiêu chí của bạn
                    </p>
                  </div>
                </div>

                <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2.5 py-0.5 rounded-full">
                  Có căn cứ rõ ràng
                </span>
              </div>

              {/* Match Highlights */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 text-teal-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Những điểm đáp ứng yêu cầu:</span>
                </div>
                <ul className="space-y-2 pl-6 text-xs text-slate-700 list-disc leading-relaxed">
                  {matchHighlights.map((highlight, idx) => (
                    <li key={idx} className="marker:text-emerald-500">{highlight}</li>
                  ))}
                </ul>
              </div>

              {/* Caveats / Disclosures */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Những điểm cần lưu ý trước khi thuê:</span>
                </div>
                <ul className="space-y-2 pl-6 text-xs text-slate-600 list-disc leading-relaxed">
                  {caveats.map((caveat, idx) => (
                    <li key={idx} className="marker:text-amber-500">{caveat}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Full Specifications Grid */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Thông số chi tiết phòng
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 block mb-1 text-[11px]">Diện tích</span>
                  <span className="font-bold text-slate-900 text-sm">{formatArea(room.areaM2)}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 block mb-1 text-[11px]">Đường chim bay</span>
                  <span className="font-bold text-teal-700 text-sm">
                    {distanceKm !== null ? `~${distanceKm} km` : 'Gần trường'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Tới cơ sở trường</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 block mb-1 text-[11px]">Thú cưng</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {room.petAllowed === true ? 'Cho phép nuôi' : room.petAllowed === false ? 'Không cho nuôi' : 'Thỏa thuận'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 block mb-1 text-[11px]">Tình trạng tin</span>
                  <span className="font-bold text-slate-700 text-sm">Tin mẫu mô phỏng</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Cần kiểm chứng trực tiếp</span>
                </div>
              </div>

              {/* Amenities List */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 mb-3">
                  Tiện ích & trang thiết bị có sẵn:
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {room.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-800 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{AMENITY_LABELS[amenity]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Student Safety Tip */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-emerald-950 font-semibold block">Lời khuyên an toàn cho sinh viên:</strong>
                <p className="leading-relaxed text-emerald-900/90">
                  Luôn đến xem phòng trực tiếp vào ban ngày, kiểm tra đồng hồ điện/nước riêng, đọc kỹ hợp đồng và tuyệt đối không chuyển cọc trước khi gặp mặt chính chủ hoặc người quản lý có giấy tờ hợp lệ.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (Sticky Commute & Price Summary - 5 cols) */}
          <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-md space-y-5">
              {/* Monthly Rent */}
              <div>
                <span className="text-xs text-slate-500 font-medium block">Giá thuê niêm yết</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {formatPriceMonthly(room.priceMonthlyVnd)}
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {room.utilitiesMonthlyEstimateVnd
                      ? `Ước tính phụ phí: ~${formatVnd(room.utilitiesMonthlyEstimateVnd)}/tháng`
                      : 'Phụ phí điện nước: Hỏi trực tiếp chủ nhà'}
                  </span>
                </div>
              </div>

              {/* Commute Gauge */}
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-teal-900">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-teal-600" />
                    <span>Lộ trình đến trường</span>
                  </span>
                  <span>{distanceKm !== null ? `~${distanceKm} km` : 'Gần trường'}</span>
                </div>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Khoảng cách đường chim bay đến <strong className="font-semibold">{campus?.campusName}</strong>. 
                  {distanceKm && distanceKm <= 1.0 ? ' Rất thuận tiện để đi bộ hoặc xe đạp.' : ' Đi xe máy mất khoảng 5–10 phút.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => alert('Chức năng liên hệ thực tế sẽ khả dụng ở giai đoạn kết nối dữ liệu thật.')}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Liên hệ xem phòng (Demo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCompareRoom(room.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isComparing
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isComparing ? 'Đã thêm vào bảng so sánh' : 'So sánh với phòng khác'}</span>
                </button>
              </div>

              {/* Disclaimer */}
              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Hệ thống TroMate cam kết chỉ hiển thị dữ liệu có căn cứ. Trạng thái phòng và giá thuê có thể thay đổi tùy thời điểm.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
