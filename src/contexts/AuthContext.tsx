import React, { createContext, useContext, useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import type { ChoirUser, UserPreferences } from '../types/auth';
import { mergePreferences } from '../lib/userPreferences';

interface AuthContextType {
  user: ChoirUser | null;
  isLoading: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  updatePreferences: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ChoirUser | null>(pb.authStore.model as ChoirUser | null);
  const [isLoading, setIsLoading] = useState(true);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user) return;

    const updatedPreferences = mergePreferences(user.preferences, newPrefs);

    try {
      const updatedRecord = await pb.collection('users').update<ChoirUser>(user.id, {
        preferences: updatedPreferences
      });

      setUser(updatedRecord);
    } catch (err: unknown) {
      console.error('Failed to update preferences:', err);
      throw err;
    }
  };

  useEffect(() => {
    setUser(pb.authStore.model as ChoirUser | null);
    setIsLoading(false);

    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setUser(model as ChoirUser | null);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

