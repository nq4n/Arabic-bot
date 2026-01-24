import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = "student" | "teacher" | "admin" | null;

export type Profile = {
  id: string;
  role: UserRole;
  must_change_password: boolean;
  added_by_teacher_id: string | null;
  full_name: string | null;
  username: string | null;
  email: string | null;
};

interface SessionContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  user: User | null;
  userRole: UserRole;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      try {
        setLoading(true);
        // Clean up: only attempt fetch if online
        if (!window.navigator.onLine) {
          setLoading(false);
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        setSession(session);

        if (session) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error) {
            throw error;
          }
          if (data) {
            setProfile(data as Profile);
          }
        } else {
          setProfile(null);
        }
      } catch (error: any) {
        // Suppress "Failed to fetch" noise when offline or on network error
        if (error.message === 'TypeError: Failed to fetch' || !window.navigator.onLine) {
          // Stay silent or handle offline state logic here if needed
        } else {
          console.error('Error fetching session and profile:', error);
        }
        setProfile(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // When auth state changes, refetch profile
      if (session) {
        fetchSessionAndProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    profile,
    loading,
    user: session?.user ?? null,
    userRole: profile?.role ?? null,
    signOut: () => supabase.auth.signOut(),
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
