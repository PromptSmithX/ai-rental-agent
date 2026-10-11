import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';
import { ChatMessageView } from './ChatMessageView';
import { AgentEventTimeline } from './AgentEventTimeline';

const SCENARIO_QUICK_ACTIONS = [
  { label: 'S01: ≤ 3tr gần BK LTK', prompt: 'Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km' },
  { label: 'S02: Thêm máy lạnh', prompt: 'Có máy lạnh nữa' },
  { label: 'S03: Cho nuôi mèo', prompt: 'Cho nuôi mèo' },
  { label: 'S04: Tăng lên 3,5tr', prompt: 'Tăng ngân sách lên 3,5 triệu' },
  { label: 'S05: Bỏ máy lạnh', prompt: 'Bỏ máy lạnh đi' },
  { label: 'S06: Trường mình (Clarify)', prompt: 'Tìm phòng gần trường mình' },
  { label: 'S07: Không có kết quả (0 hit)', prompt: 'Dưới 1 triệu, có điều hòa, nuôi mèo, dưới 500m' },
  { label: 'S09: So sánh 01 & 02', prompt: 'So sánh phòng 01 và 02' },
  { label: 'S10: Gần nhất', prompt: 'Phòng nào gần nhất?' },
];

export const ChatPanel: React.FC = () => {
  const { messages, events, runStatus, sendUserMessage } = useSearchStore();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isPending = runStatus === 'extracting' || runStatus === 'searching' || runStatus === 'ranking';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, events, runStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isPending) return;

    const query = inputText.trim();
    setInputText('');
    await sendUserMessage(query);
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isPending) return;
    await sendUserMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-surface border-r border-borderMuted">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-borderMuted flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-textPrimary leading-tight truncate">AI Trợ lý tìm trọ</h2>
            <p className="text-[11px] text-textMuted truncate">Hội thoại trích xuất bộ lọc & đồng bộ bản đồ</p>
          </div>
        </div>

        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
          Sẵn sàng
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-w-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-textMuted">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-textPrimary mb-1">
              Bạn muốn tìm phòng như thế nào?
            </h3>
            <p className="text-xs max-w-xs mb-4">
              Nhập yêu cầu bằng tiếng Việt hoặc chọn một câu lệnh mẫu bên dưới để xem AI trích xuất bộ lọc và vị trí bản đồ.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessageView key={msg.id} message={msg} />
            ))}

            {/* Agent Timeline */}
            <AgentEventTimeline events={events} runStatus={runStatus} />

            {/* Loading Indicator */}
            {isPending && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-card text-xs text-textMuted">
                <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                <span>Mô phỏng AI: đang trích xuất bộ lọc và tính toán khoảng cách...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Scenario Buttons */}
      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/70 shrink-0 min-w-0">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 px-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Kịch bản kiểm thử mẫu (Mock Scenarios):
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {SCENARIO_QUICK_ACTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isPending}
              onClick={() => handleQuickPrompt(item.prompt)}
              className="text-[11px] whitespace-nowrap bg-white hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 hover:border-brand-300 rounded-lg px-2.5 py-1 transition-all shrink-0 shadow-2xs disabled:opacity-50 font-medium"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky Composer */}
      <div className="p-3 border-t border-borderMuted bg-white shrink-0 min-w-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full min-w-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isPending}
            placeholder="Nhập yêu cầu (ví dụ: có máy lạnh, dưới 3 triệu, cho nuôi mèo...)"
            className="flex-1 min-w-0 text-xs sm:text-sm px-3.5 py-2.5 rounded-input bg-slate-50 border border-borderMuted text-textPrimary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-50"
            aria-label="Nhập câu lệnh tìm kiếm"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isPending}
            className="w-10 h-10 rounded-input bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0 active:scale-95"
            aria-label="Gửi tin nhắn"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
