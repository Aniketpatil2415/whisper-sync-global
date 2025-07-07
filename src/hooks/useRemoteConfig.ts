
import { useState, useEffect } from 'react';
import { remoteConfig } from '@/lib/firebase';
import { fetchAndActivate, getValue, getBoolean, getString } from 'firebase/remote-config';

interface RemoteConfigValues {
  enableGroupChat: boolean;
  maxGroupMembers: number;
  welcomeMessage: string;
  appVersion: string;
}

export const useRemoteConfig = () => {
  const [config, setConfig] = useState<RemoteConfigValues>({
    enableGroupChat: true,
    maxGroupMembers: 50,
    welcomeMessage: 'Welcome to ChatApp!',
    appVersion: '1.0.0'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeRemoteConfig = async () => {
      try {
        // Set default values directly on the remoteConfig instance
        remoteConfig.defaultConfig = {
          enableGroupChat: true,
          maxGroupMembers: 50,
          welcomeMessage: 'Welcome to ChatApp!',
          appVersion: '1.0.0'
        };

        // Fetch and activate
        await fetchAndActivate(remoteConfig);

        // Get values
        setConfig({
          enableGroupChat: getBoolean(remoteConfig, 'enableGroupChat'),
          maxGroupMembers: Number(getValue(remoteConfig, 'maxGroupMembers').asString()),
          welcomeMessage: getString(remoteConfig, 'welcomeMessage'),
          appVersion: getString(remoteConfig, 'appVersion')
        });
      } catch (error) {
        console.error('Error initializing Remote Config:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeRemoteConfig();
  }, []);

  return { config, loading };
};
