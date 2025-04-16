import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, Alert, ActivityIndicator, 
  FlatList, TouchableOpacity, StyleSheet, Modal, SafeAreaView
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

// Define the types
interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  tempo: string;
  genres: string;
  createdAt: Date;
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
  
  // Edit modal state
  const [editSongId, setEditSongId] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editArtist, setEditArtist] = useState<string>('');
  const [editDuration, setEditDuration] = useState<string>('');
  const [editTempo, setEditTempo] = useState<string>('');
  const [editGenres, setEditGenres] = useState(null);
  const [editDropdownOpen, setEditDropdownOpen] = useState(false);

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
      setFilteredSongs(songList); // Initialize filtered songs with all songs
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

      await addDoc(collection(db, `bands/${bandId}/songs`), newSong);

      Alert.alert("Success", "Song added successfully!");
      setTitle('');
      setArtist('');
      setDuration('');
      setTempo('');
      setGenres(null);
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
        // Keep the original createdAt date
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

  const renderSongItem = ({ item }: { item: Song }) => (
    <View style={styles.songItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.songText}>{item.title} - {item.artist}</Text>
        <Text style={{ fontSize: 14, color: 'gray' }}>
          {item.duration} | {item.tempo ? `${item.tempo} BPM | ` : ''}{item.genres}
        </Text>
      </View>
      <View style={styles.actionButtons}>
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
                style={styles.modalDropdown}
                dropDownContainerStyle={styles.modalDropdownContainer}
                zIndex={1000}
                zIndexInverse={3000}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={handleAddSong}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.addButtonText}>Add Song</Text>
              )}
            </TouchableOpacity>
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
            
            {/* Edit Genre Dropdown */}
            <View style={{ width: '100%', zIndex: 1000 }}>
              <DropDownPicker
                open={editDropdownOpen}
                value={editGenres}
                items={genreItems}
                setOpen={setEditDropdownOpen}
                setValue={setEditGenres}
                setItems={setGenreItems}
                placeholder="Select Session"
                style={styles.modalDropdown}
                dropDownContainerStyle={styles.modalDropdownContainer}
                zIndex={1000}
                zIndexInverse={3000}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleUpdateSong}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.addButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  // Search bar styles
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 6,
  },
  songCount: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
    fontWeight: '500',
  },
  emptySongsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptySongsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  songItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  songText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    borderRadius: 5,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  editButton: {
    backgroundColor: "#007AFF",
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#5C6BC0',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalDropdown: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 20,
    borderRadius: 8,
  },
  modalDropdownContainer: {
    borderColor: '#ddd',
  },
  addButton: {
    backgroundColor: "#5C6BC0",
    width: '100%',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: "#5C6BC0",
    width: '100%',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddSong;