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

export interface ApiRoomRepositoryOptions {
  baseUrl?: string;
}

/** Fetches rooms/campuses from the real backend. Backend `RoomView`/`CampusResponse`
 * already serialize to camelCase matching the frontend contract 1:1 (see
 * backend/app/schemas/base.py CamelModel), so no field mapping is needed here. */
export class ApiRoomRepository implements RoomRepository {
  private baseUrl: string;

  constructor(options: ApiRoomRepositoryOptions = {}) {
    this.baseUrl =
      options.baseUrl ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
      'http://localhost:8000';
  }

  async list(): Promise<RoomView[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/rooms`);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  async getById(id: string): Promise<RoomView | null> {
    const res = await fetch(`${this.baseUrl}/api/v1/rooms/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  async listCampuses(): Promise<Campus[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/campuses`);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  async getCampusById(id: string): Promise<Campus | null> {
    const res = await fetch(`${this.baseUrl}/api/v1/campuses/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }
}

const isTestEnv = typeof process !== 'undefined' && Boolean(process.env?.VITEST);

export const roomRepository = isTestEnv ? new MockRoomRepository() : new ApiRoomRepository();
