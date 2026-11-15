import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Compass, GraduationCap, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';

const POPULAR_SEARCHES = [
  {
    title: 'Gần ĐH Bách Khoa (Cơ sở Q.10)',
    prompt: 'Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km có máy lạnh',
    badge: '≤ 3 tr/tháng',
  },
  {
    title: 'Phòng cho nuôi thú cưng',
    prompt: 'Phòng trọ có máy lạnh ban công và cho nuôi mèo',
    badge: 'Nuôi pet OK',
  },
  {
    title: 'Phòng sinh viên tiết kiệm',
    prompt: 'Tìm phòng dưới 2 triệu gần trường',
    badge: '≤ 2.0 tr/tháng',
  },
  {
    title: 'So sánh đối chiếu phòng',
    prompt: 'So sánh phòng 01 và 02',
    badge: 'So sánh 2 phòng',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { sendUserMessage, allCampuses, currentFilters, updateFilters } = useSearchStore();
  const [promptText, setPromptText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    const query = promptText.trim();
    navigate('/workspace');
    await sendUserMessage(query);
  };

  const handleSelectExample = async (examplePrompt: string) => {
    navigate('/workspace');
    await sendUserMessage(examplePrompt);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-between bg-slate-50/60">
      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-10 pb-16 flex flex-col items-center justify-center text-center">
        {/* Top Product Tag */}
        <div className="inline-flex items-center gap-2 mb-4 px-3.5 py-1.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Trợ lý AI tìm trọ sinh viên thế hệ mới</span>
        </div>

        {/* Clean Editorial Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 max-w-2xl leading-[1.18] mb-4">
          Tìm phòng trọ lý tưởng quanh trường đại học với AI.
        </h1>

        <p className="max-w-xl text-sm sm:text-base text-slate-600 mb-8 leading-relaxed font-normal">
          Mô tả nhu cầu bằng tiếng Việt tự nhiên. AI tự động trích xuất ngân sách, tiện ích và hiển thị vị trí trực quan trên bản đồ tương tác.
        </p>

        {/* Campus Selection Bar */}
        <div className="w-full max-w-2xl mb-5 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <GraduationCap className="w-4 h-4 text-teal-600" />
            <span>Chọn nhanh cơ sở trường:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {allCampuses.map((campus) => {
              const isSelected = currentFilters.campusId === campus.id;
              return (
                <button
                  key={campus.id}
                  type="button"
                  onClick={() => updateFilters({ campusId: campus.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white font-bold shadow-xs ring-1 ring-slate-900'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400 hover:text-slate-950 shadow-2xs'
                  }`}
                >
                  {campus.campusName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Studio Composer */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl bg-white p-4 rounded-2xl border border-slate-200/90 shadow-md focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/70 transition-all mb-7 text-left"
        >
          <div className="relative">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Bạn muốn tìm phòng như thế nào? (ví dụ: Tìm phòng dưới 3 triệu gần Bách Khoa Lý Thường Kiệt trong 2 km, có máy lạnh và cho nuôi mèo...)"
              rows={3}
              className="w-full p-1.5 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent resize-none focus:outline-none leading-relaxed font-normal"
              aria-label="Khung nhập nhu cầu tìm phòng"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đồng bộ 2 chiều: Bản đồ · Giá thuê · Tiện ích</span>
            </div>

            <button
              type="submit"
              disabled={!promptText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Tìm kiếm ngay</span>
            </button>
          </div>
        </form>

        {/* Curated Popular Searches */}
        <div className="w-full max-w-2xl text-left">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Mẫu tìm kiếm gợi ý:
            </span>
            <span className="text-[11px] text-slate-400">Bấm để khám phá ngay</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {POPULAR_SEARCHES.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectExample(item.prompt)}
                className="text-left bg-white text-slate-700 hover:text-slate-950 hover:border-slate-300 border border-slate-200/90 p-3.5 rounded-xl transition-all group flex flex-col justify-between shadow-2xs hover:shadow-xs cursor-pointer"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="font-bold text-xs text-slate-900">{item.title}</span>
                  <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60 px-2 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  "{item.prompt}"
                </p>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-teal-700 group-hover:text-teal-900">
                  <span>Khám phá phòng</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Product Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-3xl mt-12 text-left">
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3 font-bold border border-teal-100">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-xs text-slate-900 mb-1">
              Đồng bộ Bản đồ & Danh sách
            </h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Mọi yêu cầu tìm kiếm đều đồng bộ vị trí marker giá tiền và danh sách thẻ phòng tức thì.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 font-bold border border-blue-100">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-xs text-slate-900 mb-1">
              Khoảng cách chuẩn xác
            </h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tính toán khoảng cách đường chim bay từ cổng trường, phân định rõ vị trí xác minh hay ước lượng.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 font-bold border border-emerald-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-xs text-slate-900 mb-1">
              Giải thích có căn cứ (Grounded)
            </h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              AI nêu rõ lý do phòng phù hợp và cảnh báo các khoản phụ phí chưa rõ, cam kết không ảo giác.
            </p>
          </div>
        </div>
      </main>

      {/* Clean Studio Footer */}
      <footer className="w-full py-4 border-t border-slate-200/80 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <span>© 2026 TroMate AI. Nền tảng tìm trọ thông minh cho sinh viên Việt Nam.</span>
          <span className="text-slate-400">
            Dữ liệu mô phỏng · Công nghệ AI-Native
          </span>
        </div>
      </footer>
    </div>
  );
};
