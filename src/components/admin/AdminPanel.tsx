
import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { AdminRequestPanel } from './AdminRequestPanel';
import { AdminAchievements } from './AdminAchievements';
import { GroupMemberManager } from './GroupMemberManager';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Settings, Trash2, Ban, CheckCircle, UserCheck, Activity, Clock, MessageSquare, Crown } from 'lucide-react';
import { UserProfile } from '@/components/chat/UserProfile';

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isOnline: boolean;
  isVerified?: boolean;
  isDisabled?: boolean;
  disabledUntil?: number;
  totalSessions?: number;
  lastActive?: number;
  joinedAt?: number;
  achievements?: Record<string, any>;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  members?: Record<string, any>;
  isDeleted?: boolean;
  isDisabled?: boolean;
  disabledUntil?: number;
}

export const AdminPanel: React.FC = () => {
  const { 
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
    updateGroupMemberLimit,
    getUserAnalytics,
    deleteMessageForEveryone,
    addMemberToGroup,
    removeMemberFromGroup
  } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [disableDuration, setDisableDuration] = useState('1');
  const [newMemberLimit, setNewMemberLimit] = useState(adminSettings.groupMemberLimit.toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const usersRef = ref(database, 'users');
    const groupsRef = ref(database, 'groups');
    
    const handleUsersChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data).map(([uid, userData]: [string, any]) => ({
          uid,
          ...userData
        })) as User[];
        setUsers(usersList.filter(u => u.uid !== user?.uid));
      }
    };

    const handleGroupsChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const groupsList = Object.entries(data).map(([id, groupData]: [string, any]) => ({
          id,
          ...groupData
        })) as Group[];
        setGroups(groupsList.filter(g => !g.isDeleted));
      }
    };

    onValue(usersRef, handleUsersChange);
    onValue(groupsRef, handleGroupsChange);

    return () => {
      off(usersRef, 'value', handleUsersChange);
      off(groupsRef, 'value', handleGroupsChange);
    };
  }, [isAdmin, user]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadAnalytics = async () => {
      try {
        const data = await getUserAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
    };

    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000);

    return () => clearInterval(interval);
  }, [isAdmin, getUserAnalytics]);

  useEffect(() => {
    setNewMemberLimit(adminSettings.groupMemberLimit.toString());
  }, [adminSettings.groupMemberLimit]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have admin privileges.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGiveBlueTick = async () => {
    if (!selectedUserId) return;
    
    setLoading(true);
    try {
      await giveBlueTickToUser(selectedUserId);
      toast({
        title: "Success",
        description: "Blue tick granted to user successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to grant blue tick",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!selectedUserId) return;
    
    setLoading(true);
    try {
      await removeUser(selectedUserId);
      toast({
        title: "Success",
        description: "User removed successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableUser = async () => {
    if (!selectedUserId) return;
    
    setLoading(true);
    try {
      await disableUser(selectedUserId, parseInt(disableDuration));
      toast({
        title: "Success",
        description: `User disabled for ${disableDuration} day(s)!`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    
    setLoading(true);
    try {
      await removeGroup(selectedGroupId);
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

  const handleDisableGroup = async () => {
    if (!selectedGroupId) return;
    
    setLoading(true);
    try {
      await disableGroup(selectedGroupId, parseInt(disableDuration));
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

  const handleUpdateMemberLimit = async () => {
    const limit = parseInt(newMemberLimit);
    if (limit < 1 || limit > 100) {
      toast({
        title: "Error",
        description: "Member limit must be between 1 and 100",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await updateGroupMemberLimit(limit);
      toast({
        title: "Success",
        description: `Group member limit updated to ${limit}!`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update member limit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="p-3 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                Admin Panel
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">Manage users, groups, settings, and system features</p>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-7 mb-6">
                <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="users" className="text-xs md:text-sm">Users</TabsTrigger>
                <TabsTrigger value="groups" className="text-xs md:text-sm">Groups</TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs md:text-sm">Analytics</TabsTrigger>
                <TabsTrigger value="requests" className="text-xs md:text-sm">Requests</TabsTrigger>
                <TabsTrigger value="achievements" className="text-xs md:text-sm">Achievements</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs md:text-sm">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Users</p>
                          <p className="text-xl font-bold">{analytics?.totalUsers || users.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Online Users</p>
                          <p className="text-xl font-bold">{users.filter(u => u.isOnline).length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Groups</p>
                          <p className="text-xl font-bold">{groups.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Messages</p>
                          <p className="text-xl font-bold">{analytics?.totalMessages || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <Label>Maintenance Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            {adminSettings.maintenanceMode ? 'System is in maintenance' : 'System is operational'}
                          </p>
                        </div>
                        <Switch
                          checked={adminSettings.maintenanceMode}
                          onCheckedChange={toggleMaintenanceMode}
                        />
                      </div>
                      <div className="p-3 border rounded-lg">
                        <Label>Group Member Limit</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Current limit: {adminSettings.groupMemberLimit} members
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={newMemberLimit}
                            onChange={(e) => setNewMemberLimit(e.target.value)}
                            className="w-20"
                          />
                          <Button
                            onClick={handleUpdateMemberLimit}
                            disabled={loading}
                            size="sm"
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {users
                            .filter(u => u.lastActive)
                            .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
                            .slice(0, 8)
                            .map(user => (
                              <div key={user.uid} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                                <div className="flex items-center gap-2">
                                  <UserProfile
                                    userId={user.uid}
                                    trigger={
                                      <Avatar className="h-6 w-6 cursor-pointer">
                                        <AvatarImage src={user.photoURL} />
                                        <AvatarFallback className="text-xs">
                                          {user.displayName?.[0]?.toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    }
                                  />
                                  <span className="text-sm">{user.displayName}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {user.lastActive && new Date(user.lastActive).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-4 md:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      User Management
                    </CardTitle>
                    <CardDescription>
                      Manage user accounts, verification, and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Select User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a user" />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-48">
                              {users.map((user) => (
                                <SelectItem key={user.uid} value={user.uid}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={user.photoURL} />
                                      <AvatarFallback className="text-xs">
                                        {user.displayName?.[0]?.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate">{user.displayName}</span>
                                    {user.isVerified && <CheckCircle className="h-3 w-3 text-blue-500" />}
                                  </div>
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Duration (Days)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={disableDuration}
                          onChange={(e) => setDisableDuration(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleGiveBlueTick}
                        disabled={!selectedUserId || loading}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Give Blue Tick
                      </Button>
                      
                      <Button
                        variant="destructive"
                        onClick={handleRemoveUser}
                        disabled={!selectedUserId || loading}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove User
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={handleDisableUser}
                        disabled={!selectedUserId || loading}
                        className="flex items-center gap-2"
                      >
                        <Ban className="h-4 w-4" />
                        Disable User
                      </Button>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">All Users</h3>
                      <ScrollArea className="h-96 w-full border rounded-lg p-4">
                        <div className="space-y-2">
                          {users.map((user) => (
                            <div
                              key={user.uid}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <UserProfile
                                  userId={user.uid}
                                  trigger={
                                    <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary">
                                      <AvatarImage src={user.photoURL} />
                                      <AvatarFallback>
                                        {user.displayName?.[0]?.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  }
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{user.displayName}</span>
                                    {user.isVerified && (
                                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant={user.isOnline ? "default" : "secondary"}>
                                  {user.isOnline ? "Online" : "Offline"}
                                </Badge>
                                {user.isDisabled && (
                                  <Badge variant="destructive">Disabled</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="groups" className="space-y-4 md:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Group Management
                    </CardTitle>
                    <CardDescription>
                      Manage groups, members, and group settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Select Group</Label>
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a group" />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-48">
                              {groups.map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span className="truncate">{group.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {Object.keys(group.members || {}).length} members
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Duration (Days)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={disableDuration}
                          onChange={(e) => setDisableDuration(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleDeleteGroup}
                        disabled={!selectedGroupId || loading}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Group
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={handleDisableGroup}
                        disabled={!selectedGroupId || loading}
                        className="flex items-center gap-2"
                      >
                        <Ban className="h-4 w-4" />
                        Disable Group
                      </Button>
                    </div>

                    {selectedGroupId && (
                      <GroupMemberManager 
                        groupId={selectedGroupId}
                        memberLimit={adminSettings.groupMemberLimit}
                      />
                    )}

                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">All Groups</h3>
                      <ScrollArea className="h-96 w-full border rounded-lg p-4">
                        <div className="space-y-2">
                          {groups.map((group) => (
                            <div
                              key={group.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{group.name}</span>
                                  {group.isDisabled && (
                                    <Badge variant="destructive">Disabled</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {group.description || 'No description'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Created {new Date(group.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {Object.keys(group.members || {}).length} members
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Most Active Users
                      </CardTitle>
                      <CardDescription>
                        Users with highest app usage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-80 w-full">
                        <div className="space-y-3">
                          {analytics?.mostActiveUsers?.map((user: any, index: number) => (
                            <div key={user.uid} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                  {index + 1}
                                </div>
                                <UserProfile
                                  userId={user.uid}
                                  trigger={
                                    <div className="cursor-pointer hover:underline">
                                      <p className="font-medium text-sm">{user.displayName}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {user.messageCount || 0} messages
                                      </p>
                                    </div>
                                  }
                                />
                              </div>
                              <Badge variant="secondary">
                                {user.totalSessions || 0} sessions
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        User Statistics
                      </CardTitle>
                      <CardDescription>
                        Detailed user engagement metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-primary/5 rounded-lg">
                          <p className="text-2xl font-bold text-primary">{users.length}</p>
                          <p className="text-sm text-muted-foreground">Total Users</p>
                        </div>
                        <div className="text-center p-4 bg-green-500/5 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {users.filter(u => u.isOnline).length}
                          </p>
                          <p className="text-sm text-muted-foreground">Online Now</p>
                        </div>
                        <div className="text-center p-4 bg-blue-500/5 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {users.filter(u => u.isVerified).length}
                          </p>
                          <p className="text-sm text-muted-foreground">Verified</p>
                        </div>
                        <div className="text-center p-4 bg-orange-500/5 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">
                            {users.filter(u => {
                              const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                              return u.joinedAt && u.joinedAt > oneWeekAgo;
                            }).length}
                          </p>
                          <p className="text-sm text-muted-foreground">New This Week</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="requests" className="space-y-4 md:space-y-6">
                <AdminRequestPanel />
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4 md:space-y-6">
                <AdminAchievements />
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 md:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Feature Settings
                    </CardTitle>
                    <CardDescription>
                      Enable or disable app features for all users
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <Label>Group Chat</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow users to create and join group chats
                          </p>
                        </div>
                        <Switch
                          checked={adminSettings.featureFlags.enableGroupChat}
                          onCheckedChange={() => toggleFeature('enableGroupChat')}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <Label>File Sharing</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow users to share files and images
                          </p>
                        </div>
                        <Switch
                          checked={adminSettings.featureFlags.enableFileSharing}
                          onCheckedChange={() => toggleFeature('enableFileSharing')}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <Label>Voice Messages</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow users to send voice messages
                          </p>
                        </div>
                        <Switch
                          checked={adminSettings.featureFlags.enableVoiceMessages}
                          onCheckedChange={() => toggleFeature('enableVoiceMessages')}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <Label>Message Reactions</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow users to react to messages with emojis
                          </p>
                        </div>
                        <Switch
                          checked={adminSettings.featureFlags.enableMessageReactions}
                          onCheckedChange={() => toggleFeature('enableMessageReactions')}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <Label>Message Deletion</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow users to delete messages for themselves or everyone
                          </p>
                        </div>
                        <Switch
                          checked={adminSettings.featureFlags.enableMessageDeletion}
                          onCheckedChange={() => toggleFeature('enableMessageDeletion')}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
