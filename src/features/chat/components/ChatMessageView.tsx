import React from 'react';
import { Bot, Home, User } from 'lucide-react';
import { ChatMessage } from '@/domain/contracts';
import { useSearchStore } from '@/app/store/searchStore';

interface ChatMessageViewProps {
  message: ChatMessage;
}

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
        <p className="whitespace-pre-wrap break-words">{message.content}</p>

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
                return (
                  <button
                    key={roomId}
                    type="button"
                    onClick={() => setSelectedRoomId(roomId)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all inline-flex items-center gap-1 max-w-full truncate ${
                      isSelected
                        ? 'bg-brand-100 text-brand-900 border border-brand-400 font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700 border border-slate-200'
                    }`}
                    title={room ? room.title : roomId}
                  >
                    <span className="font-mono text-[11px] font-bold">{roomId}</span>
                    {room && (
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({(room.priceMonthlyVnd / 1_000_000).toLocaleString('vi-VN')}tr)
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
