
import React, { createContext, useState, useEffect, useContext } from 'react';
import { ref, update, get, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from './AuthContext';

interface AdminContextProps {
  isAdmin: boolean;
  adminSettings: AdminSettings;
  giveBlueTickToUser: (userId: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  disableUser: (userId: string, durationInDays: number) => Promise<void>;
  toggleFeature: (feature: string) => Promise<void>;
  toggleMaintenanceMode: () => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
}

interface AdminSettings {
  maintenanceMode: boolean;
  featureFlags: {
    enableGroupChat: boolean;
    enableFileSharing: boolean;
    enableVoiceMessages: boolean;
    enableMessageReactions: boolean;
    enableMessageDeletion: boolean;
  };
}

const AdminContext = createContext<AdminContextProps | undefined>(undefined);

const initialSettings: AdminSettings = {
  maintenanceMode: false,
  featureFlags: {
    enableGroupChat: true,
    enableFileSharing: true,
    enableVoiceMessages: true,
    enableMessageReactions: true,
    enableMessageDeletion: true,
  }
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(initialSettings);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminRef = ref(database, `admins/${user.uid}`);
        const snapshot = await get(adminRef);
        setIsAdmin(snapshot.exists());
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    const settingsRef = ref(database, 'adminSettings');
    
    const handleSettingsChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        setAdminSettings(data);
      } else {
        // Initialize with default settings if none exist
        update(settingsRef, initialSettings);
        setAdminSettings(initialSettings);
      }
    };

    onValue(settingsRef, handleSettingsChange);

    return () => {
      off(settingsRef, 'value', handleSettingsChange);
    };
  }, []);

  const giveBlueTickToUser = async (userId: string) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, { isVerified: true });
    } catch (error) {
      console.error("Error giving blue tick:", error);
      throw error;
    }
  };

  const removeUser = async (userId: string) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, { isDisabled: true });
    } catch (error) {
      console.error("Error removing user:", error);
      throw error;
    }
  };

  const disableUser = async (userId: string, durationInDays: number) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const disableUntil = Date.now() + durationInDays * 24 * 60 * 60 * 1000;
      await update(userRef, { isDisabled: true, disabledUntil: disableUntil });
    } catch (error) {
      console.error("Error disabling user:", error);
      throw error;
    }
  };

  const toggleFeature = async (feature: string) => {
    try {
      const currentValue = adminSettings.featureFlags[feature as keyof typeof adminSettings.featureFlags];
      const newValue = !currentValue;
      
      const settingsRef = ref(database, 'adminSettings');
      await update(settingsRef, { 
        featureFlags: {
          ...adminSettings.featureFlags,
          [feature]: newValue
        }
      });

      // Update local state
      setAdminSettings(prevSettings => ({
        ...prevSettings,
        featureFlags: {
          ...prevSettings.featureFlags,
          [feature]: newValue
        }
      }));
    } catch (error) {
      console.error("Error toggling feature:", error);
      throw error;
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      const newValue = !adminSettings.maintenanceMode;
      const settingsRef = ref(database, 'adminSettings');
      await update(settingsRef, { 
        maintenanceMode: newValue 
      });

      // Update local state
      setAdminSettings(prevSettings => ({
        ...prevSettings,
        maintenanceMode: newValue
      }));
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      throw error;
    }
  };

  const removeGroup = async (groupId: string) => {
    try {
      const groupRef = ref(database, `groups/${groupId}`);
      await update(groupRef, { isDeleted: true });
    } catch (error) {
      console.error("Error removing group:", error);
      throw error;
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const chatRef = ref(database, `chats/${chatId}`);
      await update(chatRef, { isDeleted: true });
    } catch (error) {
      console.error("Error deleting chat:", error);
      throw error;
    }
  };

  const value: AdminContextProps = {
    isAdmin,
    adminSettings,
    giveBlueTickToUser,
    removeUser,
    disableUser,
    toggleFeature,
    toggleMaintenanceMode,
    removeGroup,
    deleteChat,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
