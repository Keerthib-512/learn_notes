import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com/api' 
  : 'http://localhost:8000/api';

// Mock mode flag - set to true when backend is not available
const MOCK_MODE = false; // Set to false when backend is running

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for AI operations
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Mock data and functions
const mockDelay = (ms: number = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory storage for mock mode
let mockDocuments: Document[] = [];

// Text extraction functions for different file types
const extractTextFromTxt = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  // For now, we'll use a simplified approach since we can't easily import PDF.js in this context
  // In a real implementation, you'd use PDF.js or similar
  try {
    const arrayBuffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer);
    
    // Basic PDF text extraction - look for text between stream objects
    const textMatches = text.match(/BT[\s\S]*?ET/g) || [];
    let extractedText = '';
    
    textMatches.forEach(match => {
      // Extract text content between parentheses and brackets
      const contentMatches = match.match(/\(([^)]+)\)/g) || [];
      contentMatches.forEach(content => {
        extractedText += content.replace(/[()]/g, '') + ' ';
      });
    });
    
    if (extractedText.trim()) {
      return extractedText.trim();
    }
    
    // Fallback: try to find readable text in the PDF
    const readableText = text.match(/[a-zA-Z][a-zA-Z0-9\s.,!?;:'"()-]{10,}/g);
    if (readableText) {
      return readableText.slice(0, 50).join(' ');
    }
    
    return `This PDF document "${file.name}" contains content that has been processed for analysis. The document appears to contain structured information with text, formatting, and potentially images or charts.`;
  } catch (error) {
    console.warn('PDF extraction failed, using fallback:', error);
    return `This PDF document "${file.name}" contains ${Math.round(file.size / 1024)}KB of content that would be analyzed by our AI system.`;
  }
};

const extractTextFromDocx = async (file: File): Promise<string> => {
  // Simplified DOCX extraction - in reality you'd use a proper library
  try {
    const arrayBuffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer);
    
    // Look for XML text content in DOCX
    const textMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    let extractedText = '';
    
    textMatches.forEach(match => {
      const content = match.replace(/<w:t[^>]*>([^<]+)<\/w:t>/, '$1');
      extractedText += content + ' ';
    });
    
    if (extractedText.trim()) {
      return extractedText.trim();
    }
    
    return `This Word document "${file.name}" contains structured content that would be analyzed by our AI system to provide insights and summaries.`;
  } catch (error) {
    console.warn('DOCX extraction failed, using fallback:', error);
    return `This Word document "${file.name}" contains ${Math.round(file.size / 1024)}KB of content ready for AI analysis.`;
  }
};

// OpenAI API integration
const OPENAI_API_KEY = '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';

const callOpenAI = async (prompt: string, maxTokens: number = 1000): Promise<string> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate content';
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
};

// AI content generation functions using OpenAI
const generateAISummary = async (fileName: string, content: string): Promise<string> => {
  try {
    const prompt = `Please analyze the following document content and create a comprehensive summary. The document is titled "${fileName}".

Document content:
${content.substring(0, 3000)} ${content.length > 3000 ? '...' : ''}

Please provide:
1. An executive summary (2-3 sentences)
2. Key concepts and main topics (3-5 bullet points)
3. Main insights and takeaways (2-4 points)
4. Practical applications or action items (2-3 points)
5. Document analysis (content type, complexity level)

Format the response with clear headings and bullet points for easy reading.`;

    const aiResponse = await callOpenAI(prompt, 1200);
    
    return `# AI-Generated Summary of "${fileName}"

${aiResponse}

*This summary was generated using OpenAI's advanced language model to analyze your document content.*`;
  } catch (error) {
    console.error('Failed to generate AI summary:', error);
    // Fallback to local analysis if OpenAI fails
    const analysis = await analyzeDocumentContent(content);
    return generateFallbackSummary(fileName, analysis);
  }
};

const generateFallbackSummary = (fileName: string, analysis: any): string => {
  // Create a natural, paragraph-style summary without formatting
  const conceptsText = analysis.keyConcepts.map((concept: any) => concept.title).join(', ');
  const insightsText = analysis.insights.map((insight: any) => insight.description).join(' ');
  const themesText = analysis.themes.join(', ');
  
  return `This document covers ${conceptsText.toLowerCase()} and provides valuable insights into the subject matter. ${analysis.executiveSummary} 

The content explores ${themesText.toLowerCase()} through a ${analysis.complexity.toLowerCase()} approach. ${insightsText} The document is designed to help readers understand these concepts and apply them in practical situations.

This material offers a comprehensive look at the topic and serves as a useful resource for learning and reference.`;
};

// Advanced AI-like document analysis
const analyzeDocumentContent = async (content: string): Promise<any> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const words = content.split(/\s+/).filter(word => word.length > 2);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  
  // Intelligent content analysis
  const contentAnalysis = performSemanticAnalysis(content);
  const conceptExtraction = extractMeaningfulConcepts(content);
  const insightGeneration = generateInsights(content, contentAnalysis);
  
  return {
    executiveSummary: generateExecutiveSummary(content, contentAnalysis),
    keyConcepts: conceptExtraction.concepts,
    insights: insightGeneration.insights,
    actionItems: generateActionItems(content, conceptExtraction),
    contentType: determineContentType(content),
    complexity: assessComplexity(content, words, sentences),
    readingTime: Math.ceil(words.length / 200),
    themes: conceptExtraction.themes
  };
};

const performSemanticAnalysis = (content: string) => {
  // Analyze content structure and meaning
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const keyPhrases = extractKeyPhrases(content);
  const sentiment = analyzeSentiment(content);
  const topics = identifyTopicAreas(content);
  
  return {
    structure: analyzeStructure(sentences),
    keyPhrases,
    sentiment,
    topics,
    coherence: assessCoherence(sentences)
  };
};

const extractMeaningfulConcepts = (content: string) => {
  // Extract concepts with semantic understanding
  const concepts: any[] = [];
  const themes = [];
  
  // Look for definitional patterns
  const definitions = content.match(/(.+?)\s+(?:is|are|means?|refers? to)\s+(.+?)[\.\!]/gi) || [];
  definitions.forEach(def => {
    const parts = def.split(/\s+(?:is|are|means?|refers? to)\s+/i);
    if (parts.length === 2) {
      concepts.push({
        title: parts[0].trim().replace(/^(the|a|an)\s+/i, ''),
        description: parts[1].trim().replace(/[\.\!]$/, '')
      });
    }
  });
  
  // Extract concepts from headings and emphasized text
  const headings = content.match(/^#{1,6}\s+(.+)$/gm) || [];
  headings.forEach(heading => {
    const title = heading.replace(/^#{1,6}\s+/, '').trim();
    concepts.push({
      title: title,
      description: `Key section covering ${title.toLowerCase()}`
    });
    themes.push(title);
  });
  
  // Extract from bullet points and lists
  const bullets = content.match(/^[\s]*[•\-\*]\s+(.+)$/gm) || [];
  bullets.forEach(bullet => {
    const item = bullet.replace(/^[\s]*[•\-\*]\s+/, '').trim();
    if (item.length > 20) {
      concepts.push({
        title: item.split(/[:\-]/)[0].trim(),
        description: item.includes(':') ? item.split(':')[1].trim() : `Important point: ${item}`
      });
    }
  });
  
  // If no structured concepts found, extract from key sentences
  if (concepts.length === 0) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
    sentences.slice(0, 5).forEach((sentence, i) => {
      const words = sentence.trim().split(/\s+/);
      const title = words.slice(0, 4).join(' ').replace(/[^\w\s]/g, '');
      const description = words.length > 8 ? words.slice(4, 12).join(' ') + '...' : sentence.trim();
      
      concepts.push({
        title: title || `Concept ${i + 1}`,
        description: description || 'Key information from the document'
      });
    });
  }
  
  // Extract themes from content
  if (themes.length === 0) {
    const topicWords = extractTopicWords(content);
    themes.push(...topicWords.slice(0, 4));
  }
  
  return { concepts: (concepts as any[]).slice(0, 6), themes: themes.slice(0, 5) };
};

const generateInsights = (content: string, analysis: any) => {
  const insights = [];
  
  // Generate insights based on content patterns
  if (content.includes('research') || content.includes('study') || content.includes('analysis')) {
    insights.push({
      title: 'Research-Based Content',
      description: 'This document presents research findings and analytical insights that can inform decision-making'
    });
  }
  
  if (content.includes('process') || content.includes('method') || content.includes('approach')) {
    insights.push({
      title: 'Methodological Framework',
      description: 'The document outlines systematic approaches and processes that can be applied in practice'
    });
  }
  
  if (content.includes('benefit') || content.includes('advantage') || content.includes('improvement')) {
    insights.push({
      title: 'Value Proposition',
      description: 'Key benefits and advantages are highlighted that demonstrate practical value'
    });
  }
  
  if (content.includes('challenge') || content.includes('problem') || content.includes('issue')) {
    insights.push({
      title: 'Challenge Analysis',
      description: 'Important challenges and issues are identified that require attention and solutions'
    });
  }
  
  // Default insights if none found
  if (insights.length === 0) {
    insights.push(
      {
        title: 'Core Content Analysis',
        description: 'The document provides comprehensive coverage of its subject matter with detailed explanations'
      },
      {
        title: 'Practical Applications',
        description: 'Information presented can be applied to real-world scenarios and decision-making contexts'
      }
    );
  }
  
  return { insights: insights.slice(0, 4) };
};

const generateActionItems = (content: string, conceptExtraction: any) => {
  const actionItems = [];
  
  // Generate contextual action items
  if (content.includes('learn') || content.includes('understand')) {
    actionItems.push('Review and internalize the key concepts presented');
  }
  
  if (content.includes('implement') || content.includes('apply')) {
    actionItems.push('Identify opportunities to apply these concepts in your context');
  }
  
  if (content.includes('consider') || content.includes('evaluate')) {
    actionItems.push('Evaluate how these ideas relate to your current situation');
  }
  
  // Add concept-specific actions
  conceptExtraction.concepts.slice(0, 2).forEach((concept: any) => {
    actionItems.push(`Explore the implications of ${concept.title.toLowerCase()} in your field`);
  });
  
  // Default actions if none generated
  if (actionItems.length === 0) {
    actionItems.push(
      'Reflect on how this content connects to your existing knowledge',
      'Identify practical applications for the key concepts',
      'Consider sharing these insights with relevant stakeholders'
    );
  }
  
  return actionItems.slice(0, 5);
};

const extractKeyPhrases = (content: string): string[] => {
  // Extract meaningful phrases (2-4 words)
  const phrases = content.match(/\b[A-Z][a-z]+(?:\s+[a-z]+){1,3}\b/g) || [];
  return Array.from(new Set(phrases)).slice(0, 8);
};

const analyzeSentiment = (content: string): string => {
  const positive = (content.match(/\b(good|great|excellent|beneficial|positive|effective|successful|valuable)\b/gi) || []).length;
  const negative = (content.match(/\b(bad|poor|negative|problematic|challenging|difficult|ineffective)\b/gi) || []).length;
  
  if (positive > negative * 1.5) return 'positive';
  if (negative > positive * 1.5) return 'negative';
  return 'neutral';
};

const identifyTopicAreas = (content: string): string[] => {
  const topics = [];
  
  // Look for topic indicators
  if (content.match(/\b(business|management|strategy|organization)\b/gi)) topics.push('Business');
  if (content.match(/\b(technology|software|digital|system)\b/gi)) topics.push('Technology');
  if (content.match(/\b(education|learning|training|development)\b/gi)) topics.push('Education');
  if (content.match(/\b(health|medical|wellness|healthcare)\b/gi)) topics.push('Health');
  if (content.match(/\b(science|research|study|analysis)\b/gi)) topics.push('Research');
  if (content.match(/\b(finance|economic|financial|money)\b/gi)) topics.push('Finance');
  
  return topics.slice(0, 3);
};

const analyzeStructure = (sentences: string[]) => {
  return {
    sentenceCount: sentences.length,
    avgSentenceLength: sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length,
    hasIntroduction: sentences.length > 0,
    hasConclusion: sentences.length > 2
  };
};

const assessCoherence = (sentences: string[]): number => {
  // Simple coherence assessment based on connecting words
  const connectors = sentences.join(' ').match(/\b(however|therefore|moreover|furthermore|consequently|thus|hence)\b/gi) || [];
  return Math.min(1, connectors.length / Math.max(1, sentences.length / 5));
};

const determineContentType = (content: string): string => {
  if (content.includes('abstract') || content.includes('methodology')) return 'Academic Paper';
  if (content.includes('executive summary') || content.includes('recommendation')) return 'Business Report';
  if (content.includes('introduction') && content.includes('conclusion')) return 'Structured Document';
  if (content.match(/^#{1,6}/m)) return 'Formatted Document';
  return 'General Content';
};

const assessComplexity = (content: string, words: string[], sentences: string[]): string => {
  const avgWordsPerSentence = words.length / sentences.length;
  const longWords = words.filter(word => word.length > 6).length;
  const complexityScore = (avgWordsPerSentence * 0.5) + (longWords / words.length * 100);
  
  if (complexityScore > 15) return 'Advanced';
  if (complexityScore > 8) return 'Intermediate';
  return 'Beginner';
};

const extractTopicWords = (content: string): string[] => {
  const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const commonWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'than', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other', 'more', 'very', 'what', 'know', 'just', 'first', 'into', 'over', 'think', 'also', 'your', 'work', 'life', 'only', 'can', 'still', 'should', 'after', 'being', 'now', 'made', 'before', 'here', 'through', 'when', 'where', 'much', 'some', 'these', 'many', 'then', 'them', 'well', 'were']);
  
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    if (!commonWords.has(word) && word.length > 4) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
};

const generateExecutiveSummary = (content: string, analysis: any): string => {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const firstSentence = sentences[0]?.trim() || 'This document contains important information';
  const lastSentence = sentences[sentences.length - 1]?.trim() || 'providing valuable insights';
  
  // Create intelligent executive summary
  let summary = `This document presents ${analysis.topics.length > 0 ? analysis.topics.join(' and ').toLowerCase() : 'comprehensive'} content with ${analysis.sentiment} insights. `;
  
  if (analysis.structure.sentenceCount > 10) {
    summary += `The material covers multiple aspects in ${analysis.structure.sentenceCount} key statements, `;
  }
  
  summary += `providing ${analysis.coherence > 0.3 ? 'well-structured' : 'detailed'} information that `;
  
  if (content.includes('research') || content.includes('study')) {
    summary += 'is backed by research and analysis. ';
  } else if (content.includes('practical') || content.includes('application')) {
    summary += 'focuses on practical applications and real-world scenarios. ';
  } else {
    summary += 'offers valuable insights for understanding and application. ';
  }
  
  summary += `The content demonstrates ${analysis.structure.avgSentenceLength > 15 ? 'detailed' : 'clear'} explanations and `;
  summary += analysis.keyPhrases.length > 3 ? 'covers multiple key concepts effectively.' : 'maintains focus on core themes.';
  
  return summary;
};

const extractKeyTerms = (text: string): string[] => {
  // Extract meaningful terms (3+ characters, not common words)
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
  
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    if (!commonWords.has(word) && word.length > 3) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
};

const identifyMainTopics = (text: string, sentences: string[]): Array<{title: string, description: string}> => {
  const topics: Array<{title: string, description: string}> = [];
  
  // Analyze first few sentences for main topics
  const firstSentences = sentences.slice(0, Math.min(5, sentences.length));
  
  firstSentences.forEach((sentence, index) => {
    const words = sentence.trim().split(/\s+/);
    if (words.length > 5) {
      const title = words.slice(0, 3).join(' ').replace(/[^\w\s]/g, '').trim();
      const description = words.length > 10 
        ? `${words.slice(3, 10).join(' ')}...`
        : sentence.substring(title.length).trim();
      
      if (title && description) {
        topics.push({
          title: title.charAt(0).toUpperCase() + title.slice(1),
          description: description.charAt(0).toUpperCase() + description.slice(1)
        });
      }
    }
  });
  
  // Ensure we have at least 2 topics
  if (topics.length === 0) {
    topics.push(
      { title: 'Main Content', description: 'Primary subject matter and key information' },
      { title: 'Supporting Details', description: 'Additional context and explanatory material' }
    );
  } else if (topics.length === 1) {
    topics.push({ title: 'Supporting Concepts', description: 'Additional ideas that complement the main topic' });
  }
  
  return topics.slice(0, 4);
};

const generateMindMapFromText = async (fileName: string, content: string): Promise<any> => {
  try {
    const prompt = `Create a mind map structure for the following document content. The document is titled "${fileName}".

Document content:
${content.substring(0, 2000)} ${content.length > 2000 ? '...' : ''}

Please create a mind map with:
1. A central node (the main topic)
2. 3-5 key concept nodes connected to the center
3. 2-3 supporting detail nodes for each key concept
4. Meaningful relationships between nodes

Respond with a JSON structure containing:
- nodes: array with id, label, type (central/key/support), description, size (large/medium/small)
- edges: array with from, to, label, type (primary/elaborates/cross_link)

Make the labels concise (1-3 words) and descriptions informative (1 sentence).`;

    const aiResponse = await callOpenAI(prompt, 800);
    
    // Try to parse the JSON response
    try {
      const mindMapData = JSON.parse(aiResponse);
      if (mindMapData.nodes && mindMapData.edges) {
        return mindMapData;
      }
    } catch (parseError) {
      console.warn('Could not parse OpenAI mind map response, using fallback');
    }
  } catch (error) {
    console.error('Failed to generate AI mind map:', error);
  }
  
  // Fallback to local generation
  return generateFallbackMindMap(fileName, content);
};

const generateFallbackMindMap = (fileName: string, content: string): any => {
  const keyTerms = extractKeyTerms(content);
  const mainTopics = identifyMainTopics(content, content.split(/[.!?]+/));
  const docName = fileName.replace(/\.[^/.]+$/, "");
  
  const nodes = [
    { 
      id: 'central', 
      label: docName, 
      type: 'central', 
      description: 'Main document focus and core concepts',
      size: 'large' 
    }
  ];
  
  const edges = [];
  
  // Add main topic nodes
  mainTopics.forEach((topic, index) => {
    const topicId = `topic_${index}`;
    nodes.push({
      id: topicId,
      label: topic.title,
      type: 'key',
      description: topic.description,
      size: 'medium'
    });
    
    edges.push({
      from: 'central',
      to: topicId,
      label: 'explores',
      type: 'primary'
    });
  });
  
  // Add key term nodes
  keyTerms.slice(0, 6).forEach((term, index) => {
    const termId = `term_${index}`;
    nodes.push({
      id: termId,
      label: term,
      type: 'support',
      description: `Important concept: ${term}`,
      size: 'small'
    });
    
    // Connect to relevant topics
    const topicIndex = index % mainTopics.length;
    edges.push({
      from: `topic_${topicIndex}`,
      to: termId,
      label: 'includes',
      type: 'elaborates'
    });
  });
  
  // Add cross-connections
  if (mainTopics.length > 1) {
    edges.push({
      from: 'topic_0',
      to: 'topic_1',
      label: 'relates to',
      type: 'cross_link'
    });
  }
  
  return { nodes, edges };
};

const generatePodcastScript = async (fileName: string, summary: string): Promise<any> => {
  try {
    const docName = fileName.replace(/\.[^/.]+$/, "");
    const prompt = `Create an engaging podcast script based on the following document summary. The document is titled "${fileName}".

Document Summary:
${summary.substring(0, 2500)}

Create a conversational, engaging podcast script that:
1. Welcomes listeners to a personalized learning session
2. Introduces the document and its main themes
3. Walks through key concepts in an easy-to-understand way
4. Provides practical applications and insights
5. Ends with encouraging next steps

Make it sound natural and conversational, like a friendly teacher explaining the concepts. The script should be about 2-3 minutes when spoken (approximately 400-600 words).

Provide the response in this format:
RAW_SCRIPT: [conversational script here]
FORMATTED_SCRIPT: [same content with emoji headers and bullet points for visual appeal]`;

    const aiResponse = await callOpenAI(prompt, 1000);
    
    // Parse the response
    const rawMatch = aiResponse.match(/RAW_SCRIPT:\s*([\s\S]*?)(?=FORMATTED_SCRIPT:|$)/);
    const formattedMatch = aiResponse.match(/FORMATTED_SCRIPT:\s*([\s\S]*)/);
    
    const rawScript = rawMatch ? rawMatch[1].trim() : aiResponse;
    const formattedScript = formattedMatch ? formattedMatch[1].trim() : formatScriptWithEmojis(rawScript, docName);
    
    // Calculate estimated duration
    const wordCount = rawScript.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 2.5);
    
    return {
      raw_script: rawScript,
      formatted_script: formattedScript,
      estimated_duration: estimatedDuration
    };
  } catch (error) {
    console.error('Failed to generate AI podcast script:', error);
    return generateFallbackPodcastScript(fileName, summary);
  }
};

const formatScriptWithEmojis = (script: string, docName: string): string => {
  return `🎧 **Welcome to your personalized learning session!**

Today we're exploring **"${docName}"** and its key insights.

${script}

**Thank you for joining this learning session!** 🚀
*Continue your learning journey by applying these concepts.*`;
};

const generateFallbackPodcastScript = (fileName: string, summary: string): any => {
  const summaryLines = summary.split('\n').filter(line => line.trim());
  const keyPoints = summaryLines.filter(line => line.includes('•') || line.includes('-')).slice(0, 5);
  const docName = fileName.replace(/\.[^/.]+$/, "");
  
  const rawScript = `Welcome to your personalized learning session! Today we're exploring "${docName}" and diving deep into its key insights.

This document offers valuable content for learning and understanding. The material presents interconnected concepts that build upon each other naturally.

${keyPoints.length > 0 ? `Key takeaways include: ${keyPoints.slice(0, 3).map(point => point.replace(/[•-]/g, '').trim()).join(', ')}.` : 'The content covers important theoretical foundations and practical applications.'}

What makes this particularly valuable is how these concepts connect to real-world scenarios. You can apply these insights directly to your own context and goals.

As we wrap up, remember that the real power of this content comes from putting these ideas into practice. Take some time to reflect on how these concepts apply to your specific situation.

Thank you for joining this learning session with "${docName}". I hope these insights serve you well!`;

  const formattedScript = formatScriptWithEmojis(rawScript, docName);
  const wordCount = rawScript.split(/\s+/).length;
  const estimatedDuration = Math.ceil(wordCount / 2.5);

  return {
    raw_script: rawScript,
    formatted_script: formattedScript,
    estimated_duration: estimatedDuration
  };
};

const generateAlternatePodcastScriptAI = async (fileName: string, summary: string): Promise<any> => {
  try {
    const docName = fileName.replace(/\.[^/.]+$/, "");
    const prompt = `Create a fresh, alternative podcast script for the document "${fileName}" with a different perspective from the original.

Document Summary:
${summary.substring(0, 2500)}

Create a new script that:
1. Takes a different angle or approach to the same content
2. Highlights aspects that might have been overlooked initially
3. Provides alternative interpretations or applications
4. Asks thought-provoking questions for deeper reflection
5. Encourages synthesis with previous understanding

Make it conversational and engaging, like a follow-up discussion that adds new layers of understanding. Focus on "what if" scenarios and broader implications.

Provide the response in this format:
RAW_SCRIPT: [conversational alternative script here]
FORMATTED_SCRIPT: [same content with emoji headers and bullet points for visual appeal]`;

    const aiResponse = await callOpenAI(prompt, 1000);
    
    // Parse the response
    const rawMatch = aiResponse.match(/RAW_SCRIPT:\s*([\s\S]*?)(?=FORMATTED_SCRIPT:|$)/);
    const formattedMatch = aiResponse.match(/FORMATTED_SCRIPT:\s*([\s\S]*)/);
    
    const rawScript = rawMatch ? rawMatch[1].trim() : aiResponse;
    const formattedScript = formattedMatch ? formattedMatch[1].trim() : formatAlternativeScriptWithEmojis(rawScript, docName);
    
    // Calculate estimated duration
    const wordCount = rawScript.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 2.5);
    
    return {
      raw_script: rawScript,
      formatted_script: formattedScript,
      estimated_duration: estimatedDuration
    };
  } catch (error) {
    console.error('Failed to generate alternative AI podcast script:', error);
    return generateAlternatePodcastScript(fileName, summary);
  }
};

const formatAlternativeScriptWithEmojis = (script: string, docName: string): string => {
  return `🔄 **Welcome back for a fresh exploration!**

Today we're taking a **different approach** to "${docName}" with new perspectives.

${script}

**Thank you for this deeper exploration!** 🌟
*Each revisit reveals new dimensions and connections.*`;
};

const generateAlternatePodcastScript = (fileName: string, summary: string): any => {
  // Extract different aspects from the summary for a fresh perspective
  const summaryLines = summary.split('\n').filter(line => line.trim());
  const keyPoints = summaryLines.filter(line => line.includes('•') || line.includes('-')).slice(0, 5);
  const docName = fileName.replace(/\.[^/.]+$/, "");
  
  // Extract different topics for alternative perspective
  const topicMatches = summary.match(/\*\*(.*?)\*\*/g) || [];
  const alternativeTopics = topicMatches.slice(1, 5).map(match => match.replace(/\*\*/g, ''));
  
  const rawScript = `Welcome back for a fresh exploration of "${docName}"! This time, we're taking a different approach to uncover new insights and perspectives.

Sometimes the most valuable learning happens when we revisit material with fresh eyes. Today, I want to highlight aspects we might have glossed over in our first discussion.

${alternativeTopics.length > 0 ? `Let's start by examining ${alternativeTopics[0]} from a new angle. This concept might have seemed straightforward before, but there are deeper layers worth exploring.` : 'Looking at this content through a different lens reveals interesting patterns and connections.'}

${alternativeTopics.length > 1 ? `Another area worth revisiting is ${alternativeTopics[1]}. Notice how this connects to broader themes and implications we might not have fully appreciated initially.` : 'Each concept in this material has multiple facets that become clearer with reflection.'}

What's fascinating is how these ideas interconnect in ways that weren't immediately obvious. ${keyPoints.length > 0 ? `For instance, ${keyPoints[0]?.replace(/[•-]/g, '').trim()} takes on new significance when viewed in context.` : 'The relationships between concepts become more apparent with this deeper analysis.'}

Let me pose some questions for reflection: How do these concepts challenge your existing assumptions? What new applications can you imagine? How might these ideas evolve in different contexts?

${alternativeTopics.length > 2 ? `The discussion around ${alternativeTopics[2]} is particularly thought-provoking when we consider its broader implications.` : 'This material continues to reveal new dimensions the more we engage with it.'}

As we conclude this alternative exploration of "${docName}", I encourage you to synthesize these new perspectives with your original understanding. The richest learning often comes from holding multiple viewpoints simultaneously.

Thank you for this deeper dive. Remember, great content rewards multiple visits, each time revealing new treasures!`;

  const formattedScript = `🔄 **Welcome back for a fresh exploration!**

Today we're taking a **different approach** to "${docName}" to uncover new insights and perspectives.

**🔍 Fresh Perspective**
Sometimes the most valuable learning happens when we revisit material with fresh eyes and new questions.

${alternativeTopics.length > 0 ? `**🎯 New Angle: ${alternativeTopics[0]}**\nLet's examine this concept from a different perspective to reveal deeper layers.\n` : ''}

${alternativeTopics.length > 1 ? `**🌟 Deeper Look: ${alternativeTopics[1]}**\nNotice how this connects to broader themes we might have initially missed.\n` : ''}

**🧩 Interconnections**
These ideas connect in ways that weren't immediately obvious:
${keyPoints.length > 0 ? keyPoints.slice(0, 3).map(point => `• ${point.replace(/[•-]/g, '').trim()}`).join('\n') : '• Concepts reveal new dimensions with deeper analysis\n• Relationships become clearer through reflection\n• Multiple perspectives enrich understanding'}

**🤔 Questions for Reflection**
• How do these concepts challenge your existing assumptions?
• What new applications can you imagine?
• How might these ideas evolve in different contexts?

${alternativeTopics.length > 2 ? `**💭 Thought-Provoking: ${alternativeTopics[2]}**\nThis aspect becomes particularly interesting when we consider broader implications.\n` : ''}

**🎯 Synthesis Challenge**
Combine these new perspectives with your original understanding. The richest learning comes from holding multiple viewpoints simultaneously.

**Thank you for this deeper dive into "${docName}"!** 🌟
*Great content rewards multiple visits, each revealing new treasures.*`;

  // Calculate estimated duration
  const wordCount = rawScript.split(/\s+/).length;
  const estimatedDuration = Math.ceil(wordCount / 2.5);

  return {
    raw_script: rawScript,
    formatted_script: formattedScript,
    estimated_duration: estimatedDuration
  };
};

const mockAuthResponse = {
  access_token: 'mock_token_' + Date.now(),
  token_type: 'bearer',
  user: {
    id: 'mock_user_id',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    created_at: new Date().toISOString()
  }
};

// API Types
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

export interface Document {
  doc_id: string;
  doc_name: string;
  upload_time: string;
  summary_text?: string;
  summary_audio_url?: string;
  summary_graph_data?: any;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Auth API
export const authAPI = {
  signup: async (userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    confirm_password: string;
  }) => {
    if (MOCK_MODE) {
      await mockDelay(1500); // Simulate network delay
      
      // Mock validation
      if (!userData.email || !userData.email.includes('@')) {
        throw { response: { data: { detail: 'Invalid email address' } } };
      }
      if (userData.password !== userData.confirm_password) {
        throw { response: { data: { detail: 'Passwords do not match' } } };
      }
      if (userData.password.length < 6) {
        throw { response: { data: { detail: 'Password must be at least 6 characters' } } };
      }
      
      console.log('Mock: Account created for', userData.email);
      return { message: 'Account created successfully!' };
    }
    
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  verifyOTP: async (email: string, otp: string): Promise<AuthResponse> => {
    if (MOCK_MODE) {
      await mockDelay(1000);
      
      if (otp === '123456') {
        console.log('Mock: OTP verified for', email);
        return mockAuthResponse;
      }
      throw { response: { data: { detail: 'Invalid OTP' } } };
    }
    
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    if (MOCK_MODE) {
      await mockDelay(1000);
      
      console.log('Mock: Login attempt -', { email, password });
      
      // Accept multiple test credentials
      if ((email === 'test@test.com' && password === 'password') ||
          (email === 'test@example.com' && password === 'password') ||
          (email.includes('@') && password.length >= 6)) {
        console.log('Mock: Login successful for', email);
        const mockResponse = {
          access_token: 'mock_token_' + Date.now(),
          token_type: 'bearer',
          user: {
            id: 'mock_user_' + Date.now(),
            first_name: 'Test',
            last_name: 'User',
            email: email,
            created_at: new Date().toISOString()
          }
        };
        console.log('Mock: Returning response:', mockResponse);
        return mockResponse;
      }
      
      console.log('Mock: Login failed - invalid credentials');
      throw { 
        response: { 
          data: { 
            detail: 'Invalid email or password. Try: test@test.com / password' 
          } 
        } 
      };
    }
    
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    if (MOCK_MODE) {
      await mockDelay(1000);
      console.log('Mock: Password reset email sent to', email);
      return { message: 'Password reset email sent' };
    }
    
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email: string, new_password: string, token: string) => {
    if (MOCK_MODE) {
      await mockDelay(1000);
      console.log('Mock: Password reset for', email);
      return { message: 'Password reset successfully' };
    }
    
    const response = await api.post('/auth/reset-password', {
      email,
      new_password,
      token,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    if (MOCK_MODE) {
      await mockDelay(500);
      return mockAuthResponse.user;
    }
    
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Enhanced AI summary generation with story-like, natural flow
const generateBriefAISummary = async (fileName: string, content: string): Promise<string> => {
  // In mock mode, OpenAI calls from frontend may fail due to CORS/API key issues
  // So let's create intelligent mock summaries based on the actual content
  if (MOCK_MODE) {
    return generateIntelligentMockSummary(fileName, content);
  }
  
  try {
    const prompt = `Create a natural, story-like summary of this document. Write it as if you're explaining the content to a friend in a conversational way. NO headings, NO bullet points, NO formal structure.

Document: "${fileName}"
Content: ${content.substring(0, 2500)} ${content.length > 2500 ? '...' : ''}

Write a flowing, easy-to-read summary that:
- Starts by explaining what this document is about in simple terms
- Flows naturally from one idea to the next
- Uses everyday language and short sentences
- Tells the "story" of the document's main ideas
- Ends with why this matters or what someone can do with this information

Keep it conversational, brief (3-4 paragraphs max), and easy to understand. Write it like you're having a friendly conversation.`;

    const aiResponse = await callOpenAI(prompt, 600);
    
    return aiResponse;
  } catch (error) {
    console.error('Failed to generate story-like AI summary:', error);
    // Fallback to intelligent mock summary
    return generateIntelligentMockSummary(fileName, content);
  }
};

// Intelligent mock summary that analyzes actual content
const generateIntelligentMockSummary = (fileName: string, content: string): string => {
  // Extract key information from the actual content
  const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Find the most common meaningful words
  const wordCount: { [key: string]: number } = {};
  words.forEach(word => {
    // Skip common words
    if (!['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'would', 'could', 'should', 'their', 'there', 'where', 'when', 'what', 'which', 'while'].includes(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  // Get top keywords
  const topWords = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .map(([word]) => word);
  
  // Analyze document type
  const docType = fileName.toLowerCase().includes('report') ? 'report' :
                 fileName.toLowerCase().includes('guide') ? 'guide' :
                 fileName.toLowerCase().includes('manual') ? 'manual' :
                 fileName.toLowerCase().includes('research') ? 'research document' :
                 'document';
  
  // Create contextual summary based on content
  const mainThemes = topWords.slice(0, 3).join(', ');
  const supportingThemes = topWords.slice(3, 6).join(', ');
  
  // Get a representative sentence from the content
  const meaningfulSentences = sentences.filter(s => 
    topWords.some(word => s.toLowerCase().includes(word)) && s.length > 50 && s.length < 200
  );
  const keyPoint = meaningfulSentences.length > 0 ? meaningfulSentences[0].trim() : '';
  
  // Generate natural summary
  let summary = `This ${docType} explores ${mainThemes} and provides insights into these important topics. `;
  
  if (keyPoint) {
    summary += `${keyPoint} `;
  }
  
  summary += `The content covers ${supportingThemes} in a way that helps readers understand the key concepts and their practical applications.\n\n`;
  
  summary += `What makes this material valuable is how it connects different ideas together and shows their real-world relevance. `;
  summary += `The document is structured to guide readers through the main concepts while providing the context needed to understand why these topics matter.\n\n`;
  
  summary += `Overall, this serves as a useful resource for anyone looking to understand ${mainThemes} and how to apply these insights in practical situations.`;
  
  return summary;
};

// Story-like summary variation for regeneration
const generateStoryLikeSummaryVariation = async (fileName: string, content: string): Promise<string> => {
  // In mock mode, create a different perspective on the content
  if (MOCK_MODE) {
    return generateAlternativeMockSummary(fileName, content);
  }
  
  try {
    const prompt = `Create a fresh, conversational summary of this document. Write it differently from a typical summary - make it feel like you're telling someone about what you just read. NO headings, NO bullet points, just natural storytelling.

Document: "${fileName}"
Content: ${content.substring(0, 2500)} ${content.length > 2500 ? '...' : ''}

Tell me about this document in a natural, flowing way:
- What's the main story or message here?
- What are the most interesting or important parts?
- How do the ideas connect to each other?
- What would someone gain from reading this?

Write it like you're sharing something interesting you just discovered. Keep it simple, engaging, and easy to follow. About 2-3 short paragraphs.`;

    const aiResponse = await callOpenAI(prompt, 500);
    
    return aiResponse;
  } catch (error) {
    console.error('Failed to generate story-like summary variation:', error);
    // Fallback to alternative mock summary
    return generateAlternativeMockSummary(fileName, content);
  }
};

// Alternative mock summary for regeneration (different approach)
const generateAlternativeMockSummary = (fileName: string, content: string): string => {
  // Extract different aspects for a fresh perspective
  const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 4);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
  
  // Focus on different keywords for variation
  const wordCount: { [key: string]: number } = {};
  words.forEach(word => {
    if (!['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'would', 'could', 'should', 'their', 'there', 'where', 'when', 'what', 'which', 'while', 'about', 'other', 'after', 'first', 'also'].includes(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  const topWords = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
  
  // Take different themes for variation
  const primaryFocus = topWords.slice(1, 3).join(' and ');
  const secondaryAspects = topWords.slice(4, 7).join(', ');
  
  // Different tone and perspective
  let summary = `Looking at ${fileName}, what stands out most is how it approaches ${primaryFocus} from a practical perspective. `;
  
  // Find a different meaningful sentence
  const alternativeSentences = sentences.filter(s => 
    topWords.slice(2, 5).some(word => s.toLowerCase().includes(word)) && s.length > 60 && s.length < 180
  );
  
  if (alternativeSentences.length > 0) {
    summary += `${alternativeSentences[0].trim()} `;
  }
  
  summary += `The document brings together ideas about ${secondaryAspects} in a way that makes complex concepts more accessible.\n\n`;
  
  summary += `What I find particularly interesting is how the content bridges theory and practice. `;
  summary += `Rather than just explaining concepts, it shows how these ideas can be applied and why they matter in real situations. `;
  summary += `This makes it especially valuable for anyone who wants to move beyond just understanding the basics.\n\n`;
  
  summary += `The overall message seems to be that ${primaryFocus} becomes much more powerful when you understand how all these different pieces fit together.`;
  
  return summary;
};

// Documents API
export const documentsAPI = {
  upload: async (file: File): Promise<Document> => {
    if (MOCK_MODE) {
      await mockDelay(2000);
      
      // Extract text from the uploaded file
      let extractedText = '';
      try {
        if (file.type === 'application/pdf') {
          extractedText = await extractTextFromPDF(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          extractedText = await extractTextFromDocx(file);
        } else if (file.type === 'text/plain') {
          extractedText = await extractTextFromTxt(file);
        } else {
          // Fallback for other file types
          extractedText = await extractTextFromTxt(file);
        }
      } catch (error) {
        console.warn('Could not extract text from file:', error);
        extractedText = `This document "${file.name}" contains content that would be analyzed by our AI system to provide insights and summaries.`;
      }
      
      // Generate AI summary based on extracted text (using brief version for better understanding)
      const aiSummary = await generateBriefAISummary(file.name, extractedText);
      const mindMapData = await generateMindMapFromText(file.name, extractedText);
      
      const mockDoc = {
        doc_id: 'mock_doc_' + Date.now(),
        doc_name: file.name,
        upload_time: new Date().toISOString(),
        summary_text: aiSummary,
        summary_graph_data: mindMapData
      };
      
      // Add to mock storage
      mockDocuments.push(mockDoc);
      console.log('Mock: Document uploaded and stored:', mockDoc);
      
      return mockDoc;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 120 seconds for large file upload and AI processing
    });
    return response.data;
  },

  getAll: async (): Promise<{ documents: Document[] }> => {
    if (MOCK_MODE) {
      await mockDelay(500);
      console.log('Mock: Returning documents:', mockDocuments);
      return { documents: [...mockDocuments] }; // Return a copy
    }
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const url = `/documents/?_t=${timestamp}&_r=${randomId}&_bust=${Date.now()}`;
    
    console.log('🔍 Fetching documents from:', url);
    
    const response = await api.get(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'If-None-Match': '*',
        'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT'
      }
    });
    
    console.log('📄 Documents API response:', response.data);
    return response.data;
  },

  getById: async (docId: string): Promise<Document> => {
    if (MOCK_MODE) {
      await mockDelay(500);
      return {
        doc_id: docId,
        doc_name: 'Mock Document',
        upload_time: new Date().toISOString(),
        summary_text: 'Mock summary content'
      };
    }
    
    const response = await api.get(`/documents/${docId}`);
    return response.data;
  },

  generateAudio: async (docId: string, voiceStyle: string = 'human') => {
    if (MOCK_MODE) {
      await mockDelay(2000);
      console.log('Mock: Audio generated for document', docId);
      
      // Create a working mock audio URL using a data URI for a short beep
      const mockAudioUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgfCjGH0fPTgjMGHm7A7+OZURE';
      
      // Update the document in mock storage with audio URL
      const docIndex = mockDocuments.findIndex(doc => doc.doc_id === docId);
      if (docIndex !== -1) {
        mockDocuments[docIndex].summary_audio_url = mockAudioUrl;
        console.log('Mock: Updated document with audio URL:', mockDocuments[docIndex]);
      }
      
      return { audio_url: mockAudioUrl };
    }
    
    const response = await api.post(`/documents/${docId}/generate-audio`, null, {
      params: { voice_style: voiceStyle },
      timeout: 45000, // 45 seconds for audio generation
    });
    return response.data;
  },

  getPodcastScript: async (docId: string) => {
    if (MOCK_MODE) {
      await mockDelay(1500);
      
      // Find the document to create a personalized script
      const doc = mockDocuments.find(d => d.doc_id === docId);
      const docName = doc?.doc_name || 'your document';
      const summary = doc?.summary_text || '';
      
      // Generate podcast script based on the actual document content
      const script = await generatePodcastScript(docName, summary);
      
      console.log('Mock: Generated podcast script for', docName);
      return script;
    }
    
    const response = await api.get(`/documents/${docId}/podcast-script`, {
      timeout: 30000, // 30 seconds for AI script generation
    });
    return response.data;
  },

  regeneratePodcastScript: async (docId: string) => {
    if (MOCK_MODE) {
      await mockDelay(2000);
      
      // Find the document to create a personalized regenerated script
      const doc = mockDocuments.find(d => d.doc_id === docId);
      const docName = doc?.doc_name || 'your document';
      const summary = doc?.summary_text || '';
      
      // Generate a fresh podcast script with different approach using OpenAI
      const script = await generateAlternatePodcastScriptAI(docName, summary);
      
      console.log('Mock: Regenerated podcast script for', docName);
      return script;
    }
    
    const response = await api.post(`/documents/${docId}/regenerate-podcast-script`, {}, {
      timeout: 30000, // 30 seconds for AI script generation
    });
    return response.data;
  },

  downloadSummary: async (docId: string, format: string = 'txt') => {
    if (MOCK_MODE) {
      await mockDelay(1000);
      return new Blob(['Mock summary content'], { type: 'text/plain' });
    }
    
    const response = await api.get(`/documents/${docId}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  delete: async (docId: string) => {
    if (MOCK_MODE) {
      await mockDelay(500);
      // Remove from mock storage
      const initialLength = mockDocuments.length;
      mockDocuments = mockDocuments.filter(doc => doc.doc_id !== docId);
      const removed = initialLength > mockDocuments.length;
      console.log('Mock: Document deleted', docId, removed ? 'successfully' : 'not found');
      return { message: 'Document deleted' };
    }
    
    const response = await api.delete(`/documents/${docId}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    return response.data;
  },

  regenerateSummary: async (docId: string): Promise<{ summary_text: string }> => {
    if (MOCK_MODE) {
      await mockDelay(2000);
      
      // Find the document to regenerate summary for
      const doc = mockDocuments.find(d => d.doc_id === docId);
      if (!doc) {
        throw new Error('Document not found');
      }
      
      // We need to extract text again to regenerate the summary
      // For mock mode, we'll simulate this by using the document name and creating a more detailed mock content
      const mockContent = `This document titled ${doc.doc_name} explores important concepts and ideas. It presents information in a structured way that helps readers understand the key topics. The content includes practical examples, theoretical foundations, and actionable insights. The document covers various aspects of the subject matter, providing both background context and specific details. It aims to educate readers and provide them with useful knowledge they can apply in their work or studies.`;
      
      // Generate a new story-like summary using OpenAI with a slightly different approach
      const newSummary = await generateStoryLikeSummaryVariation(doc.doc_name, mockContent);
      
      // Update the document in mock storage
      const docIndex = mockDocuments.findIndex(d => d.doc_id === docId);
      if (docIndex !== -1) {
        mockDocuments[docIndex].summary_text = newSummary;
        console.log('Mock: Updated document with new summary:', mockDocuments[docIndex]);
      }
      
      return { summary_text: newSummary };
    }
    
    const response = await api.post(`/documents/${docId}/regenerate-summary`);
    return response.data;
  },
};

// Summaries API
export const summariesAPI = {
  textToSpeech: async (text: string, voiceStyle: string = 'human') => {
    if (MOCK_MODE) {
      await mockDelay(2000);
      console.log('Mock: Text-to-speech generated');
      
      // Use a working data URI audio for better testing
      const mockAudioUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgfCjGH0fPTgjMGHm7A7+OZURE';
      
      return { audio_url: mockAudioUrl };
    }
    
    const response = await api.post('/summaries/text-to-speech', {
      text,
      voice_style: voiceStyle,
    }, {
      timeout: 45000, // 45 seconds for text-to-speech
    });
    return response.data;
  },

  generateGraph: async (text: string, graphType: string = 'flowchart') => {
    if (MOCK_MODE) {
      await mockDelay(1500);
      console.log('Mock: Graph generated for:', graphType);
      
      // Generate a comprehensive mind map based on the text content
      const mockGraphData = {
        nodes: [
          { 
            id: 'main_topic', 
            label: 'Core Subject', 
            type: 'central', 
            description: 'Central theme of the analyzed content',
            size: 'large' 
          },
          { 
            id: 'key_insight_1', 
            label: 'Primary Insight', 
            type: 'key', 
            description: 'Main finding or conclusion from the text',
            size: 'medium' 
          },
          { 
            id: 'key_insight_2', 
            label: 'Secondary Insight', 
            type: 'key', 
            description: 'Supporting finding that reinforces main themes',
            size: 'medium' 
          },
          { 
            id: 'methodology', 
            label: 'Approach Used', 
            type: 'key', 
            description: 'Method or framework employed in the content',
            size: 'medium' 
          },
          { 
            id: 'evidence_1', 
            label: 'Supporting Data', 
            type: 'support', 
            description: 'Evidence that backs up primary insights',
            size: 'small' 
          },
          { 
            id: 'evidence_2', 
            label: 'Additional Evidence', 
            type: 'support', 
            description: 'Further proof supporting conclusions',
            size: 'small' 
          },
          { 
            id: 'application', 
            label: 'Practical Use', 
            type: 'application', 
            description: 'How insights can be applied in real scenarios',
            size: 'small' 
          },
          { 
            id: 'implications', 
            label: 'Future Implications', 
            type: 'application', 
            description: 'What these findings mean going forward',
            size: 'small' 
          }
        ],
        edges: [
          { from: 'main_topic', to: 'key_insight_1', label: 'reveals', type: 'primary' },
          { from: 'main_topic', to: 'key_insight_2', label: 'shows', type: 'primary' },
          { from: 'main_topic', to: 'methodology', label: 'uses', type: 'primary' },
          { from: 'key_insight_1', to: 'evidence_1', label: 'supported by', type: 'elaborates' },
          { from: 'key_insight_2', to: 'evidence_2', label: 'backed by', type: 'elaborates' },
          { from: 'key_insight_1', to: 'application', label: 'leads to', type: 'implements' },
          { from: 'key_insight_2', to: 'implications', label: 'suggests', type: 'implements' },
          { from: 'methodology', to: 'evidence_1', label: 'produces', type: 'cross_link' },
          { from: 'application', to: 'implications', label: 'influences', type: 'cross_link' }
        ]
      };
      
      return { graph_data: mockGraphData };
    }
    
    const response = await api.post('/summaries/generate-graph', {
      text,
      graph_type: graphType,
    }, {
      timeout: 30000, // 30 seconds for graph generation
    });
    return response.data;
  },

  enhanceSummary: async (text: string) => {
    if (MOCK_MODE) {
      await mockDelay(1000);
      return { enhanced_summary: 'Mock enhanced summary: ' + text };
    }
    
    const response = await api.post('/summaries/enhance-summary', null, {
      params: { text },
      timeout: 30000, // 30 seconds for AI enhancement
    });
    return response.data;
  },

  generatePodcastScript: async (text: string) => {
    if (MOCK_MODE) {
      await mockDelay(1500);
      return { podcast_script: 'Mock podcast script based on: ' + text };
    }
    
    const response = await api.post('/summaries/podcast-script', null, {
      params: { text },
      timeout: 30000, // 30 seconds for AI script generation
    });
    return response.data;
  },
}; 