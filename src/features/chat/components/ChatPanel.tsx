import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Compass, Loader2 } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';
import { ChatMessageView } from './ChatMessageView';
import { AgentEventTimeline } from './AgentEventTimeline';

const SUGGESTED_SEARCHES = [
  { label: '≤ 3M near HCMUT LTK', prompt: 'Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km' },
  { label: '+ Air Conditioning', prompt: 'Có máy lạnh nữa' },
  { label: 'Allow Pets', prompt: 'Cho nuôi mèo' },
  { label: 'Budget up to 3.5M', prompt: 'Tăng ngân sách lên 3,5 triệu' },
  { label: 'No AC Required', prompt: 'Bỏ máy lạnh đi' },
  { label: 'Near Campus Gate', prompt: 'Tìm phòng gần trường mình' },
  { label: 'Compare Top 2', prompt: 'So sánh phòng 01 và 02' },
  { label: 'Closest to Campus', prompt: 'Phòng nào gần nhất?' },
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
      <div className="px-4 py-3 border-b border-slate-200/90 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold shrink-0 text-xs">
            TM
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-slate-900 leading-tight tracking-tight truncate">
              Rental Concierge
            </h2>
            <p className="text-[10px] text-slate-400 truncate">
              Real-time rental discovery and map synchronization
            </p>
          </div>
        </div>

        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          Online
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-w-0 bg-[#FAFAFA]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center mb-3 shadow-2xs">
              <Compass className="w-5 h-5 text-slate-700" />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 mb-1">
              How can I help you find a room?
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xs mb-4 leading-relaxed">
              Describe your desired campus, budget, or preferred amenities. Or select a popular suggestion below.
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
              <div className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 shadow-2xs">
                <Loader2 className="w-3.5 h-3.5 text-slate-700 animate-spin" />
                <span>Finding available rooms near campus matching your criteria...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Searches */}
      <div className="px-3 py-2 border-t border-slate-200 bg-white shrink-0 min-w-0">
        <div className="text-[10px] font-medium text-slate-500 mb-1.5 px-1">
          Suggested Searches:
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {SUGGESTED_SEARCHES.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isPending}
              onClick={() => handleQuickPrompt(item.prompt)}
              className="text-[11px] whitespace-nowrap bg-[#F8F9FA] hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200 rounded-md px-2.5 py-1 transition-all shrink-0 disabled:opacity-40 font-medium"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky Composer */}
      <div className="p-3 border-t border-slate-200 bg-white shrink-0 min-w-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full min-w-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isPending}
            placeholder="Describe what you need (e.g. under 3M, air conditioning, cat friendly...)"
            className="flex-1 min-w-0 text-xs px-3.5 py-2.5 rounded-lg bg-[#F8F9FA] border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all disabled:opacity-50"
            aria-label="Input search prompt"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isPending}
            className="w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs shrink-0"
            aria-label="Send message"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
