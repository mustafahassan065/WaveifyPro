const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(morgan("combined"));
app.use(cors());
app.use(express.json());

// Basic uptime check
app.get("/", (req, res) => {
  res.send("Waveify Server is running");
});

// Search + curation APIs
const {
  scrapeMusic,
  getFeatured,
  getNewReleases,
  getTrending,
  getRecommendations,
} = require("./scraper");

const withIds = (items, prefix) =>
  items.map((item, index) => ({
    _id: item.sourceId || `${prefix}-${index}`,
    ...item,
  }));

app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query)
    return res.status(400).json({ error: "Query parameter required" });

  try {
    const results = await scrapeMusic(query);
    res.json(withIds(results, `search-${query}`));
  } catch (error) {
    console.error("Search failed:", error.message);
    res.status(500).json({ error: "Scraping failed" });
  }
});

app.get("/api/featured", async (_req, res) => {
  try {
    const results = await getFeatured();
    res.json(withIds(results, "featured"));
  } catch (error) {
    console.error("Featured failed:", error.message);
    res.status(502).json({ error: "Upstream provider error" });
  }
});

app.get("/api/new", async (_req, res) => {
  try {
    const results = await getNewReleases();
    res.json(withIds(results, "new"));
  } catch (error) {
    console.error("New failed:", error.message);
    res.status(502).json({ error: "Upstream provider error" });
  }
});

app.get("/api/trending", async (_req, res) => {
  try {
    const results = await getTrending();
    res.json(withIds(results, "trending"));
  } catch (error) {
    console.error("Trending failed:", error.message);
    res.status(502).json({ error: "Upstream provider error" });
  }
});

app.get("/api/recommended", async (req, res) => {
  const seed = req.query.seed || req.query.mood || req.query.tag;
  try {
    const results = await getRecommendations(seed);
    res.json(withIds(results, `reco-${seed || "mix"}`));
  } catch (error) {
    console.error("Recommended failed:", error.message);
    res.status(502).json({ error: "Upstream provider error" });
  }
});

// Lightweight in-memory playlists to demonstrate CRUD without forcing Mongo setup
const playlists = [
  { id: "focus", name: "Focus Vibes", songs: [] },
  { id: "recent", name: "Recently Played", songs: [] },
];

app.get("/api/playlists", async (_req, res) => {
  try {
    const catalogue = await getTrending();
    const hydrated = playlists.map((pl, idx) => ({
      ...pl,
      _id: pl.id,
      songs: pl.songs.length ? pl.songs : catalogue.slice(idx * 2, idx * 2 + 2),
    }));
    res.json(hydrated);
  } catch (error) {
    console.error("Playlists failed:", error.message);
    res.status(502).json({ error: "Upstream provider error" });
  }
});

app.post("/api/playlists", (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Name is required" });
  const id =
    name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
  const playlist = { id, name, songs: [] };
  playlists.push(playlist);
  res.status(201).json({ _id: id, ...playlist });
});

app.post("/api/playlists/:id/tracks", (req, res) => {
  const { id } = req.params;
  const track = req.body;
  if (!track || !track.url)
    return res
      .status(400)
      .json({ error: "Track payload with url is required" });

  const playlist = playlists.find((p) => p.id === id);
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });

  const song = {
    _id: track._id || track.sourceId || Date.now().toString(36),
    ...track,
  };
  playlist.songs.push(song);
  res.status(201).json(song);
});

app.get("/api/related/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const results = await getRecommendations(id);
    res.json(results.slice(0, 5));
  } catch (error) {
    console.error("Related failed:", error.message);
    res.status(500).json({ error: "Failed to get related" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
