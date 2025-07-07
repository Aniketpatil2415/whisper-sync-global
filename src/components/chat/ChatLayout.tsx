
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRemoteConfig } from '@/hooks/useRemoteConfig';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import { ProfileSetup } from './ProfileSetup';
import { GroupChatModal } from './GroupChatModal';
import { Moon, Sun, Users, Plus, Shield, CheckCircle } from 'lucide-react';

export const ChatLayout = () => {
  const { user, userProfile, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { config } = useRemoteConfig();
  const { isAdmin, adminSettings } = useAdmin();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(!userProfile?.displayName);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Check maintenance mode - block ALL non-admin users
  if (adminSettings.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
            <Shield className="w-12 h-12 md:w-16 md:h-16 text-yellow-600" />
          </div>
          <h2 className="text-xl md:text-2xl font-semibold mb-2">Maintenance Mode</h2>
          <p className="text-muted-foreground mb-4">The app is currently under maintenance. Please try again later.</p>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
        </div>
      </div>
    );
  }

  if (showProfile || !userProfile?.displayName) {
    return <ProfileSetup onComplete={() => setShowProfile(false)} />;
  }

  const handleGroupCreated = (groupId: string) => {
    setSelectedChat(groupId);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar - Hidden on mobile when chat is selected */}
      <div className={`
        w-full md:w-80 bg-card border-r border-border flex flex-col
        ${selectedChat ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="p-3 md:p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
              <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
                <AvatarImage src={userProfile?.photoURL} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {userProfile?.displayName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 md:gap-2">
                  <h2 className="font-semibold text-foreground truncate text-sm md:text-base">
                    {userProfile?.displayName}
                  </h2>
                  {userProfile?.isVerified && (
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {userProfile?.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex space-x-1">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/admin', '_blank')}
                  className="text-muted-foreground hover:text-foreground p-1 md:p-2"
                >
                  <Shield className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground p-1 md:p-2"
              >
                {isDark ? <Sun className="h-3 w-3 md:h-4 md:w-4" /> : <Moon className="h-3 w-3 md:h-4 md:w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfile(true)}
                className="text-muted-foreground hover:text-foreground p-1 md:p-2 hidden md:inline-flex"
              >
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground p-1 md:p-2"
              >
                Logout
              </Button>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            {(config.enableGroupChat && adminSettings.featureFlags.enableGroupChat) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGroupModal(true)}
                className="flex items-center space-x-1 md:space-x-2 flex-1 text-xs md:text-sm"
              >
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden md:inline">New Group</span>
                <span className="md:hidden">Group</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-1 md:space-x-2 flex-1 text-xs md:text-sm"
            >
              <Plus className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">New Chat</span>
              <span className="md:hidden">Chat</span>
            </Button>
          </div>
        </div>

        {/* Chat List */}
        <ChatSidebar 
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`
        flex-1 flex flex-col
        ${selectedChat ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedChat ? (
          <ChatWindow chatId={selectedChat} onBack={() => setSelectedChat(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background p-4">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-12 h-12 md:w-16 md:h-16 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                {config.welcomeMessage}
              </h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Select a chat to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Group Chat Modal */}
      <GroupChatModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};
