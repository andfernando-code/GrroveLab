import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, Alert, ActivityIndicator, 
  FlatList, TouchableOpacity, StyleSheet, Modal, SafeAreaView, Image
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../FirebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Spotify API Configuration
const SPOTIFY_CLIENT_ID = '9a53355052d6425f8bce24ead037cee3'; // Replace with your Spotify Client ID
const SPOTIFY_CLIENT_SECRET = '0ee20861815743b9a3746f8bb3663b6b'; // Replace with your Spotify Client Secret

// Define the types
interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  tempo: string;
  genres: string;
  lyricsImageUrl?: string;
  createdAt: Date;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
}

interface SpotifyAudioFeatures {
  tempo: number;
}

type RootStackParamList = {
  Home: undefined;
  AddSong: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AddSong = () => {
  const navigation = useNavigation<NavigationProp>();

  const [bandId, setBandId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [tempo, setTempo] = useState<string>('');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  
  // Spotify state
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string>('');
  const [spotifySearchTerm, setSpotifySearchTerm] = useState<string>('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [spotifyLoading, setSpotifyLoading] = useState<boolean>(false);
  const [spotifyTrackLoading, setSpotifyTrackLoading] = useState<boolean>(false);
  
  // Lyrics state
  const [selectedLyricsImage, setSelectedLyricsImage] = useState<string | null>(null);
  
  // Dropdown state
  const [open, setOpen] = useState(false);
  const [genres, setGenres] = useState(null);
  const [genreItems, setGenreItems] = useState([
    { label: 'First Session', value: 'First Session'},
    { label: 'Second Session', value: 'Second Session'},
    { label: 'Dancing Session', value: 'Dancing Session'},
  ]);

  // Modal visibility states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [spotifyModalVisible, setSpotifyModalVisible] = useState(false);
  const [spotifyConfirmModalVisible, setSpotifyConfirmModalVisible] = useState(false);
  const [lyricsModalVisible, setLyricsModalVisible] = useState(false);
  const [viewLyricsModalVisible, setViewLyricsModalVisible] = useState(false);
  const [deleteLyricsModalVisible, setDeleteLyricsModalVisible] = useState(false);
  
  // Selected Spotify track state
  const [selectedSpotifyTrack, setSelectedSpotifyTrack] = useState<SpotifyTrack | null>(null);
  const [selectedTrackTempo, setSelectedTrackTempo] = useState<string>('');
  const [selectedTrackGenre, setSelectedTrackGenre] = useState(null);
  const [spotifyGenreOpen, setSpotifyGenreOpen] = useState(false);
  
  // Edit modal state
  const [editSongId, setEditSongId] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editArtist, setEditArtist] = useState<string>('');
  const [editDuration, setEditDuration] = useState<string>('');
  const [editTempo, setEditTempo] = useState<string>('');
  const [editGenres, setEditGenres] = useState(null);
  const [editDropdownOpen, setEditDropdownOpen] = useState(false);
  const [editLyricsImage, setEditLyricsImage] = useState<string | null>(null);

  // View lyrics state
  const [viewingLyricsUrl, setViewingLyricsUrl] = useState<string>('');
  const [songToDeleteLyrics, setSongToDeleteLyrics] = useState<Song | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [songs, setSongs] = useState<Song[]>([]);

  // Request camera roll permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload lyrics images.');
      }
    };
    requestPermissions();
  }, []);

  // Image picker functions - MODIFIED: Remove cropping
  const pickLyricsImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // CHANGED: Disable cropping
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedLyricsImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadLyricsImage = async (imageUri: string, songId: string): Promise<string | null> => {
    try {
      if (!bandId) return null;

      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const imageRef = ref(storage, `bands/${bandId}/songs/${songId}/lyrics.jpg`);
      await uploadBytes(imageRef, blob);
      
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading lyrics image:', error);
      Alert.alert('Error', 'Failed to upload lyrics image');
      return null;
    }
  };

  const deleteLyricsImage = async (songId: string) => {
    try {
      if (!bandId) return;
      
      const imageRef = ref(storage, `bands/${bandId}/songs/${songId}/lyrics.jpg`);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting lyrics image:', error);
    }
  };

  // MODIFIED: Add loading indicator for Spotify operations
  const getSpotifyAccessToken = async () => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: 'grant_type=client_credentials',
      });

      const data = await response.json();
      if (data.access_token) {
        setSpotifyAccessToken(data.access_token);
        return data.access_token;
      }
    } catch (error) {
      console.error('Error getting Spotify access token:', error);
      Alert.alert('Error', 'Failed to connect to Spotify');
    }
    return null;
  };

  const searchSpotifyTracks = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setSpotifyLoading(true);
    try {
      let token = spotifyAccessToken;
      if (!token) {
        token = await getSpotifyAccessToken();
        if (!token) return;
      }

      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.tracks && data.tracks.items) {
        setSpotifyResults(data.tracks.items);
      }
    } catch (error) {
      console.error('Error searching Spotify:', error);
      Alert.alert('Error', 'Failed to search Spotify');
    } finally {
      setSpotifyLoading(false);
    }
  };

  const getTrackAudioFeatures = async (trackId: string): Promise<number | null> => {
    try {
      let token = spotifyAccessToken;
      if (!token) {
        token = await getSpotifyAccessToken();
        if (!token) return null;
      }

      const response = await fetch(
        `https://api.spotify.com/v1/audio-features/${trackId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data: SpotifyAudioFeatures = await response.json();
      return data.tempo ? Math.round(data.tempo) : null;
    } catch (error) {
      console.error('Error getting audio features:', error);
      return null;
    }
  };

  const formatDuration = (durationMs: number): string => {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // MODIFIED: Remove lyrics fetching, add loading indicator
  const handleSelectSpotifyTrack = async (track: SpotifyTrack) => {
    setSpotifyTrackLoading(true);
    try {
      // Get tempo only
      const tempo = await getTrackAudioFeatures(track.id);
      
      setSelectedSpotifyTrack(track);
      setSelectedTrackTempo(tempo ? tempo.toString() : '');
      setSelectedTrackGenre(null);
      setSpotifyModalVisible(false);
      setSpotifyConfirmModalVisible(true);
    } catch (error) {
      console.error('Error getting track details:', error);
      Alert.alert('Error', 'Failed to get track details');
    } finally {
      setSpotifyTrackLoading(false);
    }
  };

  const handleAddSpotifySong = async () => {
    if (!selectedSpotifyTrack || !selectedTrackGenre) {
      Alert.alert("Error", "Please select a session for the song!");
      return;
    }

    if (!bandId) {
      Alert.alert("Error", "Band ID not found. Try again later.");
      return;
    }

    try {
      setLoading(true);

      // First, add the song to get the document ID
      const newSong = {
        title: selectedSpotifyTrack.name,
        artist: selectedSpotifyTrack.artists.map(artist => artist.name).join(', '),
        duration: formatDuration(selectedSpotifyTrack.duration_ms),
        tempo: selectedTrackTempo || 'Unknown',
        genres: selectedTrackGenre,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, `bands/${bandId}/songs`), newSong);

      // Handle lyrics image if selected
      let lyricsImageUrl = null;
      if (selectedLyricsImage) {
        const uploadedUrl = await uploadLyricsImage(selectedLyricsImage, docRef.id);
        if (uploadedUrl) {
          lyricsImageUrl = uploadedUrl;
        }
      }

      // Update the song with lyrics if available
      if (lyricsImageUrl) {
        await updateDoc(docRef, { lyricsImageUrl });
      }

      Alert.alert("Success", "Song added from Spotify successfully!");
      setSpotifyConfirmModalVisible(false);
      setSelectedSpotifyTrack(null);
      setSelectedTrackTempo('');
      setSelectedTrackGenre(null);
      setSelectedLyricsImage(null);

      fetchSongs();
    } catch (error) {
      console.error("Error adding Spotify song:", error);
      Alert.alert("Error", "Failed to add song from Spotify");
    } finally {
      setLoading(false);
    }
  };

  const openSpotifyModal = () => {
    setSpotifySearchTerm('');
    setSpotifyResults([]);
    setSpotifyModalVisible(true);
    if (!spotifyAccessToken) {
      getSpotifyAccessToken();
    }
  };

  const openLyricsModal = (songId: string) => {
    setEditSongId(songId);
    setEditLyricsImage(null);
    setLyricsModalVisible(true);
  };

  const handleAddLyricsImage = async () => {
    if (!editLyricsImage || !editSongId || !bandId) {
      Alert.alert("Error", "Please select an image first!");
      return;
    }

    try {
      setLoading(true);
      
      const uploadedUrl = await uploadLyricsImage(editLyricsImage, editSongId);
      if (uploadedUrl) {
        await updateDoc(doc(db, `bands/${bandId}/songs`, editSongId), {
          lyricsImageUrl: uploadedUrl
        });
        
        Alert.alert("Success", "Lyrics image added successfully!");
        setLyricsModalVisible(false);
        setEditLyricsImage(null);
        fetchSongs();
      }
    } catch (error) {
      console.error("Error adding lyrics image:", error);
      Alert.alert("Error", "Failed to add lyrics image");
    } finally {
      setLoading(false);
    }
  };

  const handleViewLyrics = (lyricsUrl: string) => {
    setViewingLyricsUrl(lyricsUrl);
    setViewLyricsModalVisible(true);
  };

  // NEW: Handle lyrics deletion
  const handleDeleteLyricsConfirm = (song: Song) => {
    setSongToDeleteLyrics(song);
    setDeleteLyricsModalVisible(true);
  };

  const handleDeleteLyricsImage = async () => {
    if (!songToDeleteLyrics || !bandId) return;

    try {
      setLoading(true);
      
      // Delete from storage
      await deleteLyricsImage(songToDeleteLyrics.id);
      
      // Update document to remove lyrics URL
      await updateDoc(doc(db, `bands/${bandId}/songs`, songToDeleteLyrics.id), {
        lyricsImageUrl: null
      });
      
      Alert.alert("Success", "Lyrics image deleted successfully!");
      setDeleteLyricsModalVisible(false);
      setSongToDeleteLyrics(null);
      fetchSongs();
    } catch (error) {
      console.error("Error deleting lyrics image:", error);
      Alert.alert("Error", "Failed to delete lyrics image");
    } finally {
      setLoading(false);
    }
  };

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

  // Filter songs when searchTerm or songs list changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSongs(songs);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      const filtered = songs.filter(song => 
        song.title.toLowerCase().includes(lowercasedSearch) || 
        song.artist.toLowerCase().includes(lowercasedSearch) ||
        song.genres.toLowerCase().includes(lowercasedSearch) ||
        song.tempo.toLowerCase().includes(lowercasedSearch)
      );
      setFilteredSongs(filtered);
    }
  }, [searchTerm, songs]);

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
      setFilteredSongs(songList);
    } catch (error) {
      console.error("Error fetching songs:", error);
    }
  };

  const handleAddSong = async () => {
    if (!title || !artist || !duration || !tempo || !genres) {
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
        tempo,
        genres,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, `bands/${bandId}/songs`), newSong);

      // Upload lyrics image if selected
      if (selectedLyricsImage) {
        const uploadedUrl = await uploadLyricsImage(selectedLyricsImage, docRef.id);
        if (uploadedUrl) {
          await updateDoc(docRef, { lyricsImageUrl: uploadedUrl });
        }
      }

      Alert.alert("Success", "Song added successfully!");
      setTitle('');
      setArtist('');
      setDuration('');
      setTempo('');
      setGenres(null);
      setSelectedLyricsImage(null);
      setAddModalVisible(false);

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
            
            // Delete lyrics image if exists
            await deleteLyricsImage(songId);
            
            // Delete song document
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

  const openEditModal = (song: Song) => {
    setEditSongId(song.id);
    setEditTitle(song.title);
    setEditArtist(song.artist);
    setEditDuration(song.duration);
    setEditTempo(song.tempo);
    setEditGenres(song.genres);
    setEditModalVisible(true);
  };

  const openAddModal = () => {
    setTitle('');
    setArtist('');
    setDuration('');
    setTempo('');
    setGenres(null);
    setSelectedLyricsImage(null);
    setAddModalVisible(true);
  };

  const handleUpdateSong = async () => {
    if (!editTitle || !editArtist || !editDuration || !editTempo || !editGenres) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    if (!bandId) {
      Alert.alert("Error", "Band ID not found. Try again later.");
      return;
    }

    try {
      setLoading(true);

      const updatedSong = {
        title: editTitle,
        artist: editArtist,
        duration: editDuration,
        tempo: editTempo,
        genres: editGenres,
      };

      await updateDoc(doc(db, `bands/${bandId}/songs`, editSongId), updatedSong);

      Alert.alert("Success", "Song updated successfully!");
      setEditModalVisible(false);
      fetchSongs();
    } catch (error) {
      console.error("Error updating song:", error);
      Alert.alert("Error", "Failed to update song");
    } finally {
      setLoading(false);
    }
  };

  // MODIFIED: Add delete lyrics button
  const renderSongItem = ({ item }: { item: Song }) => (
    <View style={styles.songItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.songText}>{item.title} - {item.artist}</Text>
        <Text style={{ fontSize: 14, color: 'gray' }}>
          {item.duration} | {item.tempo ? `${item.tempo} BPM | ` : ''}{item.genres}
        </Text>
        {item.lyricsImageUrl && (
          <View style={styles.lyricsButtonContainer}>
            <TouchableOpacity 
              onPress={() => handleViewLyrics(item.lyricsImageUrl!)}
              style={styles.lyricsButton}
            >
              <Feather name="file-text" size={14} color="#007AFF" />
              <Text style={styles.lyricsButtonText}>View Lyrics</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleDeleteLyricsConfirm(item)}
              style={styles.deleteLyricsButton}
            >
              <Feather name="trash-2" size={14} color="#f44336" />
              <Text style={styles.deleteLyricsButtonText}>Delete Lyrics</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.actionButtons}>
        {!item.lyricsImageUrl && (
          <TouchableOpacity 
            onPress={() => openLyricsModal(item.id)} 
            style={[styles.iconButton, styles.lyricsAddButton]}
          >
            <Feather name="file-plus" size={18} color="white" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={() => openEditModal(item)} 
          style={[styles.iconButton, styles.editButton]}
        >
          <Feather name="edit-2" size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleDeleteSong(item.id)} 
          style={[styles.iconButton, styles.deleteButton]}
        >
          <Feather name="trash-2" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // MODIFIED: Add loading indicator for track selection
  const renderSpotifyTrackItem = ({ item }: { item: SpotifyTrack }) => (
    <TouchableOpacity 
      style={styles.spotifyTrackItem}
      onPress={() => handleSelectSpotifyTrack(item)}
      disabled={spotifyTrackLoading}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.spotifyTrackTitle}>{item.name}</Text>
        <Text style={styles.spotifyTrackArtist}>
          {item.artists.map(artist => artist.name).join(', ')}
        </Text>
        <Text style={styles.spotifyTrackDuration}>
          {formatDuration(item.duration_ms)} | {item.album.name}
        </Text>
      </View>
      {spotifyTrackLoading ? (
        <ActivityIndicator color="#1DB954" size="small" />
      ) : (
        <Feather name="chevron-right" size={20} color="#1DB954" />
      )}
    </TouchableOpacity>
  );

  const handleSearchClear = () => {
    setSearchTerm('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>
        Songs List
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#888"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={handleSearchClear} style={styles.clearButton}>
              <Feather name="x" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredSongs.length === 0 ? (
        <View style={styles.emptySongsContainer}>
          {songs.length === 0 ? (
            <>
              <Feather name="music" size={60} color="#ccc" />
              <Text style={styles.emptySongsText}>No songs added yet</Text>
              <Text style={{ textAlign: 'center', color: '#888' }}>
                Tap the + button below to add your first song
              </Text>
            </>
          ) : (
            <>
              <Feather name="search" size={60} color="#ccc" />
              <Text style={styles.emptySongsText}>No songs match your search</Text>
              <Text style={{ textAlign: 'center', color: '#888' }}>
                Try different keywords or clear your search
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          renderItem={renderSongItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <Text style={styles.songCount}>
              {searchTerm ? `Found ${filteredSongs.length} ${filteredSongs.length === 1 ? 'song' : 'songs'}` : `Total Songs: ${songs.length}`}
            </Text>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Add Song Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Song</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            {/* Spotify Button */}
            <TouchableOpacity 
              style={styles.spotifyButton} 
              onPress={() => {
                setAddModalVisible(false);
                openSpotifyModal();
              }}
            >
              <Text style={styles.spotifyButtonText}>🎵 Add from Spotify</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <TextInput 
              placeholder="Song Title" 
              value={title} 
              onChangeText={setTitle} 
              style={styles.modalInput} 
              placeholderTextColor="gray" 
            />
            <TextInput 
              placeholder="Artist" 
              value={artist} 
              onChangeText={setArtist} 
              style={styles.modalInput} 
              placeholderTextColor="gray" 
            />
            <TextInput 
              placeholder="Duration (e.g. 3:45)" 
              value={duration} 
              onChangeText={setDuration} 
              style={styles.modalInput} 
              keyboardType="numeric" 
              placeholderTextColor="gray" 
            />
            <TextInput 
              placeholder="Tempo (BPM)" 
              value={tempo} 
              onChangeText={setTempo} 
              style={styles.modalInput} 
              keyboardType="numeric" 
              placeholderTextColor="gray" 
            />
            
            {/* Genre Dropdown */}
            <View style={{ width: '100%', zIndex: 1000 }}>
              <DropDownPicker
                open={open}
                value={genres}
                items={genreItems}
                setOpen={setOpen}
                setValue={setGenres}
                setItems={setGenreItems}
                placeholder="Select Session"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                textStyle={styles.dropdownText}
                placeholderStyle={styles.dropdownPlaceholder}
              />
            </View>

            {/* Lyrics Image Selection */}
            <TouchableOpacity 
              style={styles.lyricsImageButton}
              onPress={pickLyricsImage}
            >
              <Feather name="image" size={16} color="#007AFF" />
              <Text style={styles.lyricsImageButtonText}>
                {selectedLyricsImage ? 'Lyrics Image Selected ✓' : 'Add Lyrics Image (Optional)'}
              </Text>
            </TouchableOpacity>

            {selectedLyricsImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedLyricsImage }} style={styles.selectedImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setSelectedLyricsImage(null)}
                >
                  <Feather name="x" size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}
            
            {loading ? (
              <ActivityIndicator color="#007AFF" style={styles.loader} />
            ) : (
              <TouchableOpacity style={styles.modalButton} onPress={handleAddSong}>
                <Text style={styles.modalButtonText}>Add Song</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Spotify Search Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={spotifyModalVisible}
        onRequestClose={() => setSpotifyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Spotify</Text>
              <TouchableOpacity onPress={() => setSpotifyModalVisible(false)}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.spotifySearchContainer}>
              <TextInput
                style={styles.spotifySearchInput}
                placeholder="Search for songs..."
                value={spotifySearchTerm}
                onChangeText={setSpotifySearchTerm}
                onSubmitEditing={() => searchSpotifyTracks(spotifySearchTerm)}
                placeholderTextColor="#888"
              />
              <TouchableOpacity 
                style={styles.spotifySearchButton}
                onPress={() => searchSpotifyTracks(spotifySearchTerm)}
              >
                <Feather name="search" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {spotifyLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1DB954" />
                <Text style={styles.loadingText}>Searching Spotify...</Text>
              </View>
            ) : spotifyResults.length > 0 ? (
              <FlatList
                data={spotifyResults}
                keyExtractor={(item) => item.id}
                renderItem={renderSpotifyTrackItem}
                style={styles.spotifyResultsList}
              />
            ) : (
              <View style={styles.emptySpotifyContainer}>
                <Feather name="music" size={40} color="#ccc" />
                <Text style={styles.emptySpotifyText}>Search for songs on Spotify</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Spotify Confirm Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={spotifyConfirmModalVisible}
        onRequestClose={() => setSpotifyConfirmModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Song Details</Text>
              <TouchableOpacity onPress={() => setSpotifyConfirmModalVisible(false)}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {selectedSpotifyTrack && (
              <>
                <View style={styles.spotifyTrackDetails}>
                  <Text style={styles.spotifyTrackDetailTitle}>{selectedSpotifyTrack.name}</Text>
                  <Text style={styles.spotifyTrackDetailArtist}>
                    {selectedSpotifyTrack.artists.map(artist => artist.name).join(', ')}
                  </Text>
                  <Text style={styles.spotifyTrackDetailInfo}>
                    Duration: {formatDuration(selectedSpotifyTrack.duration_ms)}
                  </Text>
                  <Text style={styles.spotifyTrackDetailInfo}>
                    Tempo: {selectedTrackTempo ? `${selectedTrackTempo} BPM` : 'Unknown'}
                  </Text>
                </View>

                <View style={{ width: '100%', zIndex: 1000 }}>
                  <Text style={styles.fieldLabel}>Select Session:</Text>
                  <DropDownPicker
                    open={spotifyGenreOpen}
                    value={selectedTrackGenre}
                    items={genreItems}
                    setOpen={setSpotifyGenreOpen}
                    setValue={setSelectedTrackGenre}
                    setItems={setGenreItems}
                    placeholder="Select Session"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    textStyle={styles.dropdownText}
                    placeholderStyle={styles.dropdownPlaceholder}
                  />
                </View>

                {/* Lyrics Image Selection */}
                <TouchableOpacity 
                  style={styles.lyricsImageButton}
                  onPress={pickLyricsImage}
                >
                  <Feather name="image" size={16} color="#007AFF" />
                  <Text style={styles.lyricsImageButtonText}>
                    {selectedLyricsImage ? 'Lyrics Image Selected ✓' : 'Add Lyrics Image (Optional)'}
                  </Text>
                </TouchableOpacity>

                {selectedLyricsImage && (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: selectedLyricsImage }} style={styles.selectedImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setSelectedLyricsImage(null)}
                    >
                      <Feather name="x" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                )}

                {loading ? (
                  <ActivityIndicator color="#007AFF" style={styles.loader} />
                ) : (
                  <TouchableOpacity style={styles.modalButton} onPress={handleAddSpotifySong}>
                    <Text style={styles.modalButtonText}>Add Song</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Song Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Song</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <TextInput 
              placeholder="Song Title" 
              value={editTitle} 
              onChangeText={setEditTitle} 
              style={styles.modalInput} 
              placeholderTextColor="gray" 
            />
            <TextInput 
              placeholder="Artist" 
              value={editArtist} 
              onChangeText={setEditArtist} 
              style={styles.modalInput} 
              placeholderTextColor="gray" 
            />
            <TextInput 
              placeholder="Duration (e.g. 3:45)" 
              value={editDuration} 
              onChangeText={setEditDuration} 
              style={styles.modalInput} 
              keyboardType="numeric" 
              placeholderTextColor="gray" 
            />
            <TextInput 
              placeholder="Tempo (BPM)" 
              value={editTempo} 
              onChangeText={setEditTempo} 
              style={styles.modalInput} 
              keyboardType="numeric" 
              placeholderTextColor="gray" 
            />

            <View style={{ width: '100%', zIndex: 1000 }}>
              <DropDownPicker
                open={editDropdownOpen}
                value={editGenres}
                items={genreItems}
                setOpen={setEditDropdownOpen}
                setValue={setEditGenres}
                setItems={setGenreItems}
                placeholder="Select Session"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                textStyle={styles.dropdownText}
                placeholderStyle={styles.dropdownPlaceholder}
              />
            </View>

            {loading ? (
              <ActivityIndicator color="#007AFF" style={styles.loader} />
            ) : (
              <TouchableOpacity style={styles.modalButton} onPress={handleUpdateSong}>
                <Text style={styles.modalButtonText}>Update Song</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Lyrics Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={lyricsModalVisible}
        onRequestClose={() => setLyricsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Lyrics Image</Text>
              <TouchableOpacity onPress={() => setLyricsModalVisible(false)}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.lyricsImageButton}
              onPress={() => {
                setEditLyricsImage(null);
                pickLyricsImage().then(() => {
                  if (selectedLyricsImage) {
                    setEditLyricsImage(selectedLyricsImage);
                  }
                });
              }}
            >
              <Feather name="image" size={16} color="#007AFF" />
              <Text style={styles.lyricsImageButtonText}>
                {editLyricsImage ? 'Lyrics Image Selected ✓' : 'Select Lyrics Image'}
              </Text>
            </TouchableOpacity>

            {editLyricsImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: editLyricsImage }} style={styles.selectedImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setEditLyricsImage(null)}
                >
                  <Feather name="x" size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {loading ? (
              <ActivityIndicator color="#007AFF" style={styles.loader} />
            ) : (
              <TouchableOpacity 
                style={[styles.modalButton, !editLyricsImage && styles.disabledButton]} 
                onPress={handleAddLyricsImage}
                disabled={!editLyricsImage}
              >
                <Text style={styles.modalButtonText}>Add Lyrics</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* View Lyrics Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={viewLyricsModalVisible}
        onRequestClose={() => setViewLyricsModalVisible(false)}
      >
        <View style={styles.lyricsViewContainer}>
          <TouchableOpacity 
            style={styles.lyricsCloseButton}
            onPress={() => setViewLyricsModalVisible(false)}
          >
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
          <Image 
            source={{ uri: viewingLyricsUrl }} 
            style={styles.lyricsImage}
            resizeMode="contain"
          />
        </View>
      </Modal>

      {/* Delete Lyrics Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteLyricsModalVisible}
        onRequestClose={() => setDeleteLyricsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Lyrics</Text>
              <TouchableOpacity onPress={() => setDeleteLyricsModalVisible(false)}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.confirmText}>
              Are you sure you want to delete the lyrics image for "{songToDeleteLyrics?.title}"?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setDeleteLyricsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              {loading ? (
                <ActivityIndicator color="#f44336" style={styles.loader} />
              ) : (
                <TouchableOpacity 
                  style={[styles.modalButton, styles.deleteConfirmButton]} 
                  onPress={handleDeleteLyricsImage}
                >
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  songCount: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginBottom: 15,
    fontWeight: '500',
  },
  emptySongsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptySongsText: {
    fontSize: 20,
    color: '#999',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  songItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginVertical: 5,
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  songText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  lyricsButtonContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
  },
  lyricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lyricsButtonText: {
    color: '#007AFF',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  deleteLyricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deleteLyricsButtonText: {
    color: '#f44336',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsAddButton: {
    backgroundColor: '#4CAF50',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  spotifyButton: {
    backgroundColor: '#1DB954',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  spotifyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    paddingHorizontal: 15,
    color: '#888',
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  dropdown: {
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 15,
  },
  dropdownContainer: {
    borderColor: '#ddd',
    borderRadius: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    color: 'gray',
  },
  lyricsImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  lyricsImageButtonText: {
    color: '#007AFF',
    marginLeft: 8,
    fontSize: 16,
  },
  selectedImageContainer: {
    marginBottom: 15,
    position: 'relative',
    alignItems: 'center',
  },
  selectedImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: 75,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loader: {
    marginVertical: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  spotifySearchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  spotifySearchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  spotifySearchButton: {
    backgroundColor: '#1DB954',
    padding: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptySpotifyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySpotifyText: {
    marginTop: 15,
    color: '#999',
    fontSize: 16,
  },
  spotifyResultsList: {
    flex: 1,
  },
  spotifyTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  spotifyTrackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  spotifyTrackArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  spotifyTrackDuration: {
    fontSize: 12,
    color: '#999',
  },
  spotifyTrackDetails: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  spotifyTrackDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  spotifyTrackDetailArtist: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  spotifyTrackDetailInfo: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  lyricsViewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  lyricsImage: {
    width: '90%',
    height: '80%',
  },
  confirmText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    flex: 1,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteConfirmButton: {
    backgroundColor: '#f44336',
    flex: 1,
  },
  deleteConfirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddSong;