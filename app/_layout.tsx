// In _layout.tsx (Root layout)
import React, { useEffect, useState } from 'react';
import { Redirect, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { screenOptionsFactory } from 'expo-router/build/useScreens';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const userEmail = await AsyncStorage.getItem('userEmail');
        setIsAuthenticated(!!userEmail);
      } catch (error) {
        console.error("Error checking auth status:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }}/>
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      {!isAuthenticated ? (
        <Stack.Screen name="index" options={{ headerShown: false }} />
      ) : (
        <>
          
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pages" options={{ headerShown: false }} />
          
        </>
      )}
    </Stack>
  );
}