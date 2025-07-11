
import React, { useState, useEffect } from 'react';
import { ref, get, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdmin } from '@/contexts/AdminContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, UserMinus, Settings, Trash2, Ban, Clock } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  members: { [key: string]: { role: string; joinedAt: number } };
  createdBy: string;
  createdAt: number;
  isDisabled?: boolean;
  disabledUntil?: number;
}

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface GroupMemberManagerProps {
  group: Group;
  trigger?: React.ReactNode;
}

export const GroupMemberManager: React.FC<GroupMemberManagerProps> = ({ 
  group, 
  trigger 
}) => {
  const { 
    adminSettings,
    addMemberToGroup, 
    removeMemberFromGroup, 
    disableGroup, 
    removeGroup 
  } = useAdmin();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [memberUsers, setMemberUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [disableDuration, setDisableDuration] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    
    const handleUsersChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data).map(([uid, userData]: [string, any]) => ({
          uid,
          ...userData
        })) as User[];
        setAllUsers(usersList);
        
        // Filter members of this group
        const groupMemberIds = Object.keys(group.members || {});
        const groupMembers = usersList.filter(user => groupMemberIds.includes(user.uid));
        setMemberUsers(groupMembers);
      }
    };

    onValue(usersRef, handleUsersChange);

    return () => {
      off(usersRef, 'value', handleUsersChange);
    };
  }, [group]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    
    setLoading(true);
    try {
      await addMemberToGroup(group.id, selectedUserId);
      toast({
        title: "Success",
        description: "Member added to group successfully!"
      });
      setSelectedUserId('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    setLoading(true);
    try {
      await removeMemberFromGroup(group.id, userId);
      toast({
        title: "Success",
        description: `${userName} removed from group successfully!`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableGroup = async () => {
    setLoading(true);
    try {
      await disableGroup(group.id, parseInt(disableDuration));
      toast({
        title: "Success",
        description: `Group disabled for ${disableDuration} day(s)!`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable group",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    setLoading(true);
    try {
      await removeGroup(group.id);
      toast({
        title: "Success",
        description: "Group deleted successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = allUsers.filter(user => 
    !Object.keys(group.members || {}).includes(user.uid)
  );

  const currentMemberCount = Object.keys(group.members || {}).length;
  const canAddMembers = currentMemberCount < adminSettings.groupMemberLimit;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Manage Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Group: {group.name}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          <div className="space-y-6">
            {/* Group Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Group Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Members:</span>
                  <Badge variant="secondary">
                    {currentMemberCount} / {adminSettings.groupMemberLimit}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm">
                    {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {group.isDisabled && (
                  <Badge variant="destructive" className="w-full justify-center">
                    Group Disabled
                    {group.disabledUntil && ` until ${new Date(group.disabledUntil).toLocaleDateString()}`}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Add Member */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </CardTitle>
                <CardDescription>
                  Add new members to this group (Limit: {adminSettings.groupMemberLimit})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select 
                      value={selectedUserId} 
                      onValueChange={setSelectedUserId}
                      disabled={!canAddMembers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={canAddMembers ? "Select user to add" : "Member limit reached"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.uid} value={user.uid}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback className="text-xs">
                                  {user.displayName?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user.displayName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleAddMember}
                    disabled={!selectedUserId || loading || !canAddMembers}
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Members */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {memberUsers.map((member) => {
                    const memberData = group.members[member.uid];
                    const isCreator = group.createdBy === member.uid;
                    
                    return (
                      <div
                        key={member.uid}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.photoURL} />
                            <AvatarFallback className="text-xs">
                              {member.displayName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{member.displayName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={isCreator ? "default" : "secondary"} className="text-xs">
                                {isCreator ? "Creator" : memberData?.role || "Member"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Joined {new Date(memberData?.joinedAt || 0).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {!isCreator && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveMember(member.uid, member.displayName)}
                            disabled={loading}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Group Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Group Actions</CardTitle>
                <CardDescription>
                  Administrative actions for this group
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={disableDuration}
                    onChange={(e) => setDisableDuration(e.target.value)}
                    placeholder="Days"
                    className="w-20"
                  />
                  <Button
                    variant="outline"
                    onClick={handleDisableGroup}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Ban className="h-4 w-4" />
                    Disable Group
                  </Button>
                </div>
                
                <Button
                  variant="destructive"
                  onClick={handleDeleteGroup}
                  disabled={loading}
                  className="w-full flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Group Permanently
                </Button>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
