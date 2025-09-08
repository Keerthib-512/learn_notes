import fitz  # PyMuPDF
from docx import Document
import aiofiles
import os
import uuid
from typing import Tuple
import logging
from core.config import settings

logger = logging.getLogger(__name__)

class FileService:
    def __init__(self):
        self.upload_dir = "uploads"
        os.makedirs(self.upload_dir, exist_ok=True)
    
    async def save_uploaded_file(self, file_content: bytes, filename: str) -> str:
        """Save uploaded file and return the file path"""
        try:
            # Generate unique filename
            file_extension = os.path.splitext(filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(self.upload_dir, unique_filename)
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_content)
            
            return file_path
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise
    
    async def extract_text_from_file(self, file_path: str) -> str:
        """Extract text from various file formats"""
        try:
            file_extension = os.path.splitext(file_path)[1].lower()
            
            if file_extension == '.pdf':
                return await self._extract_text_from_pdf(file_path)
            elif file_extension == '.docx':
                return await self._extract_text_from_docx(file_path)
            elif file_extension == '.txt':
                return await self._extract_text_from_txt(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
                
        except Exception as e:
            logger.error(f"Error extracting text from file: {e}")
            raise
    
    async def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            doc = fitz.open(file_path)
            text = ""
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text += page.get_text()
            
            doc.close()
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise
    
    async def _extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from Word document"""
        try:
            doc = Document(file_path)
            text = ""
            
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {e}")
            raise
    
    async def _extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from text file"""
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                text = await f.read()
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from TXT: {e}")
            raise
    
    def validate_file(self, filename: str, file_size: int) -> Tuple[bool, str]:
        """Validate uploaded file"""
        # Check file extension
        file_extension = os.path.splitext(filename)[1].lower()
        if file_extension not in settings.allowed_file_types:
            return False, f"File type {file_extension} not supported. Allowed types: {', '.join(settings.allowed_file_types)}"
        
        # Check file size
        if file_size > settings.max_file_size:
            return False, f"File size too large. Maximum size: {settings.max_file_size / (1024 * 1024):.1f}MB"
        
        return True, "File is valid"
    
    async def cleanup_file(self, file_path: str) -> None:
        """Delete file from filesystem"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up file: {file_path}")
        except Exception as e:
            logger.error(f"Error cleaning up file {file_path}: {e}")
    
    def get_file_info(self, file_path: str) -> dict:
        """Get file information"""
        try:
            stat = os.stat(file_path)
            return {
                "filename": os.path.basename(file_path),
                "size": stat.st_size,
                "extension": os.path.splitext(file_path)[1],
                "created_at": stat.st_ctime
            }
        except Exception as e:
            logger.error(f"Error getting file info: {e}")
            return {}

# Global file service instance
file_service = FileService() 