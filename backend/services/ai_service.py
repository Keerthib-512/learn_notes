from langchain_openai import ChatOpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from langchain.schema import HumanMessage, SystemMessage
from core.config import settings
import logging
import json
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            temperature=0.3,
            max_tokens=4000,  # Increased for better responses
            model="gpt-4o"  # Latest GPT-4 model with 128k context window
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=8000,  # Increased chunk size for better context
            chunk_overlap=400  # Increased overlap for better continuity
        )
    
    async def generate_summary(self, document_text: str) -> str:
        """Generate a summary of the document text"""
        try:
            # Split text into chunks if it's too long
            chunks = self.text_splitter.split_text(document_text)
            
            if len(chunks) == 1:
                # Single chunk - direct summarization with concise prompt
                prompt = f"""Summarize key concepts and main ideas:

                {chunks[0]}

Summary:"""
                messages = [
                    SystemMessage(content="You are an expert at creating comprehensive, educational summaries of documents. Focus on key concepts, main ideas, and learning objectives."),
                    HumanMessage(content=prompt)
                ]
                response = self.llm.invoke(messages)
                return response.content.strip()
            else:
                # Multiple chunks - summarize each and then create final summary
                chunk_summaries = []
                for i, chunk in enumerate(chunks):
                    prompt = f"""Summarize key points:

                    {chunk}

Summary:"""
                    try:
                        messages = [
                            SystemMessage(content="You are an expert at extracting key points from document sections."),
                            HumanMessage(content=prompt)
                        ]
                        response = self.llm.invoke(messages)
                        chunk_summaries.append(response.content.strip())
                    except Exception as chunk_error:
                        logger.warning(f"Skipping chunk {i} due to token limit: {chunk_error}")
                        # Skip chunks that are too large, continue with others
                        continue
                
                if not chunk_summaries:
                    # If all chunks failed, return fallback
                    return self._generate_fallback_summary(document_text)
                
                # Combine all chunk summaries
                combined_text = "\n\n".join(chunk_summaries)
                final_prompt = f"""Create a comprehensive summary:

                {combined_text}

Final Summary:"""
                messages = [
                    SystemMessage(content="You are an expert at creating comprehensive summaries from multiple sections."),
                    HumanMessage(content=final_prompt)
                ]
                response = self.llm.invoke(messages)
                return response.content.strip()
                
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            # Check if it's a token limit error and provide a fallback
            if "maximum context length" in str(e) or "token" in str(e).lower():
                logger.warning("Token limit exceeded, using fallback summary")
                return self._generate_fallback_summary(document_text)
            # Check if it's an API key error and provide a fallback
            if "invalid_api_key" in str(e) or "401" in str(e):
                logger.error("OpenAI API key is invalid. Please check your configuration.")
                return self._generate_fallback_summary(document_text)
            raise
    
    def _generate_fallback_summary(self, document_text: str) -> str:
        """Generate a basic fallback summary when AI service is unavailable"""
        # Extract first few sentences as a basic summary
        sentences = document_text.split('. ')
        
        if len(sentences) <= 3:
            return document_text[:500] + "..." if len(document_text) > 500 else document_text
        
        # Take first 3 sentences and add some basic structure
        summary_sentences = sentences[:3]
        summary = ". ".join(summary_sentences) + "."
        
        # Add a note about the AI service being unavailable
        fallback_summary = f"""
📄 **Document Summary** (AI service temporarily unavailable)

{summary}

**Key Points Extracted:**
• Document contains {len(document_text.split())} words
• Contains {len(sentences)} sentences
• Primary content appears to focus on the topics mentioned in the opening sections

*Note: This is a basic summary. AI-powered summarization is currently unavailable due to configuration issues.*
        """.strip()
        
        return fallback_summary
    
    async def generate_podcast_script(self, summary_text: str) -> str:
        """Convert summary into a podcast-style script"""
        try:
            prompt = f"""
            Convert to conversational script. Guidelines:
            - Start directly with content
            - Warm, friendly tone
            - Simple, engaging explanations
            - Natural transitions
            - End naturally

            Summary:
            {summary_text}

            Script:
            """
            messages = [
                SystemMessage(content="You are an expert podcast script writer who creates engaging, conversational content from educational material."),
                HumanMessage(content=prompt)
            ]
            response = self.llm.invoke(messages)
            return response.content.strip()
        except Exception as e:
            logger.error(f"Error generating podcast script: {e}")
            raise
    
    async def generate_graph_data(self, summary_text: str) -> Dict[str, Any]:
        """Generate an interconnected conceptual mind map with meaningful relationships"""
        try:
            prompt = f"""
            Create a conceptual mind map that shows how ideas connect and relate to each other. This should be like a knowledge network, not just a list of topics.

            ANALYZE THE CONTENT AND:
            1. Identify the CENTRAL CONCEPT (main theme)
            2. Find KEY CONCEPTS that relate to the central idea
            3. Discover SUPPORTING CONCEPTS that explain or expand the key concepts
            4. Identify RELATIONSHIPS between concepts (cause-effect, part-whole, process steps, comparisons)
            5. Find PRACTICAL APPLICATIONS or real-world connections
            6. Include INTERCONNECTIONS between different branches (this is crucial!)

            Create a mind map that shows:
            - WHY concepts are important
            - HOW concepts relate to each other
            - WHAT happens when concepts are applied
            - WHERE concepts connect across different areas

            Return JSON with this structure:
            {{
                "nodes": [
                    {{"id": "central", "label": "Core Concept Title", "type": "central", "description": "Main idea that everything connects to", "size": "large"}},
                    {{"id": "key1", "label": "Key Concept 1", "type": "key", "description": "Important related idea", "size": "medium"}},
                    {{"id": "support1", "label": "Supporting Detail", "type": "support", "description": "Explains or expands the key concept", "size": "small"}},
                    {{"id": "application1", "label": "Real Application", "type": "application", "description": "How this applies in practice", "size": "small"}},
                    {{"id": "connection1", "label": "Bridge Concept", "type": "bridge", "description": "Links different areas together", "size": "small"}}
                ],
                "edges": [
                    {{"from": "central", "to": "key1", "label": "relates to", "type": "primary"}},
                    {{"from": "key1", "to": "support1", "label": "explained by", "type": "elaborates"}},
                    {{"from": "key1", "to": "application1", "label": "applied as", "type": "implements"}},
                    {{"from": "support1", "to": "application1", "label": "enables", "type": "causes"}},
                    {{"from": "key1", "to": "key2", "label": "connects with", "type": "cross_link"}},
                    {{"from": "application1", "to": "connection1", "label": "bridges to", "type": "cross_link"}}
                ]
            }}

            IMPORTANT: Include cross-connections between different branches! These show how concepts work together.

            Summary: {summary_text}

            Create interconnected conceptual mind map JSON:
            """
            
            messages = [
                SystemMessage(content="You are an expert at creating interconnected conceptual mind maps that show meaningful relationships between ideas."),
                HumanMessage(content=prompt)
            ]
            response = self.llm.invoke(messages)
            graph_response = response.content
            
            # Try to parse JSON, fallback to enhanced structure if parsing fails
            try:
                graph_data = json.loads(graph_response.strip())
                # Ensure we have proper structure
                if not graph_data.get("nodes") or not graph_data.get("edges"):
                    raise json.JSONDecodeError("Invalid structure", "", 0)
            except json.JSONDecodeError:
                # Create enhanced fallback based on summary content
                graph_data = self._create_enhanced_fallback_graph(summary_text)
            
            return graph_data
            
        except Exception as e:
            logger.error(f"Error generating graph data: {e}")
            # Create enhanced fallback based on summary content
            return self._create_enhanced_fallback_graph(summary_text)

    def _create_enhanced_fallback_graph(self, summary_text: str) -> Dict[str, Any]:
        """Create an interconnected conceptual mind map from summary content"""
        # Extract meaningful concepts and their relationships
        sentences = [s.strip() for s in summary_text.split('.') if len(s.strip()) > 15]
        
        # Identify the central concept
        main_topic = self._extract_main_topic(sentences[0] if sentences else "Document Analysis")
        
        nodes = [
            {
                "id": "central", 
                "label": main_topic, 
                "type": "central",
                "description": "Core concept that everything connects to",
                "size": "large"
            }
        ]
        
        edges = []
        
        # Extract conceptual themes with relationships
        concepts = self._extract_conceptual_network(summary_text)
        
        # Create key concept nodes
        key_concepts = []
        for i, concept in enumerate(concepts[:4]):  # Limit to 4 key concepts
            concept_id = f"key_{i+1}"
            key_concepts.append(concept_id)
            
            nodes.append({
                "id": concept_id,
                "label": concept["title"],
                "type": "key",
                "description": concept["description"],
                "size": "medium"
            })
            
            edges.append({
                "from": "central",
                "to": concept_id,
                "label": concept.get("relationship", "relates to"),
                "type": "primary"
            })
            
            # Add supporting concepts
            for j, support in enumerate(concept.get("supports", [])[:2]):
                support_id = f"support_{i+1}_{j+1}"
                nodes.append({
                    "id": support_id,
                    "label": support["title"],
                    "type": "support",
                    "description": support["explanation"],
                    "size": "small"
                })
                
                edges.append({
                    "from": concept_id,
                    "to": support_id,
                    "label": support.get("connection", "explained by"),
                    "type": "elaborates"
                })
                
                # Add applications if they exist
                if support.get("application"):
                    app_id = f"app_{i+1}_{j+1}"
                    nodes.append({
                        "id": app_id,
                        "label": support["application"]["title"],
                        "type": "application",
                        "description": support["application"]["description"],
                        "size": "small"
                    })
                    
                    edges.append({
                        "from": support_id,
                        "to": app_id,
                        "label": "applied as",
                        "type": "implements"
                    })
        
        # Add cross-connections between key concepts (this is crucial!)
        self._add_cross_connections(nodes, edges, concepts, key_concepts)
        
        # Add bridge concepts that connect different areas
        self._add_bridge_concepts(nodes, edges, summary_text, key_concepts)
        
        return {"nodes": nodes, "edges": edges}
    
    def _extract_main_topic(self, first_sentence: str) -> str:
        """Extract the main topic from the first sentence"""
        # Look for key topic indicators
        words = first_sentence.split()
        
        # Common patterns for main topics
        topic_patterns = [
            "presentation focused on",
            "document covers",
            "training on",
            "overview of",
            "discussion about",
            "analysis of"
        ]
        
        for pattern in topic_patterns:
            if pattern in first_sentence.lower():
                # Extract the topic after the pattern
                parts = first_sentence.lower().split(pattern)
                if len(parts) > 1:
                    topic = parts[1].strip()
                    # Clean up and capitalize
                    topic = ' '.join(topic.split()[:5])  # First 5 words
                    return topic.title()
        
        # Fallback: use first few meaningful words
        meaningful_words = [w for w in words[:6] if len(w) > 3 and w.lower() not in ['the', 'this', 'that', 'with', 'from']]
        return ' '.join(meaningful_words[:3]).title() if meaningful_words else "Document Overview"
    
    def _extract_conceptual_network(self, text: str) -> List[Dict[str, Any]]:
        """Extract concepts with their relationships and connections"""
        concepts = []
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 15]
        
        # Look for different types of concepts
        for i, sentence in enumerate(sentences[:6]):  # Process first 6 sentences
            if len(sentence) < 20:
                continue
                
            # Extract key phrases and relationships
            concept = self._analyze_sentence_for_concepts(sentence, i)
            if concept:
                concepts.append(concept)
        
        return concepts
    
    def _analyze_sentence_for_concepts(self, sentence: str, index: int) -> Dict[str, Any]:
        """Analyze a sentence to extract conceptual information"""
        # Identify concept type based on keywords
        lower_sentence = sentence.lower()
        
        # Determine concept type and relationship
        if any(word in lower_sentence for word in ['because', 'due to', 'causes', 'results in']):
            concept_type = 'causal'
            relationship = 'causes'
        elif any(word in lower_sentence for word in ['process', 'method', 'approach', 'technique']):
            concept_type = 'process'
            relationship = 'operates through'
        elif any(word in lower_sentence for word in ['benefit', 'advantage', 'improves', 'enhances']):
            concept_type = 'outcome'
            relationship = 'achieves'
        elif any(word in lower_sentence for word in ['component', 'part', 'element', 'aspect']):
            concept_type = 'structural'
            relationship = 'contains'
        else:
            concept_type = 'general'
            relationship = 'relates to'
        
        # Extract the main concept from the sentence
        words = sentence.split()
        title = self._extract_concept_title(words, concept_type)
        
        return {
            'title': title,
            'description': sentence[:100] + '...' if len(sentence) > 100 else sentence,
            'type': concept_type,
            'relationship': relationship,
            'supports': self._generate_supporting_concepts(sentence, concept_type)
        }
    
    def _extract_concept_title(self, words: List[str], concept_type: str) -> str:
        """Extract a meaningful title from sentence words"""
        # Remove common stop words and find key terms
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'this', 'that', 'these', 'those'}
        important_words = [w for w in words[:8] if w.lower() not in stop_words and len(w) > 3]
        
        if len(important_words) >= 2:
            return ' '.join(important_words[:3]).title()
        elif len(important_words) == 1:
            return important_words[0].title()
        else:
            return f"{concept_type.title()} Concept"
    
    def _generate_supporting_concepts(self, sentence: str, concept_type: str) -> List[Dict[str, Any]]:
        """Generate supporting concepts for a main concept"""
        supports = []
        
        # Create contextual supporting concepts
        if 'process' in concept_type or 'method' in sentence.lower():
            supports.append({
                'title': 'Implementation Steps',
                'explanation': 'How this concept is put into practice',
                'connection': 'broken down into',
                'application': {
                    'title': 'Real-world Application',
                    'description': 'Practical use in relevant scenarios'
                }
            })
        
        if 'benefit' in sentence.lower() or 'advantage' in sentence.lower():
            supports.append({
                'title': 'Key Benefits',
                'explanation': 'Why this concept is valuable',
                'connection': 'provides',
                'application': {
                    'title': 'Impact Areas',
                    'description': 'Where benefits are most visible'
                }
            })
        
        if len(supports) == 0:  # Default supporting concept
            supports.append({
                'title': 'Key Details',
                'explanation': 'Important aspects of this concept',
                'connection': 'includes',
                'application': {
                    'title': 'Practical Use',
                    'description': 'How this applies in practice'
                }
            })
        
        return supports[:2]  # Limit to 2 supporting concepts
    
    def _add_cross_connections(self, nodes: List[Dict], edges: List[Dict], concepts: List[Dict], key_concepts: List[str]):
        """Add meaningful connections between different concept branches"""
        # Connect concepts that have relationships
        for i, concept1 in enumerate(concepts[:3]):
            for j, concept2 in enumerate(concepts[i+1:4], i+1):
                if self._concepts_should_connect(concept1, concept2):
                    connection_label = self._determine_connection_type(concept1, concept2)
                    edges.append({
                        "from": key_concepts[i],
                        "to": key_concepts[j],
                        "label": connection_label,
                        "type": "cross_link"
                    })
    
    def _concepts_should_connect(self, concept1: Dict, concept2: Dict) -> bool:
        """Determine if two concepts should be connected"""
        # Connect if they share similar types or complementary relationships
        return (
            concept1.get('type') in ['process', 'causal'] and concept2.get('type') in ['outcome', 'structural'] or
            concept1.get('type') == 'structural' and concept2.get('type') == 'process' or
            'benefit' in concept1.get('description', '').lower() and 'process' in concept2.get('description', '').lower()
        )
    
    def _determine_connection_type(self, concept1: Dict, concept2: Dict) -> str:
        """Determine the type of connection between concepts"""
        if concept1.get('type') == 'process' and concept2.get('type') == 'outcome':
            return 'produces'
        elif concept1.get('type') == 'causal' and concept2.get('type') == 'structural':
            return 'influences'
        elif 'benefit' in concept1.get('description', '').lower():
            return 'enables'
        else:
            return 'connects with'
    
    def _add_bridge_concepts(self, nodes: List[Dict], edges: List[Dict], summary_text: str, key_concepts: List[str]):
        """Add bridge concepts that connect different areas"""
        # Look for bridge words that indicate connections
        bridge_indicators = ['integration', 'combination', 'synthesis', 'relationship', 'interaction', 'correlation']
        
        for indicator in bridge_indicators:
            if indicator in summary_text.lower():
                bridge_id = f"bridge_{indicator}"
                nodes.append({
                    "id": bridge_id,
                    "label": f"{indicator.title()} Point",
                    "type": "bridge",
                    "description": f"Connects different concepts through {indicator}",
                    "size": "small"
                })
                
                # Connect bridge to key concepts
                for key_concept in key_concepts[:2]:  # Connect to first 2 key concepts
                    edges.append({
                        "from": key_concept,
                        "to": bridge_id,
                        "label": "bridges to",
                        "type": "cross_link"
                    })
                break  # Only add one bridge concept
    
    def _extract_conceptual_themes(self, text: str) -> list:
        """Extract thematic concepts from text"""
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
        
        concepts = []
        
        # Analyze content for themes
        themes = [
            {
                "keywords": ["team", "people", "staff", "members", "responsible"],
                "title": "Team & Personnel",
                "category": "organizational"
            },
            {
                "keywords": ["service", "customer", "experience", "help", "support"],
                "title": "Service & Support",
                "category": "operational"
            },
            {
                "keywords": ["process", "procedure", "steps", "protocol", "method"],
                "title": "Processes & Procedures",
                "category": "procedural"
            },
            {
                "keywords": ["safety", "security", "protocol", "emergency", "risk"],
                "title": "Safety & Security",
                "category": "compliance"
            },
            {
                "keywords": ["training", "knowledge", "learning", "education", "skill"],
                "title": "Training & Development",
                "category": "educational"
            },
            {
                "keywords": ["rules", "policy", "requirements", "standards", "guidelines"],
                "title": "Policies & Standards",
                "category": "regulatory"
            }
        ]
        
        for theme in themes:
            # Check if theme is relevant to the content
            relevance_score = sum(1 for keyword in theme["keywords"] if keyword in text.lower())
            
            if relevance_score > 0:
                # Find sentences related to this theme
                related_sentences = []
                for sentence in sentences:
                    if any(keyword in sentence.lower() for keyword in theme["keywords"]):
                        related_sentences.append(sentence)
                
                if related_sentences:
                    concept = {
                        "title": theme["title"],
                        "description": f"Key aspects related to {theme['category']} elements",
                        "sub_concepts": []
                    }
                    
                    # Extract sub-concepts from related sentences
                    for i, sentence in enumerate(related_sentences[:3]):
                        sub_concept = self._create_sub_concept(sentence, theme["category"])
                        concept["sub_concepts"].append(sub_concept)
                    
                    concepts.append(concept)
        
        # If no thematic concepts found, create general ones
        if not concepts:
            concepts = self._create_general_concepts(sentences)
        
        return concepts[:5]  # Return max 5 concepts
    
    def _create_sub_concept(self, sentence: str, category: str) -> dict:
        """Create a sub-concept from a sentence"""
        words = sentence.split()
        
        # Extract key phrase (first part of sentence)
        key_phrase = ' '.join(words[:6]) if len(words) > 6 else sentence
        
        # Create explanation (rest of sentence or context)
        explanation = ' '.join(words[6:]) if len(words) > 6 else f"Important {category} consideration"
        
        # Determine if there's an outcome/result
        outcome = None
        if any(word in sentence.lower() for word in ["result", "leads", "ensures", "provides", "creates"]):
            outcome = {
                "title": "Expected Outcome",
                "description": f"This {category} element contributes to overall effectiveness"
            }
        
            return {
            "title": key_phrase,
            "explanation": explanation,
            "outcome": outcome
        }
    
    def _create_general_concepts(self, sentences: list) -> list:
        """Create general concepts when thematic analysis doesn't work"""
        concepts = []
        
        for i, sentence in enumerate(sentences[:4]):
            words = sentence.split()
            title = ' '.join(words[:4]) if len(words) > 4 else sentence[:30]
            
            concept = {
                "title": title,
                "description": f"Key concept {i+1} from the document",
                "sub_concepts": [
                    {
                        "title": ' '.join(words[4:8]) if len(words) > 8 else "Supporting Detail",
                        "explanation": ' '.join(words[8:]) if len(words) > 8 else "Additional context",
                        "outcome": {
                            "title": "Contributes To",
                            "description": "Overall understanding of the topic"
                        }
                    }
                ]
            }
            concepts.append(concept)
        
        return concepts
    
    async def enhance_summary_for_learning(self, summary_text: str) -> str:
        """Enhance summary with learning-focused improvements"""
        try:
            prompt = f"""
            Enhance the following summary to make it more effective for student learning.
            Add clear section headers, bullet points for key concepts, and learning objectives:

            {summary_text}

            Enhanced Learning Summary:
            """
            messages = [
                SystemMessage(content="You are an expert educational content creator who enhances summaries for optimal student learning."),
                HumanMessage(content=prompt)
            ]
            response = self.llm.invoke(messages)
            return response.content.strip()
        except Exception as e:
            logger.error(f"Error enhancing summary: {e}")
            return summary_text  # Return original if enhancement fails

# Global AI service instance
ai_service = AIService() 