import React, { createContext, useState, useEffect, useContext } from 'react';
import { ref, update, get, onValue, off, remove, push } from 'firebase/database';
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
  disableGroup: (groupId: string, durationInDays: number) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  addMemberToGroup: (groupId: string, userId: string) => Promise<void>;
  removeMemberFromGroup: (groupId: string, userId: string) => Promise<void>;
  giveAchievementToUser: (userId: string, achievement: string) => Promise<void>;
  removeAchievementFromUser: (userId: string, achievement: string) => Promise<void>;
  getUserAnalytics: () => Promise<any>;
  updateGroupMemberLimit: (limit: number) => Promise<void>;
  deleteMessageForEveryone: (chatId: string, messageId: string) => Promise<void>;
  banUserFromGroup: (groupId: string, userId: string) => Promise<void>;
  makeUserGroupAdmin: (groupId: string, userId: string) => Promise<void>;
}

interface AdminSettings {
  maintenanceMode: boolean;
  groupMemberLimit: number;
  featureFlags: {
    enableGroupChat: boolean;
    enableFileSharing: boolean;
    enableVoiceMessages: boolean;
    enableMessageReactions: boolean;
    enableMessageDeletion: boolean;
  };
}

const AdminContext = createContext<AdminContextProps | null>(null);

const initialSettings: AdminSettings = {
  maintenanceMode: false,
  groupMemberLimit: 10,
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
        try {
          const adminRef = ref(database, `admins/${user.uid}`);
          const snapshot = await get(adminRef);
          setIsAdmin(snapshot.exists());
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
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
      await update(userRef, { isDisabled: true, disabledAt: Date.now() });
    } catch (error) {
      console.error("Error removing user:", error);
      throw error;
    }
  };

  const disableUser = async (userId: string, durationInDays: number) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const disableUntil = Date.now() + durationInDays * 24 * 60 * 60 * 1000;
      await update(userRef, { 
        isDisabled: true, 
        disabledUntil: disableUntil,
        disabledAt: Date.now(),
        disabledBy: user?.uid
      });
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
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      throw error;
    }
  };

  const removeGroup = async (groupId: string) => {
    try {
      const groupRef = ref(database, `groups/${groupId}`);
      await update(groupRef, { 
        isDeleted: true, 
        deletedAt: Date.now(),
        deletedBy: user?.uid
      });
    } catch (error) {
      console.error("Error removing group:", error);
      throw error;
    }
  };

  const disableGroup = async (groupId: string, durationInDays: number) => {
    try {
      const groupRef = ref(database, `groups/${groupId}`);
      const disableUntil = Date.now() + durationInDays * 24 * 60 * 60 * 1000;
      await update(groupRef, { 
        isDisabled: true, 
        disabledUntil: disableUntil,
        disabledAt: Date.now(),
        disabledBy: user?.uid
      });
    } catch (error) {
      console.error("Error disabling group:", error);
      throw error;
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const chatRef = ref(database, `chats/${chatId}`);
      await update(chatRef, { 
        isDeleted: true,
        deletedAt: Date.now(),
        deletedBy: user?.uid
      });
      
      // Also delete associated messages
      const messagesRef = ref(database, `messages/${chatId}`);
      await remove(messagesRef);
    } catch (error) {
      console.error("Error deleting chat:", error);
      throw error;
    }
  };

  const deleteMessageForEveryone = async (chatId: string, messageId: string) => {
    try {
      const messageRef = ref(database, `messages/${chatId}/${messageId}`);
      await update(messageRef, {
        isDeleted: true,
        deletedAt: Date.now(),
        deletedBy: user?.uid,
        deletedForEveryone: true
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  };

  const addMemberToGroup = async (groupId: string, userId: string) => {
    try {
      // Check current member count
      const groupRef = ref(database, `groups/${groupId}`);
      const snapshot = await get(groupRef);
      const groupData = snapshot.val();
      
      if (!groupData) throw new Error("Group not found");
      
      const currentMembers = Object.keys(groupData.members || {});
      if (currentMembers.length >= adminSettings.groupMemberLimit) {
        throw new Error(`Group member limit of ${adminSettings.groupMemberLimit} reached`);
      }

      const memberRef = ref(database, `groups/${groupId}/members/${userId}`);
      await update(memberRef, {
        role: 'member',
        joinedAt: Date.now(),
        addedBy: user?.uid
      });
    } catch (error) {
      console.error("Error adding member to group:", error);
      throw error;
    }
  };

  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    try {
      const memberRef = ref(database, `groups/${groupId}/members/${userId}`);
      await remove(memberRef);
    } catch (error) {
      console.error("Error removing member from group:", error);
      throw error;
    }
  };

  const banUserFromGroup = async (groupId: string, userId: string) => {
    try {
      const memberRef = ref(database, `groups/${groupId}/members/${userId}`);
      await update(memberRef, {
        isBanned: true,
        bannedAt: Date.now(),
        bannedBy: user?.uid
      });
    } catch (error) {
      console.error("Error banning user from group:", error);
      throw error;
    }
  };

  const makeUserGroupAdmin = async (groupId: string, userId: string) => {
    try {
      const memberRef = ref(database, `groups/${groupId}/members/${userId}`);
      await update(memberRef, {
        role: 'admin',
        promotedAt: Date.now(),
        promotedBy: user?.uid
      });
    } catch (error) {
      console.error("Error making user group admin:", error);
      throw error;
    }
  };

  const giveAchievementToUser = async (userId: string, achievement: string) => {
    try {
      const userRef = ref(database, `users/${userId}/achievements`);
      const timestamp = Date.now();
      await update(userRef, { 
        [achievement]: {
          awarded: true,
          timestamp,
          awardedBy: user?.uid
        }
      });
    } catch (error) {
      console.error("Error giving achievement:", error);
      throw error;
    }
  };

  const removeAchievementFromUser = async (userId: string, achievement: string) => {
    try {
      const achievementRef = ref(database, `users/${userId}/achievements/${achievement}`);
      await remove(achievementRef);
    } catch (error) {
      console.error("Error removing achievement:", error);
      throw error;
    }
  };

  const updateGroupMemberLimit = async (limit: number) => {
    try {
      const settingsRef = ref(database, 'adminSettings');
      await update(settingsRef, { groupMemberLimit: limit });
    } catch (error) {
      console.error("Error updating group member limit:", error);
      throw error;
    }
  };

  const getUserAnalytics = async () => {
    try {
      const usersRef = ref(database, 'users');
      const chatsRef = ref(database, 'chats');
      const messagesRef = ref(database, 'messages');
      const groupsRef = ref(database, 'groups');

      const [usersSnapshot, chatsSnapshot, messagesSnapshot, groupsSnapshot] = await Promise.all([
        get(usersRef),
        get(chatsRef),
        get(messagesRef),
        get(groupsRef)
      ]);

      const users = usersSnapshot.val() || {};
      const chats = chatsSnapshot.val() || {};
      const messages = messagesSnapshot.val() || {};
      const groups = groupsSnapshot.val() || {};

      const analytics = {
        totalUsers: Object.keys(users).length,
        onlineUsers: Object.values(users).filter((u: any) => u.isOnline).length,
        verifiedUsers: Object.values(users).filter((u: any) => u.isVerified).length,
        newUsersToday: Object.values(users).filter((u: any) => {
          const userCreated = u.createdAt || u.joinedAt || 0;
          const today = new Date().setHours(0, 0, 0, 0);
          return userCreated >= today;
        }).length,
        totalChats: Object.keys(chats).length,
        totalGroups: Object.keys(groups).length,
        totalMessages: Object.keys(messages).length,
        mostActiveUsers: Object.entries(users)
          .map(([uid, userData]: [string, any]) => ({
            uid,
            ...userData,
            messageCount: Object.values(messages).filter((msg: any) => msg.senderId === uid).length
          }))
          .sort((a, b) => b.messageCount - a.messageCount)
          .slice(0, 10)
      };

      return analytics;
    } catch (error) {
      console.error("Error getting analytics:", error);
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
    disableGroup,
    deleteChat,
    addMemberToGroup,
    removeMemberFromGroup,
    giveAchievementToUser,
    removeAchievementFromUser,
    getUserAnalytics,
    updateGroupMemberLimit,
    deleteMessageForEveryone,
    banUserFromGroup,
    makeUserGroupAdmin,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
