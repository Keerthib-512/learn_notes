from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import uuid
import random
import string
import logging
from typing import Optional

from models.schemas import (
    UserCreate, UserLogin, UserResponse, Token, 
    PasswordReset, PasswordUpdate, OTPVerification, 
    OTPRequest, SuccessResponse, ErrorResponse
)
from core.config import settings
from core.database import db
from services.email_service import send_otp_email, send_password_reset_email

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)

# In-memory OTP storage (in production, use Redis or database)
otp_store = {}

@router.get("/test")
async def test_auth():
    """Test endpoint for auth route"""
    return {"message": "Auth route is working"}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.get_user_by_email(email=email)
    if user is None:
        raise credentials_exception
    return user

@router.post("/signup", response_model=SuccessResponse)
async def signup(user: UserCreate):
    """User registration endpoint"""
    # Validate password confirmation
    if user.password != user.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Check if user already exists
    existing_user = await db.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    # Generate OTP for email verification
    otp = generate_otp()
    otp_store[user.email] = {
        "otp": otp,
        "user_data": user.dict(),
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    }
    
    # Send OTP email
    try:
        await send_otp_email(user.email, otp)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email"
        )
    
    return SuccessResponse(
        message="Verification code sent to your email. Please verify to complete registration."
    )

@router.post("/verify-otp", response_model=Token)
async def verify_otp(verification: OTPVerification):
    """Verify OTP and complete user registration"""
    # Check if OTP exists and is valid
    if verification.email not in otp_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    stored_data = otp_store[verification.email]
    
    # Check OTP expiry
    if datetime.utcnow() > stored_data["expires_at"]:
        del otp_store[verification.email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired"
        )
    
    # Verify OTP
    if stored_data["otp"] != verification.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Create user
    user_data = stored_data["user_data"]
    hashed_password = get_password_hash(user_data["password"])
    
    new_user = await db.create_user({
        "first_name": user_data["first_name"],
        "last_name": user_data["last_name"],
        "email": user_data["email"],
        "password": hashed_password
        # Don't include id and created_at - let the database generate them with defaults
    })
    
    # Clean up OTP
    del otp_store[verification.email]
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": new_user["email"]}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=new_user["id"],
        first_name=new_user["first_name"],
        last_name=new_user["last_name"],
        email=new_user["email"],
        created_at=new_user["created_at"]
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """User login endpoint"""
    logger.info(f"Login attempt for: {user_credentials.email}")
    
    # Demo login fallback - check for demo credentials first
    if user_credentials.email == "demo@example.com" and user_credentials.password == "demo123":
        user = {
            "id": "demo-user-id",
            "email": "demo@example.com",
            "first_name": "Demo",
            "last_name": "User",
            "created_at": datetime.utcnow(),
            "is_demo": True
        }
        logger.info("Using demo credentials")
    else:
        # Try database authentication
        try:
            user = await db.get_user_by_email(user_credentials.email)
            if not user or not verify_password(user_credentials.password, user["password"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Database error during login: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database temporarily unavailable. Try demo credentials: demo@example.com / demo123"
            )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=user["id"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        email=user["email"],
        created_at=user["created_at"]
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.post("/forgot-password", response_model=SuccessResponse)
async def forgot_password(password_reset: PasswordReset):
    """Initiate password reset process"""
    user = await db.get_user_by_email(password_reset.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This email is not registered"
        )
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    otp_store[f"reset_{password_reset.email}"] = {
        "token": reset_token,
        "expires_at": datetime.utcnow() + timedelta(hours=1)
    }
    
    # Send password reset email
    try:
        await send_password_reset_email(password_reset.email, reset_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email"
        )
    
    return SuccessResponse(
        message="Password reset link sent to your email"
    )

@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(password_update: PasswordUpdate):
    """Reset user password with token"""
    reset_key = f"reset_{password_update.email}"
    
    if reset_key not in otp_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    stored_data = otp_store[reset_key]
    
    # Check token expiry
    if datetime.utcnow() > stored_data["expires_at"]:
        del otp_store[reset_key]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Verify token
    if stored_data["token"] != password_update.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    # Update password
    hashed_password = get_password_hash(password_update.new_password)
    await db.update_user_password(password_update.email, hashed_password)
    
    # Clean up token
    del otp_store[reset_key]
    
    return SuccessResponse(
        message="Password reset successfully"
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user["id"],
        first_name=current_user["first_name"],
        last_name=current_user["last_name"],
        email=current_user["email"],
        created_at=current_user["created_at"]
    ) 