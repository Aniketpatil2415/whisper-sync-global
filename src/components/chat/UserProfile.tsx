
import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, Crown, MessageCircle, Book, Sun, Moon, Heart, Users, Zap, User, CheckCircle } from 'lucide-react';

interface UserProfileProps {
  userId: string;
  trigger?: React.ReactNode;
}

interface Achievement {
  awarded: boolean;
  timestamp: number;
  awardedBy?: string;
}

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  joinedAt?: number;
  lastActive?: number;
  achievements?: { [key: string]: Achievement };
}

const achievementIcons = {
  'Most Active User': Trophy,
  'Most Chatty Person': MessageCircle,
  'Knowledge King': Book,
  'Early Bird': Sun,
  'Night Owl': Moon,
  'Silent Supporter': Heart,
  'Study Buddy': Users,
  'Peaceful Vibe': Heart,
  'Reply Machine': Zap,
};

const achievementDescriptions = {
  'Most Active User': 'Top user by app usage',
  'Most Chatty Person': 'Sends the most messages',
  'Knowledge King': 'Shares valuable knowledge',
  'Early Bird': 'Active in early morning hours',
  'Night Owl': 'Active during late night hours',
  'Silent Supporter': 'Supportive without being vocal',
  'Study Buddy': 'Helps others with studies',
  'Peaceful Vibe': 'Maintains positive atmosphere',
  'Reply Machine': 'Quick to respond to messages',
};

export const UserProfile: React.FC<UserProfileProps> = ({ 
  userId, 
  trigger 
}) => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          setUserData({ uid: userId, ...snapshot.val() });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getAchievements = () => {
    if (!userData?.achievements) return [];
    
    return Object.entries(userData.achievements)
      .filter(([_, achievement]) => achievement.awarded)
      .map(([name, achievement]) => ({ name, ...achievement }));
  };

  if (loading) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {trigger || <Button variant="ghost" size="sm">View Profile</Button>}
        </DialogTrigger>
        <DialogContent>
          <div className="p-4 text-center">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!userData) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {trigger || <Button variant="ghost" size="sm">View Profile</Button>}
        </DialogTrigger>
        <DialogContent>
          <div className="p-4 text-center text-muted-foreground">User not found</div>
        </DialogContent>
      </Dialog>
    );
  }

  const achievements = getAchievements();

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || <Button variant="ghost" size="sm">View Profile</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          <div className="space-y-4">
            {/* User Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={userData.photoURL} />
                    <AvatarFallback className="text-lg">
                      {userData.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{userData.displayName}</h3>
                      {userData.isVerified && (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{userData.email}</p>
                    <div className="mt-2">
                      <Badge variant={userData.isOnline ? "default" : "secondary"}>
                        {userData.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Joined:</span>
                    <p className="font-medium">
                      {userData.joinedAt ? formatDate(userData.joinedAt) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Active:</span>
                    <p className="font-medium">
                      {userData.lastActive ? formatDate(userData.lastActive) : 'Unknown'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4" />
                  Achievements ({achievements.length})
                </CardTitle>
                <CardDescription>
                  Special badges earned by this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {achievements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No achievements yet
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {achievements.map((achievement) => {
                      const IconComponent = achievementIcons[achievement.name as keyof typeof achievementIcons] || Trophy;
                      
                      return (
                        <div
                          key={achievement.name}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-secondary/20"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{achievement.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {achievementDescriptions[achievement.name as keyof typeof achievementDescriptions]}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Earned on {formatDate(achievement.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
