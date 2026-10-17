import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, UserRole } from '../types/database';
import { api } from '../lib/api';
import { isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabaseClient';

interface AuthContextType {
  currentUser: Profile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isPlayer: boolean;
  canManageUsers: boolean;
  canManageMatches: boolean;
  canEditStats: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updateCurrentUser: (updates: Partial<Profile>) => Promise<Profile>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSessionInitialized(true);
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user.id || null);
      setSessionInitialized(true);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error('Unable to restore session:', error.message);
      setAuthUserId(data.session?.user.id || null);
      setSessionInitialized(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUserId) {
      setCurrentUser(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    setProfileLoading(true);
    api.getProfileById(authUserId)
      .then((profile) => {
        if (active) setCurrentUser(profile);
      })
      .catch((error: unknown) => {
        console.error('Unable to load profile:', error);
        if (active) setCurrentUser(null);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authUserId]);

  const login = async (email: string, password: string) => {
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  const updateCurrentUser = async (updates: Partial<Profile>) => {
    if (!currentUser) throw new Error('Sign in to update your profile.');
    const updated = await api.updateProfile(currentUser.id, updates);
    setCurrentUser(updated);
    return updated;
  };

  const refreshProfile = async () => {
    if (!authUserId) return;
    const profile = await api.getProfileById(authUserId);
    setCurrentUser(profile);
  };

  const role = currentUser?.role || null;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;
  const isPlayer = role === 'player';

  return (
    <AuthContext.Provider value={{
      currentUser,
      role,
      isAuthenticated: Boolean(currentUser),
      isLoading: !sessionInitialized || profileLoading,
      isAdmin,
      isManager,
      isPlayer,
      canManageUsers: isAdmin,
      canManageMatches: isManager,
      canEditStats: isManager,
      login,
      logout,
      requestPasswordReset,
      updateCurrentUser,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export { isSupabaseConfigured };
