from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from auth import hash_password, verify_password, create_access_token
from user_model import create_user, get_user_by_email, update_user_role, get_all_users

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
    role: str = "viewer"

class UpdateRoleRequest(BaseModel):
    email: str
    role: str

@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest):
    existing = get_user_by_email(request.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed = hash_password(request.password)
    user = create_user(request.email, hashed, request.full_name)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create user"
        )

    token = create_access_token({
        "sub": user["email"],
        "name": user["full_name"],
        "role": user.get("role", "viewer")
    })

    return AuthResponse(
        access_token=token,
        full_name=user["full_name"],
        email=user["email"],
        role=user.get("role", "viewer")
    )

@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest):
    user = get_user_by_email(request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": user["email"],
        "name": user["full_name"],
        "role": user.get("role", "viewer")
    })

    return AuthResponse(
        access_token=token,
        full_name=user["full_name"],
        email=user["email"],
        role=user.get("role", "viewer")
    )

@router.get("/me")
def get_me():
    return {"message": "Auth working!"}

@router.get("/users")
def list_users():
    return get_all_users()

@router.post("/users/role")
def change_role(request: UpdateRoleRequest):
    if request.role not in ["admin", "manager", "viewer"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be admin, manager, or viewer"
        )
    user = update_user_role(request.email, request.role)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"message": f"Role updated to {request.role}", "user": user}