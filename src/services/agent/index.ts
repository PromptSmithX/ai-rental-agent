import { RentalAgentService } from '@/domain/contracts';
import { MockRentalAgentService } from './mockRentalAgentService';
import { ApiRentalAgentService } from './apiRentalAgentService';

export { MockRentalAgentService, ApiRentalAgentService };

// Using MockRentalAgentService for lightweight frontend demo and screenshot capture.
export const rentalAgentService: RentalAgentService = new MockRentalAgentService();
