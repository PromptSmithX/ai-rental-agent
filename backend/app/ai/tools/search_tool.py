from app.schemas.search import SearchFilters, SearchResult
from app.ai.repositories.base import BaseAgentRoomRepository


def search_rooms(filters: SearchFilters, repo: BaseAgentRoomRepository) -> SearchResult:
    """Execute room search enforcing hard filters and returning scored hits.
    
    Invariants:
    - Zero arbitrary SQL.
    - Deterministic straight-line distance.
    - Mandatory constraints never relaxed automatically.
    """
    return repo.search_rooms(filters)
