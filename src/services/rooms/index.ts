import { Campus, RoomRepository, RoomView } from '@/domain/contracts';
import { MOCK_ROOMS } from '@/mocks/fixtures/rooms';
import { MOCK_CAMPUSES } from '@/mocks/fixtures/campuses';

export class MockRoomRepository implements RoomRepository {
  private rooms: RoomView[] = [...MOCK_ROOMS];
  private campuses: Campus[] = [...MOCK_CAMPUSES];

  async list(): Promise<RoomView[]> {
    return [...this.rooms];
  }

  async getById(id: string): Promise<RoomView | null> {
    const found = this.rooms.find((r) => r.id === id);
    return found ? { ...found } : null;
  }

  async listCampuses(): Promise<Campus[]> {
    return [...this.campuses];
  }

  async getCampusById(id: string): Promise<Campus | null> {
    const found = this.campuses.find((c) => c.id === id);
    return found ? { ...found } : null;
  }
}

export const roomRepository = new MockRoomRepository();
