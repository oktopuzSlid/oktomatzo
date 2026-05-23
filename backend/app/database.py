import os
import socket
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse

raw_url = os.getenv("DATABASE_URL", "")

# Resolve hostname to IPv4 to avoid Render-to-Supabase IPv6 routing issues
def resolve_ipv4(url: str) -> str:
    if not url:
        return url
    try:
        parsed = urlparse(url)
        host = parsed.hostname
        if not host:
            return url
        # Get IPv4 address for the host
        ipv4 = socket.getaddrinfo(host, None, socket.AF_INET)[0][4][0]
        url = url.replace(host, ipv4)
    except Exception:
        pass  # fall back to original URL if resolution fails
    return url

DATABASE_URL = resolve_ipv4(raw_url)

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

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
