import os
import socket
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse
from fastapi import HTTPException

raw_url = os.getenv("DATABASE_URL", "")
_resolved_url = None

def _resolve_url():
    global _resolved_url
    if _resolved_url is not None:
        return _resolved_url
    url = raw_url
    if url:
        try:
            parsed = urlparse(url)
            host = parsed.hostname
            if host:
                ipv4 = socket.getaddrinfo(host, None, socket.AF_INET)[0][4][0]
                url = url.replace(host, ipv4)
        except Exception:
            pass
    _resolved_url = url
    return url

def get_connection():
    return psycopg2.connect(_resolve_url(), cursor_factory=RealDictCursor)

def get_db():
    try:
        return get_connection()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

def get_user_id(email: str, conn) -> int:
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row["id"]

def init_db():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS saved_states (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_slug TEXT NOT NULL,
            label TEXT DEFAULT '',
            state JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS scores (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_slug TEXT NOT NULL,
            score INTEGER NOT NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS uploaded_models (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_slug TEXT NOT NULL,
            name TEXT NOT NULL,
            file_url TEXT NOT NULL,
            file_format TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_saves_user_slug ON saved_states(user_id, project_slug);
        CREATE INDEX IF NOT EXISTS idx_scores_slug ON scores(project_slug);
        CREATE INDEX IF NOT EXISTS idx_models_user ON uploaded_models(user_id);
    """)
    conn.commit()
    cur.close()
    conn.close()
