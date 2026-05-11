import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function identifyMovieFromImage(base64Image: string) {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            text: `Identify the movie or TV show in this image. 
            Return a JSON object with:
            - title: The name of the movie/show.
            - year: Release year (if known).
            - confidence: 0 to 1 confidence score.
            - reason: A short explanation of why you think it's this movie/show.
            - actors: Top 3 actors in this scene (if identifiable).`
          },
          {
            inlineData: {
              data: base64Image,
              mimeType: "image/jpeg"
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
          actors: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "confidence"]
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
      systemInstruction: "You are CIGHT AI, a specialized entertainment assistant. You help users find movies, provide synopsis, details about actors, and suggest similar content. Be helpful, enthusiastic, and knowledgeable about cinema."
    }
  });

  return response.text;
}
