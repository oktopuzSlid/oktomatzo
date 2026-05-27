import os
import mimetypes
import httpx
from fastapi import HTTPException
from .database import get_db
from .repositories import (
    create_user, find_user_by_email, find_user_by_id, email_exists,
    upsert_save, list_saves, delete_save,
    insert_score, get_leaderboard,
    insert_model, list_models, delete_model,
)
from .auth import hash_password, verify_password, create_access_token

# ── Auth ────────────────────────────────────────────────────────────────────

def signup_user(name: str, email: str, password: str) -> dict:
    conn = get_db()
    try:
        if email_exists(conn, email):
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = hash_password(password)
        user_id = create_user(conn, name, email.strip().lower(), hashed)
        token = create_access_token({"sub": email, "user_id": user_id})
        return {"access_token": token, "user_name": name}
    finally:
        conn.close()

def login_user(email: str, password: str) -> dict:
    conn = get_db()
    try:
        user = find_user_by_email(conn, email.strip().lower())
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token({"sub": user["email"], "user_id": user["id"]})
        return {"access_token": token, "user_name": user["name"]}
    finally:
        conn.close()

def get_user_profile(user_id: int) -> dict:
    conn = get_db()
    try:
        user = find_user_by_id(conn, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"id": user["id"], "name": user["name"], "email": user["email"]}
    finally:
        conn.close()

# ── Saves ───────────────────────────────────────────────────────────────────

def save_state(user_id: int, project_slug: str, label: str, state: dict) -> dict:
    conn = get_db()
    try:
        save_id = upsert_save(conn, user_id, project_slug, label, state)
        return {"id": save_id, "message": "Saved"}
    finally:
        conn.close()

def load_saves(user_id: int, project_slug: str) -> list:
    conn = get_db()
    try:
        return list_saves(conn, user_id, project_slug)
    finally:
        conn.close()

def remove_save(save_id: int, user_id: int) -> dict:
    conn = get_db()
    try:
        delete_save(conn, save_id, user_id)
        return {"success": True}
    finally:
        conn.close()

# ── Scores ──────────────────────────────────────────────────────────────────

def submit_score(user_id: int, project_slug: str, score: int, metadata: dict) -> dict:
    conn = get_db()
    try:
        insert_score(conn, user_id, project_slug, score, metadata)
        return {"success": True}
    finally:
        conn.close()

def get_scores_leaderboard(project_slug: str, limit: int = 20) -> list:
    conn = get_db()
    try:
        return get_leaderboard(conn, project_slug, limit)
    finally:
        conn.close()

# ── Models ───────────────────────────────────────────────────────────────────

ALLOWED_FORMATS = {".glb", ".gltf", ".obj", ".stl"}

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
BUCKET = "models"

async def upload_model_file(user_id: int, project_slug: str, filename: str, file_bytes: bytes) -> dict:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Format {ext} not supported. Use: {', '.join(ALLOWED_FORMATS)}"
        )
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase storage not configured")

    storage_path = f"{user_id}/{filename}"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": mimetypes.guess_type(filename)[0] or "application/octet-stream",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.put(upload_url, content=file_bytes, headers=headers)

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Upload to storage failed: {resp.text}")

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
    file_size = len(file_bytes)

    conn = get_db()
    try:
        model_id = insert_model(conn, user_id, project_slug, filename, public_url, ext, file_size)
    except Exception:
        # Storage upload succeeded but DB insert failed — orphaned file, log it
        raise HTTPException(status_code=500, detail="Upload recorded but database save failed")
    finally:
        conn.close()

    return {"id": model_id, "url": public_url, "name": filename, "format": ext}

def list_user_models(user_id: int) -> list:
    conn = get_db()
    try:
        return list_models(conn, user_id)
    finally:
        conn.close()

def remove_model(model_id: int, user_id: int) -> dict:
    conn = get_db()
    try:
        delete_model(conn, model_id, user_id)
        return {"success": True}
    finally:
        conn.close()
