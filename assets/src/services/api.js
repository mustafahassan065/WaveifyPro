import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

const guessBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL)
    return `${process.env.EXPO_PUBLIC_API_URL}/api`;

  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:5000/api`;
  }

  const host = Constants.expoConfig?.hostUri || "";
  if (host.includes("localhost")) return "http://localhost:5000/api";
  if (host) {
    const hostname = host.split(":")[0];
    return `http://${hostname}:5000/api`;
  }
  if (Platform.OS === "android") return "http://10.0.2.2:5000/api";
  return "http://localhost:5000/api";
};

const BASE_URL = guessBaseUrl();

export const searchSongs = async (query) => {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    console.error("Error searching songs:", error.message);
    return [];
  }
};

export const fetchFeatured = async () => {
  try {
    const { data } = await axios.get(`${BASE_URL}/featured`);
    return data;
  } catch (error) {
    console.error("Error fetching featured:", error.message);
    return [];
  }
};

export const fetchNewReleases = async () => {
  try {
    const { data } = await axios.get(`${BASE_URL}/new`);
    return data;
  } catch (error) {
    console.error("Error fetching new releases:", error.message);
    return [];
  }
};

export const fetchTrending = async () => {
  try {
    const { data } = await axios.get(`${BASE_URL}/trending`);
    return data;
  } catch (error) {
    console.error("Error fetching trending:", error.message);
    return [];
  }
};

export const fetchRecommended = async (seed) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/recommended`, {
      params: seed ? { seed } : undefined,
    });
    return data;
  } catch (error) {
    console.error("Error fetching recommended:", error.message);
    return [];
  }
};

export const fetchPlaylists = async () => {
  try {
    const { data } = await axios.get(`${BASE_URL}/playlists`);
    return data;
  } catch (error) {
    console.error("Error fetching playlists:", error.message);
    return [];
  }
};

export const createPlaylist = async (name) => {
  const { data } = await axios.post(`${BASE_URL}/playlists`, { name });
  return data;
};

export const fetchRelated = async (id) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/related/${id}`);
    return data;
  } catch (error) {
    console.error("Error fetching related:", error.message);
    return [];
  }
};
