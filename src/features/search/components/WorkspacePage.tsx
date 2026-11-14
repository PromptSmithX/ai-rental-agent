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
      <div className="h-[calc(100vh-3.75rem)] flex items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wide">Loading rental listings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.75rem)] overflow-hidden bg-[#FAFAFA] w-full">
      {/* Top Filter Chips & Layout Toolbar */}
      <div className="flex flex-col border-b border-slate-200/90 bg-white shrink-0">
        <FilterChips />

        {/* Desktop View Switcher Toolbar */}
        <div className="hidden md:flex items-center justify-between px-4 py-1.5 bg-[#F8F9FA] border-t border-slate-200/70 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
              View Mode:
            </span>
            <div className="flex items-center bg-white p-0.5 rounded-md border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setDesktopView('all')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                  desktopView === 'all'
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                title="Three-column layout: Conversation + Map + Directory"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>3 Columns</span>
              </button>

              <button
                type="button"
                onClick={() => setDesktopView('map-list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                  desktopView === 'map-list'
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                title="Expand Map and Rental Directory"
              >
                <Map className="w-3.5 h-3.5" />
                <span>Map & Directory</span>
              </button>

              <button
                type="button"
                onClick={() => setDesktopView('chat-list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                  desktopView === 'chat-list'
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                title="Focus on Conversation and Directory list"
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span>Chat & Directory</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 font-medium">
            Showing <strong className="text-slate-900 font-semibold">{visibleRooms.length}</strong> rentals available
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex border-b border-slate-200 bg-white shrink-0 text-xs font-semibold">
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
          <span>Chat</span>
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
          <span>Map</span>
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
          <span>Rentals ({visibleRooms.length})</span>
        </button>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Left Pane: Chat Panel */}
        <div
          className={`h-full border-r border-slate-200/90 transition-all shrink-0 ${
            // Desktop visibility
            desktopView === 'map-list'
              ? 'hidden'
              : desktopView === 'chat-list'
              ? 'w-full md:w-[460px] lg:w-[480px]'
              : 'w-full md:w-[360px] lg:w-[380px] xl:w-[400px]'
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
          className={`h-full border-l border-slate-200/90 transition-all shrink-0 ${
            // Desktop width
            desktopView === 'chat-list'
              ? 'flex-1 min-w-0'
              : desktopView === 'map-list'
              ? 'w-full md:w-[440px] lg:w-[480px]'
              : 'w-full md:w-[360px] lg:w-[380px] xl:w-[400px]'
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
