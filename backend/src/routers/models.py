from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from ..models.api import DeleteResponse
from ..services import upload_model_file, list_user_models, remove_model
from ..auth import get_current_user

router = APIRouter(prefix="/api/models", tags=["models"])

@router.post("/upload")
async def upload_model(
    project_slug: str = Form(...),
    file: UploadFile = File(...),
    current: dict = Depends(get_current_user),
):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    file_bytes = await file.read()
    return await upload_model_file(current["user_id"], project_slug, file.filename, file_bytes)

@router.get("")
def list_models(current: dict = Depends(get_current_user)):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return list_user_models(current["user_id"])

@router.delete("/{model_id}", response_model=DeleteResponse)
def delete_model_route(model_id: int, current: dict = Depends(get_current_user)):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return remove_model(model_id, current["user_id"])
