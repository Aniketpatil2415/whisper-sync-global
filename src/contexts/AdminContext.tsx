
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get, set, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';

interface AdminSettings {
  maintenanceMode: boolean;
  featureFlags: {
    enableGroupChat: boolean;
    enableFileSharing: boolean;
    enableVoiceMessages: boolean;
  };
}

interface AdminContextType {
  isAdmin: boolean;
  adminSettings: AdminSettings;
  giveBlueTickToUser: (userId: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  disableUser: (userId: string, duration: number) => Promise<void>;
  toggleFeature: (feature: keyof AdminSettings['featureFlags']) => Promise<void>;
  toggleMaintenanceMode: () => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    maintenanceMode: false,
    featureFlags: {
      enableGroupChat: true,
      enableFileSharing: true,
      enableVoiceMessages: false,
    }
  });

  // Check if current user is admin
  useEffect(() => {
    if (user && userProfile) {
      const adminEmail = 'aniketpatil2415@gmail.com';
      setIsAdmin(user.email === adminEmail);
    }
  }, [user, userProfile]);

  // Load admin settings
  useEffect(() => {
    if (isAdmin) {
      const settingsRef = ref(database, 'adminSettings');
      
      const handleSettingsChange = (snapshot: any) => {
        const data = snapshot.val();
        if (data) {
          setAdminSettings(data);
        }
      };

      onValue(settingsRef, handleSettingsChange);

      return () => {
        off(settingsRef, 'value', handleSettingsChange);
      };
    }
  }, [isAdmin]);

  const giveBlueTickToUser = async (userId: string) => {
    if (!isAdmin) return;
    
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      await set(userRef, {
        ...userData,
        isVerified: true,
        verifiedAt: Date.now(),
        verifiedBy: user?.uid
      });
    }
  };

  const removeUser = async (userId: string) => {
    if (!isAdmin) return;
    
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, null);
    
    // Log admin action
    const logRef = ref(database, 'adminLogs');
    await set(logRef, {
      action: 'USER_REMOVED',
      targetUserId: userId,
      adminId: user?.uid,
      timestamp: Date.now()
    });
  };

  const disableUser = async (userId: string, duration: number) => {
    if (!isAdmin) return;
    
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      const disabledUntil = Date.now() + (duration * 24 * 60 * 60 * 1000); // duration in days
      
      await set(userRef, {
        ...userData,
        isDisabled: true,
        disabledUntil,
        disabledBy: user?.uid,
        disabledAt: Date.now()
      });
    }
  };

  const toggleFeature = async (feature: keyof AdminSettings['featureFlags']) => {
    if (!isAdmin) return;
    
    const newSettings = {
      ...adminSettings,
      featureFlags: {
        ...adminSettings.featureFlags,
        [feature]: !adminSettings.featureFlags[feature]
      }
    };
    
    const settingsRef = ref(database, 'adminSettings');
    await set(settingsRef, newSettings);
    setAdminSettings(newSettings);
  };

  const toggleMaintenanceMode = async () => {
    if (!isAdmin) return;
    
    const newSettings = {
      ...adminSettings,
      maintenanceMode: !adminSettings.maintenanceMode
    };
    
    const settingsRef = ref(database, 'adminSettings');
    await set(settingsRef, newSettings);
    setAdminSettings(newSettings);
  };

  const removeGroup = async (groupId: string) => {
    if (!isAdmin) return;
    
    const groupRef = ref(database, `groups/${groupId}`);
    await set(groupRef, null);
    
    // Remove all messages in the group
    const messagesRef = ref(database, `messages/${groupId}`);
    await set(messagesRef, null);
  };

  const deleteChat = async (chatId: string) => {
    if (!isAdmin) return;
    
    const messagesRef = ref(database, `messages/${chatId}`);
    await set(messagesRef, null);
  };

  const value: AdminContextType = {
    isAdmin,
    adminSettings,
    giveBlueTickToUser,
    removeUser,
    disableUser,
    toggleFeature,
    toggleMaintenanceMode,
    removeGroup,
    deleteChat
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
