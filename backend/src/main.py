import os
from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers import projects, auth, admin, saves, scores, models, projects_display
from .database import init_db
from .middleware import rate_limit_middleware, global_exception_handler


app = FastAPI(title="Oktomatzo Host", version="1.0.0")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

# CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:4321,http://localhost:8001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# Exception handler
app.add_exception_handler(Exception, global_exception_handler)

# API routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(admin.router)
app.include_router(saves.router)
app.include_router(scores.router)
app.include_router(models.router)

# Dynamic project pages (listing + wrapper — discovered from projects/ folder)
app.include_router(projects_display.router)

# Static mounts for project files, platform SDK, and docs
projects_dir = os.path.join(BASE_DIR, "projects")
platform_dir = os.path.join(BASE_DIR, "platform")
docs_dir = os.path.join(BASE_DIR, "docs")
if os.path.isdir(projects_dir):
    app.mount("/projects-content", StaticFiles(directory=projects_dir, html=True), name="projects-content")
if os.path.isdir(platform_dir):
    app.mount("/platform", StaticFiles(directory=platform_dir), name="platform")
if os.path.isdir(docs_dir):
    app.mount("/docs", StaticFiles(directory=docs_dir, html=True), name="docs")

# Static frontend files — check both possible build output locations
for dist_candidate in [
    os.path.join(BASE_DIR, "generated", "frontend", "dist"),
    os.path.join(BASE_DIR, "frontend", "dist"),
    os.path.join(BASE_DIR, "dist"),
]:
    if os.path.isdir(dist_candidate):
        app.mount("/", StaticFiles(directory=dist_candidate, html=True), name="frontend")
        break

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
