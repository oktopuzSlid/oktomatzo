from fastapi import APIRouter, HTTPException, Depends
from ..database import get_connection
from ..auth import get_current_user
from ..schemas.models import ScoreRequest, DeleteResponse
import json

router = APIRouter(prefix="/api/scores", tags=["scores"])

def db_or_503():
    try:
        return get_connection()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

@router.post("")
def submit_score(req: ScoreRequest, email: str = Depends(get_current_user)):
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        conn = db_or_503()
        cur = conn.cursor()
        meta_json = json.dumps(req.metadata or {})
        cur.execute(
            "INSERT INTO scores (user_id, project_slug, score, metadata) VALUES ((SELECT id FROM users WHERE email=%s), %s, %s, %s)",
            (email, req.project_slug, req.score, meta_json)
        )
        conn.commit(); cur.close(); conn.close()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{slug}")
def get_leaderboard(slug: str, limit: int = 20):
    try:
        conn = db_or_503()
        cur = conn.cursor()
        cur.execute(
            "SELECT u.name, s.score, s.metadata, s.created_at FROM scores s JOIN users u ON u.id=s.user_id WHERE s.project_slug=%s ORDER BY s.score DESC LIMIT %s",
            (slug, limit)
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return [dict(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
