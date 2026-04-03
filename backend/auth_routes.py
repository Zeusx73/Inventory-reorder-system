from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from auth import hash_password, verify_password, create_access_token
from user_model import create_user, get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    full_name: str
    email: str

@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest):
    # Check if user exists
    existing = get_user_by_email(request.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password and save user
    hashed = hash_password(request.password)
    user = create_user(request.email, hashed, request.full_name)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create user"
        )

    # Create JWT token
    token = create_access_token({"sub": user["email"], "name": user["full_name"]})

    return AuthResponse(
        access_token=token,
        full_name=user["full_name"],
        email=user["email"]
    )

@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest):
    # Find user
    user = get_user_by_email(request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check password
    if not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Create JWT token
    token = create_access_token({"sub": user["email"], "name": user["full_name"]})

    return AuthResponse(
        access_token=token,
        full_name=user["full_name"],
        email=user["email"]
    )

@router.get("/me")
def get_me(user: dict = None):
    return {"message": "Auth working!"}