import { RentalAgentService } from '@/domain/contracts';
import { MockRentalAgentService } from './mockRentalAgentService';
import { ApiRentalAgentService } from './apiRentalAgentService';

export { MockRentalAgentService, ApiRentalAgentService };

// Use ApiRentalAgentService as default. Errors propagate to the caller (see
// searchStore.sendUserMessage) instead of silently falling back to Mock.
export const rentalAgentService: RentalAgentService = new ApiRentalAgentService();
