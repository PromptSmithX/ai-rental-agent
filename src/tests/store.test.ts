import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore, selectVisibleRooms } from '@/app/store/searchStore';

describe('useSearchStore & Canonical State Synchronization', () => {
  beforeEach(async () => {
    // Reset store before each test
    await useSearchStore.getState().initData();
  });

  it('initializes with default campus and room fixtures', () => {
    const state = useSearchStore.getState();
    expect(state.allRooms.length).toBeGreaterThan(0);
    expect(state.allCampuses.length).toBe(2);
    expect(state.currentFilters.campusId).toBe('hcmut-ltk');
    expect(state.lastSearchResult).not.toBeNull();
  });

  it('selects and synchronizes room between card and marker', () => {
    const store = useSearchStore.getState();
    store.setSelectedRoomId('demo-room-01');
    expect(useSearchStore.getState().selectedRoomId).toBe('demo-room-01');

    store.setSelectedRoomId(null);
    expect(useSearchStore.getState().selectedRoomId).toBeNull();
  });

  it('updates and removes filters cleanly and updates canonical search result', () => {
    const store = useSearchStore.getState();

    // Update filter
    store.updateFilters({ maxPriceVnd: 2500000 });
    expect(useSearchStore.getState().currentFilters.maxPriceVnd).toBe(2500000);
    const countAfterPrice = useSearchStore.getState().lastSearchResult!.hits.length;

    // Remove filter
    store.removeFilter('maxPriceVnd');
    expect(useSearchStore.getState().currentFilters.maxPriceVnd).toBeNull();
    const countAfterRemove = useSearchStore.getState().lastSearchResult!.hits.length;
    expect(countAfterRemove).toBeGreaterThanOrEqual(countAfterPrice);
  });

  it('toggles room comparison correctly (up to 3 rooms)', () => {
    const store = useSearchStore.getState();
    store.toggleCompareRoom('demo-room-01');
    store.toggleCompareRoom('demo-room-02');
    expect(useSearchStore.getState().comparingRoomIds).toEqual(['demo-room-01', 'demo-room-02']);

    // Toggle off
    store.toggleCompareRoom('demo-room-01');
    expect(useSearchStore.getState().comparingRoomIds).toEqual(['demo-room-02']);
  });

  it('selectVisibleRooms derives consistent collection matching hit order', () => {
    const store = useSearchStore.getState();
    const hits = store.lastSearchResult?.hits;
    const visible = selectVisibleRooms(hits, store.allRooms);

    expect(visible.length).toBe(hits!.length);
    for (let i = 0; i < visible.length; i++) {
      expect(visible[i].id).toBe(hits![i].roomId);
    }
  });

  it('handles sendUserMessage with simulated event timeline updates', async () => {
    const store = useSearchStore.getState();
    await store.sendUserMessage('Tìm phòng dưới 3 triệu quanh Bách Khoa Lý Thường Kiệt trong 2 km');

    const updated = useSearchStore.getState();
    expect(updated.messages.length).toBe(2); // 1 user + 1 assistant
    expect(updated.events.length).toBeGreaterThan(0);
    expect(updated.runStatus).toBe('completed');
    expect(updated.currentFilters.maxPriceVnd).toBe(3000000);
  });
});
