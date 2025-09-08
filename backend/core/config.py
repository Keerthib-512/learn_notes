from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # OpenAI Configuration
    openai_api_key: str
    
    # Supabase Configuration
    supabase_url: str
    supabase_service_key: str
    
    # SendGrid Configuration
    sendgrid_api_key: str
    
    # JWT Configuration
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # File Upload Configuration
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    allowed_file_types: list = [".pdf", ".docx", ".txt"]
    
    # Email Configuration
    from_email: str = "borra.keerthisudha@intellinotes.org"
    
    class Config:
        env_file = ".env"

settings = Settings() 