from supabase import create_client, Client
from core.config import settings
from typing import Optional
import logging
import httpx

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        try:
            # Create Supabase client with basic configuration
            self.supabase: Client = create_client(
                settings.supabase_url,
                settings.supabase_service_key
            )
            self.connection_available = True
            logger.info("Supabase connection initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            self.supabase = None
            self.connection_available = False
    
    async def create_user(self, user_data: dict) -> dict:
        """Create a new user in the database"""
        try:
            response = self.supabase.table("users").insert(user_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email"""
        if not self.connection_available or not self.supabase:
            logger.warning("Database connection not available, returning None for user lookup")
            return None
            
        try:
            response = self.supabase.table("users").select("*").eq("email", email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            # For login issues, return None instead of raising to allow graceful handling
            if "timeout" in str(e).lower() or "read operation timed out" in str(e):
                logger.warning("Database timeout occurred, returning None")
                return None
            raise
    
    async def update_user_password(self, email: str, hashed_password: str) -> bool:
        """Update user password"""
        try:
            response = self.supabase.table("users").update(
                {"password": hashed_password}
            ).eq("email", email).execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error updating password: {e}")
            raise
    
    async def create_document(self, document_data: dict) -> dict:
        """Create a new document record"""
        try:
            response = self.supabase.table("documents").insert(document_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            raise
    
    async def get_user_documents(self, user_id: str) -> list:
        """Get all documents for a user"""
        try:
            response = self.supabase.table("documents").select("*").eq("user_id", user_id).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error getting user documents: {e}")
            raise
    
    async def update_document_summary(self, doc_id: str, summary_data: dict) -> bool:
        """Update document with summary data"""
        try:
            response = self.supabase.table("documents").update(summary_data).eq("doc_id", doc_id).execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error updating document summary: {e}")
            raise
    
    async def upload_file_to_storage(self, file_path: str, file_data: bytes) -> str:
        """Upload file to Supabase storage"""
        try:
            response = self.supabase.storage.from_("documents").upload(file_path, file_data)
            return f"{settings.supabase_url}/storage/v1/object/public/documents/{file_path}"
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            raise
    
    async def delete_document(self, doc_id: str) -> bool:
        """Delete a document record from the database"""
        try:
            logger.info(f"Attempting to delete document: {doc_id}")
            response = self.supabase.table("documents").delete().eq("doc_id", doc_id).execute()
            logger.info(f"Delete response: {response}")
            logger.info(f"Delete response data: {response.data}")
            logger.info(f"Delete response count: {response.count}")
            
            # Check both data length and count for successful deletion
            success = (response.data is not None and len(response.data) > 0) or (response.count is not None and response.count > 0)
            logger.info(f"Delete success: {success}")
            return success
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            raise
    
    async def delete_file_from_storage(self, file_path: str) -> bool:
        """Delete file from Supabase storage"""
        try:
            response = self.supabase.storage.from_("documents").remove([file_path])
            return True
        except Exception as e:
            logger.error(f"Error deleting file from storage: {e}")
            raise

# Global database instance
db = DatabaseManager() 