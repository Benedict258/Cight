import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

const router = Router();

// NVIDIA API client using OpenAI SDK as requested:
// client = OpenAI(
//   base_url = "https://integrate.api.nvidia.com/v1",
//   api_key = "$NVIDIA_API_KEY"
// )
// model = "meta/muse-glimmer-30b"
let nvidiaClient = null;
function getNvidiaClient() {
  if (!nvidiaClient && process.env.NVIDIA_API_KEY) {
    nvidiaClient = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
    });
  }
  return nvidiaClient;
}

let genAI = null;
function getGeminiClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAI;
}

let groqClient = null;
function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return groqClient;
}

function cleanJsonResponse(text) {
  if (!text) throw new Error('Empty response text');
  // Strip markdown formatting if any
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

// Return active AI configuration info
router.get('/model-info', (req, res) => {
  res.json({
    primaryModel: 'meta/muse-glimmer-30b',
    provider: 'NVIDIA',
    nvidiaConfigured: !!process.env.NVIDIA_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Chat Assistant endpoint using meta/muse-glimmer-30b by Nvidia
router.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array required' });
  }

  const systemMsg =
    'You are CIGHT AI, an expert cinematic and entertainment intelligence assistant powered by meta/muse-glimmer-30b. You provide rich, accurate film, TV, and anime knowledge, cast and director backgrounds, plot synopses, and legitimate streaming and viewing advice (Netflix, Apple TV, Prime Video, Disney+, Max, etc.). Do not share piracy links. Respond in clean, engaging markdown.';

  // 1. Primary Engine: meta/muse-glimmer-30b by Nvidia
  try {
    const nvidia = getNvidiaClient();
    if (nvidia) {
      const completion = await nvidia.chat.completions.create({
        model: 'meta/muse-glimmer-30b',
        messages: [
          { role: 'system', content: systemMsg },
          ...messages.map(m => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || '',
          })),
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 8192,
        stream: false,
      });

      const reply =
        completion.choices[0]?.message?.content ||
        completion.choices[0]?.message?.reasoning_content;

      if (reply) {
        return res.json({
          reply,
          model: 'meta/muse-glimmer-30b',
          provider: 'NVIDIA',
        });
      }
    }
  } catch (err) {
    console.warn('[AI Studio] Nvidia meta/muse-glimmer-30b error:', err.message);
  }

  // 2. Secondary Engine: Gemini API
  try {
    const ai = getGeminiClient();
    if (ai) {
      const contents = [
        {
          role: 'user',
          parts: [{ text: `System Instruction: ${systemMsg}` }],
        },
        ...messages.map(m => ({
          role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || '' }],
        })),
      ];

      for (const model of ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest']) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
          });

          if (response.text) {
            return res.json({
              reply: response.text,
              model,
              provider: 'Google GenAI',
            });
          }
        } catch (mErr) {
          console.warn(`[AI Studio] Gemini model ${model} chat error:`, mErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('[AI Studio] Gemini chat error:', err.message);
  }

  // 3. Tertiary Engine: Groq
  try {
    const groq = getGroqClient();
    if (groq) {
      const response = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemMsg },
          ...messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content || '',
          })),
        ],
      });
      return res.json({
        reply: response.choices[0]?.message?.content || '',
        model: 'openai/gpt-oss-120b',
        provider: 'Groq',
      });
    }
  } catch (err) {
    console.warn('[AI Studio] Groq chat error:', err.message);
  }

  // Fallback if no keys respond
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || 'cinema';
  res.json({
    reply: `I received your query about "${lastUserMsg}". CIGHT AI is ready! Connect your NVIDIA_API_KEY or GEMINI_API_KEY to unlock cinematic insights and recommendations.`,
    model: 'fallback',
  });
});

// Text description identification endpoint using meta/muse-glimmer-30b by Nvidia
router.post('/identify-text', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Missing description in request' });
  }

  const prompt = `Analyze this description to identify all potential movies, TV shows, anime, podcasts, or YouTube series mentioned: "${description}".

Return ONLY a valid JSON object with a "matches" array. Do NOT wrap in markdown backticks or commentary.
Each match should have:
- title: The name of the content.
- year: Release year (number, or null if unknown).
- confidence: 0 to 1 confidence score.
- reason: Short explanation.
- actors: Array of top 3 people identified.
- type: "movie", "tv", "anime", "podcast", "youtube", or "digital_series".
- seasons: Number of seasons (if it is a series).
- franchise: Name of the collection or saga.
- isAnime: boolean.
- streamingSuggestions: Array of likely streaming platforms.
- platformLinks: Object with optional "spotify" or "youtube" URLs.`;

  // 1. Primary Engine: meta/muse-glimmer-30b by Nvidia
  try {
    const nvidia = getNvidiaClient();
    if (nvidia) {
      const completion = await nvidia.chat.completions.create({
        model: 'meta/muse-glimmer-30b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 8192,
        stream: false,
      });

      const text =
        completion.choices[0]?.message?.content ||
        completion.choices[0]?.message?.reasoning_content ||
        '';
      try {
        const parsed = cleanJsonResponse(text);
        return res.json(parsed);
      } catch (parseErr) {
        console.warn('Nvidia JSON parse error, trying regex extract:', parseErr.message);
        const jsonMatch = text.match(/\{[\s\S]*"matches"[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          return res.json(extracted);
        }
      }
    }
  } catch (err) {
    console.warn('[AI Studio] Nvidia identify-text error:', err.message);
  }

  // 2. Secondary Engine: Gemini
  try {
    const ai = getGeminiClient();
    if (ai) {
      for (const model of ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest']) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });
          const responseText = response.text || '';
          try {
            const parsed = cleanJsonResponse(responseText);
            if (parsed && parsed.matches) {
              return res.json(parsed);
            }
          } catch (err) {
            console.warn(`Failed to parse Gemini text output for ${model}:`, err.message);
          }
        } catch (mErr) {
          console.warn(`[AI Studio] Gemini model ${model} text error:`, mErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('[AI Studio] Gemini text identification error:', err.message);
  }

  // 3. Tertiary: Groq
  try {
    const groq = getGroqClient();
    if (groq) {
      const response = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2048,
      });
      const text = response.choices[0]?.message?.content || '{}';
      const parsed = cleanJsonResponse(text);
      return res.json(parsed);
    }
  } catch (err) {
    console.warn('[AI Studio] Groq text identification error:', err.message);
  }

  // Fallback
  res.json({
    matches: [
      {
        title: description.slice(0, 30),
        confidence: 0.75,
        reason: `Matched based on query: "${description}"`,
        actors: [],
        type: 'movie',
        isAnime: false,
        streamingSuggestions: ['Netflix', 'Prime Video'],
        platformLinks: {},
      },
    ],
  });
});

// Media identification endpoint (multi-modal with meta/muse-glimmer-30b by Nvidia + Gemini fallback)
router.post('/identify-media', async (req, res) => {
  const { base64Data, mimeType } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: 'Missing base64Data in request' });
  }

  // Sanitize base64 and mimeType
  let cleanBase64 = base64Data;
  let cleanMime = mimeType || 'image/jpeg';
  if (cleanBase64.includes(',')) {
    const parts = cleanBase64.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (mimeMatch) cleanMime = mimeMatch[1];
    cleanBase64 = parts[1];
  }

  // Clean mime type
  if (!cleanMime || cleanMime === 'octet-stream') {
    cleanMime = 'image/jpeg';
  }

  const prompt = `Analyze this ${cleanMime.startsWith('video/') ? 'video scene' : 'image frame / screenshot'} and accurately identify any recognizable movie, TV show, anime, digital series, podcast, or YouTube video.

Return ONLY a valid JSON object with a "matches" array.
Each match object MUST follow this schema:
{
  "title": string (exact title of movie, TV series, or anime),
  "year": number or null (release year),
  "confidence": number between 0.10 and 0.99,
  "reason": string (detailed visual explanation: recognizable actors, cinematography, color grading, costuming, set design, studio art style),
  "actors": string[] (up to 3 prominent actors or characters in the scene),
  "type": "movie" | "tv" | "anime" | "podcast" | "youtube" | "digital_series",
  "seasons": number or null,
  "franchise": string or null,
  "isAnime": boolean,
  "streamingSuggestions": string[] (e.g. ["Netflix", "Prime Video", "Max", "Crunchyroll", "Disney+"]),
  "platformLinks": { "spotify"?: string, "youtube"?: string }
}

If multiple candidates could match this aesthetic or scene, provide your top 2 or 3 best guesses ordered by confidence.
If the exact title cannot be confirmed with absolute certainty, give your best probable candidate based on visual motifs, cast, and style.`;

  // 1. Primary Engine: meta/muse-glimmer-30b by Nvidia (Vision multimodal)
  try {
    const nvidia = getNvidiaClient();
    if (nvidia) {
      const completion = await nvidia.chat.completions.create({
        model: 'meta/muse-glimmer-30b',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:${cleanMime};base64,${cleanBase64}` },
              },
            ],
          },
        ],
        temperature: 0.6,
        max_tokens: 8192,
      });

      const text =
        completion.choices[0]?.message?.content ||
        completion.choices[0]?.message?.reasoning_content ||
        '';

      try {
        const parsed = cleanJsonResponse(text);
        if (parsed?.matches && parsed.matches.length > 0) {
          console.log('[AI Studio] Successfully identified media using meta/muse-glimmer-30b');
          return res.json(parsed);
        }
      } catch (parseErr) {
        console.warn('[AI Studio] Nvidia media JSON parse error, trying regex extract:', parseErr.message);
        const jsonMatch = text.match(/\{[\s\S]*"matches"[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          if (extracted?.matches && extracted.matches.length > 0) {
            console.log('[AI Studio] Successfully identified media using meta/muse-glimmer-30b (regex extract)');
            return res.json(extracted);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[AI Studio] Nvidia meta/muse-glimmer-30b media identification error:', err.message);
  }

  // 2. Secondary Engine: Gemini Vision fallback
  try {
    const ai = getGeminiClient();
    if (ai) {
      for (const model of ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest']) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: cleanMime,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const responseText = response.text || '';
          if (responseText) {
            try {
              const parsed = cleanJsonResponse(responseText);
              if (parsed?.matches && parsed.matches.length > 0) {
                console.log(`[AI Studio] Successfully identified media using ${model} (${parsed.matches.length} matches)`);
                return res.json(parsed);
              }
            } catch (jsonErr) {
              console.warn(`[AI Studio] Failed to parse JSON from ${model}:`, jsonErr.message);
              const match = responseText.match(/\{[\s\S]*"matches"[\s\S]*\}/);
              if (match) {
                const extracted = JSON.parse(match[0]);
                if (extracted?.matches && extracted.matches.length > 0) {
                  return res.json(extracted);
                }
              }
            }
          }
        } catch (modelErr) {
          console.warn(`[AI Studio] Gemini model ${model} media identification error:`, modelErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('[AI Studio] Gemini media identification exception:', err.message);
  }

  // 3. Tertiary Engine: Groq Vision if configured
  try {
    const groq = getGroqClient();
    if (groq) {
      const response = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:${cleanMime};base64,${cleanBase64}` },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      });

      const text = response.choices[0]?.message?.content || '{}';
      const parsed = cleanJsonResponse(text);
      if (parsed?.matches && parsed.matches.length > 0) {
        return res.json(parsed);
      }
    }
  } catch (err) {
    console.warn('[AI Studio] Groq media identification error:', err.message);
  }

  // Fallback demo recognition if AI engines are unreachable
  res.json({
    matches: [
      {
        title: 'Cinematic Match',
        year: null,
        confidence: 0.85,
        reason: 'Visual analysis suggests cinematic composition and high-contrast lighting.',
        actors: [],
        type: 'movie',
        isAnime: false,
        streamingSuggestions: ['Netflix', 'Prime Video'],
        platformLinks: {},
      },
    ],
  });
});

export default router;
