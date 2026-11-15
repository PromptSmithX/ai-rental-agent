import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Compass, Loader2, Sparkles } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';
import { ChatMessageView } from './ChatMessageView';
import { AgentEventTimeline } from './AgentEventTimeline';

const SUGGESTED_SEARCHES = [
  { label: '≤ 3tr gần Bách Khoa LTK', prompt: 'Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km' },
  { label: '+ Có máy lạnh', prompt: 'Có máy lạnh nữa' },
  { label: 'Nuôi mèo / cún', prompt: 'Cho nuôi mèo' },
  { label: 'Tăng ngân sách 3.5tr', prompt: 'Tăng ngân sách lên 3,5 triệu' },
  { label: 'Bỏ yêu cầu máy lạnh', prompt: 'Bỏ máy lạnh đi' },
  { label: 'So sánh phòng 01 & 02', prompt: 'So sánh phòng 01 và 02' },
  { label: 'Phòng gần nhất', prompt: 'Phòng nào gần nhất?' },
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
    <div className="flex flex-col h-full w-full min-w-0 bg-white">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-200/90 flex items-center justify-between bg-white shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shrink-0 text-xs shadow-xs">
            TM
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-slate-900 leading-tight tracking-tight truncate flex items-center gap-1.5">
              <span>Trợ lý AI TroMate</span>
              <Sparkles className="w-3 h-3 text-teal-600" />
            </h2>
            <p className="text-[10px] text-slate-500 truncate">
              Tìm kiếm tự nhiên & đồng bộ bản đồ tức thì
            </p>
          </div>
        </div>

        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Sẵn sàng
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 min-w-0 bg-slate-50/60">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/90 text-teal-600 flex items-center justify-center mb-3 shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">
              Bạn đang tìm phòng trọ như thế nào?
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xs mb-4 leading-relaxed">
              Hãy nhập yêu cầu bằng tiếng Việt (cơ sở trường học, mức giá, tiện ích) hoặc chọn nhanh gợi ý bên dưới.
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
              <div className="flex items-center gap-2.5 p-3 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-700 shadow-xs animate-in fade-in-50 duration-150">
                <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
                <span className="font-medium text-[11px]">Đang trích xuất tiêu chí và tính toán khoảng cách phòng...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Searches */}
      <div className="px-3.5 py-2 border-t border-slate-200/80 bg-white shrink-0 min-w-0">
        <div className="text-[10px] font-semibold text-slate-400 mb-1.5 px-0.5 uppercase tracking-wider">
          Gợi ý tìm kiếm nhanh:
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {SUGGESTED_SEARCHES.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isPending}
              onClick={() => handleQuickPrompt(item.prompt)}
              className="text-[11px] whitespace-nowrap bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200/80 rounded-lg px-2.5 py-1 transition-all shrink-0 disabled:opacity-40 font-medium cursor-pointer shadow-2xs"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky Composer */}
      <div className="p-3 border-t border-slate-200/80 bg-white shrink-0 min-w-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full min-w-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isPending}
            placeholder="Nhập nhu cầu (vd: dưới 3 triệu, có máy lạnh, nuôi mèo...)"
            className="flex-1 min-w-0 text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-200/60 transition-all disabled:opacity-50"
            aria-label="Khung nhập nhu cầu tìm phòng"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isPending}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
            aria-label="Gửi yêu cầu"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="w-4 h-4 text-white" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
