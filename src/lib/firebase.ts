
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getRemoteConfig } from 'firebase/remote-config';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGNl1qDTgmeloZRaMlNIqADYF99JAsveg",
  authDomain: "notes-app-42c4f.firebaseapp.com",
  databaseURL: "https://notes-app-42c4f-default-rtdb.firebaseio.com",
  projectId: "notes-app-42c4f",
  storageBucket: "notes-app-42c4f.firebasestorage.app",
  messagingSenderId: "423058349540",
  appId: "1:423058349540:web:57723aa1f97c137aa03bf1",
  measurementId: "G-3B2HV9P73K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const remoteConfig = getRemoteConfig(app);

// Remote Config settings
remoteConfig.settings = {
  minimumFetchIntervalMillis: 3600000, // 1 hour
  fetchTimeoutMillis: 60000, // 1 minute
};

export default app;
