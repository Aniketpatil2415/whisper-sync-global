
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get, set, onValue, off, push, serverTimestamp } from 'firebase/database';
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

  // Load admin settings with real-time updates
  useEffect(() => {
    const settingsRef = ref(database, 'adminSettings');
    
    // Initialize default settings if they don't exist
    const initializeSettings = async () => {
      const snapshot = await get(settingsRef);
      if (!snapshot.exists()) {
        await set(settingsRef, adminSettings);
      }
    };

    const handleSettingsChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        setAdminSettings(data);
      }
    };

    initializeSettings();
    onValue(settingsRef, handleSettingsChange);

    return () => {
      off(settingsRef, 'value', handleSettingsChange);
    };
  }, []);

  const giveBlueTickToUser = async (userId: string) => {
    if (!isAdmin) return;
    
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      await set(userRef, {
        ...userData,
        isVerified: true,
        verifiedAt: serverTimestamp(),
        verifiedBy: user?.uid
      });
      
      // Log admin action
      const logRef = push(ref(database, 'adminLogs'));
      await set(logRef, {
        action: 'BLUE_TICK_GRANTED',
        targetUserId: userId,
        adminId: user?.uid,
        timestamp: serverTimestamp()
      });
    }
  };

  const removeUser = async (userId: string) => {
    if (!isAdmin) return;
    
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, null);
    
    // Log admin action
    const logRef = push(ref(database, 'adminLogs'));
    await set(logRef, {
      action: 'USER_REMOVED',
      targetUserId: userId,
      adminId: user?.uid,
      timestamp: serverTimestamp()
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
        disabledAt: serverTimestamp()
      });
      
      // Log admin action
      const logRef = push(ref(database, 'adminLogs'));
      await set(logRef, {
        action: 'USER_DISABLED',
        targetUserId: userId,
        duration: duration,
        adminId: user?.uid,
        timestamp: serverTimestamp()
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
    
    // Log admin action
    const logRef = push(ref(database, 'adminLogs'));
    await set(logRef, {
      action: 'FEATURE_TOGGLED',
      feature: feature,
      enabled: newSettings.featureFlags[feature],
      adminId: user?.uid,
      timestamp: serverTimestamp()
    });
  };

  const toggleMaintenanceMode = async () => {
    if (!isAdmin) return;
    
    const newSettings = {
      ...adminSettings,
      maintenanceMode: !adminSettings.maintenanceMode
    };
    
    const settingsRef = ref(database, 'adminSettings');
    await set(settingsRef, newSettings);
    
    // Log admin action
    const logRef = push(ref(database, 'adminLogs'));
    await set(logRef, {
      action: 'MAINTENANCE_MODE_TOGGLED',
      enabled: newSettings.maintenanceMode,
      adminId: user?.uid,
      timestamp: serverTimestamp()
    });
  };

  const removeGroup = async (groupId: string) => {
    if (!isAdmin) return;
    
    const groupRef = ref(database, `groups/${groupId}`);
    await set(groupRef, null);
    
    // Remove all messages in the group
    const messagesRef = ref(database, `messages/${groupId}`);
    await set(messagesRef, null);
    
    // Log admin action
    const logRef = push(ref(database, 'adminLogs'));
    await set(logRef, {
      action: 'GROUP_REMOVED',
      targetGroupId: groupId,
      adminId: user?.uid,
      timestamp: serverTimestamp()
    });
  };

  const deleteChat = async (chatId: string) => {
    if (!isAdmin) return;
    
    const messagesRef = ref(database, `messages/${chatId}`);
    await set(messagesRef, null);
    
    // Log admin action
    const logRef = push(ref(database, 'adminLogs'));
    await set(logRef, {
      action: 'CHAT_DELETED',
      targetChatId: chatId,
      adminId: user?.uid,
      timestamp: serverTimestamp()
    });
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
