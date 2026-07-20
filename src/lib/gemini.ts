import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function identifyMovieFromMedia(base64Data: string, mimeType: string) {
  const model = "gemini-2.5-flash"; 
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            text: `Analyze this ${mimeType.startsWith('video/') ? 'video clip' : 'image'} and identify ALL recognizable movies, TV shows, anime, digital series, podcasts, or YouTube channels appearing in the frame.
            
            Return a JSON object with a "matches" array. Each match should have:
            - title: The name of the movie/show/podcast.
            - year: Release year (if known).
            - confidence: 0 to 1 confidence score.
            - reason: Short explanation of why you think it's this.
            - actors: Top 3 actors, hosts, or recurring creators.
            - type: "movie", "tv", "anime", "podcast", "youtube", or "digital_series".
            - seasons: Number of seasons (if it's a TV show/series).
            - franchise: Name of the saga or collection it belongs to (e.g., "Marvel Cinematic Universe", "Fast & Furious").
            - isAnime: boolean.
            - streamingSuggestions: Array of likely streaming platforms where this is available.
            - platformLinks: Object with optional "spotify" or "youtube" directly-accessible URLs if it's a podcast or digital series.`
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                year: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                reason: { type: Type.STRING },
                type: { type: Type.STRING },
                seasons: { type: Type.NUMBER },
                franchise: { type: Type.STRING },
                isAnime: { type: Type.BOOLEAN },
                actors: { type: Type.ARRAY, items: { type: Type.STRING } },
                streamingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                platformLinks: {
                  type: Type.OBJECT,
                  properties: {
                    spotify: { type: Type.STRING },
                    youtube: { type: Type.STRING }
                  }
                }
              },
              required: ["title", "confidence", "type", "isAnime"]
            }
          }
        },
        required: ["matches"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function identifyMovieFromText(description: string) {
  const model = "gemini-2.5-flash"; 
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            text: `Analyze this description to identify all potential movies, TV shows, anime, podcasts, or YouTube series mentioned: "${description}". 
            
            Return a JSON object with a "matches" array. Each match should have:
            - title: The name of the content.
            - year: Release year (if known).
            - confidence: 0 to 1 confidence score.
            - reason: Short explanation.
            - actors: Top 3 people identified.
            - type: "movie", "tv", "anime", "podcast", "youtube", or "digital_series".
            - seasons: Number of seasons (if it is a series).
            - franchise: Name of the collection or saga.
            - isAnime: boolean.
            - streamingSuggestions: Array of likely streaming platforms.
            - platformLinks: Object with optional "spotify" or "youtube" directly-accessible URLs if it's a podcast or digital series.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                year: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                reason: { type: Type.STRING },
                type: { type: Type.STRING },
                seasons: { type: Type.NUMBER },
                franchise: { type: Type.STRING },
                isAnime: { type: Type.BOOLEAN },
                actors: { type: Type.ARRAY, items: { type: Type.STRING } },
                streamingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                platformLinks: {
                  type: Type.OBJECT,
                  properties: {
                    spotify: { type: Type.STRING },
                    youtube: { type: Type.STRING }
                  }
                }
              },
              required: ["title", "confidence", "type", "isAnime"]
            }
          }
        },
        required: ["matches"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function chatAssistant(messages: { role: "user" | "model", content: string }[]) {
  const model = "gemini-2.5-flash";
  
  const response = await ai.models.generateContent({
    model,
    contents: messages.map(m => ({ 
      role: m.role, 
      parts: [{ text: m.content }] 
    })),
    config: {
      systemInstruction: "You are CIGHT AI, a specialized entertainment assistant. You help users find movies, provide synopsis, details about actors, and suggest similar content. Note: You only provide information about legitimate streaming and purchase platforms (Netflix, Apple TV, Prime Video, etc.) and do not provide illegal download or piracy links. Be helpful, enthusiastic, and knowledgeable about cinema."
    }
  });

  return response.text;
}
