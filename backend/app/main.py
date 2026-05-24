from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers import projects, auth, admin, saves, scores, models
from .database import init_db
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Oktomatzo Host", version="1.0.0")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:4321,http://localhost:8001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(admin.router)
app.include_router(saves.router)
app.include_router(scores.router)
app.include_router(models.router)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DIST_DIR = os.path.join(BASE_DIR, 'dist')
if os.path.isdir(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")

@app.on_event("startup")
def startup():
    db_url = os.getenv("DATABASE_URL", "")
    masked = db_url[:20] + "..." + db_url[-10:] if db_url else "NOT SET"
    print(f"DATABASE_URL: {masked}")
    print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT SET')}")
    print(f"SUPABASE_SERVICE_KEY set: {'YES' if os.getenv('SUPABASE_SERVICE_KEY') else 'NO'}")
    try:
        init_db()
        print("Database ready")
    except Exception as e:
        print("Database unavailable (frontend still works):", e)

@app.get("/api/debug/db-test")
def debug_db():
    from .database import raw_url, _resolve_url, get_connection
    import traceback
    result = {"raw_url_prefix": raw_url[:35] + "..." if raw_url else "NOT SET"}
    try:
        resolved = _resolve_url()
        result["resolved_prefix"] = resolved[:45] + "..." if resolved else "NOT SET"
    except Exception as e:
        result["resolve_error"] = str(e)
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT version()")
        v = cur.fetchone()
        cur.close(); conn.close()
        result["connection"] = "OK"
        result["version"] = str(v)
    except Exception as e:
        result["connection"] = "FAILED"
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()
    return result
