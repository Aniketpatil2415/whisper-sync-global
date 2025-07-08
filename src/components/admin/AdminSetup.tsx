import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminRequestModal } from './AdminRequestModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Crown, Send } from 'lucide-react';

export const AdminSetup: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showRequestModal, setShowRequestModal] = useState(false);

  return (
    <>
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Request Admin Access
          </CardTitle>
          <CardDescription>
            Send a request to the admin for elevated privileges
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
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Admin access requires approval from the main administrator.
            </p>
          </div>
          
          <Button 
            onClick={() => setShowRequestModal(true)}
            disabled={!user}
            className="w-full touch-target"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Admin Request
          </Button>
        </CardContent>
      </Card>

      <AdminRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
      />
    </>
  );
};