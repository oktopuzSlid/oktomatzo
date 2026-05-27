from fastapi import APIRouter, Depends, HTTPException
from ..models.api import ScoreRequest
from ..services import submit_score, get_scores_leaderboard
from ..auth import get_current_user

router = APIRouter(prefix="/api/scores", tags=["scores"])

@router.post("")
def create_score(req: ScoreRequest, current: dict = Depends(get_current_user)):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return submit_score(current["user_id"], req.project_slug, req.score, req.metadata or {})

@router.get("/{slug}")
def leaderboard(slug: str, limit: int = 20):
    return get_scores_leaderboard(slug, limit)
