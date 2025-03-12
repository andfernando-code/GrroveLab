import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define the types
interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  genres: string;
  createdAt: Date;
}

// Assuming you have a RootStackParamList defined elsewhere in your app
// If not, you should create one
type RootStackParamList = {
  Home: undefined;
  AddSong: undefined;
  // Add other screens as needed
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AddSong = () => {
  const navigation = useNavigation<NavigationProp>();

  const [bandId, setBandId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [genres, setGenres] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    const fetchBandId = async () => {
      try {
        const storedBandName = await AsyncStorage.getItem('bandName');
        if (storedBandName) {
          const bandQuery = query(collection(db, "bands"), where("bandName", "==", storedBandName));
          const bandSnapshot = await getDocs(bandQuery);

          if (!bandSnapshot.empty) {
            const bandDoc = bandSnapshot.docs[0];
            setBandId(bandDoc.id);
          }
        }
      } catch (error) {
        console.error("Error fetching band ID:", error);
      }
    };

    fetchBandId();
  }, []);

  useEffect(() => {
    if (bandId) {
      fetchSongs();
    }
  }, [bandId]);

  // 🔄 Fetch all songs of the band
  const fetchSongs = async () => {
    try {
      if (!bandId) return;

      const songsQuery = collection(db, `bands/${bandId}/songs`);
      const songsSnapshot = await getDocs(songsQuery);

      const songList = songsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Song[];

      setSongs(songList);
    } catch (error) {
      console.error("Error fetching songs:", error);
    }
  };

  const handleAddSong = async () => {
    if (!title || !artist || !duration || !genres) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    if (!bandId) {
      Alert.alert("Error", "Band ID not found. Try again later.");
      return;
    }

    try {
      setLoading(true);

      const newSong = {
        title,
        artist,
        duration,
        genres,
        createdAt: new Date(),
      };

      await addDoc(collection(db, `bands/${bandId}/songs`), newSong);

      Alert.alert("Success", "Song added successfully!");
      setTitle('');
      setArtist('');
      setDuration('');
      setGenres('');

      fetchSongs();
    } catch (error) {
      console.error("Error adding song:", error);
      Alert.alert("Error", "Failed to add song");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    Alert.alert("Confirm", "Are you sure you want to remove this song?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            if (!bandId) {
              Alert.alert("Error", "Band ID not found");
              return;
            }
            await deleteDoc(doc(db, `bands/${bandId}/songs`, songId));
            Alert.alert("Success", "Song removed successfully!");
            fetchSongs();
          } catch (error) {
            console.error("Error deleting song:", error);
            Alert.alert("Error", "Failed to remove song");
          }
        },
      },
    ]);
  };

  const renderSongItem = ({ item }: { item: Song }) => (
    <View style={styles.songItem}>
      <View>
        <Text style={styles.songText}>{item.title} - {item.artist}</Text>
        <Text style={{ fontSize: 14, color: 'gray' }}>{item.duration} | {item.genres}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteSong(item.id)} style={styles.deleteButton}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: "center" }}>Manage Songs</Text>

      {/* 🎵 Add Song Form */}
      <View style={{ alignItems: "center" }}>
        <TextInput placeholder="Song Title" value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor="gray" />
        <TextInput placeholder="Artist" value={artist} onChangeText={setArtist} style={styles.input} placeholderTextColor="gray" />
        <TextInput placeholder="Duration (e.g. 3:45)" value={duration} onChangeText={setDuration} style={styles.input} keyboardType="numeric" placeholderTextColor="gray" />
        <TextInput placeholder="Genres (comma-separated)" value={genres} onChangeText={setGenres} style={styles.input} placeholderTextColor="gray" />

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Add Song" onPress={handleAddSong} />
        )}
      </View>

      <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 30, marginBottom: 10 }}>Songs List</Text>

      {/* 🎵 Display Song List */}
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderSongItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 50,
    borderColor: '#000',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  songItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  songText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 5,
    borderRadius: 5,
  },
});

export default AddSong;