import React, { createContext, useContext, useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

interface AuthContextType {
  user: RecordModel | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.model);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(pb.authStore.model);
    setIsLoading(false);

    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setUser(model);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
