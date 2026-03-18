import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { loadUserData, saveUserData } from './database';
import { useStore } from '@/store';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  syncToCloud: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isGuest: false,
  signInWithGoogle: async () => {},
  signInWithGitHub: async () => {},
  signOut: async () => {},
  continueAsGuest: () => {},
  syncToCloud: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const currentUserId = useRef<string | null>(null);

  // Load cloud data into the store when user signs in
  const loadCloudData = useCallback(async (userId: string) => {
    currentUserId.current = userId;

    const cloudData = await loadUserData(userId);

    // Check if guest had data before signing in
    const guestState = useStore.getState();
    const guestHadData = guestState.semesters.length > 0 || guestState.detailedCourses.length > 0;

    if (cloudData) {
      // Cloud data exists — load it
      // If guest had data and cloud is empty, merge guest data to cloud
      if (guestHadData && cloudData.semesters.length === 0 && cloudData.detailedCourses.length === 0) {
        await saveUserData(userId, {
          gradeScale: guestState.gradeScale,
          semesters: guestState.semesters,
          detailedCourses: guestState.detailedCourses,
        });
      } else {
        useStore.getState().resetData();
        useStore.getState().importData(JSON.stringify(cloudData));
      }
    } else if (guestHadData) {
      // No cloud data but guest had data — push it to cloud
      await saveUserData(userId, {
        gradeScale: guestState.gradeScale,
        semesters: guestState.semesters,
        detailedCourses: guestState.detailedCourses,
      });
    } else {
      // No cloud data, no guest data — fresh start
      useStore.getState().resetData();
    }

    setIsGuest(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadCloudData(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await loadCloudData(s.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadCloudData]);

  // Auto-save to cloud when store changes (debounced)
  useEffect(() => {
    if (!user) return;

    let timeout: ReturnType<typeof setTimeout>;
    const unsub = useStore.subscribe(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        // Only save if this user is still signed in
        if (currentUserId.current !== user.id) return;
        const { gradeScale, semesters, detailedCourses } = useStore.getState();
        saveUserData(user.id, { gradeScale, semesters, detailedCourses });
      }, 1500);
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [user]);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signInWithGitHub = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    if (!supabase) return;
    currentUserId.current = null;
    await supabase.auth.signOut();
    useStore.getState().resetData();
    setUser(null);
    setSession(null);
    setIsGuest(false);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  const syncToCloud = async () => {
    if (!user) return;
    const { gradeScale, semesters, detailedCourses } = useStore.getState();
    await saveUserData(user.id, { gradeScale, semesters, detailedCourses });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isGuest, signInWithGoogle, signInWithGitHub, signOut, continueAsGuest, syncToCloud }}>
      {children}
    </AuthContext.Provider>
  );
}
