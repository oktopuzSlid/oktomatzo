from fastapi import APIRouter, Depends, HTTPException
from ..models.auth import SignUpRequest, LoginRequest, TokenResponse, UserResponse
from ..services import signup_user, login_user, get_user_profile
from ..auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup", response_model=TokenResponse)
def signup(request: SignUpRequest):
    try:
        result = signup_user(request.name, request.email, request.password)
        return TokenResponse(access_token=result["access_token"], user_name=result["user_name"])
    except HTTPException:
        raise

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    try:
        result = login_user(request.email, request.password)
        return TokenResponse(access_token=result["access_token"], user_name=result["user_name"])
    except HTTPException:
        raise

@router.get("/me", response_model=UserResponse)
def profile(current: dict = Depends(get_current_user)):
    if not current:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = get_user_profile(current["user_id"])
    return UserResponse(id=user["id"], name=user["name"], email=user["email"])
