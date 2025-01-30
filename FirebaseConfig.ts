import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJTSJ68I2RuDrP4YlsjkcCuIOp2l7qHlY",
  authDomain: "groovelab-fd9e1.firebaseapp.com",
  projectId: "groovelab-fd9e1",
  storageBucket: "groovelab-fd9e1.firebasestorage.app",
  messagingSenderId: "127817373650",
  appId: "1:127817373650:web:f1424ff3abaa65a6a49a0b",

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);