const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

async function fetchTMDB(endpoint: string, params: Record<string, string> = {}) {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'MY_TMDB_API_KEY') {
    throw new Error('MISSING_TMDB_KEY');
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  
  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.status_message || `TMDB error: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.message === 'MISSING_TMDB_KEY') throw error;
    console.error('TMDB Fetch Error:', error);
    throw error;
  }
}

export async function getTrendingMovies() {
  return fetchTMDB('/trending/movie/day');
}

export async function searchMovie(query: string, year?: number) {
  const params: Record<string, string> = { query };
  if (year) params.year = year.toString();
  return fetchTMDB('/search/movie', params);
}

export async function getMovieDetails(movieId: string) {
  return fetchTMDB(`/movie/${movieId}`, { append_to_response: 'videos,credits,recommendations' });
}

export async function getMovieCredits(movieId: string) {
  return fetchTMDB(`/movie/${movieId}/credits`);
}
