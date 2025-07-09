import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, onValue, off, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatRequest {
  id: string;
  from: string;
  fromName: string;
  fromAvatar?: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

interface ChatRequestHandlerProps {
  onRequestAccepted?: (chatId: string) => void;
}

export const ChatRequestHandler: React.FC<ChatRequestHandlerProps> = ({ onRequestAccepted }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const requestsRef = ref(database, `chatRequests/${user.uid}`);
    
    const handleRequestsChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const requestsList = Object.entries(data).map(([chatId, requestData]: [string, any]) => ({
          id: chatId,
          ...requestData
        }));
        
        // Filter only pending requests
        const pendingRequests = requestsList.filter(req => req.status === 'pending');
        setRequests(pendingRequests);
      } else {
        setRequests([]);
      }
    };

    onValue(requestsRef, handleRequestsChange);

    return () => {
      off(requestsRef, 'value', handleRequestsChange);
    };
  }, [user]);

  const handleAcceptRequest = async (request: ChatRequest) => {
    if (!user) return;

    try {
      // Update request status
      const requestRef = ref(database, `chatRequests/${user.uid}/${request.id}`);
      await update(requestRef, { status: 'accepted' });

      // Also notify the sender
      const senderRequestRef = ref(database, `chatRequests/${request.from}/${request.id}`);
      await update(senderRequestRef, { status: 'accepted' });

      toast({
        title: "Chat request accepted",
        description: `You can now chat with ${request.fromName}`,
      });

      if (onRequestAccepted) {
        onRequestAccepted(request.id);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: "Error",
        description: "Failed to accept chat request",
        variant: "destructive"
      });
    }
  };

  const handleRejectRequest = async (request: ChatRequest) => {
    if (!user) return;

    try {
      // Update request status
      const requestRef = ref(database, `chatRequests/${user.uid}/${request.id}`);
      await update(requestRef, { status: 'rejected' });

      // Also notify the sender
      const senderRequestRef = ref(database, `chatRequests/${request.from}/${request.id}`);
      await update(senderRequestRef, { status: 'rejected' });

      toast({
        title: "Chat request rejected",
        description: `Request from ${request.fromName} has been rejected`,
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject chat request",
        variant: "destructive"
      });
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Chat Requests</h3>
      
      <div className="space-y-3">
        {requests.map((request) => (
          <Card key={request.id} className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={request.fromAvatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {request.fromName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground truncate">
                      {request.fromName}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimestamp(request.timestamp)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Wants to start a conversation with you
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleAcceptRequest(request)}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRejectRequest(request)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};