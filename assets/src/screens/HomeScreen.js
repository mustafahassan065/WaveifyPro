import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { useDispatch } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import {
  fetchFeatured,
  fetchNewReleases,
  fetchTrending,
  fetchRecommended,
  fetchPlaylists,
  searchSongs,
} from "../services/api";
import SongCard from "../components/SongCard";
import {
  setCurrentTrack,
  setIsPlaying,
  setQueue,
  addRecentlyPlayed,
} from "../redux/playerSlice";

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const fallbackFeatured = [
    {
      _id: "f1",
      title: "SoundHelix Song 1",
      artist: "SoundHelix",
      thumbnail:
        "https://dummyimage.com/600x600/0a1c2b/1db954&text=SoundHelix+1",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
      _id: "f2",
      title: "SoundHelix Song 2",
      artist: "SoundHelix",
      thumbnail:
        "https://dummyimage.com/600x600/0a1c2b/1db954&text=SoundHelix+2",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
  ];

  const fallbackNew = [
    {
      _id: "n1",
      title: "SoundHelix Song 3",
      artist: "SoundHelix",
      thumbnail:
        "https://dummyimage.com/600x600/0a1c2b/1db954&text=SoundHelix+3",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
    {
      _id: "n2",
      title: "SoundHelix Song 4",
      artist: "SoundHelix",
      thumbnail:
        "https://dummyimage.com/600x600/0a1c2b/1db954&text=SoundHelix+4",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    },
  ];

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const [
        featuredData,
        newData,
        trendingData,
        recommendedData,
        playlistData,
      ] = await Promise.all([
        fetchFeatured(),
        fetchNewReleases(),
        fetchTrending(),
        fetchRecommended(),
        fetchPlaylists(),
      ]);
      setFeatured(featuredData.length ? featuredData : fallbackFeatured);
      setNewReleases(newData.length ? newData : fallbackNew);
      setTrending(trendingData.length ? trendingData : fallbackFeatured);
      setRecommended(recommendedData.length ? recommendedData : fallbackNew);
      setPlaylists(playlistData);
      await handleSearch("chill");
    } catch (error) {
      console.error("Bootstrap failed", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async (text) => {
    if (!text) {
      setSongs([]);
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const results = await searchSongs(text);
      if (results && results.length > 0) {
        setSongs(results);
        setSuggestions(results.slice(0, 5)); // Show top 5 as suggestions
      } else {
        setSongs([]);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Search failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const onPlay = (song, list = songs) => {
    dispatch(setCurrentTrack(song));
    dispatch(setIsPlaying(true));
    dispatch(setQueue(list && list.length ? list : [song]));
    dispatch(addRecentlyPlayed(song));
    navigation.navigate("Player");
  };

  const renderSection = (title, data = []) => {
    if (!data.length) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <SongCard
              song={item}
              onPlay={() => onPlay(item, data)}
              isHorizontal
            />
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>
    );
  };

  return (
    <LinearGradient colors={["#121212", "#000000"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <Text style={styles.greeting}>Good Evening</Text>
          <Text style={styles.header}>Waveify</Text>
        </View>

        <TextInput
          style={[styles.searchBar, searchFocused && styles.searchBarFocused]}
          placeholder="Search songs, artists..."
          placeholderTextColor="#888"
          value={query}
          selectionColor="#1DB954"
          underlineColorAndroid="transparent"
          onChangeText={(text) => {
            setQuery(text);
            handleSearch(text);
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />

        {query.length > 0 && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => {
                    setQuery(item.title);
                    onPlay(item, suggestions);
                  }}
                >
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.suggestionThumbnail}
                  />
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionTitle}>{item.title}</Text>
                    <Text style={styles.suggestionArtist}>{item.artist}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <FlatList
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={bootstrap}
              tintColor="#1DB954"
            />
          }
          ListHeaderComponent={
            <>
              {renderSection("Featured", featured)}
              {renderSection("Trending Now", trending)}
              {renderSection("New Releases", newReleases)}
              {renderSection("For You", recommended)}
              {playlists.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Playlists</Text>
                  <FlatList
                    horizontal
                    data={playlists}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => {
                      const lead = item.songs?.[0];
                      const placeholder = {
                        title: item.name,
                        artist: `${item.songs?.length || 0} tracks`,
                        thumbnail:
                          "https://dummyimage.com/600x600/111827/1db954&text=Waveify+Playlist",
                        url:
                          lead?.url ||
                          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                      };
                      return (
                        <SongCard
                          song={
                            lead
                              ? {
                                  ...lead,
                                  title: item.name,
                                  artist: `${item.songs.length} tracks`,
                                }
                              : placeholder
                          }
                          onPlay={() => {
                            if (lead) onPlay(lead, item.songs);
                          }}
                          isHorizontal
                        />
                      );
                    }}
                    showsHorizontalScrollIndicator={false}
                  />
                </View>
              )}
              {songs.length > 0 && (
                <Text style={styles.sectionTitle}>Search Results</Text>
              )}
            </>
          }
          data={songs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <SongCard song={item} onPlay={() => onPlay(item, songs)} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loading ? <ActivityIndicator color="#1DB954" /> : null
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 18, color: "#ccc" },
  header: { fontSize: 28, fontWeight: "bold", color: "#1DB954" },
  searchBar: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#fff",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "transparent",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  searchBarFocused: {
    borderColor: "#1DB954",
    shadowColor: "#1DB954",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  suggestionsContainer: {
    backgroundColor: "#333",
    borderRadius: 8,
    marginBottom: 20,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#444",
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#555",
  },
  suggestionThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
  },
  suggestionInfo: { flex: 1 },
  suggestionTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  suggestionArtist: { color: "#bbb", fontSize: 14 },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  list: { paddingBottom: 100 },
});

export default HomeScreen;
