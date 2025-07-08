import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Vibrate, Volume2, VolumeX, Download, Share } from 'lucide-react';

export const MobileFeatures: React.FC = () => {
  const { toast } = useToast();
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [isNotificationSoundEnabled, setIsNotificationSoundEnabled] = useState(true);

  // Vibration feedback
  const vibrate = (pattern: number | number[] = 100) => {
    if (isVibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Share functionality
  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WhatsApp-style Chat App',
          text: 'Check out this awesome chat app!',
          url: window.location.origin,
        });
        vibrate([50, 50, 50]);
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.origin);
      toast({
        title: "Link Copied!",
        description: "App link has been copied to clipboard",
      });
      vibrate(100);
    }
  };

  // Install PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast({
          title: "App Installed!",
          description: "You can now use the app from your home screen",
        });
        vibrate([100, 50, 100]);
      }
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  // Notification sound
  const playNotificationSound = () => {
    if (isNotificationSoundEnabled) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {
        // Fallback if audio file doesn't exist
        console.log('Notification sound not available');
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Install App Button */}
      {showInstallButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={installApp}
          className="touch-target"
        >
          <Download className="h-4 w-4 mr-2" />
          Install App
        </Button>
      )}

      {/* Share Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={shareApp}
        className="touch-target"
      >
        <Share className="h-4 w-4 mr-2" />
        Share
      </Button>

      {/* Vibration Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsVibrationEnabled(!isVibrationEnabled);
          vibrate(100);
        }}
        className="touch-target"
      >
        <Vibrate className={`h-4 w-4 ${isVibrationEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
      </Button>

      {/* Sound Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsNotificationSoundEnabled(!isNotificationSoundEnabled);
          if (!isNotificationSoundEnabled) playNotificationSound();
        }}
        className="touch-target"
      >
        {isNotificationSoundEnabled ? (
          <Volume2 className="h-4 w-4 text-primary" />
        ) : (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
};

// Hook for using mobile features throughout the app
export const useMobileFeatures = () => {
  const vibrate = (pattern: number | number[] = 100) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  return {
    vibrate,
    isStandalone: isStandalone(),
    isMobile: isMobile()
  };
};