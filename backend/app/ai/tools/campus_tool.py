from typing import List, Optional
from pydantic import Field
from app.schemas.base import CamelModel
from app.schemas.campus import CampusResponse
from app.ai.repositories.base import BaseAgentRoomRepository


class CampusResolutionResult(CamelModel):
    campus_id: Optional[str] = None
    canonical_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_ambiguous: bool = False
    candidates: List[CampusResponse] = Field(default_factory=list)


def resolve_campus(query: Optional[str], repo: BaseAgentRoomRepository) -> CampusResolutionResult:
    """Resolve user campus query against known registered campuses.
    
    Never invents coordinates. If multiple campuses match or query is ambiguous,
    flags is_ambiguous=True with candidate campuses.
    """
    if not query or not query.strip():
        return CampusResolutionResult(is_ambiguous=True)

    campuses = repo.list_campuses()
    q = query.lower().strip()

    # 1. Direct ID match
    for c in campuses:
        if c.id.lower() == q:
            return CampusResolutionResult(
                campus_id=c.id,
                canonical_name=f"{c.university_name} - {c.campus_name}",
                latitude=c.latitude,
                longitude=c.longitude,
                is_ambiguous=False,
            )

    # 2. Specific alias rules
    if "hà nội" in q or "bkhn" in q or "hust" in q:
        target = next((c for c in campuses if c.id == "hust-hanoi"), None)
        if target:
            return CampusResolutionResult(
                campus_id=target.id,
                canonical_name=f"{target.university_name} - {target.campus_name}",
                latitude=target.latitude,
                longitude=target.longitude,
            )

    if "quốc gia hà nội" in q or "qghn" in q or "vnu" in q:
        target = next((c for c in campuses if c.id == "vnu-hanoi"), None)
        if target:
            return CampusResolutionResult(
                campus_id=target.id,
                canonical_name=f"{target.university_name} - {target.campus_name}",
                latitude=target.latitude,
                longitude=target.longitude,
            )

    if "kinh tế quốc dân" in q or "neu" in q:
        target = next((c for c in campuses if c.id == "neu-hanoi"), None)
        if target:
            return CampusResolutionResult(
                campus_id=target.id,
                canonical_name=f"{target.university_name} - {target.campus_name}",
                latitude=target.latitude,
                longitude=target.longitude,
            )

    if "lý thường kiệt" in q or "ltk" in q or ("bách khoa" in q and "quận 10" in q):
        target = next((c for c in campuses if c.id == "hcmut-ltk"), None)
        if target:
            return CampusResolutionResult(
                campus_id=target.id,
                canonical_name=f"{target.university_name} - {target.campus_name}",
                latitude=target.latitude,
                longitude=target.longitude,
            )

    if "dĩ an" in q or "thủ đức" in q or ("bách khoa" in q and "bình dương" in q):
        target = next((c for c in campuses if c.id == "hcmut-da"), None)
        if target:
            return CampusResolutionResult(
                campus_id=target.id,
                canonical_name=f"{target.university_name} - {target.campus_name}",
                latitude=target.latitude,
                longitude=target.longitude,
            )

    # 3. Check for broad ambiguity: "bách khoa" alone matches multiple campuses
    if "bách khoa" in q:
        bk_campuses = [c for c in campuses if "bách khoa" in c.university_name.lower()]
        if len(bk_campuses) > 1:
            return CampusResolutionResult(
                is_ambiguous=True,
                candidates=bk_campuses,
            )
        elif len(bk_campuses) == 1:
            c = bk_campuses[0]
            return CampusResolutionResult(
                campus_id=c.id,
                canonical_name=f"{c.university_name} - {c.campus_name}",
                latitude=c.latitude,
                longitude=c.longitude,
            )

    # 4. Partial substring matching across all campuses
    matched = [
        c for c in campuses
        if q in c.university_name.lower() or q in c.campus_name.lower()
    ]
    if len(matched) == 1:
        c = matched[0]
        return CampusResolutionResult(
            campus_id=c.id,
            canonical_name=f"{c.university_name} - {c.campus_name}",
            latitude=c.latitude,
            longitude=c.longitude,
        )
    elif len(matched) > 1:
        return CampusResolutionResult(
            is_ambiguous=True,
            candidates=matched,
        )

    # 5. Not found / ambiguous
    return CampusResolutionResult(
        is_ambiguous=True,
        candidates=campuses[:3],
    )
