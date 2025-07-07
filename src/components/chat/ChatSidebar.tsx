
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isOnline: boolean;
  lastSeen: any;
  isVerified?: boolean;
}

interface Group {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: number;
  lastMessage?: {
    text: string;
    timestamp: number;
    sender: string;
  };
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const usersRef = ref(database, 'users');
    const groupsRef = ref(database, 'groups');
    
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

    const handleGroupsChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const groupsList = Object.entries(data).map(([id, group]: [string, any]) => ({
          id,
          ...group
        })) as Group[];
        // Filter groups where current user is a member
        const userGroups = groupsList.filter(group => 
          group.members && group.members.includes(user.uid)
        );
        setGroups(userGroups);
      }
    };

    onValue(usersRef, handleUsersChange);
    onValue(groupsRef, handleGroupsChange);

    return () => {
      off(usersRef, 'value', handleUsersChange);
      off(groupsRef, 'value', handleGroupsChange);
    };
  }, [user]);

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="flex-1 flex flex-col h-full">
      {/* Search */}
      <div className="p-3 md:p-4">
        <Input
          type="text"
          placeholder="Search users and groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-secondary border-border text-sm"
        />
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading chats...
          </div>
        ) : (
          <>
            {/* Groups Section */}
            {filteredGroups.length > 0 && (
              <div className="px-2 md:px-3 mb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">Groups</h3>
                <div className="space-y-1">
                  {filteredGroups.map((group) => {
                    const isSelected = selectedChat === group.id;
                    
                    return (
                      <div
                        key={group.id}
                        className={`
                          flex items-center space-x-3 p-2 md:p-3 rounded-lg cursor-pointer transition-colors
                          ${isSelected 
                            ? 'bg-primary/20 border border-primary/30' 
                            : 'hover:bg-secondary/50'
                          }
                        `}
                        onClick={() => onSelectChat(group.id)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10 md:h-12 md:w-12">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {group.name[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground truncate text-sm md:text-base">
                              {group.name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              Group
                            </Badge>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {group.members.length} members
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Users Section */}
            {filteredUsers.length === 0 && filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? 'No chats found' : 'No chats available'}
              </div>
            ) : (
              <div className="px-2 md:px-3">
                {filteredUsers.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">Direct Messages</h3>
                    <div className="space-y-1">
                      {filteredUsers.map((otherUser) => {
                        const chatId = user ? [user.uid, otherUser.uid].sort().join('_') : '';
                        const isSelected = selectedChat === chatId;
                        
                        return (
                          <div
                            key={otherUser.uid}
                            className={`
                              flex items-center space-x-3 p-2 md:p-3 rounded-lg cursor-pointer transition-colors
                              ${isSelected 
                                ? 'bg-primary/20 border border-primary/30' 
                                : 'hover:bg-secondary/50'
                              }
                            `}
                            onClick={() => handleStartChat(otherUser)}
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10 md:h-12 md:w-12">
                                <AvatarImage src={otherUser.photoURL} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                  {otherUser.displayName[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {otherUser.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-status-online rounded-full border-2 border-chat-sidebar"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-foreground truncate text-sm md:text-base">
                                    {otherUser.displayName}
                                  </h3>
                                  {otherUser.isVerified && (
                                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-blue-500 flex-shrink-0" />
                                  )}
                                </div>
                                {otherUser.isOnline && (
                                  <Badge variant="secondary" className="text-xs bg-status-online/20 text-status-online">
                                    Online
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground truncate">
                                {otherUser.isOnline ? 'Online' : `Last seen ${formatLastSeen(otherUser.lastSeen)}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
