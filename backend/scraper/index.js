const axios = require("axios");

// NOTE:
// Spotify Web API no longer returns usable preview URLs in this environment
// (preview_url is always null), and several /browse endpoints are 404.
// To keep the app playable (30s previews), we use Apple's iTunes Search API
// + Apple Marketing Tools RSS as a “trending” source.

const DEFAULT_LIMIT = 20;
const DEFAULT_COUNTRY = (process.env.MUSIC_COUNTRY || "us").toLowerCase();

const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";
const ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup";
const APPLE_RSS_BASE = "https://rss.applemarketingtools.com/api/v2";

const upscaleArtwork = (url) => {
  if (!url) return url;
  return url.replace(/\d+x\d+bb\./, "600x600bb.");
};

const formatItunesTrack = (track = {}) => ({
  title: track.trackName,
  artist: track.artistName,
  album: track.collectionName,
  duration: track.trackTimeMillis
    ? Math.round(track.trackTimeMillis / 1000)
    : undefined,
  thumbnail: upscaleArtwork(
    track.artworkUrl100 || track.artworkUrl60 || track.artworkUrl30
  ),
  url: track.previewUrl,
  source: "itunes",
  sourceId: track.trackId ? String(track.trackId) : undefined,
  release_date: track.releaseDate,
  genre: track.primaryGenreName,
  external_url: track.trackViewUrl,
});

const uniqById = (items = []) => {
  const seen = new Set();
  return items.filter((t) => {
    const id = t?.sourceId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const mapTracks = (tracks = []) =>
  uniqById(tracks.map(formatItunesTrack).filter((t) => t.url));

const itunesSearch = async (term, limit = DEFAULT_LIMIT) => {
  if (!term) return [];
  try {
    const { data } = await axios.get(ITUNES_SEARCH_URL, {
      params: {
        term,
        country: DEFAULT_COUNTRY,
        media: "music",
        entity: "song",
        limit,
      },
    });
    return mapTracks(data?.results || []);
  } catch (error) {
    console.warn(
      "iTunes search failed",
      error?.response?.status,
      error.message
    );
    return [];
  }
};

const itunesLookup = async (ids = []) => {
  const clean = ids.filter(Boolean).slice(0, 200);
  if (!clean.length) return [];
  try {
    const { data } = await axios.get(ITUNES_LOOKUP_URL, {
      params: {
        id: clean.join(","),
        country: DEFAULT_COUNTRY,
      },
    });
    return mapTracks(data?.results || []);
  } catch (error) {
    console.warn(
      "iTunes lookup failed",
      error?.response?.status,
      error.message
    );
    return [];
  }
};

const appleRssTopSongs = async (limit = 50) => {
  // most-played/50/songs.json
  try {
    const { data } = await axios.get(
      `${APPLE_RSS_BASE}/${DEFAULT_COUNTRY}/music/most-played/${limit}/songs.json`
    );
    const results = data?.feed?.results || [];
    return results.map((r) => r.id).filter(Boolean);
  } catch (error) {
    console.warn("Apple RSS failed", error?.response?.status, error.message);
    return [];
  }
};

const scrapeMusic = async (query) => itunesSearch(query, DEFAULT_LIMIT);

const getFeatured = async () => {
  // Use trending chart as “featured”.
  const ids = await appleRssTopSongs(50);
  const tracks = await itunesLookup(ids.slice(0, DEFAULT_LIMIT));
  if (tracks.length) return tracks;
  return itunesSearch("top hits", DEFAULT_LIMIT);
};

const getTrending = async () => {
  const ids = await appleRssTopSongs(50);
  const tracks = await itunesLookup(ids.slice(0, DEFAULT_LIMIT));
  return tracks.length ? tracks : await getFeatured();
};

const getNewReleases = async () => {
  // iTunes doesn't have a perfect “new releases” endpoint without RSS categories.
  // We use a search heuristic that returns playable previews.
  const tracks = await itunesSearch("new music", DEFAULT_LIMIT);
  return tracks.length ? tracks : await getFeatured();
};

const getRecommendations = async (seed) => {
  if (!seed) return itunesSearch("chill", DEFAULT_LIMIT);
  const tracks = await itunesSearch(seed, DEFAULT_LIMIT);
  return tracks.length ? tracks : await getFeatured();
};

module.exports = {
  scrapeMusic,
  getFeatured,
  getNewReleases,
  getTrending,
  getRecommendations,
};
