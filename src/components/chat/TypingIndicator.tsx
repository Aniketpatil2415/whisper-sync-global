
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, onValue, off, set, remove } from 'firebase/database';
import { database } from '@/lib/firebase';

interface TypingIndicatorProps {
  chatId: string;
  isGroup?: boolean;
}

// Custom hook for typing functionality
export const useTypingIndicator = ({ chatId, isGroup = false }: TypingIndicatorProps) => {
  const { user, userProfile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!chatId) return;

    const typingRef = ref(database, `typing/${chatId}`);
    
    const handleTypingChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const users = Object.keys(data).filter(uid => uid !== user?.uid);
        setTypingUsers(users);
      } else {
        setTypingUsers([]);
      }
    };

    onValue(typingRef, handleTypingChange);

    return () => {
      off(typingRef, 'value', handleTypingChange);
      // Clean up typing status on unmount
      if (user) {
        const userTypingRef = ref(database, `typing/${chatId}/${user.uid}`);
        remove(userTypingRef);
      }
    };
  }, [chatId, user]);

  const setTypingStatus = (typing: boolean) => {
    if (!user || !userProfile) return;

    const userTypingRef = ref(database, `typing/${chatId}/${user.uid}`);
    
    if (typing) {
      set(userTypingRef, {
        name: userProfile.displayName,
        timestamp: Date.now()
      });
    } else {
      remove(userTypingRef);
    }
  };

  // Auto-cleanup typing status after 3 seconds of inactivity
  useEffect(() => {
    if (isTyping) {
      const timeout = setTimeout(() => {
        setTypingStatus(false);
        setIsTyping(false);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [isTyping]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(true);
    }
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      setTypingStatus(false);
    }
  };

  const getTypingText = () => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return 'Someone is typing...';
    return `${typingUsers.length} people are typing...`;
  };

  return {
    typingText: getTypingText(),
    isAnyoneTyping: typingUsers.length > 0,
    handleTyping,
    handleStopTyping
  };
};

// Component for displaying typing indicator
export const TypingDisplay: React.FC<{ chatId: string }> = ({ chatId }) => {
  const { typingText, isAnyoneTyping } = useTypingIndicator({ chatId });

  if (!isAnyoneTyping) return null;

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground italic">
      {typingText}
    </div>
  );
};
