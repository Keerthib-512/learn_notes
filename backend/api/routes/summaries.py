from fastapi import APIRouter, HTTPException, Depends, status
from models.schemas import TTSRequest, TTSResponse, GraphRequest, GraphResponse, SuccessResponse
from api.routes.auth import get_current_user
from services.ai_service import ai_service
from services.tts_service import tts_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/text-to-speech", response_model=TTSResponse)
async def generate_text_to_speech(
    tts_request: TTSRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate text-to-speech audio from text"""
    try:
        # Generate audio
        audio_url = await tts_service.text_to_speech(
            text=tts_request.text,
            voice_style=tts_request.voice_style
        )
        
        return TTSResponse(audio_url=audio_url)
        
    except Exception as e:
        logger.error(f"Error generating TTS: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate text-to-speech audio"
        )

@router.post("/generate-graph", response_model=GraphResponse)
async def generate_graph(
    graph_request: GraphRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate graph/flowchart data from text"""
    try:
        # Generate graph data
        graph_data = await ai_service.generate_graph_data(graph_request.text)
        
        return GraphResponse(
            graph_data=graph_data,
            graph_type=graph_request.graph_type
        )
        
    except Exception as e:
        logger.error(f"Error generating graph: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate graph data"
        )

@router.post("/enhance-summary")
async def enhance_summary(
    text: str,
    current_user: dict = Depends(get_current_user)
):
    """Enhance summary for better learning"""
    try:
        enhanced_summary = await ai_service.enhance_summary_for_learning(text)
        
        return {"enhanced_summary": enhanced_summary}
        
    except Exception as e:
        logger.error(f"Error enhancing summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enhance summary"
        )

@router.post("/podcast-script")
async def generate_podcast_script(
    text: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate podcast-style script from text"""
    try:
        podcast_script = await ai_service.generate_podcast_script(text)
        
        return {"podcast_script": podcast_script}
        
    except Exception as e:
        logger.error(f"Error generating podcast script: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate podcast script"
        ) 