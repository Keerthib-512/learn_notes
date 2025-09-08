from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from typing import List
import uuid
from datetime import datetime

from models.schemas import DocumentResponse, DocumentList, SuccessResponse
from api.routes.auth import get_current_user
from services.file_service import file_service
from services.ai_service import ai_service
from services.tts_service import tts_service
from core.database import db
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def serialize_datetime(dt_value):
    """Helper function to convert datetime to ISO format string"""
    if dt_value is None:
        return None
    if isinstance(dt_value, str):
        return dt_value
    if hasattr(dt_value, 'isoformat'):
        return dt_value.isoformat()
    return str(dt_value)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload and process a document"""
    try:
        # Validate file
        file_content = await file.read()
        is_valid, message = file_service.validate_file(file.filename, len(file_content))
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        # Save file
        file_path = await file_service.save_uploaded_file(file_content, file.filename)
        
        # Create document record
        doc_id = str(uuid.uuid4())
        document_data = {
            "doc_id": doc_id,
            "user_id": current_user["id"],
            "doc_name": file.filename,
            "upload_time": datetime.utcnow().isoformat(),
            "file_path": file_path
        }
        
        new_document = await db.create_document(document_data)
        
        # Start background processing (extract text and generate summary)
        try:
            # Extract text from file
            document_text = await file_service.extract_text_from_file(file_path)
            
            if not document_text.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract text from the document"
                )
            
            # Generate summary
            summary_text = await ai_service.generate_summary(document_text)
            
            # Generate graph data
            graph_data = await ai_service.generate_graph_data(summary_text)
            
            # Update document with summary data
            await db.update_document_summary(doc_id, {
                "summary_text": summary_text,
                "summary_graph_data": graph_data,
                "processed": True
            })
            
            # Clean up uploaded file
            await file_service.cleanup_file(file_path)
            
        except Exception as e:
            logger.error(f"Error processing document {doc_id}: {e}")
            # Update document with error status
            await db.update_document_summary(doc_id, {
                "processing_error": str(e),
                "processed": False
            })
        
        return DocumentResponse(
            doc_id=new_document["doc_id"],
            doc_name=new_document["doc_name"],
            upload_time=serialize_datetime(new_document["upload_time"]),
            summary_text=None,  # Will be processed asynchronously
            summary_audio_url=None,
            summary_graph_data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )

@router.get("/", response_model=DocumentList)
async def get_user_documents(current_user: dict = Depends(get_current_user)):
    """Get all documents for the current user"""
    try:
        documents = await db.get_user_documents(current_user["id"])
        
        document_responses = [
            DocumentResponse(
                doc_id=doc["doc_id"],
                doc_name=doc["doc_name"],
                upload_time=serialize_datetime(doc["upload_time"]),
                summary_text=doc.get("summary_text"),
                summary_audio_url=doc.get("summary_audio_url"),
                summary_graph_data=doc.get("summary_graph_data")
            )
            for doc in documents
        ]
        
        return DocumentList(documents=document_responses)
        
    except Exception as e:
        logger.error(f"Error getting user documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve documents"
        )

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific document by ID"""
    try:
        documents = await db.get_user_documents(current_user["id"])
        document = next((doc for doc in documents if doc["doc_id"] == doc_id), None)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        return DocumentResponse(
            doc_id=document["doc_id"],
            doc_name=document["doc_name"],
            upload_time=serialize_datetime(document["upload_time"]),
            summary_text=document.get("summary_text"),
            summary_audio_url=document.get("summary_audio_url"),
            summary_graph_data=document.get("summary_graph_data")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document {doc_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document"
        )

@router.post("/{doc_id}/generate-audio")
async def generate_audio(
    doc_id: str,
    voice_style: str = "human",
    current_user: dict = Depends(get_current_user)
):
    """Generate audio for document summary with human-like pacing"""
    try:
        # Get document
        documents = await db.get_user_documents(current_user["id"])
        document = next((doc for doc in documents if doc["doc_id"] == doc_id), None)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        if not document.get("summary_text"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document summary not available"
            )
        
        # Check if podcast script already exists in database
        podcast_script = document.get("podcast_script")
        
        if not podcast_script:
            # Generate new podcast script and store it
            podcast_script = await ai_service.generate_podcast_script(document["summary_text"])
            
            # Store the generated script in database
            await db.update_document_summary(doc_id, {
                "podcast_script": podcast_script
            })
        
        # Generate audio using the stored script
        audio_url = await tts_service.generate_podcast_audio(podcast_script, voice_style)
        
        # Update document with audio URL
        await db.update_document_summary(doc_id, {
            "summary_audio_url": audio_url
        })
        
        return {"audio_url": audio_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating audio for document {doc_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate audio"
        )

@router.post("/{doc_id}/regenerate-podcast-script")
async def regenerate_podcast_script(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Regenerate podcast script for a document"""
    try:
        # Get document
        documents = await db.get_user_documents(current_user["id"])
        document = next((doc for doc in documents if doc["doc_id"] == doc_id), None)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        if not document.get("summary_text"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document summary not available"
            )
        
        # Generate new podcast script
        podcast_script = await ai_service.generate_podcast_script(document["summary_text"])
        
        # Store the new script in database (this will replace the old one)
        await db.update_document_summary(doc_id, {
            "podcast_script": podcast_script,
            "summary_audio_url": None  # Clear existing audio since script changed
        })
        
        # Format for audio (show what the TTS will actually receive)
        formatted_script = tts_service._format_for_podcast(podcast_script)
        
        return {
            "raw_script": podcast_script,
            "formatted_script": formatted_script,
            "estimated_duration": len(formatted_script.split()) * 0.5  # Rough estimate: 0.5 seconds per word
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating podcast script for document {doc_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate podcast script"
        )

@router.get("/{doc_id}/podcast-script")
async def get_podcast_script(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Preview the podcast script that would be used for audio generation"""
    try:
        # Get document
        documents = await db.get_user_documents(current_user["id"])
        document = next((doc for doc in documents if doc["doc_id"] == doc_id), None)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        if not document.get("summary_text"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document summary not available"
            )
        
        # Check if podcast script already exists in database
        podcast_script = document.get("podcast_script")
        
        if not podcast_script:
            # Generate new podcast script and store it
            podcast_script = await ai_service.generate_podcast_script(document["summary_text"])
            
            # Store the generated script in database
            await db.update_document_summary(doc_id, {
                "podcast_script": podcast_script
            })
        
        # Format for audio (show what the TTS will actually receive)
        formatted_script = tts_service._format_for_podcast(podcast_script)
        
        return {
            "raw_script": podcast_script,
            "formatted_script": formatted_script,
            "estimated_duration": len(formatted_script.split()) * 0.5  # Rough estimate: 0.5 seconds per word
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating podcast script for document {doc_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate podcast script"
        )

@router.get("/{doc_id}/download")
async def download_summary(
    doc_id: str,
    format: str = "txt",
    current_user: dict = Depends(get_current_user)
):
    """Download document summary in specified format"""
    try:
        # Get document
        documents = await db.get_user_documents(current_user["id"])
        document = next((doc for doc in documents if doc["doc_id"] == doc_id), None)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        if not document.get("summary_text"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document summary not available"
            )
        
        from fastapi.responses import Response
        
        summary_text = document["summary_text"]
        filename = f"{document['doc_name']}_summary.{format}"
        
        if format == "txt":
            return Response(
                content=summary_text,
                media_type="text/plain",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported format. Only 'txt' is currently supported."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading summary for document {doc_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download summary"
        )

@router.delete("/{doc_id}", response_model=SuccessResponse)
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document"""
    try:
        logger.info(f"Delete request for document: {doc_id} by user: {current_user['id']}")
        
        # Get document first to verify ownership
        documents = await db.get_user_documents(current_user["id"])
        logger.info(f"User has {len(documents)} documents total")
        
        # Log all documents for debugging
        for doc in documents:
            logger.info(f"Document: {doc['doc_id']} - {doc['doc_name']}")
        
        document = next((doc for doc in documents if doc["doc_id"] == doc_id), None)
        
        if not document:
            logger.warning(f"Document {doc_id} not found in user's documents")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        logger.info(f"Found document to delete: {document['doc_name']} (ID: {doc_id})")
        
        # Clean up audio file if exists
        if document.get("summary_audio_url"):
            try:
                await tts_service.cleanup_audio_file(document["summary_audio_url"])
            except Exception as e:
                logger.warning(f"Failed to delete audio file: {e}")
        
        # Delete original uploaded file if exists
        if document.get("file_path"):
            try:
                await file_service.cleanup_file(document["file_path"])
            except Exception as e:
                logger.warning(f"Failed to delete uploaded file: {e}")
        
        # Delete file from storage if it was uploaded to storage
        try:
            # Extract file name from file_path for storage deletion
            file_name = document.get("file_path", "").split("/")[-1] if document.get("file_path") else None
            if file_name:
                await db.delete_file_from_storage(file_name)
        except Exception as e:
            logger.warning(f"Failed to delete file from storage: {e}")
        
        # Delete from database
        logger.info(f"Deleting document {doc_id} from database")
        deletion_success = await db.delete_document(doc_id)
        logger.info(f"Database deletion result: {deletion_success}")
        
        if not deletion_success:
            logger.error(f"Failed to delete document {doc_id} from database")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete document from database"
            )
        
        # Verify deletion by checking if document still exists
        verification_documents = await db.get_user_documents(current_user["id"])
        still_exists = any(doc["doc_id"] == doc_id for doc in verification_documents)
        
        if still_exists:
            logger.error(f"Document {doc_id} still exists after deletion attempt!")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Document deletion failed - document still exists"
            )
        
        logger.info(f"Document {doc_id} successfully deleted and verified")
        logger.info(f"User now has {len(verification_documents)} documents")
        
        return SuccessResponse(message="Document deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {doc_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        ) 