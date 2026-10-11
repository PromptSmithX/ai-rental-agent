import React, { useMemo, useState } from 'react';
import { Columns3, Map, List, MessageSquare, SplitSquareVertical } from 'lucide-react';
import { useSearchStore, selectVisibleRooms } from '@/app/store/searchStore';
import { FilterChips } from './FilterChips';
import { ChatPanel } from '@/features/chat/components/ChatPanel';
import { RoomMap } from '@/features/map/components/RoomMap';
import { RoomList } from '@/features/rooms/components/RoomList';
import { RoomCompareModal } from '@/features/rooms/components/RoomCompareModal';
import { TraceDrawer } from '@/features/trace/components/TraceDrawer';

type DesktopViewMode = 'all' | 'map-list' | 'chat-list';

export const WorkspacePage: React.FC = () => {
  const { lastSearchResult, allRooms, mobileTab, setMobileTab, isLoadingRooms } = useSearchStore();
  const [desktopView, setDesktopView] = useState<DesktopViewMode>('all');

  const visibleRooms = useMemo(() => {
    return selectVisibleRooms(lastSearchResult?.hits, allRooms);
  }, [lastSearchResult?.hits, allRooms]);

  if (isLoadingRooms) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3 text-textMuted">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Đang tải dữ liệu phòng mẫu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-canvas w-full">
      {/* Top Extracted Filter Chips & Desktop Layout Controls */}
      <div className="flex flex-col border-b border-borderMuted bg-white shrink-0">
        <FilterChips />

        {/* Desktop View Switcher Toolbar */}
        <div className="hidden md:flex items-center justify-between px-4 py-1.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 text-[11px]">Bố cục làm việc:</span>
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setDesktopView('all')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  desktopView === 'all'
                    ? 'bg-brand-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem cả 3 cột: Chat + Bản đồ + Danh sách"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>3 Cột (Đầy đủ)</span>
              </button>

              <button
                type="button"
                onClick={() => setDesktopView('map-list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  desktopView === 'map-list'
                    ? 'bg-brand-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ẩn khung chat, mở rộng Bản đồ và Danh sách phòng"
              >
                <Map className="w-3.5 h-3.5" />
                <span>Bản đồ & Danh sách</span>
              </button>

              <button
                type="button"
                onClick={() => setDesktopView('chat-list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  desktopView === 'chat-list'
                    ? 'bg-brand-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ẩn bản đồ, tập trung Chat và duyệt Danh sách"
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span>Chat & Danh sách</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Đang hiển thị <strong className="text-brand-700">{visibleRooms.length}</strong> phòng phù hợp tiêu chí
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex border-b border-borderMuted bg-white shrink-0 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            mobileTab === 'chat'
              ? 'border-brand-600 text-brand-700 bg-brand-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat AI</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            mobileTab === 'map'
              ? 'border-brand-600 text-brand-700 bg-brand-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Bản đồ ({visibleRooms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('rooms')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            mobileTab === 'rooms'
              ? 'border-brand-600 text-brand-700 bg-brand-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Danh sách ({visibleRooms.length})</span>
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden w-full max-w-full">
        {/* Left Column: Chat Panel */}
        <section
          aria-label="Khung hội thoại với AI"
          className={`h-full flex flex-col min-w-0 transition-all duration-200 ${
            // Mobile visibility
            mobileTab !== 'chat' ? 'hidden md:flex' : 'flex w-full'
          } ${
            // Desktop visibility based on view mode
            desktopView === 'map-list'
              ? 'md:hidden'
              : desktopView === 'chat-list'
              ? 'w-full md:w-[460px] lg:w-[500px] shrink-0'
              : 'w-full md:w-[350px] lg:w-[380px] xl:w-[420px] shrink-0'
          }`}
        >
          <ChatPanel />
        </section>

        {/* Right Area: Map & List */}
        <section
          aria-label="Bản đồ và danh sách phòng trọ"
          className={`flex-1 flex flex-col lg:flex-row h-full overflow-hidden min-w-0 ${
            mobileTab === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Map Column/Pane */}
          <div
            className={`h-full min-h-[250px] min-w-0 transition-all ${
              desktopView === 'chat-list' ? 'hidden' : 'block flex-1'
            } ${mobileTab === 'rooms' ? 'hidden lg:block' : 'block'}`}
          >
            <RoomMap rooms={visibleRooms} />
          </div>

          {/* List Column/Pane */}
          <div
            className={`border-l border-borderMuted bg-canvas h-full overflow-hidden shrink-0 flex flex-col min-w-0 ${
              mobileTab === 'map' ? 'hidden lg:flex' : 'flex'
            } ${
              desktopView === 'map-list'
                ? 'w-full lg:w-[460px] xl:w-[500px]'
                : desktopView === 'chat-list'
                ? 'flex-1'
                : 'w-full lg:w-[340px] xl:w-[380px]'
            }`}
          >
            <RoomList rooms={visibleRooms} />
          </div>
        </section>
      </div>

      {/* Overlays */}
      <RoomCompareModal />
      <TraceDrawer />
    </div>
  );
};
