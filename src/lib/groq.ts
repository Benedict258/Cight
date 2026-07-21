import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  dangerouslyAllowBrowser: true,
});

const MODEL = 'openai/gpt-oss-120b';

export async function identifyMovieFromMedia(base64Data: string, mimeType: string) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this ${mimeType.startsWith('video/') ? 'video clip' : 'image'} and identify ALL recognizable movies, TV shows, anime, digital series, podcasts, or YouTube channels appearing in the frame.

Return ONLY a JSON object with a "matches" array. Each match should have:
- title: The name of the movie/show/podcast.
- year: Release year (if known).
- confidence: 0 to 1 confidence score.
- reason: Short explanation of why you think it's this.
- actors: Top 3 actors, hosts, or recurring creators.
- type: "movie", "tv", "anime", "podcast", "youtube", or "digital_series".
- seasons: Number of seasons (if it's a TV show/series).
- franchise: Name of the saga or collection it belongs to.
- isAnime: boolean.
- streamingSuggestions: Array of likely streaming platforms.
- platformLinks: Object with optional "spotify" or "youtube" URLs.`
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Data}` }
          }
        ]
      }
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  const text = response.choices[0].message.content || '{}';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

export async function identifyMovieFromText(description: string) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: `Analyze this description to identify all potential movies, TV shows, anime, podcasts, or YouTube series mentioned: "${description}".

Return ONLY a JSON object with a "matches" array. Each match should have:
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
- platformLinks: Object with optional "spotify" or "youtube" URLs.`
      }
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  const text = response.choices[0].message.content || '{}';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

export async function chatAssistant(messages: { role: 'user' | 'model'; content: string }[]) {
  const systemMsg = "You are CIGHT AI, a specialized entertainment assistant. You help users find movies, provide synopsis, details about actors, and suggest similar content. Only provide information about legitimate streaming and purchase platforms (Netflix, Apple TV, Prime Video, etc.). Do not provide illegal download or piracy links. Be helpful, enthusiastic, and knowledgeable about cinema.";

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMsg },
      ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content } as const))
    ],
  });

  return response.choices[0].message.content || '';
}
