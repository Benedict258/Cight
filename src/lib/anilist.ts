
export async function fetchAniList(query: string, variables: Record<string, any> = {}) {
  const url = 'https://graphql.anilist.co';
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      variables: variables
    })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.errors?.[0]?.message || 'AniList Error');
    return data.data;
  } catch (error) {
    console.error('AniList Fetch Error:', error);
    throw error;
  }
}

export async function searchAnime(search: string) {
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          type
          format
          status
          description
          startDate {
            year
          }
          episodes
          duration
          chapters
          volumes
          genres
          averageScore
          bannerImage
          coverImage {
            extraLarge
          }
        }
      }
    }
  `;
  return fetchAniList(query, { search });
}
