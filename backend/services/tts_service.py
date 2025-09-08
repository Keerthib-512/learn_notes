from gtts import gTTS
import os
import uuid
import aiofiles
import logging
from typing import Optional
import re

logger = logging.getLogger(__name__)

class TTSService:
    def __init__(self):
        self.audio_dir = "static/audio"
        os.makedirs(self.audio_dir, exist_ok=True)
    
    async def text_to_speech(self, text: str, voice_style: str = "human", lang: str = "en") -> str:
        """Convert text to speech with human-like pacing and return audio file URL"""
        try:
            # Generate unique filename
            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_path = os.path.join(self.audio_dir, audio_filename)
            
            # Format text for natural human-like speech
            formatted_text = self._format_for_natural_speech(text)
            
            # Configure TTS based on voice style
            tts_params = self._get_tts_params(voice_style, lang)
            
            # Generate speech
            tts = gTTS(text=formatted_text, **tts_params)
            tts.save(audio_path)
            
            # Return absolute URL pointing to the backend server
            audio_url = f"http://localhost:8000/static/audio/{audio_filename}"
            logger.info(f"Generated human-like TTS audio: {audio_url}")
            
            return audio_url
            
        except Exception as e:
            logger.error(f"Error generating TTS: {e}")
            raise
    
    def _get_tts_params(self, voice_style: str, lang: str) -> dict:
        """Get TTS parameters optimized for natural human conversation pace"""
        params = {
            "lang": lang,
            "slow": False,  # Use normal speed - more natural than slow
            "tld": "com"  # Top level domain for different accents
        }
        
        # All voice styles optimized for natural human conversation
        if voice_style == "calm":
            params["tld"] = "com.au"  # Australian - naturally calm and pleasant
            params["slow"] = True  # Slightly slower for calming effect
        elif voice_style == "explanatory":
            params["tld"] = "com"  # US English - clear and direct
            params["slow"] = False  # Normal pace for explanations
        elif voice_style == "soft":
            params["tld"] = "ca"  # Canadian - gentle and soft
            params["slow"] = True  # Slower for gentle effect
        elif voice_style == "sweet":
            params["tld"] = "co.uk"  # British - pleasant and refined
            params["slow"] = False  # Normal pace
        elif voice_style == "human":
            params["tld"] = "com"  # US English - most familiar and natural
            params["slow"] = False  # Normal human conversation pace
        else:
            # Default to natural human conversation
            params["tld"] = "com"  # US English for familiarity
            params["slow"] = False  # Normal conversation speed
        
        return params

    def _format_for_natural_speech(self, text: str) -> str:
        """Format text for natural human conversation - minimal artificial pauses"""
        # Start with the original text
        formatted = text.strip()
        
        # Add very brief, natural pauses only where humans naturally pause
        # Short pause after sentences (natural breathing)
        formatted = formatted.replace(". ", ". ")
        formatted = formatted.replace("! ", "! ")
        formatted = formatted.replace("? ", "? ")
        
        # Tiny pause after commas (natural speech rhythm)
        formatted = formatted.replace(", ", ", ")
        
        # Brief pause after colons (natural for lists/explanations)
        formatted = formatted.replace(": ", ": ")
        
        # Add small pause between paragraphs (natural topic transition)
        formatted = formatted.replace("\n\n", ". ")
        formatted = formatted.replace("\n", " ")
        
        # Clean up any excessive spaces
        formatted = re.sub(r'\s+', ' ', formatted)
        
        return formatted.strip()
    
    async def generate_podcast_audio(self, podcast_script: str, voice_style: str = "human") -> str:
        """Generate audio for podcast-style content with human-like pacing"""
        try:
            # Add extra natural pauses for podcast flow
            formatted_script = self._format_for_podcast(podcast_script)
            
            # Generate audio using human-like voice
            audio_url = await self.text_to_speech(formatted_script, voice_style)
            
            return audio_url
            
        except Exception as e:
            logger.error(f"Error generating podcast audio: {e}")
            raise
    
    def _format_for_podcast(self, text: str) -> str:
        """Format text for natural human conversation - podcast style"""
        # Start with the original text
        formatted = text.strip()
        
        # Add natural conversation pauses (like a real person talking)
        # Normal pause after sentences
        formatted = formatted.replace(". ", ". ")
        formatted = formatted.replace("! ", "! ")
        formatted = formatted.replace("? ", "? ")
        
        # Natural pause after commas in conversation
        formatted = formatted.replace(", ", ", ")
        
        # Brief pause after colons (introducing ideas)
        formatted = formatted.replace(": ", ": ")
        formatted = formatted.replace("; ", "; ")
        
        # Paragraph breaks = natural topic shifts
        formatted = formatted.replace("\n\n", ". ")
        formatted = formatted.replace("\n", " ")
        
        # Add very subtle emphasis for transition words (natural human speech)
        # Just a tiny pause before these words like humans do
        formatted = re.sub(r'\b(however|therefore|moreover|furthermore|meanwhile|consequently)\b', r' \1', formatted, flags=re.IGNORECASE)
        
        # Natural flow for numbered points
        formatted = re.sub(r'\b(first|second|third|next|then|finally|in conclusion)\b', r'\1', formatted, flags=re.IGNORECASE)
        
        # Clean up any double spaces
        formatted = re.sub(r'\s+', ' ', formatted)
        
        return formatted.strip()
    
    async def cleanup_audio_file(self, audio_url: str) -> None:
        """Delete audio file from filesystem"""
        try:
            # Extract filename from URL
            filename = os.path.basename(audio_url)
            file_path = os.path.join(self.audio_dir, filename)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up audio file: {file_path}")
        except Exception as e:
            logger.error(f"Error cleaning up audio file: {e}")
    
    def get_audio_info(self, audio_url: str) -> dict:
        """Get audio file information"""
        try:
            filename = os.path.basename(audio_url)
            file_path = os.path.join(self.audio_dir, filename)
            
            if os.path.exists(file_path):
                stat = os.stat(file_path)
                return {
                    "filename": filename,
                    "size": stat.st_size,
                    "duration_estimate": stat.st_size / 2000,  # Rough estimate
                    "created_at": stat.st_ctime
                }
            return {}
        except Exception as e:
            logger.error(f"Error getting audio info: {e}")
            return {}

# Global TTS service instance
tts_service = TTSService() 