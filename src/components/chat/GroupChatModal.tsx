
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, push, get, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const { user, userProfile } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadUsers();
    }
  }, [isOpen, user]);

  const loadUsers = async () => {
    if (!user) return;
    
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const usersData = snapshot.val();
      const usersList = Object.values(usersData) as User[];
      setUsers(usersList.filter(u => u.uid !== user.uid));
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || !user || !userProfile) return;
    
    setLoading(true);
    try {
      const groupsRef = ref(database, 'groups');
      const groupRef = await push(groupsRef, {
        name: groupName.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: {
          [user.uid]: {
            role: 'admin',
            joinedAt: serverTimestamp()
          },
          ...Object.fromEntries(
            selectedUsers.map(userId => [
              userId,
              { role: 'member', joinedAt: serverTimestamp() }
            ])
          )
        }
      });
      
      onGroupCreated(groupRef.key!);
      onClose();
      setGroupName('');
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          
          <div className="max-h-60 overflow-y-auto">
            <h4 className="text-sm font-medium mb-2">Select Members:</h4>
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.uid} className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedUsers.includes(user.uid)}
                    onCheckedChange={() => handleUserSelect(user.uid)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL} />
                    <AvatarFallback>
                      {user.displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.displayName}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={createGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0 || loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
