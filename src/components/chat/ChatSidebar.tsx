
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, onValue, off, push, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isOnline: boolean;
  lastSeen: any;
  isVerified?: boolean;
}

interface ChatItem {
  id: string;
  type: 'user' | 'group';
  user?: User;
  group?: Group;
  lastActivity: number;
  lastMessage?: {
    text: string;
    timestamp: number;
    sender: string;
    senderName: string;
  };
  hasUnread?: boolean;
  isPendingRequest?: boolean;
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
  const { user, userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const usersRef = ref(database, 'users');
    const groupsRef = ref(database, 'groups');
    const chatsRef = ref(database, 'chats');
    const requestsRef = ref(database, `chatRequests/${user.uid}`);
    
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
        const userGroups = groupsList.filter(group => {
          // Ensure members exists and is an array before using includes
          if (!group.members) return false;
          if (Array.isArray(group.members)) {
            return group.members.includes(user.uid);
          }
          // If members is an object (Firebase sometimes stores as object)
          if (typeof group.members === 'object') {
            return Object.values(group.members).includes(user.uid);
          }
          return false;
        });
        setGroups(userGroups);
      }
    };

    const handleRequestsChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const requests = Object.keys(data).filter(chatId => data[chatId].status === 'pending');
        setPendingRequests(requests);
      } else {
        setPendingRequests([]);
      }
    };

    onValue(usersRef, handleUsersChange);
    onValue(groupsRef, handleGroupsChange);
    onValue(requestsRef, handleRequestsChange);

    return () => {
      off(usersRef, 'value', handleUsersChange);
      off(groupsRef, 'value', handleGroupsChange);
      off(requestsRef, 'value', handleRequestsChange);
    };
  }, [user]);

  // Create combined chat items with last activity
  useEffect(() => {
    if (!user) return;

    const items: ChatItem[] = [];

    // Add users with chat activity
    users.forEach(otherUser => {
      const chatId = [user.uid, otherUser.uid].sort().join('_');
      items.push({
        id: chatId,
        type: 'user',
        user: otherUser,
        lastActivity: otherUser.lastSeen || 0,
        isPendingRequest: pendingRequests.includes(chatId)
      });
    });

    // Add groups
    groups.forEach(group => {
      items.push({
        id: group.id,
        type: 'group',
        group,
        lastActivity: group.lastMessage?.timestamp || group.createdAt || 0
      });
    });

    // Sort by last activity (most recent first)
    items.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));

    setChatItems(items);
  }, [users, groups, user, pendingRequests]);

  const filteredChatItems = chatItems.filter(item => {
    if (item.type === 'user' && item.user) {
      return item.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             item.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (item.type === 'group' && item.group) {
      return item.group.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return false;
  });

  const handleStartChat = async (otherUser: User) => {
    if (!user) return;
    
    const chatId = [user.uid, otherUser.uid].sort().join('_');
    
    // Check if the other user is verified and this is first contact
    if (otherUser.isVerified && !userProfile?.isVerified) {
      // Check if there are existing messages
      const chatRef = ref(database, `chats/${chatId}/messages`);
      const chatSnapshot = await get(chatRef);
      
      if (!chatSnapshot.exists()) {
        // Send chat request
        const requestRef = ref(database, `chatRequests/${otherUser.uid}/${chatId}`);
        await push(requestRef, {
          from: user.uid,
          fromName: user.displayName || 'Unknown User',
          fromAvatar: user.photoURL || '',
          status: 'pending',
          timestamp: Date.now()
        });
        
        toast({
          title: "Chat request sent",
          description: `Your chat request has been sent to ${otherUser.displayName}`
        });
        return;
      }
    }
    
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
    <div className="flex flex-col h-full">
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
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading chats...
          </div>
        ) : (
          <div className="px-2 md:px-3">
            {filteredChatItems.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? 'No chats found' : 'No chats available'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredChatItems.map((item) => {
                  if (item.type === 'group' && item.group) {
                    const isSelected = selectedChat === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`
                          flex items-center space-x-3 p-2 md:p-3 rounded-lg cursor-pointer transition-colors
                          ${isSelected 
                            ? 'bg-primary/20 border border-primary/30' 
                            : 'hover:bg-secondary/50'
                          }
                        `}
                        onClick={() => onSelectChat(item.id)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10 md:h-12 md:w-12">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {item.group.name[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground truncate text-sm md:text-base">
                              {item.group.name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              Group
                            </Badge>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {Array.isArray(item.group.members) ? item.group.members.length : Object.keys(item.group.members || {}).length} members
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'user' && item.user) {
                    const isSelected = selectedChat === item.id;
                    const isPending = item.isPendingRequest;
                    
                    return (
                      <div
                        key={item.id}
                        className={`
                          flex items-center space-x-3 p-2 md:p-3 rounded-lg cursor-pointer transition-colors
                          ${isSelected 
                            ? 'bg-primary/20 border border-primary/30' 
                            : 'hover:bg-secondary/50'
                          }
                          ${isPending ? 'opacity-60' : ''}
                        `}
                        onClick={() => handleStartChat(item.user!)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10 md:h-12 md:w-12">
                            <AvatarImage src={item.user.photoURL} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {item.user.displayName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {item.user.isOnline && !isPending && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-status-online rounded-full border-2 border-chat-sidebar"></div>
                          )}
                          {isPending && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-orange-500 rounded-full border-2 border-chat-sidebar flex items-center justify-center">
                              <Clock className="h-2 w-2 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground truncate text-sm md:text-base">
                                {item.user.displayName}
                              </h3>
                              {item.user.isVerified && (
                                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            {isPending ? (
                              <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-500">
                                Pending
                              </Badge>
                            ) : item.user.isOnline ? (
                              <Badge variant="secondary" className="text-xs bg-status-online/20 text-status-online">
                                Online
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {isPending 
                              ? 'Chat request pending...'
                              : item.user.isOnline 
                                ? 'Online' 
                                : `Last seen ${formatLastSeen(item.user.lastSeen)}`
                            }
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
