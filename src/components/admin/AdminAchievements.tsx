import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Award, Users, BarChart3 } from 'lucide-react';

const ACHIEVEMENTS = [
  { id: 'most_active', label: 'Most Active User', icon: '🔥', color: 'bg-red-500' },
  { id: 'chatty_person', label: 'Most Chatty Person', icon: '💬', color: 'bg-blue-500' },
  { id: 'knowledge_king', label: 'Knowledge King', icon: '👑', color: 'bg-yellow-500' },
  { id: 'early_bird', label: 'Early Bird', icon: '🌅', color: 'bg-orange-500' },
  { id: 'night_owl', label: 'Night Owl', icon: '🦉', color: 'bg-purple-500' },
  { id: 'silent_supporter', label: 'Silent Supporter', icon: '🤐', color: 'bg-gray-500' },
  { id: 'study_buddy', label: 'Study Buddy', icon: '📚', color: 'bg-green-500' },
  { id: 'peaceful_vibe', label: 'Peaceful Vibe', icon: '☮️', color: 'bg-teal-500' },
  { id: 'reply_machine', label: 'Reply Machine', icon: '⚡', color: 'bg-pink-500' },
];

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isOnline: boolean;
  isVerified?: boolean;
  achievements?: Record<string, any>;
  messageCount?: number;
}

export const AdminAchievements: React.FC = () => {
  const { giveAchievementToUser, getUserAnalytics } = useAdmin();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAchievement, setSelectedAchievement] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    
    const handleUsersChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.values(data) as User[];
        setUsers(usersList);
      }
    };

    onValue(usersRef, handleUsersChange);

    return () => {
      off(usersRef, 'value', handleUsersChange);
    };
  }, []);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await getUserAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
    };

    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [getUserAnalytics]);

  const handleGiveAchievement = async () => {
    if (!selectedUserId || !selectedAchievement) return;
    
    setLoading(true);
    try {
      await giveAchievementToUser(selectedUserId, selectedAchievement);
      toast({
        title: "Success",
        description: "Achievement awarded successfully!"
      });
      setSelectedUserId('');
      setSelectedAchievement('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to award achievement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserAchievements = (user: User) => {
    if (!user.achievements) return [];
    return Object.keys(user.achievements).filter(key => user.achievements[key]?.awarded);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-xl font-bold">{analytics?.totalUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Online Users</p>
                <p className="text-xl font-bold">{analytics?.onlineUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">New Users Today</p>
                <p className="text-xl font-bold">{analytics?.newUsersToday || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-xl font-bold">{analytics?.totalMessages || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Award Achievement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Award Achievement
          </CardTitle>
          <CardDescription>
            Give special achievements to recognize user contributions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
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

            <div className="space-y-2">
              <Label>Select Achievement</Label>
              <Select value={selectedAchievement} onValueChange={setSelectedAchievement}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose achievement" />
                </SelectTrigger>
                <SelectContent>
                  {ACHIEVEMENTS.map((achievement) => (
                    <SelectItem key={achievement.id} value={achievement.id}>
                      <div className="flex items-center gap-2">
                        <span>{achievement.icon}</span>
                        <span>{achievement.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGiveAchievement}
            disabled={!selectedUserId || !selectedAchievement || loading}
            className="w-full md:w-auto"
          >
            Award Achievement
          </Button>
        </CardContent>
      </Card>

      {/* Most Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Most Active Users
          </CardTitle>
          <CardDescription>
            Users ranked by message activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analytics?.mostActiveUsers?.map((user: any, index: number) => (
              <div key={user.uid} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL} />
                    <AvatarFallback className="text-xs">
                      {user.displayName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.messageCount} messages</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {getUserAchievements(user).map((achievementId) => {
                    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
                    return achievement ? (
                      <span key={achievementId} className="text-sm" title={achievement.label}>
                        {achievement.icon}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users with Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Users with Achievements
          </CardTitle>
          <CardDescription>
            All users and their earned achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {users.map((user) => {
              const userAchievements = getUserAchievements(user);
              return (
                <div key={user.uid} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL} />
                      <AvatarFallback className="text-xs">
                        {user.displayName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {userAchievements.length > 0 ? (
                      userAchievements.map((achievementId) => {
                        const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
                        return achievement ? (
                          <Badge key={achievementId} variant="outline" className="text-xs">
                            {achievement.icon} {achievement.label}
                          </Badge>
                        ) : null;
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground">No achievements</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};