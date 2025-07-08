import React, { useState, useEffect } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Clock, Shield } from 'lucide-react';

interface AdminRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto: string;
  message: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export const AdminRequestPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if current user is the main admin
  const isMainAdmin = user?.email === 'aniketpatil2415@gmail.com';

  useEffect(() => {
    if (!isMainAdmin) return;

    const requestsRef = ref(database, 'adminRequests');
    
    const handleRequestsChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const requestsList = Object.entries(data).map(([id, request]: [string, any]) => ({
          id,
          ...request
        })) as AdminRequest[];
        
        // Sort by timestamp, newest first
        requestsList.sort((a, b) => b.timestamp - a.timestamp);
        setRequests(requestsList);
      } else {
        setRequests([]);
      }
      setLoading(false);
    };

    onValue(requestsRef, handleRequestsChange);

    return () => {
      off(requestsRef, 'value', handleRequestsChange);
    };
  }, [isMainAdmin]);

  const handleRequest = async (requestId: string, action: 'approve' | 'reject', userId: string) => {
    try {
      // Update request status
      const requestRef = ref(database, `adminRequests/${requestId}`);
      await update(requestRef, {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedAt: Date.now(),
        reviewedBy: user?.uid
      });

      if (action === 'approve') {
        // Add user as admin
        const adminRef = ref(database, `admins/${userId}`);
        await update(adminRef, {
          email: requests.find(r => r.id === requestId)?.userEmail,
          addedAt: Date.now(),
          addedBy: user?.uid
        });
      }

      toast({
        title: action === 'approve' ? "Request Approved!" : "Request Rejected",
        description: `User has been ${action === 'approve' ? 'granted' : 'denied'} admin access.`,
      });
    } catch (error) {
      console.error('Error handling admin request:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive"
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isMainAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Only the main administrator can manage admin requests.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading admin requests...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Admin Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and approve or reject admin access requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No pending requests
            </p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.userPhoto} />
                      <AvatarFallback>
                        {request.userName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">{request.userName}</h4>
                      <p className="text-sm text-muted-foreground">{request.userEmail}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(request.timestamp)}
                      </p>
                    </div>
                  </div>
                  
                  {request.message && (
                    <div className="bg-muted p-3 rounded">
                      <p className="text-sm">{request.message}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRequest(request.id, 'approve', request.userId)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRequest(request.id, 'reject', request.userId)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewed Requests History */}
      {reviewedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>
              Previously reviewed admin requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviewedRequests.slice(0, 10).map((request) => (
                <div key={request.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={request.userPhoto} />
                      <AvatarFallback className="text-xs">
                        {request.userName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{request.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(request.timestamp)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={request.status === 'approved' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};