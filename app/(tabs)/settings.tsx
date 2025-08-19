import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { router } from 'expo-router';

type RootStackParamList = {
  '/': undefined;
};

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, '/'>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // For demo purposes only
  const [storageUsage, setStorageUsage] = useState<string>("54.3 MB");

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Log Out", 
          onPress: () => router.replace("/"),
          style: "destructive"
        }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all temporarily stored data. Your account information and saved data will not be affected.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Clear", 
          onPress: () => {
            // For demo purposes
            setStorageUsage("23.1 MB");
            Alert.alert("Success", "Cache has been cleared successfully.");
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert("Export Data", "Your data will be exported as CSV and sent to your registered email address.");
  };

  const handleFeatureRequest = () => {
    Alert.alert("Feature Request", "This would typically open a form or email composer to submit feature requests.");
  };

  const SettingsItem = ({ 
    icon, 
    title, 
    subtitle = "", 
    onPress, 
    rightElement = null 
  }: { 
    icon: React.ReactNode, 
    title: string, 
    subtitle?: string, 
    onPress?: () => void,
    rightElement?: React.ReactNode
  }) => (
    <TouchableOpacity 
      style={styles.settingsItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingsItemTitle}>{title}</Text>
          {subtitle ? <Text style={styles.settingsItemSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightElement ? rightElement : (
        onPress ? <Ionicons name="chevron-forward" size={20} color="#888" /> : null
      )}
    </TouchableOpacity>
  );

  const SettingsSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  // For demo purposes - toggle admin status
  const toggleAdmin = () => setIsAdmin(!isAdmin);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        <SettingsSection title="App Information">
          <SettingsItem 
            icon={<Ionicons name="information-circle-outline" size={24} color="#5271ff" />}
            title="App Version"
            subtitle="v1.2.3 (Build 45)"
          />
          <SettingsItem 
            icon={<Ionicons name="code-slash-outline" size={24} color="#5271ff" />}
            title="Developer Info"
            subtitle="BandManager Team"
          />
        </SettingsSection>

        <SettingsSection title="Storage">
          <SettingsItem 
            icon={<Ionicons name="server-outline" size={24} color="#5271ff" />}
            title="Data & Storage"
            onPress={() => {}}
          />
          <SettingsItem 
            icon={<Ionicons name="trash-bin-outline" size={24} color="#5271ff" />}
            title="Clear Cached Data"
            subtitle="Free up storage space"
            onPress={handleClearCache}
          />
          <SettingsItem 
            icon={<Ionicons name="analytics-outline" size={24} color="#5271ff" />}
            title="Storage Usage"
            subtitle={storageUsage}
          />
          {isAdmin && (
            <SettingsItem 
              icon={<Ionicons name="download-outline" size={24} color="#5271ff" />}
              title="Export Data"
              subtitle="Admin Only"
              onPress={handleExportData}
            />
          )}
        </SettingsSection>

        <SettingsSection title="Help & Feedback">
          <SettingsItem 
            icon={<Ionicons name="bulb-outline" size={24} color="#5271ff" />}
            title="Feature Requests"
            subtitle="Suggest new features"
            onPress={handleFeatureRequest}
          />
        </SettingsSection>

        {/* For demo purposes only - toggle admin status */}
        <SettingsSection title="Demo Controls">
          <SettingsItem 
            icon={<Ionicons name="shield-outline" size={24} color="#5271ff" />}
            title="Admin Mode"
            subtitle="Toggle admin features visibility"
            rightElement={
              <Switch 
                value={isAdmin}
                onValueChange={toggleAdmin}
                trackColor={{ false: "#d4d4d4", true: "#bfd0ff" }}
                thumbColor={isAdmin ? "#5271ff" : "#f4f4f4"}
              />
            }
          />
        </SettingsSection>
      </ScrollView>

      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#5271ff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5271ff',
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  logoutContainer: {
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: '#ff5252',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SettingsScreen;