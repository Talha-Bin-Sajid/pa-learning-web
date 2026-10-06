import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, configureApi } from '@/lib/api-client';
import { accessToken, authAdapter } from '@/lib/auth-client';
import type { Me, Permissions, Person } from '@/types/api';

type Status = 'loading' | 'signed-out' | 'ready' | 'blocked';

interface AuthContextValue {
  status: Status;
  me: Me | undefined;
  /** Why a signed-in account cannot use the app (no profile / deactivated). */
  blockedReason: string | null;
  signIn(email: string, password: string): Promise<void>;
  register(fullName: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const ME_KEY = ['me'] as const;

/**
 * Owns the Supabase session and the backend profile (/me). The API client gets
 * its bearer token from here; a 401 from the API signs the user out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<boolean | undefined>(undefined);

  const signOut = useCallback(async () => {
    await authAdapter().signOut().catch(() => undefined);
    queryClient.clear();
    setSession(false);
  }, [queryClient]);

  useEffect(() => {
    configureApi(accessToken, () => void signOut());
    const auth = authAdapter();
    void auth.isSignedIn().then(setSession);
    return auth.subscribe((signedIn) => {
      if (!signedIn) queryClient.clear();
      setSession(signedIn);
    });
  }, [signOut, queryClient]);

  const meQuery = useQuery({
    queryKey: ME_KEY,
    queryFn: () => api.get<Me>('/me'),
    enabled: !!session,
    staleTime: 5 * 60_000,
    retry: (count, err) => (err as { status?: number }).status !== 403 && count < 2,
  });

  const signIn = useCallback((email: string, password: string) => authAdapter().signInWithPassword(email, password), []);

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      await api.post<{ profile: Person }>('/auth/register', { fullName, email, password });
      await signIn(email, password);
    },
    [signIn],
  );

  // 403 = account not allowed. Any other failure (server down, bad gateway) must also
  // surface here, otherwise the app sits on the loader forever.
  const blockedReason = meQuery.error
    ? (meQuery.error as { status?: number }).status === 403
      ? (meQuery.error as Error).message
      : `Could not load your profile: ${(meQuery.error as Error).message}`
    : null;
  const status: Status =
    session === undefined || (session && meQuery.isPending && !blockedReason)
      ? 'loading'
      : !session
        ? 'signed-out'
        : blockedReason
          ? 'blocked'
          : meQuery.data
            ? 'ready'
            : 'loading';

  const value = useMemo(
    () => ({ status, me: meQuery.data, blockedReason, signIn, register, signOut }),
    [status, meQuery.data, blockedReason, signIn, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** The signed-in person (only valid inside the authenticated app shell). */
export function useMe(): Me {
  const { me } = useAuth();
  if (!me) throw new Error('useMe used outside an authenticated route');
  return me;
}

export function usePermissions(): Permissions {
  return useMe().permissions;
}
