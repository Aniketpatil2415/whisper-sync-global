import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Shield, Send, X } from 'lucide-react';

interface AdminRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminRequestModal: React.FC<AdminRequestModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const sendAdminRequest = async () => {
    if (!user || !userProfile) return;
    
    setLoading(true);
    try {
      const requestRef = ref(database, 'adminRequests');
      await push(requestRef, {
        userId: user.uid,
        userEmail: user.email,
        userName: userProfile.displayName,
        userPhoto: userProfile.photoURL || '',
        message: message.trim() || 'Requesting admin access',
        timestamp: Date.now(),
        status: 'pending'
      });

      toast({
        title: "Request Sent!",
        description: "Your admin request has been sent. You'll be notified once reviewed.",
      });

      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error sending admin request:', error);
      toast({
        title: "Error",
        description: "Failed to send admin request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Request Admin Access
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Send a request to the admin for elevated privileges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Reason for requesting admin access:
            </label>
            <Textarea
              placeholder="Please explain why you need admin access..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={sendAdminRequest} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};