import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  ActivityIndicator, 
  Alert, 
  RefreshControl, 
  ScrollView, 
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar
} from "react-native";
import { db } from "../../../FirebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  getDocs,
  query,
  orderBy,
  DocumentData,
  where
} from "firebase/firestore";
import { Link, useRouter } from "expo-router";

interface DataItem {
  id: string;
  location: string;
  dateTime: string;
  specialNotes?: string;
}

const { width } = Dimensions.get('window');

const Event = () => {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bandId, setBandId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchBandId = async () => {
      try {
        const storedBandName = await AsyncStorage.getItem("bandName");
        if (storedBandName) {
          const bandQuery = query(collection(db, "bands"), where("bandName", "==", storedBandName));
          const bandSnapshot = await getDocs(bandQuery);
          if (!bandSnapshot.empty) {
            setBandId(bandSnapshot.docs[0].id);
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
      getItems();
    }
  }, [bandId]);

  const getItems = async () => {
    if (!bandId) return;

    try {
      setLoading(true);
      const eventsCollection = collection(db, `bands/${bandId}/events`);
      const eventsQuery = query(eventsCollection, orderBy("dateTime", "asc"));
      const querySnapshot = await getDocs(eventsQuery);
      const itemsList: DataItem[] = [];

      querySnapshot.forEach((doc) => {
        itemsList.push({
          id: doc.id,
          ...(doc.data() as Omit<DataItem, "id">),
        });
      });

      setItems(itemsList);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch events");
      console.error("Error getting documents:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    getItems();
  };

  const handleEventPress = (item: DataItem) => {
    router.push({
      pathname: "/(tabs)/pages/eventItem",
      params: {
        id: item.id,
        location: item.location,
        dateTime: item.dateTime,
        specialNotes: item.specialNotes || "",
      },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming Events</Text>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#4A90E2"]}
            tintColor="#4A90E2"
          />
        }
      >
        {items.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="calendar-outline" size={60} color="#8E8E93" />
            <Text style={styles.emptyStateText}>
              No events scheduled
            </Text>
            <Text style={styles.emptyStateSubText}>
              Pull down to refresh
            </Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {items.map((item) => (
              <Pressable
                key={item.id}
                style={({pressed}) => [
                  styles.eventCard,
                  pressed && styles.eventCardPressed
                ]}
                onPress={() => handleEventPress(item)}
                android_ripple={{color: 'rgba(0, 0, 0, 0.1)'}}
              >
                <View style={styles.eventDateContainer}>
                  <Text style={styles.eventDate}>{formatDate(item.dateTime)}</Text>
                  <Text style={styles.eventTime}>{formatTime(item.dateTime)}</Text>
                </View>
                
                <View style={styles.eventDetailsContainer}>
                  <View style={styles.locationContainer}>
                    <Ionicons name="location" size={18} color="#4A90E2" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>
                  
                  {item.specialNotes && (
                    <View style={styles.notesContainer}>
                      <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
                      <Text style={styles.notesText} numberOfLines={1}>
                        {item.specialNotes}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  eventsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventCardPressed: {
    backgroundColor: '#F5F5F5',
  },
  eventDateContainer: {
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#EFEFEF',
    justifyContent: 'center',
    minWidth: 80,
  },
  eventDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  eventTime: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  eventDetailsContainer: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginLeft: 6,
    flex: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 6,
    flex: 1,
  },
  chevronContainer: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
});

export default Event;