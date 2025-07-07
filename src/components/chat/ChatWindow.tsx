
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, push, onValue, off, serverTimestamp, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTypingIndicator, TypingDisplay } from './TypingIndicator';
import { Check, CheckCheck, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  senderName: string;
  senderAvatar?: string;
  status?: 'sent' | 'delivered' | 'seen';
  reactions?: { [userId: string]: string };
}

interface ChatWindowProps {
  chatId: string;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, onBack }) => {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isGroup, setIsGroup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { handleTyping, handleStopTyping } = useTypingIndicator({ chatId, isGroup });

  // Check if it's a group chat
  useEffect(() => {
    const checkChatType = async () => {
      if (!chatId) return;
      
      // Check if it's a group
      const groupRef = ref(database, `groups/${chatId}`);
      const groupSnapshot = await get(groupRef);
      
      if (groupSnapshot.exists()) {
        setIsGroup(true);
        setOtherUser({ displayName: groupSnapshot.val().name, isGroup: true });
      } else {
        setIsGroup(false);
        // Get other user info for one-to-one chat
        if (user) {
          const otherUserId = chatId.split('_').find(id => id !== user.uid);
          if (otherUserId) {
            const otherUserRef = ref(database, `users/${otherUserId}`);
            const snapshot = await get(otherUserRef);
            if (snapshot.exists()) {
              setOtherUser(snapshot.val());
            }
          }
        }
      }
    };

    checkChatType();
  }, [chatId, user]);

  // Load messages
  useEffect(() => {
    if (!chatId) return;

    const messagesPath = isGroup ? `groups/${chatId}/messages` : `chats/${chatId}/messages`;
    const messagesRef = ref(database, messagesPath);
    
    const handleMessagesChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg
        }));
        messagesList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(messagesList);
        
        // Mark messages as seen
        markMessagesAsSeen(messagesList);
      } else {
        setMessages([]);
      }
      setLoading(false);
    };

    onValue(messagesRef, handleMessagesChange);

    return () => {
      off(messagesRef, 'value', handleMessagesChange);
    };
  }, [chatId, isGroup]);

  // Mark messages as seen
  const markMessagesAsSeen = async (messagesList: Message[]) => {
    if (!user) return;
    
    const unseenMessages = messagesList.filter(
      msg => msg.senderId !== user.uid && msg.status !== 'seen'
    );
    
    for (const message of unseenMessages) {
      const messagePath = isGroup 
        ? `groups/${chatId}/messages/${message.id}/status`
        : `chats/${chatId}/messages/${message.id}/status`;
      
      await update(ref(database, messagePath), { seen: true });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !userProfile) return;

    const messagesPath = isGroup ? `groups/${chatId}/messages` : `chats/${chatId}/messages`;
    const messagesRef = ref(database, messagesPath);
    
    try {
      await push(messagesRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: userProfile.displayName,
        senderAvatar: userProfile.photoURL || '',
        timestamp: serverTimestamp(),
        status: 'sent'
      });
      
      setNewMessage('');
      handleStopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      handleTyping();
    } else {
      handleStopTyping();
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = new Date(typeof timestamp === 'number' ? timestamp : Date.now());
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatusIcon = (message: Message) => {
    if (message.senderId !== user?.uid) return null;
    
    if (message.status === 'seen') {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    } else if (message.status === 'delivered') {
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    } else {
      return <Check className="h-3 w-3 text-muted-foreground" />;
    }
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
      <div className="p-3 md:p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="md:hidden p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Avatar className="h-8 w-8 md:h-10 md:w-10">
            <AvatarImage src={otherUser?.photoURL} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {otherUser?.displayName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm md:text-base">
              {otherUser?.displayName || 'Unknown User'}
            </h3>
            <div className="flex items-center space-x-2">
              {!isGroup && otherUser?.isOnline && (
                <div className="w-2 h-2 bg-status-online rounded-full"></div>
              )}
              <p className="text-xs md:text-sm text-muted-foreground">
                {isGroup 
                  ? 'Group Chat' 
                  : (otherUser?.isOnline ? 'Online' : 'Offline')
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm md:text-base">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.uid;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex space-x-2 max-w-[280px] md:max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwn && (
                    <Avatar className="h-6 w-6 md:h-8 md:w-8 mt-auto flex-shrink-0">
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
                    {isGroup && !isOwn && (
                      <p className="text-xs font-medium mb-1 text-primary">
                        {message.senderName}
                      </p>
                    )}
                    <p className="text-sm break-words">{message.text}</p>
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-message-timestamp'}`}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                      {getMessageStatusIcon(message)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <TypingDisplay chatId={chatId} />

      {/* Message Input */}
      <div className="p-3 md:p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            className="flex-1 text-sm md:text-base"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-primary hover:bg-primary-glow px-3 md:px-4"
            size="sm"
          >
            <span className="text-xs md:text-sm">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
};
