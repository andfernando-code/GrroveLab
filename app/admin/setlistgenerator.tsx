import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, Alert, ActivityIndicator, 
  FlatList, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  Platform, ScrollView
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { format } from 'date-fns';

// Define interfaces for TypeScript
interface Event {
  id: string;
  location: string;
  dateTime: string;
  specialNotes?: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  tempo: string;
  genres: string;
}

interface Setlist {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  sessions: {
    name: string;
    songs: Song[];
  }[];
  createdAt: Date;
}

const SetlistGenerator = () => {
  const [bandId, setBandId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [eventsOpen, setEventsOpen] = useState(false);
  
  // Sessions state
  const [sessionCount, setSessionCount] = useState<string | null>("1");
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const sessionItems = [
    { label: '1 Session', value: "1" },
    { label: '2 Sessions', value: "2" },
    { label: '3 Sessions', value: "3" },
  ];
  
  // Session song counts
  const [firstSessionCount, setFirstSessionCount] = useState<string>("5");
  const [secondSessionCount, setSecondSessionCount] = useState<string>("5");
  const [dancingSessionCount, setDancingSessionCount] = useState<string>("5");
  
  // Songs database
  const [songs, setSongs] = useState<Song[]>([]);
  
  // Generated setlists
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  
  // Modal visibility
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [setlistDetailModalVisible, setSetlistDetailModalVisible] = useState(false);
  
  // ViewShot ref for capturing setlist as image
  const viewShotRef = useRef<ViewShot>(null);

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
      fetchEvents();
      fetchSongs();
      fetchSetlists();
    }
  }, [bandId]);

  const fetchEvents = async () => {
    try {
      if (!bandId) return;

      const eventsQuery = collection(db, `bands/${bandId}/events`);
      const eventsSnapshot = await getDocs(eventsQuery);

      const eventList = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Event[];

      setEvents(eventList);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

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

  const fetchSetlists = async () => {
    try {
      if (!bandId) return;

      const setlistsQuery = collection(db, `bands/${bandId}/setlists`);
      const setlistsSnapshot = await getDocs(setlistsQuery);

      const setlistList = setlistsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Setlist[];

      setSetlists(setlistList);
    } catch (error) {
      console.error("Error fetching setlists:", error);
    }
  };

  const deleteSetlist = async (id: string) => {
    Alert.alert(
      "Delete Setlist",
      "Are you sure you want to delete this setlist?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              if (!bandId) return;
              
              setLoading(true);
              // Delete from Firestore
              await deleteDoc(doc(db, `bands/${bandId}/setlists`, id));
              
              // Update state
              setSetlists(prevSetlists => prevSetlists.filter(setlist => setlist.id !== id));
              
              // Close modal if the deleted setlist was selected
              if (selectedSetlist && selectedSetlist.id === id) {
                setSetlistDetailModalVisible(false);
                setSelectedSetlist(null);
              }
              
              Alert.alert("Success", "Setlist deleted successfully");
            } catch (error) {
              console.error("Error deleting setlist:", error);
              Alert.alert("Error", "Failed to delete setlist");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const generateSetlist = async () => {
    if (!selectedEvent) {
      Alert.alert("Error", "Please select an event");
      return;
    }

    if (!sessionCount) {
      Alert.alert("Error", "Please select number of sessions");
      return;
    }

    try {
      setGenerating(true);

      // Get the selected event details
      const selectedEventObj = events.find(event => event.id === selectedEvent);
      if (!selectedEventObj) {
        Alert.alert("Error", "Selected event not found");
        setGenerating(false);
        return;
      }

      // Group songs by session type
      const firstSessionSongs = songs.filter(song => song.genres === 'First Session');
      const secondSessionSongs = songs.filter(song => song.genres === 'Second Session');
      const dancingSessionSongs = songs.filter(song => song.genres === 'Dancing Session');

      // Check if we have enough songs for each session
      if (parseInt(firstSessionCount) > firstSessionSongs.length) {
        Alert.alert("Error", `Not enough songs for First Session. You only have ${firstSessionSongs.length} songs.`);
        setGenerating(false);
        return;
      }

      if (parseInt(sessionCount) >= 2 && parseInt(secondSessionCount) > secondSessionSongs.length) {
        Alert.alert("Error", `Not enough songs for Second Session. You only have ${secondSessionSongs.length} songs.`);
        setGenerating(false);
        return;
      }

      if (parseInt(sessionCount) >= 3 && parseInt(dancingSessionCount) > dancingSessionSongs.length) {
        Alert.alert("Error", `Not enough songs for Dancing Session. You only have ${dancingSessionSongs.length} songs.`);
        setGenerating(false);
        return;
      }

      // Randomly select songs for each session
      const getRandomSongs = (songArray: Song[], count: number) => {
        const shuffled = [...songArray].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      };

      // Create sessions array
      const sessions = [];
      
      // First session (always included)
      sessions.push({
        name: 'First Session',
        songs: getRandomSongs(firstSessionSongs, parseInt(firstSessionCount))
      });
      
      // Add second session if needed
      if (parseInt(sessionCount) >= 2) {
        sessions.push({
          name: 'Second Session',
          songs: getRandomSongs(secondSessionSongs, parseInt(secondSessionCount))
        });
      }
      
      // Add dancing session if needed
      if (parseInt(sessionCount) >= 3) {
        sessions.push({
          name: 'Dancing Session',
          songs: getRandomSongs(dancingSessionSongs, parseInt(dancingSessionCount))
        });
      }

      // Create new setlist
      const newSetlist = {
        eventId: selectedEventObj.id,
        eventName: selectedEventObj.location,
        eventDate: selectedEventObj.dateTime,
        sessions,
        createdAt: new Date()
      };

      // Save to Firebase
      const docRef = await addDoc(collection(db, `bands/${bandId}/setlists`), newSetlist);
      
      // Refresh setlists
      fetchSetlists();
      
      // Close modal
      setFormModalVisible(false);
      
      Alert.alert("Success", "Setlist generated successfully!");
    } catch (error) {
      console.error("Error generating setlist:", error);
      Alert.alert("Error", "Failed to generate setlist");
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'MMM dd, yyyy - hh:mm a');
  };

  const captureSetlistAsImage = async () => {
    try {
      // Early return if viewShotRef.current doesn't exist
      if (!viewShotRef.current) {
        Alert.alert('Error', 'Could not capture setlist image');
        return;
      }
      
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Need storage permission to save image');
        return;
      }
      
      // Store the ref in a constant
      const viewShot = viewShotRef.current;
      
      // Check if the capture method exists
      if (typeof viewShot.capture !== 'function') {
        Alert.alert('Error', 'ViewShot capture method not available');
        return;
      }
      
      // Capture the view
      const uri = await viewShot.capture();
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);
      
      Alert.alert('Success', 'Setlist saved to your photo gallery');
    } catch (error) {
      console.error("Error capturing setlist:", error);
      Alert.alert("Error", "Failed to capture setlist as image");
    }
  };

  const renderSetlistItem = ({ item }: { item: Setlist }) => (
    <TouchableOpacity 
      style={styles.setlistItem}
      onPress={() => {
        setSelectedSetlist(item);
        setSetlistDetailModalVisible(true);
      }}
    >
      <View style={styles.setlistItemContent}>
        <Text style={styles.setlistEventName}>{item.eventName}</Text>
        <Text style={styles.setlistEventDate}>{formatDate(item.eventDate)}</Text>
        <Text style={styles.setlistSongCount}>
          {item.sessions.reduce((total, session) => total + session.songs.length, 0)} songs | 
          {item.sessions.length} {item.sessions.length === 1 ? 'session' : 'sessions'}
        </Text>
        
        {/* Added section to display song list */}
        <View style={styles.songsPreviewContainer}>
          {item.sessions.map((session, sessionIndex) => (
            <View key={`session-${sessionIndex}`} style={styles.sessionPreview}>
              <Text style={styles.sessionPreviewName}>{session.name}:</Text>
              <Text style={styles.sessionSongsList}>
                {session.songs.map(song => song.title).join(', ')}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.setlistItemActions}>
        <Feather name="chevron-right" size={24} color="#888" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Setlists</Text>
      
      {setlists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="list" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No setlists generated yet</Text>
          <Text style={{ textAlign: 'center', color: '#888' }}>
            Tap the + button to create your first setlist
          </Text>
        </View>
      ) : (
        <FlatList
          data={setlists}
          keyExtractor={(item) => item.id}
          renderItem={renderSetlistItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* FAB for generating new setlist */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setFormModalVisible(true)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Generate Setlist Form Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={formModalVisible}
        onRequestClose={() => setFormModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate New Setlist</Text>
              <TouchableOpacity onPress={() => setFormModalVisible(false)}>
                <Feather name="x" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            {/* Event Selection */}
            <Text style={styles.inputLabel}>Select Event</Text>
            <View style={{ width: '100%', zIndex: 3000 }}>
              <DropDownPicker
                open={eventsOpen}
                value={selectedEvent}
                items={events.map(event => ({
                  label: `${event.location} (${formatDate(event.dateTime)})`,
                  value: event.id
                }))}
                setOpen={setEventsOpen}
                setValue={setSelectedEvent}
                setItems={() => {}}
                placeholder="Select an event"
                style={styles.dropdownPicker}
                dropDownContainerStyle={styles.dropdownContainer}
                zIndex={3000}
                zIndexInverse={1000}
              />
            </View>
            
            {/* Session Count Selection */}
            <Text style={styles.inputLabel}>Number of Sessions</Text>
            <View style={{ width: '100%', zIndex: 2000, marginTop: 10 }}>
              <DropDownPicker
                open={sessionsOpen}
                value={sessionCount}
                items={sessionItems}
                setOpen={setSessionsOpen}
                setValue={setSessionCount}
                setItems={() => {}}
                placeholder="Select number of sessions"
                style={styles.dropdownPicker}
                dropDownContainerStyle={styles.dropdownContainer}
                zIndex={2000}
                zIndexInverse={2000}
              />
            </View>
            
            {/* Songs per session inputs */}
            <View style={{ marginTop: eventsOpen || sessionsOpen ? 110 : 20 }}>
              <Text style={styles.inputLabel}>Songs for First Session</Text>
              <TextInput
                style={styles.input}
                value={firstSessionCount}
                onChangeText={setFirstSessionCount}
                keyboardType="numeric"
                placeholder="Number of songs"
                placeholderTextColor="#888"
              />
              
              {parseInt(sessionCount || "1") >= 2 && (
                <>
                  <Text style={styles.inputLabel}>Songs for Second Session</Text>
                  <TextInput
                    style={styles.input}
                    value={secondSessionCount}
                    onChangeText={setSecondSessionCount}
                    keyboardType="numeric"
                    placeholder="Number of songs"
                    placeholderTextColor="#888"
                  />
                </>
              )}
              
              {parseInt(sessionCount || "1") >= 3 && (
                <>
                  <Text style={styles.inputLabel}>Songs for Dancing Session</Text>
                  <TextInput
                    style={styles.input}
                    value={dancingSessionCount}
                    onChangeText={setDancingSessionCount}
                    keyboardType="numeric"
                    placeholder="Number of songs"
                    placeholderTextColor="#888"
                  />
                </>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.generateButton} 
              onPress={generateSetlist}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.generateButtonText}>Generate Setlist</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Setlist Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={setlistDetailModalVisible}
        onRequestClose={() => setSetlistDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.setlistDetailContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Setlist Detail</Text>
              <View style={styles.modalActions}>
                {/* Delete button */}
                {selectedSetlist && (
                  <TouchableOpacity 
                    onPress={() => {
                      setSetlistDetailModalVisible(false);
                      setTimeout(() => {
                        if (selectedSetlist) {
                          deleteSetlist(selectedSetlist.id);
                        }
                      }, 300); // Small delay to allow modal to close first
                    }}
                    style={styles.deleteButton}
                  >
                    <Feather name="trash-2" size={20} color="#FF5252" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => setSetlistDetailModalVisible(false)}
                  style={{marginLeft: 15}}
                >
                  <Feather name="x" size={24} color="#888" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={styles.setlistPrintView}>
              <ScrollView>
                {selectedSetlist && (
                  <View style={styles.setlistDetailView}>
                    <View style={styles.setlistHeader}>
                      <Text style={styles.setlistTitle}>{selectedSetlist.eventName}</Text>
                      <Text style={styles.setlistDate}>{formatDate(selectedSetlist.eventDate)}</Text>
                    </View>
                    
                    {selectedSetlist.sessions.map((session, index) => (
                      <View key={index} style={styles.sessionContainer}>
                        <Text style={styles.sessionName}>{session.name}</Text>
                        {session.songs.map((song, songIndex) => (
                          <View key={songIndex} style={styles.songRow}>
                            <Text style={styles.songNumber}>{songIndex + 1}</Text>
                            <View style={styles.songDetails}>
                              <Text style={styles.songTitle}>{song.title}</Text>
                              <Text style={styles.songArtist}>{song.artist}</Text>
                            </View>
                            <Text style={styles.songDuration}>{song.duration}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </ViewShot>
            
            <TouchableOpacity 
              style={styles.downloadButton} 
              onPress={captureSetlistAsImage}
            >
              <Feather name="download" size={20} color="#fff" />
              <Text style={styles.downloadButtonText}>Save as Image</Text>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
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
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  setlistDetailContent: {
    width: '95%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
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
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#555',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownPicker: {
    borderColor: '#ddd',
    height: 50,
    marginBottom: 15,
  },
  dropdownContainer: {
    borderColor: '#ddd',
  },
  generateButton: {
    backgroundColor: "#5C6BC0",
    width: '100%',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Setlist item styles
  setlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Changed from center to flex-start
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  setlistItemContent: {
    flex: 1,
  },
  setlistItemActions: {
    paddingTop: 5,
  },
  setlistEventName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  setlistEventDate: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  setlistSongCount: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    marginBottom: 10,
  },
  // Songs preview in list item
  songsPreviewContainer: {
    marginTop: 5,
  },
  sessionPreview: {
    marginBottom: 3,
  },
  sessionPreviewName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  sessionSongsList: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  // Setlist detail styles
  setlistPrintView: {
    backgroundColor: 'white',
    flex: 1,
    width: '100%',
  },
  setlistDetailView: {
    padding: 15,
    minHeight: '100%',
  },
  setlistHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
  },
  setlistTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  setlistDate: {
    fontSize: 16,
    color: '#555',
    marginTop: 8,
  },
  sessionContainer: {
    marginBottom: 20,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  songNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'center',
  },
  songDetails: {
    flex: 1,
    paddingHorizontal: 10,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  songArtist: {
    fontSize: 14,
    color: '#666',
  },
  songDuration: {
    fontSize: 14,
    color: '#888',
    width: 50,
    textAlign: 'right',
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: '#5C6BC0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  downloadButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default SetlistGenerator;