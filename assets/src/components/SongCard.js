import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

const SongCard = ({ song, onPlay, isHorizontal }) => {
    if (isHorizontal) {
        return (
            <TouchableOpacity style={styles.horizontalContainer} onPress={onPlay}>
                <Image source={{ uri: song.thumbnail }} style={styles.horizontalThumbnail} />
                <Text style={styles.horizontalTitle} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity style={styles.container} onPress={onPlay}>
            <Image source={{ uri: song.thumbnail }} style={styles.thumbnail} />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.artist}>{song.artist}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 8 },
    thumbnail: { width: 50, height: 50, borderRadius: 4 },
    info: { marginLeft: 15, flex: 1 },
    title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    // Horizontal Styles
    horizontalContainer: { marginRight: 15, width: 140 },
    horizontalThumbnail: { width: 140, height: 140, borderRadius: 8, marginBottom: 10 },
    horizontalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 5 },

    artist: { color: '#bbb', fontSize: 14 }
});

export default SongCard;
