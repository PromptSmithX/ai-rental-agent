import React from 'react';
import { Building, User, MapPin, ArrowUpRight } from 'lucide-react';
import { ChatMessage } from '@/domain/contracts';
import { useSearchStore } from '@/app/store/searchStore';
import { formatPriceMonthly } from '@/shared/utils/format';

interface ChatMessageViewProps {
  message: ChatMessage;
}

function renderInline(text: string, isUser: boolean, keyPrefix: string): React.ReactNode[] {
  const tokenRegex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong
          key={key}
          className={isUser ? 'font-bold text-white' : 'font-semibold text-slate-900'}
        >
          {inner}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={key}
          className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
            isUser ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'
          }`}
        >
          {inner}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return <em key={key}>{inner}</em>;
    }
    return part;
  });
}

const FormattedMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Check for numbered item: "1. ", "2. ", etc.
        const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const [, indent, num, itemText] = numMatch;
          return (
            <div
              key={lineIdx}
              className={`flex items-start gap-1.5 ${indent ? 'pl-3' : 'pt-0.5'}`}
            >
              <span className={`font-mono text-xs font-bold shrink-0 ${isUser ? 'text-slate-300' : 'text-teal-700'}`}>
                {num}.
              </span>
              <div className="flex-1 min-w-0">
                {renderInline(itemText, isUser, `num-${lineIdx}`)}
              </div>
            </div>
          );
        }

        // Check for bullet item: "- ", "* ", " - "
        const bulletMatch = line.match(/^(\s*)[-*•]\s+(.*)$/);
        if (bulletMatch) {
          const [, indent, itemText] = bulletMatch;
          return (
            <div
              key={lineIdx}
              className={`flex items-start gap-2 ${indent ? 'pl-4' : 'pl-1.5'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  isUser ? 'bg-white' : 'bg-teal-600'
                }`}
              />
              <div className="flex-1 min-w-0">
                {renderInline(itemText, isUser, `bullet-${lineIdx}`)}
              </div>
            </div>
          );
        }

        // Regular line
        return (
          <div key={lineIdx} className="break-words">
            {renderInline(line, isUser, `p-${lineIdx}`)}
          </div>
        );
      })}
    </div>
  );
};

export const ChatMessageView: React.FC<ChatMessageViewProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const { setSelectedRoomId, allRooms, selectedRoomId } = useSearchStore();

  return (
    <div className={`flex gap-2.5 my-2 w-full min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Icon */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 shadow-xs">
          TM
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`max-w-[92%] sm:max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs break-words overflow-hidden min-w-0 ${
          isUser
            ? 'bg-slate-900 text-white rounded-tr-xs'
            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
        }`}
      >
        <FormattedMessage content={message.content} isUser={isUser} />

        {/* Referenced Rooms Mini-Cards */}
        {!isUser && message.referencedRoomIds && message.referencedRoomIds.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-2 w-full">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
              <Building className="w-3.5 h-3.5 text-teal-600" />
              Phòng trọ được nhắc tới:
            </span>
            <div className="flex flex-col gap-1.5">
              {message.referencedRoomIds.map((roomId) => {
                const room = allRooms.find((r) => r.id === roomId);
                const isSelected = selectedRoomId === roomId;
                const title = room?.title || roomId;
                const photo = room?.imageUrls?.[0];

                return (
                  <button
                    key={roomId}
                    type="button"
                    onClick={() => setSelectedRoomId(roomId)}
                    className={`text-xs p-2 rounded-xl transition-all flex items-center gap-2.5 w-full text-left cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-900'
                        : 'bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Thumbnail */}
                    {photo ? (
                      <img
                        src={photo}
                        alt={title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200/80 flex items-center justify-center shrink-0 text-slate-500">
                        <MapPin className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate leading-snug">
                        {title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {room?.priceMonthlyVnd && (
                          <span className={`font-bold text-[11px] ${isSelected ? 'text-teal-300' : 'text-slate-900'}`}>
                            {formatPriceMonthly(room.priceMonthlyVnd)}
                          </span>
                        )}
                        <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          • Bấm để xem trên bản đồ
                        </span>
                      </div>
                    </div>

                    <ArrowUpRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-teal-300' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-2 font-mono text-right ${
            isUser ? 'text-slate-400' : 'text-slate-400'
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {/* User Icon */}
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-[10px] mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
