import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { AdminRequestPanel } from './AdminRequestPanel';
import { AdminAchievements } from './AdminAchievements';
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
import { Shield, Users, Settings, Trash2, Ban, CheckCircle, UserCheck, Activity, Clock } from 'lucide-react';
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
}

interface UserActivity {
  uid: string;
  displayName: string;
  totalSessions: number;
  dailyUsage: Record<string, number>;
  lastActive: number;
  joinedAt: number;
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
    deleteChat,
    updateGroupMemberLimit
  } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [disableDuration, setDisableDuration] = useState('1');
  const [newMemberLimit, setNewMemberLimit] = useState(adminSettings.groupMemberLimit.toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const usersRef = ref(database, 'users');
    const activityRef = ref(database, 'userActivity');
    
    const handleUsersChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.values(data) as User[];
        setUsers(usersList.filter(u => u.uid !== user?.uid));
      }
    };

    const handleActivityChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const activities: UserActivity[] = [];
        Object.entries(data).forEach(([uid, activity]: [string, any]) => {
          const user = users.find(u => u.uid === uid);
          if (user) {
            activities.push({
              uid,
              displayName: user.displayName,
              totalSessions: activity.totalSessions || 0,
              dailyUsage: activity.dailyUsage || {},
              lastActive: activity.lastActive || 0,
              joinedAt: user.joinedAt || 0
            });
          }
        });
        
        // Sort by total sessions (most active first)
        activities.sort((a, b) => (b.totalSessions || 0) - (a.totalSessions || 0));
        setUserActivities(activities);
      }
    };

    onValue(usersRef, handleUsersChange);
    onValue(activityRef, handleActivityChange);

    return () => {
      off(usersRef, 'value', handleUsersChange);
      off(activityRef, 'value', handleActivityChange);
    };
  }, [isAdmin, user, users]);

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
    <ScrollArea className="h-screen">
      <div className="min-h-screen bg-background p-3 md:p-6">
        <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage users, settings, and system features</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="users" className="text-xs md:text-sm">Users</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm">Analytics</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs md:text-sm">Requests</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs md:text-sm">Achievements</TabsTrigger>
            <TabsTrigger value="features" className="text-xs md:text-sm">Features</TabsTrigger>
            <TabsTrigger value="system" className="text-xs md:text-sm">System</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Users className="h-4 w-4 md:h-5 md:w-5" />
                  User Management
                </CardTitle>
                <CardDescription className="text-sm">
                  Manage user accounts, verification, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-3 md:space-y-4">
                    <Label htmlFor="user-select" className="text-sm md:text-base">Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.uid} value={user.uid}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5 md:h-6 md:w-6">
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback className="text-xs">
                                  {user.displayName?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{user.displayName} ({user.email})</span>
                              {user.isVerified && <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <Label htmlFor="disable-duration" className="text-sm md:text-base">Disable Duration (Days)</Label>
                    <Input
                      id="disable-duration"
                      type="number"
                      min="1"
                      max="365"
                      value={disableDuration}
                      onChange={(e) => setDisableDuration(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <Button
                    onClick={handleGiveBlueTick}
                    disabled={!selectedUserId || loading}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Give Blue Tick
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={handleRemoveUser}
                    disabled={!selectedUserId || loading}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove User
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleDisableUser}
                    disabled={!selectedUserId || loading}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Ban className="h-4 w-4" />
                    Disable User
                  </Button>
                </div>

                <div className="mt-4 md:mt-6">
                  <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">All Users</h3>
                  <ScrollArea className="h-96 w-full">
                    <div className="grid gap-2 md:gap-3 pr-4">
                    {users.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center justify-between p-3 md:p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <UserProfile
                            userId={user.uid}
                            trigger={
                              <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary">
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback className="text-xs md:text-sm">
                                  {user.displayName?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 md:gap-2">
                              <span className="font-medium text-sm md:text-base truncate">{user.displayName}</span>
                              {user.isVerified && (
                                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                          <Badge variant={user.isOnline ? "default" : "secondary"} className="text-xs">
                            {user.isOnline ? "Online" : "Offline"}
                          </Badge>
                          {user.isDisabled && (
                            <Badge variant="destructive" className="text-xs">Disabled</Badge>
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

          <TabsContent value="analytics" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Most Active Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Activity className="h-4 w-4 md:h-5 md:w-5" />
                    Most Active Users
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Users with highest app usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80 w-full">
                    <div className="space-y-3 pr-4">
                      {userActivities.slice(0, 10).map((activity, index) => (
                        <div key={activity.uid} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
                              {index + 1}
                            </div>
                            <UserProfile
                              userId={activity.uid}
                              trigger={
                                <div className="cursor-pointer hover:underline">
                                  <p className="font-medium text-sm">{activity.displayName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {activity.totalSessions || 0} sessions
                                  </p>
                                </div>
                              }
                            />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {Object.keys(activity.dailyUsage || {}).length} days active
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* User Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Users className="h-4 w-4 md:h-5 md:w-5" />
                    User Statistics
                  </CardTitle>
                  <CardDescription className="text-sm">
                    App usage statistics
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
                      <p className="text-sm text-muted-foreground">Verified Users</p>
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
                  
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      {users
                        .filter(u => u.lastActive)
                        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
                        .slice(0, 5)
                        .map(user => (
                          <div key={user.uid} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                            <div className="flex items-center gap-2">
                              <UserProfile
                                userId={user.uid}
                                trigger={
                                  <Avatar className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary">
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

          <TabsContent value="features" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                  Feature Toggles
                </CardTitle>
                <CardDescription className="text-sm">
                  Enable or disable app features for all users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm md:text-base">Group Chat</Label>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Allow users to create and join group chats
                      </p>
                    </div>
                    <Switch
                      checked={adminSettings.featureFlags.enableGroupChat}
                      onCheckedChange={() => toggleFeature('enableGroupChat')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm md:text-base">File Sharing</Label>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Allow users to share files and images
                      </p>
                    </div>
                    <Switch
                      checked={adminSettings.featureFlags.enableFileSharing}
                      onCheckedChange={() => toggleFeature('enableFileSharing')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm md:text-base">Voice Messages</Label>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Allow users to send voice messages
                      </p>
                    </div>
                    <Switch
                      checked={adminSettings.featureFlags.enableVoiceMessages}
                      onCheckedChange={() => toggleFeature('enableVoiceMessages')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm md:text-base">Message Reactions</Label>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Allow users to react to messages with emojis
                      </p>
                    </div>
                    <Switch
                      checked={adminSettings.featureFlags.enableMessageReactions}
                      onCheckedChange={() => toggleFeature('enableMessageReactions')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm md:text-base">Message Deletion</Label>
                      <p className="text-xs md:text-sm text-muted-foreground">
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

          <TabsContent value="system" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">System Settings</CardTitle>
                <CardDescription className="text-sm">
                  Manage system-wide settings and maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm md:text-base">Maintenance Mode</Label>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Put the app in maintenance mode to prevent user access
                    </p>
                    {adminSettings.maintenanceMode && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        Currently Active
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={adminSettings.maintenanceMode}
                    onCheckedChange={toggleMaintenanceMode}
                  />
                </div>

                <div className="p-3 md:p-4 border rounded-lg space-y-4">
                  <div>
                    <Label className="text-sm md:text-base">Group Member Limit</Label>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Maximum number of members allowed in a group
                    </p>
                  </div>
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
                      disabled={loading || newMemberLimit === adminSettings.groupMemberLimit.toString()}
                    >
                      Update Limit
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current limit: {adminSettings.groupMemberLimit} members
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </ScrollArea>
  );
};
