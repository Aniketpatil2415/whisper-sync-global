
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { ref, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
import { useToast } from '@/hooks/use-toast';
import { Heart, Smile, ThumbsUp, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  senderName: string;
  senderAvatar?: string;
  status?: 'sent' | 'delivered' | 'seen';
  reactions?: { [userId: string]: string };
  deletedForEveryone?: boolean;
  deletedFor?: string[];
}

interface MessageActionsProps {
  message: Message;
  chatId: string;
  isGroup: boolean;
  children: React.ReactNode;
}

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

export const MessageActions: React.FC<MessageActionsProps> = ({ 
  message, 
  chatId, 
  isGroup, 
  children 
}) => {
  const { user } = useAuth();
  const { adminSettings } = useAdmin();
  const { toast } = useToast();
  const [showReactions, setShowReactions] = useState(false);

  const canDeleteForEveryone = message.senderId === user?.uid;
  const isDeleted = message.deletedForEveryone || message.deletedFor?.includes(user?.uid || '');

  const handleReaction = async (emoji: string) => {
    if (!user || !adminSettings.featureFlags.enableMessageReactions) {
      toast({
        title: "Feature disabled",
        description: "Message reactions are currently disabled",
        variant: "destructive"
      });
      return;
    }

    const messagePath = isGroup 
      ? `groups/${chatId}/messages/${message.id}`
      : `chats/${chatId}/messages/${message.id}`;

    try {
      const currentReaction = message.reactions?.[user.uid];
      const updates: any = {};
      
      if (currentReaction === emoji) {
        // Remove reaction
        updates[`reactions/${user.uid}`] = null;
      } else {
        // Add/change reaction
        updates[`reactions/${user.uid}`] = emoji;
      }

      await update(ref(database, messagePath), updates);
      
      toast({
        title: currentReaction === emoji ? "Reaction removed" : "Reaction added",
        description: `${emoji} reaction ${currentReaction === emoji ? 'removed' : 'added'}`
      });
    } catch (error) {
      console.error('Error updating reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive"
      });
    }
  };

  const handleDeleteForMe = async () => {
    if (!user || !adminSettings.featureFlags.enableMessageDeletion) {
      toast({
        title: "Feature disabled",
        description: "Message deletion is currently disabled",
        variant: "destructive"
      });
      return;
    }

    const messagePath = isGroup 
      ? `groups/${chatId}/messages/${message.id}`
      : `chats/${chatId}/messages/${message.id}`;

    try {
      const deletedFor = message.deletedFor || [];
      const updatedDeletedFor = [...deletedFor, user.uid];
      
      await update(ref(database, messagePath), { 
        deletedFor: updatedDeletedFor 
      });
      
      toast({
        title: "Message deleted",
        description: "Message deleted for you"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!user || !canDeleteForEveryone || !adminSettings.featureFlags.enableMessageDeletion) {
      toast({
        title: "Feature disabled",
        description: "Message deletion is currently disabled",
        variant: "destructive"
      });
      return;
    }

    const messagePath = isGroup 
      ? `groups/${chatId}/messages/${message.id}`
      : `chats/${chatId}/messages/${message.id}`;

    try {
      await update(ref(database, messagePath), { 
        deletedForEveryone: true,
        text: "This message was deleted"
      });
      
      toast({
        title: "Message deleted",
        description: "Message deleted for everyone"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  if (isDeleted) {
    return (
      <div className="text-xs text-muted-foreground italic p-2 bg-muted rounded">
        This message was deleted
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="relative group">
          {children}
          
          {/* Reaction Display */}
          {adminSettings.featureFlags.enableMessageReactions && message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(
                Object.values(message.reactions).reduce((acc: any, emoji) => {
                  acc[emoji] = (acc[emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    message.reactions?.[user?.uid || ''] === emoji
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  }`}
                >
                  {emoji} {count}
                </button>
              ))}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48">
        {adminSettings.featureFlags.enableMessageReactions && (
          <>
            <div className="p-2">
              <div className="text-xs text-muted-foreground mb-2">React with</div>
              <div className="flex gap-1">
                {REACTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-base hover:bg-accent"
                    onClick={() => handleReaction(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
            <ContextMenuSeparator />
          </>
        )}
        
        {adminSettings.featureFlags.enableMessageDeletion && (
          <>
            <ContextMenuItem onClick={handleDeleteForMe}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete for me
            </ContextMenuItem>
            
            {canDeleteForEveryone && (
              <ContextMenuItem onClick={handleDeleteForEveryone}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete for everyone
              </ContextMenuItem>
            )}
          </>
        )}
        
        {!adminSettings.featureFlags.enableMessageReactions && !adminSettings.featureFlags.enableMessageDeletion && (
          <div className="p-2 text-xs text-muted-foreground text-center">
            No actions available
          </div>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
