import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../FirebaseConfig';

interface Message {
  id: string;
  text: string;
  senderEmail: string;
  senderName: string;
  timestamp: Timestamp;
}

const BandGroupChat = () => {
  const [bandId, setBandId] = useState<string | null>(null);
  const [bandName, setBandName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  // Load user and band details on component mount
  useEffect(() => {
    const loadUserAndBandDetails = async () => {
      try {
        setLoading(true);
        
        // Get user email and band name from AsyncStorage (matching your login flow)
        const storedUserEmail = await AsyncStorage.getItem('userEmail');
        const storedBandName = await AsyncStorage.getItem('bandName');
        
        if (!storedUserEmail) {
          Alert.alert("Error", "User details not found. Please log in again.");
          return;
        }
        
        if (!storedBandName) {
          Alert.alert("Error", "Band details not found.");
          return;
        }
        
        setUserEmail(storedUserEmail);
        setBandName(storedBandName);
        
        // Get user name from Firestore
        const fetchUserName = async () => {
          const bandsSnapshot = await getDocs(collection(db, "bands"));
          
          for (const bandDoc of bandsSnapshot.docs) {
            const bandId = bandDoc.id;
            const usersQuery = query(
              collection(db, `bands/${bandId}/users`),
              where("email", "==", storedUserEmail)
            );
            
            const usersSnapshot = await getDocs(usersQuery);
            
            if (!usersSnapshot.empty) {
              const userData = usersSnapshot.docs[0].data();
              setUserName(userData.name || storedUserEmail.split('@')[0]);
              break;
            }
          }
        };
        
        await fetchUserName();
        
        // Get band ID from Firestore based on band name
        const bandQuery = query(
          collection(db, "bands"),
          where("bandName", "==", storedBandName)
        );
        
        const bandSnapshot = await getDocs(bandQuery);
        
        if (bandSnapshot.empty) {
          Alert.alert("Error", "Band not found in database");
          return;
        }
        
        const bandData = bandSnapshot.docs[0];
        const currentBandId = bandData.id;
        setBandId(currentBandId);
        
      } catch (error) {
        console.error("Error loading initial data:", error);
        Alert.alert("Error", "Failed to load chat data");
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndBandDetails();
  }, []);
  
  // Subscribe to messages when bandId is available
  useEffect(() => {
    if (!bandId) return;
    
    // Create messages collection if it doesn't exist
    const ensureMessagesCollection = async () => {
      try {
        // Check if any messages exist
        const messagesRef = collection(db, `bands/${bandId}/messages`);
        const messagesQuery = query(messagesRef);
        const messagesSnapshot = await getDocs(messagesQuery);
        
        // If there are no messages, create a welcome message
        if (messagesSnapshot.empty) {
          await addDoc(collection(db, `bands/${bandId}/messages`), {
            text: `Welcome to ${bandName}'s group chat!`,
            senderEmail: 'system@groovelab.app',
            senderName: 'GrooveLab',
            timestamp: Timestamp.now()
          });
        }
      } catch (error) {
        console.error("Error ensuring messages collection:", error);
      }
    };
    
    ensureMessagesCollection();
    
    // Set up real-time listener for messages
    const messagesRef = collection(db, `bands/${bandId}/messages`);
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const loadedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(loadedMessages);
      
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        if (flatListRef.current && loadedMessages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }, (error) => {
      console.error("Error listening for messages:", error);
      Alert.alert("Error", "Failed to load messages");
    });
    
    // Clean up subscription on unmount
    return () => unsubscribe();
  }, [bandId, bandName]);
  
  const sendMessage = async () => {
    if (!message.trim() || !bandId || !userEmail) return;
    
    try {
      setSending(true);
      
      const newMessage = {
        text: message.trim(),
        senderEmail: userEmail,
        senderName: userName || userEmail.split('@')[0], // Use name or email username if name not set
        timestamp: Timestamp.now()
      };
      
      await addDoc(collection(db, `bands/${bandId}/messages`), newMessage);
      setMessage(''); // Clear input
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };
  
  // Format timestamp to readable time
  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date for message grouping
  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    
    return date.toLocaleDateString();
  };
  
  // Determine if message is from current user
  const isCurrentUser = (senderEmail: string) => {
    return senderEmail === userEmail;
  };
  
  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: {[key: string]: Message[]} = {};
    
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
        keyboardVerticalOffset={100}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{bandName} Chat</Text>
        </View>
        
        <FlatList
          ref={flatListRef}
          data={groupMessagesByDate()}
          keyExtractor={(item) => item.date}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          renderItem={({ item: group }) => (
            <View>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{group.date}</Text>
              </View>
              
              {group.messages.map((message: { id: React.Key | null | undefined; senderEmail: string; senderName: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; text: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; timestamp: Timestamp; }) => (
                <View 
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    isCurrentUser(message.senderEmail) ? styles.currentUserMessage : styles.otherUserMessage
                  ]}
                >
                  {!isCurrentUser(message.senderEmail) && (
                    <Text style={styles.senderName}>{message.senderName}</Text>
                  )}
                  <Text style={[
                    styles.messageText,
                    isCurrentUser(message.senderEmail) ? styles.currentUserMessageText : styles.otherUserMessageText
                  ]}>
                    {message.text}
                  </Text>
                  <Text style={[
                    styles.timestamp,
                    isCurrentUser(message.senderEmail) ? styles.currentUserTimestamp : styles.otherUserTimestamp
                  ]}>
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          onContentSizeChange={() => {
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1A237E',
  },
  header: {
    backgroundColor: '#5C6BC0',
    padding: 15,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 10,
    paddingBottom: 20,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateHeaderText: {
    backgroundColor: '#E8EAF6',
    color: '#5C6BC0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#5C6BC0',
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8EAF6',
  },
  senderName: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
    color: '#555',
  },
  messageText: {
    fontSize: 16,
  },
  currentUserMessageText: {
    color: '#fff',
  },
  otherUserMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  currentUserTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherUserTimestamp: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8EAF6',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#5C6BC0',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#C5CAE9',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default BandGroupChat;