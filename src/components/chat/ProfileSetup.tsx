import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface ProfileSetupProps {
  onComplete: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
  const { userProfile, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    displayName: userProfile?.displayName || '',
    photoURL: userProfile?.photoURL || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.displayName.trim()) {
      toast({
        title: "Error",
        description: "Display name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await updateUserProfile({
        displayName: profileData.displayName.trim(),
        photoURL: profileData.photoURL.trim()
      });
      
      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });
      
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
            <svg
              className="w-10 h-10 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary">Setup Your Profile</h1>
          <p className="text-muted-foreground mt-2">Let others know who you are</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Profile Information</CardTitle>
            <CardDescription>Complete your profile to start chatting</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Preview */}
              <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData.photoURL} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {profileData.displayName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter your name"
                  value={profileData.displayName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photoURL">Profile Picture URL (Optional)</Label>
                <Input
                  id="photoURL"
                  type="url"
                  placeholder="Enter image URL"
                  value={profileData.photoURL}
                  onChange={(e) => setProfileData(prev => ({ ...prev, photoURL: e.target.value }))}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-glow" 
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Continue to Chat'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};