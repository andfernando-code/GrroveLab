import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, TextInput, Alert, ActivityIndicator, 
  FlatList, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  Platform, ScrollView, Image, Dimensions
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

const SetlistGenerator = () => {
  const [bandId, setBandId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'past' | 'future'>('future');

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
  
  // Lyrics viewing state
  const [lyricsModalVisible, setLyricsModalVisible] = useState(false);
  const [viewingLyricsUrl, setViewingLyricsUrl] = useState<string>('');
  const [selectedSongTitle, setSelectedSongTitle] = useState<string>('');
  const [lyricsImageLoading, setLyricsImageLoading] = useState<boolean>(false);
  const [lyricsImageError, setLyricsImageError] = useState<boolean>(false);
  const [lyricsImageDimensions, setLyricsImageDimensions] = useState<{ width: number; height: number; } | null>(null);
  
  // ViewShot ref for capturing setlist as image
  const viewShotRef = useRef<ViewShot>(null);
  
  // Setlist image preview URI and generation state
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState<boolean>(false);

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

  useEffect(() => {
    if (setlistDetailModalVisible && selectedSetlist) {
      // Add a longer delay to ensure the modal is fully rendered
      const timer = setTimeout(() => {
        generateSetlistPreview();
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setPreviewImageUri(null);
    }
  }, [setlistDetailModalVisible, selectedSetlist]);

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
      "Are you sure you want to permanently delete this setlist? This action cannot be undone.",
      [
        { 
          text: "Cancel", 
          style: "cancel",
          onPress: () => console.log("Delete cancelled")
        },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              if (!bandId) return;
              
              setLoading(true);
              await deleteDoc(doc(db, `bands/${bandId}/setlists`, id));
              
              setSetlists(prevSetlists => prevSetlists.filter(setlist => setlist.id !== id));
              
              if (selectedSetlist && selectedSetlist.id === id) {
                setSetlistDetailModalVisible(false);
                setSelectedSetlist(null);
              }
              
              Alert.alert("Success", "Setlist deleted successfully");
            } catch (error) {
              console.error("Error deleting setlist:", error);
              Alert.alert("Error", "Failed to delete setlist. Please try again.");
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

      const selectedEventObj = events.find(event => event.id === selectedEvent);
      if (!selectedEventObj) {
        Alert.alert("Error", "Selected event not found");
        setGenerating(false);
        return;
      }

      const firstSessionSongs = songs.filter(song => song.genres === 'First Session');
      const secondSessionSongs = songs.filter(song => song.genres === 'Second Session');
      const dancingSessionSongs = songs.filter(song => song.genres === 'Dancing Session');

      if (parseInt(firstSessionCount) > firstSessionSongs.length) {
        Alert.alert("Error", `Not enough songs for First Session. You only have ${firstSessionSongs.length} songs.`);
        setGenerating(false);
        return;
      }

      if (parseInt(sessionCount || "1") >= 2 && parseInt(secondSessionCount) > secondSessionSongs.length) {
        Alert.alert("Error", `Not enough songs for Second Session. You only have ${secondSessionSongs.length} songs.`);
        setGenerating(false);
        return;
      }

      if (parseInt(sessionCount || "1") >= 3 && parseInt(dancingSessionCount) > dancingSessionSongs.length) {
        Alert.alert("Error", `Not enough songs for Dancing Session. You only have ${dancingSessionSongs.length} songs.`);
        setGenerating(false);
        return;
      }

      const getRandomSongs = (songArray: Song[], count: number) => {
        const shuffled = [...songArray].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      };

      const sessions = [];
      
      sessions.push({
        name: 'First Session',
        songs: getRandomSongs(firstSessionSongs, parseInt(firstSessionCount))
      });
      
      if (parseInt(sessionCount || "1") >= 2) {
        sessions.push({
          name: 'Second Session',
          songs: getRandomSongs(secondSessionSongs, parseInt(secondSessionCount))
        });
      }
      
      if (parseInt(sessionCount || "1") >= 3) {
        sessions.push({
          name: 'Dancing Session',
          songs: getRandomSongs(dancingSessionSongs, parseInt(dancingSessionCount))
        });
      }

      const newSetlist = {
        eventId: selectedEventObj.id,
        eventName: selectedEventObj.location,
        eventDate: selectedEventObj.dateTime,
        sessions,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, `bands/${bandId}/setlists`), newSetlist);
      
      fetchSetlists();
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
    return format(date, 'MMM dd, yyyy');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'hh:mm a');
  };

  const generateSetlistPreview = useCallback(async () => {
    if (!selectedSetlist) return;
    
    try {
      setGeneratingPreview(true);
      console.log('Starting setlist preview generation...');
      
      // Multiple attempts with different delays
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Preview generation attempt ${attempt}`);
          
          if (!viewShotRef.current) {
            console.error(`Attempt ${attempt}: ViewShot ref is null`);
            await new Promise(resolve => setTimeout(resolve, 200 * attempt));
            continue;
          }
          
          const viewShot = viewShotRef.current;
          
          if (!viewShot.capture || typeof viewShot.capture !== 'function') {
            console.error(`Attempt ${attempt}: ViewShot capture method not available`);
            await new Promise(resolve => setTimeout(resolve, 200 * attempt));
            continue;
          }
          
          console.log(`Attempt ${attempt}: Capturing setlist...`);
          const uri = await viewShot.capture();
          console.log(`Attempt ${attempt}: Capture successful, URI:`, uri);
          
          setPreviewImageUri(uri);
          setGeneratingPreview(false);
          return; // Success, exit the function
          
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === 3) {
            throw error; // Re-throw on final attempt
          }
          await new Promise(resolve => setTimeout(resolve, 300 * attempt));
        }
      }
      
    } catch (error) {
      console.error("Error generating setlist preview:", error);
      setGeneratingPreview(false);
      // Don't show error alert, just log it
    }
  }, [selectedSetlist]);

  const captureAndSaveSetlistAsImage = async () => {
    try {
      let imageUri = previewImageUri;
      
      // Request permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Need storage permission to save image');
        return;
      }
      
      // If no cached preview, generate one
      if (!imageUri) {
        console.log('No cached preview, generating new one...');
        
        if (!viewShotRef.current || !viewShotRef.current.capture) {
          Alert.alert('Error', 'Could not capture setlist image. Please try again.');
          return;
        }
        
        try {
          imageUri = await viewShotRef.current.capture();
          console.log('New capture successful:', imageUri);
        } catch (error) {
          console.error('Capture failed:', error);
          Alert.alert('Error', 'Failed to capture setlist image. Please try again.');
          return;
        }
      }
      
      if (!imageUri) {
        Alert.alert('Error', 'No image to save. Please try again.');
        return;
      }
      
      console.log('Saving image to gallery:', imageUri);
      const asset = await MediaLibrary.createAssetAsync(imageUri);
      console.log('Image saved successfully:', asset);
      
      Alert.alert('Success', 'Setlist saved to your photo gallery');
    } catch (error) {
      console.error("Error saving setlist:", error);
      Alert.alert("Error", "Failed to save setlist as image. Please try again.");
    }
  };

  const handleSongPress = (song: Song) => {
    if (song.lyricsImageUrl) {
      console.log('Opening lyrics for song:', song.title, 'URL:', song.lyricsImageUrl);
      
      setLyricsImageLoading(true);
      setLyricsImageError(false);
      setViewingLyricsUrl(song.lyricsImageUrl);
      setSelectedSongTitle(song.title);
      setLyricsModalVisible(true);
      setLyricsImageDimensions(null);
    } else {
      Alert.alert("No Lyrics", "This song doesn't have lyrics image available.");
    }
  };

  const handleLyricsImageLoad = (event: any) => {
    console.log('Lyrics image loaded successfully');
    setLyricsImageLoading(false);
    setLyricsImageError(false);

    const { width, height } = event.nativeEvent.source;
    setLyricsImageDimensions({ width, height });
  };

  const handleLyricsImageError = (error: any) => {
    console.error('Error loading lyrics image:', error);
    setLyricsImageLoading(false);
    setLyricsImageError(true);
  };

  const closeLyricsModal = () => {
    setLyricsModalVisible(false);
    setTimeout(() => {
      setLyricsImageLoading(false);
      setLyricsImageError(false);
      setViewingLyricsUrl('');
      setSelectedSongTitle('');
      setLyricsImageDimensions(null);
    }, 300);
  };

  const retryLyricsImage = () => {
    setLyricsImageError(false);
    setLyricsImageLoading(true);
    const currentUrl = viewingLyricsUrl;
    setViewingLyricsUrl('');
    setTimeout(() => {
      setViewingLyricsUrl(currentUrl);
    }, 100);
  };

  const getFilteredSetlists = () => {
    const now = new Date();
    return setlists.filter(setlist => {
      const eventDate = new Date(setlist.eventDate);
      return activeTab === 'future' ? eventDate >= now : eventDate < now;
    }).sort((a, b) => {
      const dateA = new Date(a.eventDate);
      const dateB = new Date(b.eventDate);
      return activeTab === 'future' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
  };

  const filteredSetlists = getFilteredSetlists();

  const renderTabButton = (tab: 'past' | 'future', label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSetlistItem = ({ item }: { item: Setlist }) => {
    const totalSongs = item.sessions.reduce((total, session) => total + session.songs.length, 0);
    const sessionCount = item.sessions.length;
    
    return (
      <TouchableOpacity 
        style={styles.setlistCard}
        onPress={() => {
          setSelectedSetlist(item);
          setSetlistDetailModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.setlistCardContent}>
          <View style={styles.setlistHeaderRow}>
            <View style={styles.setlistMainInfo}>
              <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
              <View style={styles.dateTimeContainer}>
                <View style={styles.dateTimeRow}>
                  <Feather name="calendar" size={14} color="#666" />
                  <Text style={styles.eventDate}>{formatDate(item.eventDate)}</Text>
                </View>
                <View style={styles.dateTimeRow}>
                  <Feather name="clock" size={14} color="#666" />
                  <Text style={styles.eventTime}>{formatTime(item.eventDate)}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                deleteSetlist(item.id);
              }}
              style={styles.deleteIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="trash-2" size={18} color="#FF5252" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.setlistStats}>
            <View style={styles.statItem}>
              <Feather name="music" size={16} color="#5C6BC0" />
              <Text style={styles.statText}>{totalSongs} songs</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="layers" size={16} color="#5C6BC0" />
              <Text style={styles.statText}>{sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.chevronContainer}>
          <Feather name="chevron-right" size={20} color="#C1C1C1" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Setlists</Text>
      </View>
      
      <View style={styles.tabContainer}>
        {renderTabButton('future', 'Upcoming')}
        {renderTabButton('past', 'Past Events')}
      </View>
      
      {filteredSetlists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Feather name="list" size={48} color="#E0E0E0" />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'future' ? 'No upcoming setlists' : 'No past setlists'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'future' 
              ? 'Create your first setlist for upcoming events' 
              : 'Past setlists will appear here after events'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSetlists}
          keyExtractor={(item) => item.id}
          renderItem={renderSetlistItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setFormModalVisible(true)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Generate Setlist Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={formModalVisible}
        onRequestClose={() => setFormModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate New Setlist</Text>
              <TouchableOpacity onPress={() => setFormModalVisible(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Select Event</Text>
                <View style={{ zIndex: 3000 }}>
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
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    textStyle={styles.dropdownText}
                    zIndex={3000}
                    zIndexInverse={1000}
                  />
                </View>
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Number of Sessions</Text>
                <View style={{ zIndex: 2000 }}>
                  <DropDownPicker
                    open={sessionsOpen}
                    value={sessionCount}
                    items={sessionItems}
                    setOpen={setSessionsOpen}
                    setValue={setSessionCount}
                    setItems={() => {}}
                    placeholder="Select number of sessions"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    textStyle={styles.dropdownText}
                    zIndex={2000}
                    zIndexInverse={2000}
                  />
                </View>
              </View>
              
              <View style={[styles.formSection, { marginTop: eventsOpen || sessionsOpen ? 120 : 0 }]}>
                <Text style={styles.inputLabel}>Songs for First Session</Text>
                <TextInput
                  style={styles.input}
                  value={firstSessionCount}
                  onChangeText={setFirstSessionCount}
                  keyboardType="numeric"
                  placeholder="Number of songs"
                  placeholderTextColor="#999"
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
                      placeholderTextColor="#999"
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
                      placeholderTextColor="#999"
                    />
                  </>
                )}
              </View>
            </ScrollView>
            
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
        <View style={styles.modalOverlay}>
          <View style={styles.setlistDetailContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Setlist Detail</Text>
              <View style={styles.modalActions}>
                {selectedSetlist && (
                  <TouchableOpacity 
                    onPress={() => {
                      setSetlistDetailModalVisible(false);
                      setTimeout(() => {
                        if (selectedSetlist) {
                          deleteSetlist(selectedSetlist.id);
                        }
                      }, 300)
                    }}
                    style={styles.headerActionButton}
                  >
                    <Feather name="trash-2" size={20} color="#FF5252" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => setSetlistDetailModalVisible(false)}
                  style={styles.headerActionButton}
                >
                  <Feather name="x" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* FIXED: ViewShot container - now visible and properly sized */}
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
                      <Text style={styles.setlistDate}>
                        {formatDate(selectedSetlist.eventDate)} at {formatTime(selectedSetlist.eventDate)}
                      </Text>
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
            
            <View style={styles.imagePreviewContainer}>
              {generatingPreview ? (
                <View style={styles.loadingPreview}>
                  <ActivityIndicator size="large" color="#5C6BC0" />
                  <Text style={styles.loadingText}>Generating preview...</Text>
                </View>
              ) : previewImageUri ? (
                <Image 
                  source={{ uri: previewImageUri }} 
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.loadingPreview}>
                  <Feather name="image" size={48} color="#E0E0E0" />
                  <Text style={styles.loadingText}>Preview not available</Text>
                  <TouchableOpacity 
                    onPress={generateSetlistPreview}
                    style={styles.retryPreviewButton}
                  >
                    <Text style={styles.retryPreviewText}>Generate Preview</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <ScrollView style={styles.setlistContentScroll} showsVerticalScrollIndicator={false}>
              {selectedSetlist && (
                <View style={styles.setlistDetailViewScroll}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{selectedSetlist.eventName}</Text>
                    <View style={styles.eventDetailsRow}>
                      <View style={styles.eventDetail}>
                        <Feather name="calendar" size={16} color="#666" />
                        <Text style={styles.eventDetailText}>{formatDate(selectedSetlist.eventDate)}</Text>
                      </View>
                      <View style={styles.eventDetail}>
                        <Feather name="clock" size={16} color="#666" />
                        <Text style={styles.eventDetailText}>{formatTime(selectedSetlist.eventDate)}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {selectedSetlist.sessions.map((session, sessionIndex) => (
                    <View key={sessionIndex} style={styles.sessionSection}>
                      <Text style={styles.sessionTitle}>{session.name}</Text>
                      <View style={styles.songsContainer}>
                        {session.songs.map((song, songIndex) => (
                          <TouchableOpacity 
                            key={songIndex} 
                            style={styles.songItem}
                            onPress={() => handleSongPress(song)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.songItemContent}>
                              <Text style={styles.songItemNumber}>{songIndex + 1}</Text>
                              <View style={styles.songItemDetails}>
                                <Text style={styles.songItemTitle}>{song.title}</Text>
                                <Text style={styles.songItemArtist}>{song.artist}</Text>
                                <View style={styles.songMetaData}>
                                  <Text style={styles.songDurationText}>{song.duration}</Text>
                                  <Text style={styles.songTempo}>• {song.tempo}</Text>
                                </View>
                              </View>
                              {song.lyricsImageUrl && (
                                <Feather name="file-text" size={16} color="#5C6BC0" />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.saveImageButton}
                onPress={captureAndSaveSetlistAsImage}
                activeOpacity={0.8}
              >
                <Feather name="download" size={20} color="white" />
                <Text style={styles.saveImageButtonText}>Save as Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lyrics Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={lyricsModalVisible}
        onRequestClose={closeLyricsModal}
      >
        <View style={styles.lyricsModalOverlay}>
          <View style={styles.lyricsModalContent}>
            <View style={styles.lyricsModalHeader}>
              <Text style={styles.lyricsModalTitle} numberOfLines={1}>
                {selectedSongTitle}
              </Text>
              <TouchableOpacity 
                onPress={closeLyricsModal}
                style={styles.lyricsCloseButton}
              >
                <Feather name="x" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.lyricsImageContainer}>
              {lyricsImageLoading && (
                <View style={styles.lyricsLoadingContainer}>
                  <ActivityIndicator size="large" color="#5C6BC0" />
                  <Text style={styles.lyricsLoadingText}>Loading lyrics...</Text>
                </View>
              )}
              
              {lyricsImageError && !lyricsImageLoading && (
                <View style={styles.lyricsErrorContainer}>
                  <Feather name="alert-circle" size={48} color="#FF5252" />
                  <Text style={styles.lyricsErrorText}>Failed to load lyrics</Text>
                  <TouchableOpacity 
                    onPress={retryLyricsImage}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {viewingLyricsUrl && (
                <ScrollView 
                  style={styles.lyricsScrollView}
                  contentContainerStyle={styles.lyricsScrollContent}
                  showsVerticalScrollIndicator={false}
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                >
                  <Image
                    source={{ uri: viewingLyricsUrl }}
                    style={[
                      styles.lyricsImage,
                      lyricsImageDimensions ? {
                        aspectRatio: lyricsImageDimensions.width / lyricsImageDimensions.height
                      } : {
                        height: screenHeight * 0.7
                      }
                    ]}
                    resizeMode="contain"
                    onLoad={handleLyricsImageLoad}
                    onError={handleLyricsImageError}
                  />
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#5C6BC0" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: '#5C6BC0',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabButtonText: {
    color: 'white',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  setlistCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  setlistCardContent: {
    flex: 1,
  },
  setlistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  setlistMainInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  deleteIconButton: {
    padding: 4,
  },
  setlistStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  chevronContainer: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5C6BC0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: screenHeight * 0.9,
  },
  setlistDetailContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: screenHeight * 0.95,
    minHeight: screenHeight * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 4,
    marginLeft: 12,
  },
  modalScrollContent: {
    maxHeight: screenHeight * 0.4,
  },
  formSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dropdown: {
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dropdownContainer: {
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#333',
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: '#5C6BC0',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
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
  imagePreviewContainer: {
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  loadingPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  retryPreviewButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#5C6BC0',
    borderRadius: 6,
  },
  retryPreviewText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  setlistContentScroll: {
    flex: 1,
  },
  setlistDetailViewScroll: {
    paddingBottom: 20,
  },
  eventInfo: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  eventTitle: {
    fontSize: 22,
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
  sessionSection: {
    marginBottom: 24,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5C6BC0',
    marginBottom: 12,
  },
  songsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
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
  songItemNumber: {
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
  songDurationText: {
    fontSize: 12,
    color: '#999',
  },
  songTempo: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  saveImageButton: {
    flex: 1,
    backgroundColor: '#5C6BC0',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveImageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  lyricsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  lyricsModalContent: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  lyricsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  lyricsModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginRight: 16,
  },
  lyricsCloseButton: {
    padding: 4,
  },
  lyricsImageContainer: {
    flex: 1,
  },
  lyricsLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricsLoadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  lyricsErrorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  lyricsErrorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  lyricsScrollView: {
    flex: 1,
  },
  lyricsScrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  lyricsImage: {
    width: screenWidth - 40,
    minHeight: 200,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SetlistGenerator;