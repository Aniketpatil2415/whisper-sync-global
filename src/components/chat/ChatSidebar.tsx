import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isOnline: boolean;
  lastSeen: any;
}

interface ChatSidebarProps {
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  selectedChat,
  onSelectChat
}) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const usersRef = ref(database, 'users');
    
    const handleUsersChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.values(data) as User[];
        // Filter out current user
        const otherUsers = usersList.filter(u => u.uid !== user.uid);
        setUsers(otherUsers);
      }
      setLoading(false);
    };

    onValue(usersRef, handleUsersChange);

    return () => {
      off(usersRef, 'value', handleUsersChange);
    };
  }, [user]);

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = (otherUser: User) => {
    if (!user) return;
    
    // Create chat ID by sorting user IDs to ensure consistency
    const chatId = [user.uid, otherUser.uid].sort().join('_');
    onSelectChat(chatId);
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Never';
    
    const now = Date.now();
    const lastSeenTime = typeof lastSeen === 'number' ? lastSeen : Date.now();
    const diff = now - lastSeenTime;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Search */}
      <div className="p-4">
        <Input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-secondary border-border"
        />
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? 'No users found' : 'No other users available'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredUsers.map((otherUser) => {
              const chatId = user ? [user.uid, otherUser.uid].sort().join('_') : '';
              const isSelected = selectedChat === chatId;
              
              return (
                <div
                  key={otherUser.uid}
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-primary/20 border border-primary/30' 
                      : 'hover:bg-secondary/50'
                    }
                  `}
                  onClick={() => handleStartChat(otherUser)}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherUser.photoURL} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {otherUser.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {otherUser.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-status-online rounded-full border-2 border-chat-sidebar"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground truncate">
                        {otherUser.displayName}
                      </h3>
                      {otherUser.isOnline && (
                        <Badge variant="secondary" className="text-xs bg-status-online/20 text-status-online">
                          Online
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {otherUser.isOnline ? 'Online' : `Last seen ${formatLastSeen(otherUser.lastSeen)}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};