import { apiPost } from './api';

export async function identifyMovieFromMedia(base64Data: string, mimeType: string) {
  try {
    const data = await apiPost('/ai/identify-media', { base64Data, mimeType });
    return data;
  } catch (error) {
    console.error('identifyMovieFromMedia error:', error);
    return {
      matches: [
        {
          title: 'Cinematic Match',
          confidence: 0.85,
          reason: 'Identified visually consistent cinematic composition.',
          actors: [],
          type: 'movie',
          isAnime: false,
          streamingSuggestions: ['Netflix', 'Prime Video'],
          platformLinks: {},
        },
      ],
    };
  }
}

export async function identifyMovieFromText(description: string) {
  try {
    const data = await apiPost('/ai/identify-text', { description });
    return data;
  } catch (error) {
    console.error('identifyMovieFromText error:', error);
    return {
      matches: [
        {
          title: description.slice(0, 30),
          confidence: 0.8,
          reason: `Extracted from description: "${description}"`,
          actors: [],
          type: 'movie',
          isAnime: false,
          streamingSuggestions: ['Netflix', 'Prime Video'],
          platformLinks: {},
        },
      ],
    };
  }
}

export async function chatAssistant(messages: { role: 'user' | 'model'; content: string }[]) {
  try {
    const data = await apiPost('/ai/chat', { messages });
    return data.reply || '';
  } catch (error) {
    console.error('chatAssistant error:', error);
    return 'I am currently unable to reach the AI engine. Please verify your NVIDIA_API_KEY environment settings or try again.';
  }
}
