import React from 'react';
import { Bot, Home, User } from 'lucide-react';
import { ChatMessage } from '@/domain/contracts';
import { useSearchStore } from '@/app/store/searchStore';

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
          className={`px-1 py-0.5 rounded text-[11px] font-mono ${
            isUser ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-800'
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
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // Check for numbered item: "1. ", "2. ", etc.
        const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const [, indent, num, itemText] = numMatch;
          return (
            <div
              key={lineIdx}
              className={`flex items-start gap-1.5 ${indent ? 'pl-4' : 'pt-1'}`}
            >
              <span className={`font-bold shrink-0 ${isUser ? 'text-white' : 'text-brand-700'}`}>
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
              className={`flex items-start gap-2 ${indent ? 'pl-5' : 'pl-3'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  isUser ? 'bg-white' : 'bg-brand-500'
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
    <div className={`flex gap-2.5 my-2.5 w-full min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Icon */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`max-w-[92%] sm:max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs break-words overflow-hidden min-w-0 ${
          isUser
            ? 'bg-brand-600 text-white rounded-br-xs'
            : 'bg-white text-textPrimary border border-borderMuted rounded-tl-xs'
        }`}
      >
        <FormattedMessage content={message.content} isUser={isUser} />

        {/* Referenced Rooms Chips */}
        {!isUser && message.referencedRoomIds && message.referencedRoomIds.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1.5 w-full">
            <span className="text-[11px] text-textMuted flex items-center gap-1 font-medium">
              <Home className="w-3 h-3 text-brand-600" /> Phòng được đề cập:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.referencedRoomIds.map((roomId) => {
                const room = allRooms.find((r) => r.id === roomId);
                const isSelected = selectedRoomId === roomId;
                const title = room?.title || roomId;
                const priceFormatted =
                  room && room.priceMonthlyVnd && room.priceMonthlyVnd > 0
                    ? `${(room.priceMonthlyVnd / 1_000_000).toLocaleString('vi-VN')}tr`
                    : null;

                return (
                  <button
                    key={roomId}
                    type="button"
                    onClick={() => setSelectedRoomId(roomId)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all inline-flex items-center gap-1.5 max-w-full truncate ${
                      isSelected
                        ? 'bg-brand-100 text-brand-900 border border-brand-400 font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700 border border-slate-200'
                    }`}
                    title={room ? `${room.title} — ${room.addressLabel}` : roomId}
                  >
                    <span className="font-semibold text-xs truncate max-w-[200px]">{title}</span>
                    {priceFormatted && (
                      <span className="text-[10px] text-brand-700 font-semibold shrink-0 bg-white/80 px-1 py-0.2 rounded border border-slate-200/60">
                        ({priceFormatted})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1 text-right ${
            isUser ? 'text-brand-100/80' : 'text-slate-400'
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
        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
