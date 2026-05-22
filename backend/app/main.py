from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers import projects, auth
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

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DIST_DIR = os.path.join(BASE_DIR, 'dist')
if os.path.isdir(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")

@app.on_event("startup")
def startup():
    try:
        init_db()
        os.makedirs(os.getenv("STORAGE_PATH", "./storage"), exist_ok=True)
        print("Startup complete")
    except Exception as e:
        print("Startup error:", e)
