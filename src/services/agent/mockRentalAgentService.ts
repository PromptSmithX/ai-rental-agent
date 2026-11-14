import { AgentReply, RentalAgentService, SearchFilters } from '@/domain/contracts';
import { matchAndExecuteScenario } from '@/mocks/scenarios';
import { roomRepository } from '@/services/rooms';

export class MockRentalAgentService implements RentalAgentService {
  async run(input: {
    threadId: string;
    userMessage: string;
    currentFilters: SearchFilters;
  }): Promise<AgentReply> {
    const rooms = await roomRepository.list();
    const campuses = await roomRepository.listCampuses();

    // Brief simulated async reaction (~150ms) to emulate observable event lifecycle
    await new Promise((resolve) => setTimeout(resolve, 150));

    return matchAndExecuteScenario({
      threadId: input.threadId,
      userMessage: input.userMessage,
      currentFilters: input.currentFilters,
      rooms,
      campuses,
    });
  }
}
