import React, { useMemo, useState } from 'react';
import { Columns3, Map, List, MessageSquare, SplitSquareVertical } from 'lucide-react';
import { useSearchStore, selectVisibleRooms } from '@/app/store/searchStore';
import { FilterChips } from './FilterChips';
import { ChatPanel } from '@/features/chat/components/ChatPanel';
import { RoomMap } from '@/features/map/components/RoomMap';
import { RoomList } from '@/features/rooms/components/RoomList';
import { RoomCompareModal } from '@/features/rooms/components/RoomCompareModal';

type DesktopViewMode = 'all' | 'map-list' | 'chat-list';

export const WorkspacePage: React.FC = () => {
  const { lastSearchResult, allRooms, mobileTab, setMobileTab, isLoadingRooms } = useSearchStore();
  const [desktopView, setDesktopView] = useState<DesktopViewMode>('all');

  const visibleRooms = useMemo(() => {
    return selectVisibleRooms(lastSearchResult?.hits, allRooms);
  }, [lastSearchResult?.hits, allRooms]);

  if (isLoadingRooms) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wide text-slate-600">Đang tải danh sách phòng trọ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-100/70 w-full">
      {/* Top Filter Chips & Layout Toolbar */}
      <div className="flex flex-col bg-white shrink-0 z-20 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <FilterChips />

        {/* Desktop View Switcher Toolbar */}
        <div className="hidden md:flex items-center justify-between px-4 py-1.5 bg-slate-50/90 border-t border-slate-200/70 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
              Chế độ hiển thị:
            </span>
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setDesktopView('all')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  desktopView === 'all'
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                title="Bố cục 3 cột: Trò chuyện AI + Bản đồ + Danh sách phòng"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>3 Cột (Toàn diện)</span>
              </button>

              <button
                type="button"
                onClick={() => setDesktopView('map-list')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  desktopView === 'map-list'
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                title="Tập trung vào Bản đồ lớn và Danh sách phòng"
              >
                <Map className="w-3.5 h-3.5" />
                <span>Bản đồ & Danh sách</span>
              </button>

              <button
                type="button"
                onClick={() => setDesktopView('chat-list')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  desktopView === 'chat-list'
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                title="Tập trung vào Hội thoại AI và Danh sách phòng"
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span>Hội thoại & Danh sách</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Tìm thấy <strong className="text-slate-900 font-bold">{visibleRooms.length}</strong> phòng trọ phù hợp</span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex border-b border-slate-200 bg-white shrink-0 text-xs font-semibold z-20">
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            mobileTab === 'chat'
              ? 'border-slate-900 text-slate-900 bg-slate-50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Trò chuyện</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            mobileTab === 'map'
              ? 'border-slate-900 text-slate-900 bg-slate-50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Bản đồ</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('rooms')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            mobileTab === 'rooms'
              ? 'border-slate-900 text-slate-900 bg-slate-50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Danh sách ({visibleRooms.length})</span>
        </button>
      </div>

      {/* Main Responsive Layout */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Left Pane: Chat Panel */}
        <div
          className={`h-full border-r border-slate-200 transition-all shrink-0 z-10 ${
            // Desktop visibility
            desktopView === 'map-list'
              ? 'hidden'
              : desktopView === 'chat-list'
              ? 'w-full md:w-[440px] lg:w-[480px]'
              : 'w-full md:w-[350px] lg:w-[380px] xl:w-[400px]'
          } ${
            // Mobile visibility
            mobileTab === 'chat' ? 'flex w-full' : 'hidden md:flex'
          }`}
        >
          <ChatPanel />
        </div>

        {/* Center Pane: Interactive Map */}
        <div
          className={`h-full flex-1 min-w-[280px] relative transition-all ${
            // Desktop visibility
            desktopView === 'chat-list' ? 'hidden' : 'flex'
          } ${
            // Mobile visibility
            mobileTab === 'map' ? 'flex w-full absolute inset-0 z-10' : 'hidden md:flex'
          }`}
        >
          <RoomMap rooms={visibleRooms} />
        </div>

        {/* Right Pane: Room Results List */}
        <div
          className={`h-full border-l border-slate-200 transition-all shrink-0 z-10 ${
            // Desktop width
            desktopView === 'chat-list'
              ? 'flex-1 min-w-0'
              : desktopView === 'map-list'
              ? 'w-full md:w-[460px] lg:w-[500px]'
              : 'w-full md:w-[360px] lg:w-[380px] xl:w-[410px]'
          } ${
            // Mobile visibility
            mobileTab === 'rooms' ? 'flex w-full absolute inset-0 z-10' : 'hidden md:flex'
          }`}
        >
          <RoomList rooms={visibleRooms} />
        </div>
      </div>

      {/* Side-by-side Room Compare Modal */}
      <RoomCompareModal />
    </div>
  );
};
