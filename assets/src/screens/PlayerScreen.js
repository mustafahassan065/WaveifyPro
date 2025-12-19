import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  setCurrentTrack,
  setIsPlaying,
  setPosition,
  setDuration,
  playNext,
  playPrevious,
  addRecentlyPlayed,
  setQueue,
} from "../redux/playerSlice";
import { fetchRelated } from "../services/api";

const PlayerScreen = () => {
  const { currentTrack, isPlaying, queue, position, duration } = useSelector(
    (state) => state.player
  );
  const dispatch = useDispatch();
  const [sound, setSound] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const cacheRef = useRef(new Map());
  const [relatedTracks, setRelatedTracks] = useState([]);
  const queueRef = useRef(queue);
  const currentTrackRef = useRef(currentTrack);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
  }, []);

  useEffect(() => {
    if (currentTrack) {
      loadSound(currentTrack);
      seedRecommendations(currentTrack);
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [currentTrack]);

  useEffect(() => {
    if (sound) {
      if (isPlaying) {
        sound.playAsync();
      } else {
        sound.pauseAsync();
      }
    }
  }, [isPlaying, sound]);

  const identifyTrack = (track) =>
    track?._id ||
    track?.sourceId ||
    `${track?.title}-${track?.artist}-${track?.url}`;

  const appendUnique = (base = [], extras = []) => {
    const seen = new Set();
    const merged = [];
    base.filter(Boolean).forEach((item) => {
      const id = identifyTrack(item);
      if (!id || seen.has(id)) return;
      seen.add(id);
      merged.push(item);
    });
    extras.filter(Boolean).forEach((item) => {
      const id = identifyTrack(item);
      if (!id || seen.has(id)) return;
      seen.add(id);
      merged.push(item);
    });
    return merged;
  };

  const buildSeed = (track) =>
    track?.artist || track?.title || track?.album || "mix";

  const extendQueueWith = (extras = []) => {
    if (!extras.length) return false;
    const nextQueue = appendUnique(queueRef.current, extras);
    if (nextQueue.length === queueRef.current.length) return false;
    queueRef.current = nextQueue;
    dispatch(setQueue(nextQueue));
    return true;
  };

  const seedRecommendations = async (track) => {
    if (!track) return;
    const recs = await fetchRelated(buildSeed(track));
    setRelatedTracks(recs);

    let snapshot = queueRef.current;
    const containsTrack = snapshot.some(
      (item) => identifyTrack(item) === identifyTrack(track)
    );
    if (!snapshot.length || !containsTrack) {
      snapshot = appendUnique([track], snapshot);
      queueRef.current = snapshot;
      dispatch(setQueue(snapshot));
    }

    if (snapshot.length <= 1) {
      extendQueueWith(recs);
    }
  };

  const hydrateQueueIfNeeded = async () => {
    let extras = relatedTracks.filter(
      (item) =>
        identifyTrack(item) &&
        !queueRef.current.some(
          (queued) => identifyTrack(queued) === identifyTrack(item)
        )
    );

    if (!extras.length) {
      extras = await fetchRelated(buildSeed(currentTrackRef.current));
      setRelatedTracks(extras);
    }

    return extendQueueWith(extras);
  };

  const continueAfterTrack = async (finishedTrack) => {
    const snapshot = queueRef.current;
    const finishedId = identifyTrack(finishedTrack);
    const finishedIndex = snapshot.findIndex(
      (item) => identifyTrack(item) === finishedId
    );
    const hasQueuedNext =
      finishedIndex >= 0 && finishedIndex < snapshot.length - 1;

    if (hasQueuedNext) {
      dispatch(playNext());
      return;
    }

    const extended = await hydrateQueueIfNeeded();
    if (extended) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => dispatch(playNext()));
      } else {
        setTimeout(() => dispatch(playNext()), 0);
      }
    } else {
      dispatch(setIsPlaying(false));
    }
  };

  const cacheAudio = async (uri) => {
    if (cacheRef.current.has(uri)) return cacheRef.current.get(uri);
    try {
      const fileName = uri.split("/").pop();
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        await FileSystem.downloadAsync(uri, fileUri);
      }
      cacheRef.current.set(uri, fileUri);
      return fileUri;
    } catch (err) {
      console.warn("Cache failed, streaming remote", err.message);
      return uri;
    }
  };

  const loadSound = async (track) => {
    if (!track) return;
    if (sound) await sound.unloadAsync();

    setIsBuffering(true);
    const uri = await cacheAudio(track.url);

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      (status) => {
        if (!status.isLoaded) return;
        dispatch(setDuration((status.durationMillis || 0) / 1000));
        dispatch(setPosition((status.positionMillis || 0) / 1000));
        setIsBuffering(status.isBuffering);
        if (status.didJustFinish) {
          dispatch(addRecentlyPlayed(track));
          continueAfterTrack(track);
        }
      }
    );
    setSound(newSound);
    setIsBuffering(false);
  };

  const togglePlayPause = () => {
    dispatch(setIsPlaying(!isPlaying));
  };

  const onSeekComplete = async (value) => {
    if (!sound) return;
    await sound.setPositionAsync(value * 1000);
    dispatch(setPosition(value));
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const currentIndex = queue.findIndex(
    (t) => identifyTrack(t) === identifyTrack(currentTrack)
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;

  const handlePlayFromRecommendations = (track) => {
    if (!track) return;
    const filteredQueue = queueRef.current.filter(
      (item) => identifyTrack(item) !== identifyTrack(track)
    );
    const reordered = appendUnique([track, ...filteredQueue], relatedTracks);
    queueRef.current = reordered;
    dispatch(setQueue(reordered));
    dispatch(setCurrentTrack(track));
    dispatch(setIsPlaying(true));
  };

  if (!currentTrack)
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No Track Playing</Text>
      </View>
    );

  return (
    <LinearGradient
      colors={["#4c669f", "#3b5998", "#192f6a"]}
      style={styles.container}
    >
      <Image source={{ uri: currentTrack.thumbnail }} style={styles.artwork} />
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{currentTrack.title}</Text>
        <Text style={styles.artist}>{currentTrack.artist}</Text>
      </View>

      <View style={styles.sliderRow}>
        <Slider
          value={position}
          minimumValue={0}
          maximumValue={duration || 1}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#5b6470"
          thumbTintColor="#1DB954"
          onSlidingComplete={onSeekComplete}
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => hasPrev && dispatch(playPrevious())}
          disabled={!hasPrev}
        >
          <Ionicons
            name="play-skip-back"
            size={40}
            color={hasPrev ? "#fff" : "#555"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={50}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => hasNext && dispatch(playNext())}
          disabled={!hasNext}
        >
          <Ionicons
            name="play-skip-forward"
            size={40}
            color={hasNext ? "#fff" : "#555"}
          />
        </TouchableOpacity>
      </View>

      {isBuffering && (
        <ActivityIndicator color="#1DB954" style={styles.buffer} />
      )}

      {relatedTracks.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>Recommended</Text>
          <FlatList
            data={relatedTracks}
            horizontal
            keyExtractor={(item) => identifyTrack(item)}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.relatedCard}
                onPress={() => handlePlayFromRecommendations(item)}
              >
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.relatedThumb}
                />
                <Text style={styles.relatedName} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.relatedArtist} numberOfLines={1}>
                  {item.artist}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  artwork: { width: 300, height: 300, borderRadius: 10, marginBottom: 30 },
  infoContainer: { alignItems: "center", marginBottom: 50 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  artist: { fontSize: 18, color: "#ddd", marginTop: 10 },
  sliderRow: { width: "90%", marginBottom: 20 },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  time: { color: "#ccc", fontSize: 12 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    width: "70%",
    justifyContent: "space-between",
  },
  playButton: { backgroundColor: "#1DB954", padding: 20, borderRadius: 50 },
  text: { color: "#fff" },
  buffer: { marginTop: 16 },
  relatedSection: { width: "100%", marginTop: 30, paddingHorizontal: 20 },
  relatedTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  relatedCard: {
    width: 140,
    marginRight: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  relatedThumb: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  relatedName: { color: "#fff", fontWeight: "600" },
  relatedArtist: { color: "#bbb", fontSize: 12 },
});

export default PlayerScreen;
