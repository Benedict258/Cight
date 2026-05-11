# CIGHT

AI-powered entertainment recognition and discovery platform. Identify movies and TV shows from screenshots and clips instantly.

## Features

- **Trending Movies**: Discover what's popular right now.
- **AI Scanner**: Upload screenshots or clips to identify movies using Gemini AI.
- **AI Chat**: Talk to our movie expert AI for recommendations and trivia.
- **Watchlist**: Keep track of movies you want to see.
- **Deep Metadata**: Powered by TMDB for accurate movie information.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Motion
- **Backend/Storage**: Firebase (Firestore, Auth)
- **AI**: Google Gemini Pro & Flash
- **Data Source**: TMDB API

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
