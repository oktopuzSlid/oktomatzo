from fastapi import APIRouter, Depends, HTTPException
from ..models.api import SaveRequest, SaveResponse, DeleteResponse
from ..services import save_state, load_saves, remove_save
from ..auth import get_current_user

router = APIRouter(prefix="/api/saves", tags=["saves"])

@router.post("", response_model=SaveResponse)
def create_save(req: SaveRequest, current: dict = Depends(get_current_user)):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    result = save_state(current["user_id"], req.project_slug, req.label, req.state)
    return SaveResponse(id=result["id"], message=result["message"])

@router.get("/{slug}")
def read_saves(slug: str, current: dict = Depends(get_current_user)):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return load_saves(current["user_id"], slug)

@router.delete("/{save_id}", response_model=DeleteResponse)
def delete_save_route(save_id: int, current: dict = Depends(get_current_user)):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return remove_save(save_id, current["user_id"])
