from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User Models
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    confirm_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    created_at: datetime

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordUpdate(BaseModel):
    email: EmailStr
    new_password: str
    token: str

# Document Models
class DocumentUpload(BaseModel):
    filename: str
    content_type: str

class DocumentResponse(BaseModel):
    doc_id: str
    doc_name: str
    upload_time: str
    summary_text: Optional[str] = None
    summary_audio_url: Optional[str] = None
    summary_graph_data: Optional[dict] = None

class DocumentList(BaseModel):
    documents: List[DocumentResponse]

# Summary Models
class SummaryRequest(BaseModel):
    doc_id: str

class SummaryResponse(BaseModel):
    doc_id: str
    summary_text: str
    summary_audio_url: Optional[str] = None
    summary_graph_data: Optional[dict] = None

# Authentication Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class OTPVerification(BaseModel):
    email: EmailStr
    otp: str

class OTPRequest(BaseModel):
    email: EmailStr

# Text-to-Speech Models
class TTSRequest(BaseModel):
    text: str
    voice_style: Optional[str] = "calm"

class TTSResponse(BaseModel):
    audio_url: str

# Graph Generation Models
class GraphRequest(BaseModel):
    text: str
    graph_type: Optional[str] = "flowchart"

class GraphResponse(BaseModel):
    graph_data: dict
    graph_type: str

# Error Models
class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

# Success Models
class SuccessResponse(BaseModel):
    message: str
    data: Optional[dict] = None 