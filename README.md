# CIGHT

AI-powered entertainment recognition and discovery platform. Identify movies and TV shows from screenshots and clips instantly.

## Features

- **Trending Movies**: Discover what's popular right now.
- **AI Scanner**: Upload screenshots or clips to identify movies using Gemini AI.
- **Anime Recognition**: Specialized support for anime frames via Trace.moe and AniList.
- **Watch Providers**: Real-time information on where to stream identified content legally.
- **AI Expert**: Talk to our specialized movie/anime agent for recommendations and trivia.
- **Library**: Keep track of movies and shows you want to watch.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Motion
- **Backend/Storage**: Firebase (Firestore, Auth)
- **AI**: Google Gemini 2.5 Flash (Recognition & Chat)
- **Data Sources**:
  - **TMDB API**: Global movie/TV metadata and watch providers.
  - **AniList API**: Detailed anime metadata and character info.
  - **Trace.moe API**: Frame-accurate anime identification.

## Setup

### Prerequisites

- Node.js 18+
- Firebase project with Firestore and Authentication enabled
- Google Gemini API key
- TMDB API key

### Installation

1. Clone the repository:
   ```
   git clone <repo-url>
   cd Cight
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up Firebase:
   - Copy `firebase-applet-config.example.json` to `firebase-applet-config.json`
   - Fill in your Firebase project credentials

4. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit `.env` and add your API keys:
   - `GEMINI_API_KEY` — Get from [Google AI Studio](https://aistudio.google.com/apikey)
   - `VITE_TMDB_API_KEY` — Get from [TMDB](https://www.themoviedb.org/settings/api)

### Development

```
npm run dev
```

### Production Build

```
npm run build
```
The build output is in the `dist/` directory. Deploy to any static host (Vercel, Netlify, Cloudflare Pages, Nginx, etc.). Ensure your host is configured to serve `index.html` for all routes (SPA fallback).
