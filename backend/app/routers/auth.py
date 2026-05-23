from fastapi import APIRouter, HTTPException, Depends
from ..database import get_connection
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..schemas.auth import SignUpRequest, LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

def db_or_503():
    try:
        return get_connection()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

@router.post("/signup", response_model=TokenResponse)
def signup(request: SignUpRequest):
    try:
        conn = db_or_503()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (request.email,))
        if cur.fetchone():
            cur.close(); conn.close()
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed = hash_password(request.password)
        cur.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
            (request.name, request.email, hashed)
        )
        user_id = cur.fetchone()["id"]
        conn.commit()
        cur.close(); conn.close()

        token = create_access_token({"sub": request.email, "user_id": user_id})
        return TokenResponse(access_token=token, user_name=request.name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signup error: {type(e).__name__}: {str(e)}")

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    try:
        conn = db_or_503()
        cur = conn.cursor()
        email = request.email.strip().lower()
        cur.execute("SELECT id, name, email, password_hash FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close(); conn.close()

        if not user or not verify_password(request.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_access_token({"sub": user["email"], "user_id": user["id"]})
        return TokenResponse(access_token=token, user_name=user["name"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {type(e).__name__}: {str(e)}")

@router.get("/me", response_model=UserResponse)
def get_profile(email: str = Depends(get_current_user)):
    try:
        if not email:
            raise HTTPException(status_code=401, detail="Not authenticated")
        conn = db_or_503()
        cur = conn.cursor()
        cur.execute("SELECT id, name, email FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close(); conn.close()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse(id=user["id"], name=user["name"], email=user["email"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile error: {type(e).__name__}: {str(e)}")
