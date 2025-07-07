import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { auth, database } from '@/lib/firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastSeen: any;
  isOnline: boolean;
  isVerified?: boolean;
  isDisabled?: boolean;
  disabledUntil?: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user is disabled
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          
          // Check if user is currently disabled
          if (userData.isDisabled && userData.disabledUntil && userData.disabledUntil > Date.now()) {
            // User is still disabled, log them out
            await signOut(auth);
            return;
          } else if (userData.isDisabled && userData.disabledUntil && userData.disabledUntil <= Date.now()) {
            // Disable period has expired, re-enable user
            await set(userRef, {
              ...userData,
              isDisabled: false,
              disabledUntil: null
            });
          }
        }

        // Set user online status
        await set(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || '',
          lastSeen: serverTimestamp(),
          isOnline: true,
          isVerified: snapshot.exists() ? snapshot.val().isVerified || false : false
        });

        // Get user profile
        const updatedSnapshot = await get(userRef);
        if (updatedSnapshot.exists()) {
          setUserProfile(updatedSnapshot.val());
        }

        // Set offline when user disconnects
        const offlineRef = ref(database, `users/${user.uid}/isOnline`);
        const lastSeenRef = ref(database, `users/${user.uid}/lastSeen`);
        
        // This will be triggered when the user goes offline
        window.addEventListener('beforeunload', () => {
          set(offlineRef, false);
          set(lastSeenRef, serverTimestamp());
        });
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
  };

  const logout = async () => {
    if (user) {
      // Set user offline before logging out
      await set(ref(database, `users/${user.uid}/isOnline`), false);
      await set(ref(database, `users/${user.uid}/lastSeen`), serverTimestamp());
    }
    await signOut(auth);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    const userRef = ref(database, `users/${user.uid}`);
    await set(userRef, { ...userProfile, ...data });
    setUserProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
