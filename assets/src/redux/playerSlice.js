import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentTrack: null,
  isPlaying: false,
  queue: [],
  recentlyPlayed: [],
  position: 0,
  duration: 0,
};

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setCurrentTrack: (state, action) => {
      state.currentTrack = action.payload;
      state.position = 0;
    },
    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setQueue: (state, action) => {
      state.queue = action.payload;
    },
    addToQueue: (state, action) => {
      state.queue = [...state.queue, action.payload];
    },
    playNext: (state) => {
      if (!state.currentTrack || state.queue.length === 0) return;
      const currentIndex = state.queue.findIndex(
        (t) => t._id === state.currentTrack._id
      );
      const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
      if (nextIndex < state.queue.length) {
        state.currentTrack = state.queue[nextIndex];
        state.position = 0;
        state.isPlaying = true;
      }
    },
    playPrevious: (state) => {
      if (!state.currentTrack || state.queue.length === 0) return;
      const currentIndex = state.queue.findIndex(
        (t) => t._id === state.currentTrack._id
      );
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
      if (state.queue[prevIndex]) {
        state.currentTrack = state.queue[prevIndex];
        state.position = 0;
        state.isPlaying = true;
      }
    },
    setPosition: (state, action) => {
      state.position = action.payload;
    },
    setDuration: (state, action) => {
      state.duration = action.payload;
    },
    addRecentlyPlayed: (state, action) => {
      const exists = state.recentlyPlayed.find(
        (t) => t._id === action.payload._id
      );
      if (!exists) {
        state.recentlyPlayed = [action.payload, ...state.recentlyPlayed].slice(
          0,
          20
        );
      }
    },
  },
});

export const {
  setCurrentTrack,
  setIsPlaying,
  setQueue,
  addToQueue,
  playNext,
  playPrevious,
  setPosition,
  setDuration,
  addRecentlyPlayed,
} = playerSlice.actions;
export default playerSlice.reducer;
