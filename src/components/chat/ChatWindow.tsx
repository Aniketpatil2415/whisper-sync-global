import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, push, onValue, off, serverTimestamp, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  senderName: string;
  senderAvatar?: string;
}

interface ChatWindowProps {
  chatId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get other user info
  useEffect(() => {
    if (!user || !chatId) return;

    const otherUserId = chatId.split('_').find(id => id !== user.uid);
    if (!otherUserId) return;

    const otherUserRef = ref(database, `users/${otherUserId}`);
    get(otherUserRef).then(snapshot => {
      if (snapshot.exists()) {
        setOtherUser(snapshot.val());
      }
    });
  }, [chatId, user]);

  // Load messages
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = ref(database, `chats/${chatId}/messages`);
    
    const handleMessagesChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg
        }));
        // Sort by timestamp
        messagesList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(messagesList);
      } else {
        setMessages([]);
      }
      setLoading(false);
    };

    onValue(messagesRef, handleMessagesChange);

    return () => {
      off(messagesRef, 'value', handleMessagesChange);
    };
  }, [chatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !userProfile) return;

    const messagesRef = ref(database, `chats/${chatId}/messages`);
    
    try {
      await push(messagesRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: userProfile.displayName,
        senderAvatar: userProfile.photoURL || '',
        timestamp: serverTimestamp()
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = new Date(typeof timestamp === 'number' ? timestamp : Date.now());
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser?.photoURL} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {otherUser?.displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {otherUser?.displayName || 'Unknown User'}
            </h3>
            <div className="flex items-center space-x-2">
              {otherUser?.isOnline && (
                <div className="w-2 h-2 bg-status-online rounded-full"></div>
              )}
              <p className="text-sm text-muted-foreground">
                {otherUser?.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.uid;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwn && (
                    <Avatar className="h-8 w-8 mt-auto">
                      <AvatarImage src={message.senderAvatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {message.senderName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`
                    rounded-lg px-3 py-2 relative
                    ${isOwn 
                      ? 'bg-message-own text-primary-foreground' 
                      : 'bg-message-bubble text-foreground'
                    }
                  `}>
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-message-timestamp'}`}>
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-primary hover:bg-primary-glow"
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};