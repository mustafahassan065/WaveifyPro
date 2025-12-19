const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    album: { type: String },
    duration: { type: Number }, // in seconds
    thumbnail: { type: String },
    url: { type: String, required: true }, // Stream URL
    source: { type: String, default: 'scraper' },
    sourceId: { type: String }, // ID from the source website
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', songSchema);
