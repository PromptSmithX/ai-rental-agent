import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, CheckCircle2, Compass, GraduationCap, MapPin, Sparkles } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';
import { SimulationBadge } from '@/shared/ui/SimulationBadge';

const EXAMPLE_PROMPTS = [
  'Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km',
  'Có máy lạnh, ban công thoáng mát và cho nuôi mèo gần trường',
  'Tìm phòng trọ sinh viên giá rẻ dưới 2,5 triệu gần Bách Khoa',
  'So sánh các phòng trọ có máy lạnh gần cổng trường',
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

  const handleSelectExample = async (example: string) => {
    navigate('/workspace');
    await sendUserMessage(example);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between bg-canvas">
      {/* Hero Section */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-12 pb-16 flex flex-col items-center justify-center text-center">
        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <SimulationBadge />
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Native Rental Discovery
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-textPrimary tracking-tight mb-4">
          Tìm phòng trọ sinh viên <br />
          bằng <span className="text-brand-600 underline decoration-brand-300 decoration-wavy underline-offset-8">hội thoại thông minh</span>
        </h1>

        <p className="max-w-2xl text-base sm:text-lg text-textMuted mb-8 leading-relaxed">
          Mô tả nhu cầu bằng tiếng Việt tự nhiên: trường đại học, ngân sách, bán kính di chuyển và tiện ích. 
          AI sẽ đồng bộ ngay trên bản đồ trực quan kèm lý do đề xuất rõ ràng.
        </p>

        {/* Campus Quick-Select Pill */}
        <div className="w-full max-w-2xl mb-4 flex items-center justify-center gap-2 text-xs text-textMuted">
          <GraduationCap className="w-4 h-4 text-brand-600" />
          <span>Khu vực trường:</span>
          <div className="flex flex-wrap gap-1.5">
            {allCampuses.map((campus) => (
              <button
                key={campus.id}
                type="button"
                onClick={() => updateFilters({ campusId: campus.id })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  currentFilters.campusId === campus.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-borderMuted hover:border-brand-400'
                }`}
              >
                {campus.campusName}
              </button>
            ))}
          </div>
        </div>

        {/* AI Composer Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl bg-surface p-2.5 sm:p-3 rounded-panel border border-borderMuted shadow-md hover:shadow-lg transition-all focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 mb-6"
        >
          <div className="relative">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Bạn muốn tìm phòng trọ như thế nào? (Ví dụ: Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km, có máy lạnh...)"
              rows={3}
              className="w-full p-2.5 text-sm sm:text-base text-textPrimary placeholder:text-slate-400 bg-transparent resize-none focus:outline-none"
              aria-label="Nhập nhu cầu tìm phòng trọ"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 px-1">
            <div className="flex items-center gap-2 text-xs text-textMuted">
              <Bot className="w-4 h-4 text-brand-600" />
              <span className="hidden sm:inline">Phản hồi tự động qua kịch bản mô phỏng</span>
            </div>

            <button
              type="submit"
              disabled={!promptText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-input bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-[0.98]"
            >
              <span>Bắt đầu tìm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Example Prompt Chips */}
        <div className="w-full max-w-2xl text-left">
          <p className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Câu lệnh mẫu thử nghiệm (Mock Scenarios):
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectExample(prompt)}
                className="text-left text-xs bg-white text-slate-700 hover:text-brand-700 hover:border-brand-400 border border-borderMuted px-3 py-2 rounded-input transition-all shadow-2xs hover:shadow-xs group flex items-center gap-1.5"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mt-12 text-left">
          <div className="p-4 rounded-card bg-white border border-borderMuted">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-2.5 font-bold">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-textPrimary mb-1">Đồng bộ Chat & Bản đồ</h2>
            <p className="text-xs text-textMuted">
              Mọi yêu cầu trong chat tự động trích xuất tiêu chí và cập nhật marker trên bản đồ tức thì.
            </p>
          </div>

          <div className="p-4 rounded-card bg-white border border-borderMuted">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2.5 font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-textPrimary mb-1">Dữ liệu minh bạch</h2>
            <p className="text-xs text-textMuted">
              Khoảng cách đường chim bay có kiểm chứng sai số; ghi chú rõ ràng các khoản chi phí chưa rõ.
            </p>
          </div>

          <div className="p-4 rounded-card bg-white border border-borderMuted">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2.5 font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-textPrimary mb-1">Dành riêng cho sinh viên</h2>
            <p className="text-xs text-textMuted">
              Tối ưu hóa tìm phòng theo cơ sở trường (Lý Thường Kiệt, Dĩ An) với ngân sách thực tế.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 border-t border-borderMuted text-center text-xs text-textMuted bg-surface">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI Rental Copilot — Frontend-first MVP Prototype (2026)</span>
          <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Dữ liệu phòng & AI hoàn toàn mô phỏng (Demo Simulation)
          </span>
        </div>
      </footer>
    </div>
  );
};
