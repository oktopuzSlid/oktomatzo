import json

def create_user(conn, name: str, email: str, password_hash: str) -> int:
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
        (name, email, password_hash)
    )
    user_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    return user_id

def find_user_by_email(conn, email: str):
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, password_hash FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    return user

def find_user_by_id(conn, user_id: int):
    cur = conn.cursor()
    cur.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    return user

def email_exists(conn, email: str) -> bool:
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    found = cur.fetchone() is not None
    cur.close()
    return found

def count_users(conn) -> int:
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as c FROM users")
    count = cur.fetchone()["c"]
    cur.close()
    return count

def count_saves(conn) -> int:
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as c FROM saved_states")
    count = cur.fetchone()["c"]
    cur.close()
    return count

def list_all_users(conn):
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, created_at FROM users ORDER BY id DESC")
    rows = cur.fetchall()
    cur.close()
    return [dict(r) for r in rows]

def upsert_save(conn, user_id: int, project_slug: str, label: str, state: dict):
    cur = conn.cursor()
    state_json = json.dumps(state)
    cur.execute(
        """SELECT id FROM saved_states
           WHERE user_id = %s AND project_slug = %s AND label = %s""",
        (user_id, project_slug, label)
    )
    existing = cur.fetchone()
    if existing:
        cur.execute(
            "UPDATE saved_states SET state = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (state_json, existing["id"])
        )
        save_id = existing["id"]
    else:
        cur.execute(
            "INSERT INTO saved_states (user_id, project_slug, label, state) VALUES (%s, %s, %s, %s) RETURNING id",
            (user_id, project_slug, label, state_json)
        )
        save_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    return save_id

def list_saves(conn, user_id: int, project_slug: str):
    cur = conn.cursor()
    cur.execute(
        """SELECT id, label, state, created_at, updated_at
           FROM saved_states
           WHERE user_id = %s AND project_slug = %s
           ORDER BY updated_at DESC""",
        (user_id, project_slug)
    )
    rows = cur.fetchall()
    cur.close()
    return [dict(r) for r in rows]

def delete_save(conn, save_id: int, user_id: int):
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM saved_states WHERE id = %s AND user_id = %s",
        (save_id, user_id)
    )
    conn.commit()
    cur.close()

def insert_score(conn, user_id: int, project_slug: str, score: int, metadata: dict):
    cur = conn.cursor()
    meta_json = json.dumps(metadata)
    cur.execute(
        "INSERT INTO scores (user_id, project_slug, score, metadata) VALUES (%s, %s, %s, %s)",
        (user_id, project_slug, score, meta_json)
    )
    conn.commit()
    cur.close()

def get_leaderboard(conn, project_slug: str, limit: int = 20):
    cur = conn.cursor()
    cur.execute(
        """SELECT u.name, s.score, s.metadata, s.created_at
           FROM scores s
           JOIN users u ON u.id = s.user_id
           WHERE s.project_slug = %s
           ORDER BY s.score DESC LIMIT %s""",
        (project_slug, limit)
    )
    rows = cur.fetchall()
    cur.close()
    return [dict(r) for r in rows]

def insert_model(conn, user_id: int, project_slug: str, name: str, file_url: str, file_format: str, file_size: int) -> int:
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO uploaded_models (user_id, project_slug, name, file_url, file_format, file_size) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
        (user_id, project_slug, name, file_url, file_format, file_size)
    )
    model_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    return model_id

def list_models(conn, user_id: int):
    cur = conn.cursor()
    cur.execute(
        """SELECT id, project_slug, name, file_url, file_format, file_size, created_at
           FROM uploaded_models
           WHERE user_id = %s
           ORDER BY created_at DESC""",
        (user_id,)
    )
    rows = cur.fetchall()
    cur.close()
    return [dict(r) for r in rows]

def delete_model(conn, model_id: int, user_id: int):
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM uploaded_models WHERE id = %s AND user_id = %s",
        (model_id, user_id)
    )
    conn.commit()
    cur.close()
