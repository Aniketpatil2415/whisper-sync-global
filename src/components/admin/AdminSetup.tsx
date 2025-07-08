import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Crown } from 'lucide-react';

export const AdminSetup: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const makeCurrentUserAdmin = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Add current user as admin
      const adminRef = ref(database, `admins/${user.uid}`);
      await set(adminRef, {
        email: user.email,
        addedAt: Date.now(),
        addedBy: 'self-setup'
      });

      // Initialize admin settings
      const settingsRef = ref(database, 'adminSettings');
      await set(settingsRef, {
        maintenanceMode: false,
        featureFlags: {
          enableGroupChat: true,
          enableFileSharing: true,
          enableVoiceMessages: true,
          enableMessageReactions: true,
          enableMessageDeletion: true,
        }
      });

      toast({
        title: "Success!",
        description: "You are now an admin. Refresh the page to see admin features.",
      });

      // Refresh page to reload admin status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error setting up admin:', error);
      toast({
        title: "Error",
        description: "Failed to set up admin access",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Admin Setup
        </CardTitle>
        <CardDescription>
          Set yourself up as an admin to access all features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin Features:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Message reactions</li>
            <li>• Delete messages for everyone</li>
            <li>• User management</li>
            <li>• Feature toggles</li>
            <li>• System settings</li>
          </ul>
        </div>
        
        <Button 
          onClick={makeCurrentUserAdmin} 
          disabled={loading || !user}
          className="w-full"
        >
          {loading ? "Setting up..." : "Make me Admin"}
        </Button>
      </CardContent>
    </Card>
  );
};