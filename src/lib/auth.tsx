import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { loadUserData, saveUserData } from './database';
import { useStore } from '@/store';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  syncToCloud: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithGitHub: async () => {},
  signOut: async () => {},
  syncToCloud: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Load cloud data into the store when user signs in
  const loadCloudData = useCallback(async (userId: string) => {
    const data = await loadUserData(userId);
    if (data) {
      const store = useStore.getState();
      // Cloud data exists — load it into the store
      store.importData(JSON.stringify(data));
    } else {
      // No cloud data — push current localStorage data to cloud
      await saveUserData(userId, {
        gradeScale: useStore.getState().gradeScale,
        semesters: useStore.getState().semesters,
        detailedCourses: useStore.getState().detailedCourses,
      });
    }
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const syncToCloud = async () => {
    if (!user) return;
    const { gradeScale, semesters, detailedCourses } = useStore.getState();
    await saveUserData(user.id, { gradeScale, semesters, detailedCourses });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signInWithGitHub, signOut, syncToCloud }}>
      {children}
    </AuthContext.Provider>
  );
}
