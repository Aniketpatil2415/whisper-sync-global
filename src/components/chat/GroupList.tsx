
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { ref, onValue, off, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Users, Crown, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
  members: { [key: string]: { role: string; joinedAt: number } };
  createdBy: string;
  createdAt: number;
  lastMessage?: {
    text: string;
    timestamp: number;
    sender: string;
    senderName: string;
  };
  isDeleted?: boolean;
}

interface GroupListProps {
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
}

export const GroupList: React.FC<GroupListProps> = ({
  selectedChat,
  onSelectChat
}) => {
  const { user } = useAuth();
  const { isAdmin, removeGroup } = useAdmin();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const groupsRef = ref(database, 'groups');
    
    const handleGroupsChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const groupsList = Object.entries(data)
          .map(([id, group]: [string, any]) => ({
            id,
            ...group
          }))
          .filter((group: Group) => !group.isDeleted) as Group[];
        
        // For admin, show all groups. For users, show only groups they're members of
        const userGroups = isAdmin 
          ? groupsList 
          : groupsList.filter(group => {
              if (!group.members) return false;
              return Object.keys(group.members).includes(user.uid);
            });
        
        // Sort by last activity
        userGroups.sort((a, b) => {
          const aTime = a.lastMessage?.timestamp || a.createdAt || 0;
          const bTime = b.lastMessage?.timestamp || b.createdAt || 0;
          return bTime - aTime;
        });
        
        setGroups(userGroups);
      } else {
        setGroups([]);
      }
      setLoading(false);
    };

    onValue(groupsRef, handleGroupsChange);

    return () => {
      off(groupsRef, 'value', handleGroupsChange);
    };
  }, [user, isAdmin]);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!isAdmin) return;
    
    try {
      await removeGroup(groupId);
      toast({
        title: "Group deleted",
        description: `Group "${groupName}" has been deleted successfully.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete group. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatLastSeen = (timestamp: number) => {
    if (!timestamp) return '';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getMemberCount = (members: { [key: string]: any }) => {
    if (!members) return 0;
    return Object.keys(members).length;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 md:p-4">
        <Input
          type="text"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-secondary border-border text-sm"
        />
      </div>

      {/* Groups List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading groups...
          </div>
        ) : (
          <div className="px-2 md:px-3">
            {filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? 'No groups found' : 'No groups available'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredGroups.map((group) => {
                  const isSelected = selectedChat === group.id;
                  const memberCount = getMemberCount(group.members);
                  const isCreator = group.createdBy === user?.uid;
                  
                  return (
                    <div
                      key={group.id}
                      className={`
                        flex items-center space-x-3 p-2 md:p-3 rounded-lg cursor-pointer transition-colors relative group/item
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
                            <Users className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        {isCreator && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-background flex items-center justify-center">
                            <Crown className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground truncate text-sm md:text-base">
                              {group.name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {memberCount} members
                            </Badge>
                          </div>
                          {group.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatLastSeen(group.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {group.lastMessage ? (
                            `${group.lastMessage.senderName}: ${group.lastMessage.text}`
                          ) : (
                            'No messages yet'
                          )}
                        </p>
                      </div>

                      {/* Admin Controls */}
                      {isAdmin && (
                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id, group.name);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
