# CIGHT

AI-powered entertainment recognition and discovery platform. Identify movies and TV shows from screenshots and clips instantly.

## Live Demo

[Visit Live Demo](https://cight-257251079622.us-west1.run.app)

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
- **AI**: Google Gemini 1.5 Flash (Recognition & Chat)
- **Data Sources**:
  - **TMDB API**: Global movie/TV metadata and watch providers.
  - **AniList API**: Detailed anime metadata and character info.
  - **Trace.moe API**: Frame-accurate anime identification.

## Setup Requirements

To use the movie discovery features, you must provide a TMDB API Key.

1. Get an API key from [The Movie Database (TMDB)](https://www.themoviedb.org/documentation/api).
2. Open the **Settings** menu in the AI Studio editor.
3. Add a new secret with the key `VITE_TMDB_API_KEY` and your actual API key as the value.

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```
