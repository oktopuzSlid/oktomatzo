from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from ..database import get_connection
from ..auth import get_current_user
from ..schemas.models import DeleteResponse
import httpx
import os
import mimetypes

router = APIRouter(prefix="/api/models", tags=["models"])

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
BUCKET = "models"

ALLOWED = {".glb", ".gltf", ".obj", ".stl"}

def format_from_name(name: str) -> str:
    _, ext = os.path.splitext(name)
    return ext.lower()

@router.post("/upload")
async def upload_model(
    project_slug: str = Form(...),
    file: UploadFile = File(...),
    email: str = Depends(get_current_user)
):
    if not email or not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=401, detail="Missing auth or Supabase config")

    ext = format_from_name(file.filename)
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"Format {ext} not supported. Use: {', '.join(ALLOWED)}")

    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Build a unique path: user_id/filename
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    user = cur.fetchone()
    cur.close(); conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    uid = user["id"]
    storage_path = f"{uid}/{file.filename}"

    # Upload to Supabase Storage via REST API
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": mimetypes.guess_type(file.filename)[0] or "application/octet-stream",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.put(upload_url, content=file_bytes, headers=headers)

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Upload to storage failed: {resp.text}")

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO uploaded_models (user_id, project_slug, name, file_url, file_format, file_size) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
        (uid, project_slug, file.filename, public_url, ext, file_size)
    )
    model_id = cur.fetchone()["id"]
    conn.commit()
    cur.close(); conn.close()

    return {"id": model_id, "url": public_url, "name": file.filename, "format": ext}

@router.get("")
def list_models(email: str = Depends(get_current_user)):
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, project_slug, name, file_url, file_format, file_size, created_at FROM uploaded_models WHERE user_id=(SELECT id FROM users WHERE email=%s) ORDER BY created_at DESC",
            (email,)
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{model_id}", response_model=DeleteResponse)
def delete_model(model_id: int, email: str = Depends(get_current_user)):
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM uploaded_models WHERE id=%s AND user_id=(SELECT id FROM users WHERE email=%s)",
            (model_id, email)
        )
        conn.commit()
        cur.close(); conn.close()
        return DeleteResponse(success=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
