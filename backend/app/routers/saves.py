from fastapi import APIRouter, HTTPException, Depends
from ..database import get_connection
from ..auth import get_current_user
from ..schemas.models import SaveRequest, SaveResponse, DeleteResponse

router = APIRouter(prefix="/api/saves", tags=["saves"])

def db_or_503():
    try:
        return get_connection()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

@router.post("", response_model=SaveResponse)
def save_state(req: SaveRequest, email: str = Depends(get_current_user)):
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        conn = db_or_503()
        cur = conn.cursor()

        cur.execute(
            "SELECT id FROM saved_states WHERE user_id=(SELECT id FROM users WHERE email=%s) AND project_slug=%s AND label=%s",
            (email, req.project_slug, req.label)
        )
        existing = cur.fetchone()
        import json
        state_json = json.dumps(req.state)

        if existing:
            cur.execute(
                "UPDATE saved_states SET state=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s",
                (state_json, existing["id"])
            )
            save_id = existing["id"]
        else:
            cur.execute(
                "INSERT INTO saved_states (user_id, project_slug, label, state) VALUES ((SELECT id FROM users WHERE email=%s), %s, %s, %s) RETURNING id",
                (email, req.project_slug, req.label, state_json)
            )
            save_id = cur.fetchone()["id"]

        conn.commit(); cur.close(); conn.close()
        return SaveResponse(id=save_id, message="Saved")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save error: {type(e).__name__}: {str(e)}")

@router.get("/{slug}")
def list_saves(slug: str, email: str = Depends(get_current_user)):
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        conn = db_or_503()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, label, state, created_at, updated_at FROM saved_states WHERE user_id=(SELECT id FROM users WHERE email=%s) AND project_slug=%s ORDER BY updated_at DESC",
            (email, slug)
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return [dict(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{save_id}", response_model=DeleteResponse)
def delete_save(save_id: int, email: str = Depends(get_current_user)):
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        conn = db_or_503()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM saved_states WHERE id=%s AND user_id=(SELECT id FROM users WHERE email=%s)",
            (save_id, email)
        )
        conn.commit(); cur.close(); conn.close()
        return DeleteResponse(success=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
