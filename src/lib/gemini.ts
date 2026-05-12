import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function identifyMovieFromMedia(base64Data: string, mimeType: string) {
  const model = "gemini-1.5-flash"; // Use flash for fast recognition
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            text: `Analyze this ${mimeType.startsWith('video/') ? 'video clip' : 'image'} to identify the movie or TV show. 
            Return a JSON object with:
            - title: The name of the movie/show.
            - year: Release year (if known).
            - confidence: 0 to 1 confidence score.
            - reason: A short explanation of why you think it's this movie/show.
            - actors: Top 3 actors in this scene (if identifiable).
            - type: "movie", "tv", or "anime".
            - isAnime: boolean.
            - streamingSuggestions: Array of likely streaming platforms where this is available.`
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
          title: { type: Type.STRING },
          year: { type: Type.NUMBER },
          confidence: { type: Type.NUMBER },
          reason: { type: Type.STRING },
          type: { type: Type.STRING },
          isAnime: { type: Type.BOOLEAN },
          actors: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          streamingSuggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "confidence", "isAnime"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function chatAssistant(messages: { role: "user" | "model", content: string }[]) {
  const model = "gemini-3-flash-preview";
  
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
