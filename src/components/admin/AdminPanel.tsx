
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
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage users, settings, and system features</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="features">Feature Toggles</TabsTrigger>
            <TabsTrigger value="system">System Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label htmlFor="user-select">Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.uid} value={user.uid}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback>
                                  {user.displayName?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {user.displayName} ({user.email})
                              {user.isVerified && <CheckCircle className="h-4 w-4 text-blue-500" />}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="disable-duration">Disable Duration (Days)</Label>
                    <Input
                      id="disable-duration"
                      type="number"
                      min="1"
                      max="365"
                      value={disableDuration}
                      onChange={(e) => setDisableDuration(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
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
                  <div className="grid gap-3">
                    {users.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>
                              {user.displayName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.displayName}</span>
                              {user.isVerified && (
                                <CheckCircle className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Feature Toggles
                </CardTitle>
                <CardDescription>
                  Enable or disable app features for all users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
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

                  <div className="flex items-center justify-between">
                    <div>
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

                  <div className="flex items-center justify-between">
                    <div>
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Manage system-wide settings and maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Put the app in maintenance mode to prevent user access
                    </p>
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
