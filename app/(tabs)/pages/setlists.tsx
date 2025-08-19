import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, Alert, ActivityIndicator, 
  FlatList, TouchableOpacity, StyleSheet, Modal, 
  SafeAreaView, ScrollView, Image, Dimensions, Platform,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../FirebaseConfig';
import { Feather } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Define interfaces for TypeScript
interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  tempo: string;
  genres: string;
  lyricsImageUrl?: string;
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

const Setlists = ({ navigation }) => {
  const [bandId, setBandId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  
  // Slide tab animation
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const [isTabOpen, setIsTabOpen] = useState(false);
  
  // Lyrics viewing state
  const [viewLyricsModalVisible, setViewLyricsModalVisible] = useState(false);
  const [viewingLyricsUrl, setViewingLyricsUrl] = useState<string>('');
  
  // ViewShot ref for capturing setlist as image
  const viewShotRef = useRef<ViewShot>(null);
  
  // Setlist image preview generation state
  const [generatingPreview, setGeneratingPreview] = useState<boolean>(false);

  // Fetch band ID when component mounts
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

  // Fetch setlists when band ID is available
  useEffect(() => {
    if (bandId) {
      fetchSetlists();
    }
  }, [bandId]);

  // Refetch setlists when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (bandId) {
        fetchSetlists();
      }
    }, [bandId])
  );

  const fetchSetlists = async () => {
    try {
      if (!bandId) return;
      setLoading(true);

      const setlistsQuery = collection(db, `bands/${bandId}/setlists`);
      const setlistsSnapshot = await getDocs(setlistsQuery);

      const setlistList = setlistsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Setlist[];

      setSetlists(setlistList);
    } catch (error) {
      console.error("Error fetching setlists:", error);
      Alert.alert("Error", "Failed to load setlists");
    } finally {
      setLoading(false);
    }
  };

  

  // Slide tab animation functions
  const openSlideTab = (setlist: Setlist) => {
    setSelectedSetlist(setlist);
    setIsTabOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSlideTab = () => {
    Animated.timing(slideAnim, {
      toValue: screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsTabOpen(false);
      setSelectedSetlist(null);
    });
  };

  const captureAndSaveSetlistAsImage = async () => {
    try {
      setGeneratingPreview(true);
      
      // Request permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Need storage permission to save image');
        setGeneratingPreview(false);
        return;
      }
      
      if (!viewShotRef.current || !viewShotRef.current.capture) {
        Alert.alert('Error', 'Could not capture setlist image. Please try again.');
        setGeneratingPreview(false);
        return;
      }
      
      // Capture the view
      const imageUri = await viewShotRef.current.capture();
      console.log('Capture successful:', imageUri);
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(imageUri);
      console.log('Image saved successfully:', asset);
      
      Alert.alert('Success', 'Setlist saved to your photo gallery');
    } catch (error) {
      console.error("Error saving setlist:", error);
      Alert.alert("Error", "Failed to save setlist as image. Please try again.");
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Handle song press to view lyrics - matching AddSong component
  const handleSongPress = (song: Song) => {
    if (song.lyricsImageUrl) {
      console.log('Opening lyrics for song:', song.title, 'URL:', song.lyricsImageUrl);
      setViewingLyricsUrl(song.lyricsImageUrl);
      setViewLyricsModalVisible(true);
    } else {
      Alert.alert("No Lyrics", "This song doesn't have lyrics image available.");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'MMM dd, yyyy - hh:mm a');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'hh:mm a');
  };

  const renderSetlistItem = ({ item }: { item: Setlist }) => (
    <TouchableOpacity 
      style={styles.setlistItem}
      onPress={() => openSlideTab(item)}
    >
      <View style={styles.setlistItemContent}>
        <Text style={styles.setlistEventName}>{item.eventName}</Text>
        <Text style={styles.setlistEventDate}>{formatDate(item.eventDate)}</Text>
        <Text style={styles.setlistSongCount}>
          {item.sessions.reduce((total, session) => total + session.songs.length, 0)} songs | 
          {item.sessions.length} {item.sessions.length === 1 ? 'session' : 'sessions'}
        </Text>
        
        {/* Preview of session names */}
        <View style={styles.sessionNamesContainer}>
          {item.sessions.map((session, index) => (
            <View key={index} style={styles.sessionNameChip}>
              <Text style={styles.sessionNameText}>{session.name}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.setlistItemActions}>
        <Feather name="chevron-right" size={24} color="#888" style={{ marginLeft: 8 }} />
      </View>
    </TouchableOpacity>
  );

  // Create a flat list of all songs from all sessions
  const getAllSongs = (setlist: Setlist) => {
    const allSongs: Array<Song & { sessionName: string; songNumber: number; globalNumber: number }> = [];
    let globalNumber = 1;
    
    setlist.sessions.forEach((session) => {
      session.songs.forEach((song, index) => {
        allSongs.push({
          ...song,
          sessionName: session.name,
          songNumber: index + 1,
          globalNumber: globalNumber++
        });
      });
    });
    
    return allSongs;
  };

  const renderSongItem = ({ item }: { item: Song & { sessionName: string; songNumber: number; globalNumber: number } }) => (
    <TouchableOpacity 
      style={styles.songItem}
      onPress={() => handleSongPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.songItemContent}>
        <Text style={styles.songGlobalNumber}>{item.globalNumber}</Text>
        <View style={styles.songItemDetails}>
          <Text style={styles.songItemTitle}>{item.title}</Text>
          <Text style={styles.songItemArtist}>{item.artist}</Text>
          <View style={styles.songMetaData}>
            <Text style={styles.songSessionName}>{item.sessionName}</Text>
            <Text style={styles.songDurationText}>• {item.duration}</Text>
            <Text style={styles.songTempo}>• {item.tempo}</Text>
          </View>
        </View>
        {item.lyricsImageUrl && (
          <Feather name="file-text" size={16} color="#5C6BC0" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Setlists</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
        </View>
      ) : setlists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="list" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No setlists available</Text>
          <Text style={{ textAlign: 'center', color: '#888' }}>
            Create a setlist from the generator
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.navigate('SetlistGenerator')}
          >
            <Text style={styles.createButtonText}>Create Setlist</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={setlists}
          keyExtractor={(item) => item.id}
          renderItem={renderSetlistItem}
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Hidden ViewShot component for image generation */}
      <View style={styles.viewShotContainer}>
        <ViewShot 
          ref={viewShotRef} 
          options={{ 
            format: "jpg", 
            quality: 0.9,
            result: 'tmpfile'
          }} 
          style={styles.setlistPrintView}
        >
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
        </ViewShot>
      </View>

      {/* Slide Tab for Setlist Details */}
      {isTabOpen && (
        <Animated.View style={[styles.slideTab, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.slideTabContent}>
            {/* Tab Header */}
            <View style={styles.slideTabHeader}>
              <TouchableOpacity 
                onPress={closeSlideTab}
                style={styles.backButton}
              >
                <Feather name="arrow-left" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.slideTabTitle}>Setlist Detail</Text>
              <TouchableOpacity 
                style={styles.downloadButton} 
                onPress={captureAndSaveSetlistAsImage}
                disabled={generatingPreview}
              >
                {generatingPreview ? (
                  <ActivityIndicator size="small" color="#5C6BC0" />
                ) : (
                  <Feather name="download" size={20} color="#5C6BC0" />
                )}
              </TouchableOpacity>
            </View>
            
            {/* Event Info */}
            {selectedSetlist && (
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{selectedSetlist.eventName}</Text>
                <View style={styles.eventDetailsRow}>
                  <View style={styles.eventDetail}>
                    <Feather name="calendar" size={16} color="#666" />
                    <Text style={styles.eventDetailText}>{formatDate(selectedSetlist.eventDate)}</Text>
                  </View>
                </View>
                <Text style={styles.totalSongsText}>
                  {selectedSetlist.sessions.reduce((total, session) => total + session.songs.length, 0)} songs total
                </Text>
              </View>
            )}
            
            {/* Songs List */}
            <FlatList
              data={selectedSetlist ? getAllSongs(selectedSetlist) : []}
              keyExtractor={(item) => `${item.sessionName}-${item.id}`}
              renderItem={renderSongItem}
              style={styles.songsList}
              contentContainerStyle={styles.songsListContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Animated.View>
      )}

      {/* Backdrop for slide tab */}
      {isTabOpen && (
        <TouchableOpacity 
          style={styles.backdrop} 
          onPress={closeSlideTab}
          activeOpacity={1}
        />
      )}

      {/* View Lyrics Modal - Matching AddSong component */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  createButton: {
    backgroundColor: '#5C6BC0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Setlist item styles
  setlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  setlistItemContent: {
    flex: 1,
  },
  setlistItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 5,
  },
  setlistEventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  setlistEventDate: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  setlistSongCount: {
    fontSize: 14,
    color: '#777',
    marginTop: 6,
  },
  sessionNamesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  sessionNameChip: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  sessionNameText: {
    fontSize: 12,
    color: '#5C6BC0',
    fontWeight: '500',
  },
  
  // Slide tab styles
  slideTab: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  slideTabContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
  },
  slideTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  slideTabTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  downloadButton: {
    padding: 5,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  // ViewShot component container (hidden)
  viewShotContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 800,
    backgroundColor: 'white',
  },
  setlistPrintView: {
    backgroundColor: 'white',
    padding: 20,
  },
  setlistDetailView: {
    backgroundColor: 'white',
  },
  setlistHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#5C6BC0',
  },
  setlistTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  setlistDate: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sessionContainer: {
    marginBottom: 24,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5C6BC0',
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  songNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 30,
  },
  songDetails: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  songArtist: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  songDuration: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Event info styles
  eventInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  totalSongsText: {
    fontSize: 14,
    color: '#5C6BC0',
    fontWeight: '600',
    marginTop: 8,
  },
  // Songs list styles
  songsList: {
    flex: 1,
    backgroundColor: 'white',
  },
  songsListContent: {
    paddingBottom: 20,
  },
  songItem: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  songItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  songGlobalNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5C6BC0',
    width: 30,
  },
  songItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  songItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  songItemArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  songMetaData: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songSessionName: {
    fontSize: 12,
    color: '#5C6BC0',
    fontWeight: '600',
  },
  songDurationText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  songTempo: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  // Lyrics modal styles - matching AddSong component
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
});

export default Setlists;