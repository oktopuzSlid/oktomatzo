from fastapi import APIRouter, HTTPException, Depends
from ..database import get_connection
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..schemas.auth import SignUpRequest, LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup", response_model=TokenResponse)
def signup(request: SignUpRequest):
    conn = get_connection()
    existing = conn.execute(
        "SELECT id FROM users WHERE email = ?", (request.email,)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(request.password)
    cursor = conn.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (request.name, request.email, hashed)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    token = create_access_token({"sub": request.email, "user_id": user_id})
    return TokenResponse(access_token=token, user_name=request.name)

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    conn = get_connection()
    user = conn.execute(
        "SELECT id, name, email, password_hash FROM users WHERE email = ?",
        (request.email.strip().lower(),)
    ).fetchone()
    conn.close()

    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user["email"], "user_id": user["id"]})
    return TokenResponse(access_token=token, user_name=user["name"])

@router.get("/me", response_model=UserResponse)
def get_profile(email: str = Depends(get_current_user)):
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_connection()
    user = conn.execute(
        "SELECT id, name, email FROM users WHERE email = ?", (email,)
    ).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=user["id"], name=user["name"], email=user["email"])
