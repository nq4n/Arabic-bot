import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { classifyAuthChange } from '../utils/authState';

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
  // Tracks the currently loaded user so we can tell a genuine sign-in/out from a
  // background token refresh or multi-tab sync (same user), and avoid re-gating
  // the whole app — which would unmount in-progress pages — on the latter.
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchProfileForSession = async (nextSession: Session | null) => {
      if (!nextSession) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', nextSession.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }
    };

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
        currentUserIdRef.current = session?.user?.id ?? null;

        await fetchProfileForSession(session);
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

    const handleAuthChangeProfileError = (error: any) => {
      if (error.message === 'TypeError: Failed to fetch' || !window.navigator.onLine) {
        // Stay silent or handle offline state logic here if needed
      } else {
        console.error('Error fetching auth-change profile:', error);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const prevUserId = currentUserIdRef.current;
      const nextUserId = nextSession?.user?.id ?? null;
      currentUserIdRef.current = nextUserId;
      setSession(nextSession);

      const kind = classifyAuthChange(prevUserId, nextUserId);

      // Background token refresh / tab refocus / multi-tab sync for the SAME user:
      // refresh the profile quietly and keep the current page mounted. Do NOT flip
      // `loading` to true here — that unmounts every route behind the loading screen
      // and destroys in-progress work (e.g. an AI evaluation) whenever another tab
      // refreshes the shared Supabase token.
      if (kind === 'background-refresh') {
        void fetchProfileForSession(nextSession).catch(handleAuthChangeProfileError);
        return;
      }

      // Genuine sign-out: clear the profile.
      if (kind === 'signed-out') {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Genuine sign-in or account switch: load the matching profile (gated).
      setLoading(true);
      void fetchProfileForSession(nextSession)
        .catch((error: any) => {
          handleAuthChangeProfileError(error);
          setProfile(null);
        })
        .finally(() => {
          setLoading(false);
        });
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
