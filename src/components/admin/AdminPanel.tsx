
import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Settings, Trash2, Ban, CheckCircle } from 'lucide-react';

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isOnline: boolean;
  isVerified?: boolean;
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
    deleteChat 
  } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [disableDuration, setDisableDuration] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const usersRef = ref(database, 'users');
    
    const handleUsersChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.values(data) as User[];
        setUsers(usersList.filter(u => u.uid !== user?.uid));
      }
    };

    onValue(usersRef, handleUsersChange);

    return () => {
      off(usersRef, 'value', handleUsersChange);
    };
  }, [isAdmin, user]);

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

  return (
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
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="users" className="text-xs md:text-sm">User Management</TabsTrigger>
            <TabsTrigger value="features" className="text-xs md:text-sm">Feature Toggles</TabsTrigger>
            <TabsTrigger value="system" className="text-xs md:text-sm">System Settings</TabsTrigger>
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
                  <div className="grid gap-2 md:gap-3 max-h-96 overflow-y-auto">
                    {users.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center justify-between p-3 md:p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback className="text-xs md:text-sm">
                              {user.displayName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
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
                </div>
              </CardContent>
            </Card>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
