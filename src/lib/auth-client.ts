import { GoTrueClient } from '@supabase/auth-js';
import { config } from './config';

/**
 * Sign-in provider seen by the app. Production uses Supabase Auth; local demo
 * mode (VITE_DEMO_MODE=true, dev only) uses a picker against the demo server.
 * The browser never talks to the database directly (ADR 0001).
 */
export interface AuthAdapter {
  isSignedIn(): Promise<boolean>;
  accessToken(): Promise<string | null>;
  subscribe(onChange: (signedIn: boolean) => void): () => void;
  signInWithPassword(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

class SupabaseAuth implements AuthAdapter {
  private readonly client = new GoTrueClient({
    url: `${config.supabaseUrl}/auth/v1`,
    headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}` },
    storageKey: 'pa-learning-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  });

  async isSignedIn() {
    return !!(await this.client.getSession()).data.session;
  }

  async accessToken() {
    // auth-js refreshes the token when it is close to expiry.
    return (await this.client.getSession()).data.session?.access_token ?? null;
  }

  subscribe(onChange: (signedIn: boolean) => void) {
    const { data } = this.client.onAuthStateChange((_event, session) => onChange(!!session));
    return () => data.subscription.unsubscribe();
  }

  async signInWithPassword(email: string, password: string) {
    const { error } = await this.client.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message);
  }

  async signOut() {
    await this.client.signOut();
  }
}

/** DEV ONLY: token = "demo:<authUserId>", accepted solely by backend/scripts/demo-server.ts. */
export class DemoAuth implements AuthAdapter {
  private static readonly KEY = 'pa-learning-demo-token';
  private listeners = new Set<(signedIn: boolean) => void>();

  private read(): string | null {
    try {
      return localStorage.getItem(DemoAuth.KEY);
    } catch {
      return null;
    }
  }

  async isSignedIn() {
    return !!this.read();
  }

  async accessToken() {
    return this.read();
  }

  subscribe(onChange: (signedIn: boolean) => void) {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  async signInWithPassword() {
    throw new Error('Demo mode: pick an account below.');
  }

  signInAs(authUserId: string) {
    localStorage.setItem(DemoAuth.KEY, `demo:${authUserId}`);
    this.listeners.forEach((l) => l(true));
  }

  async signOut() {
    localStorage.removeItem(DemoAuth.KEY);
    this.listeners.forEach((l) => l(false));
  }
}

let adapter: AuthAdapter | null = null;

export function authAdapter(): AuthAdapter {
  adapter ??= config.demoMode ? new DemoAuth() : new SupabaseAuth();
  return adapter;
}

export async function accessToken(): Promise<string | null> {
  return authAdapter().accessToken();
}
