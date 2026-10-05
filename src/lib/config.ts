/** Public runtime configuration (Vite env). Fails loudly when misconfigured. */

function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

export const config = {
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, ''),
  get supabaseUrl() {
    return required('VITE_SUPABASE_URL').replace(/\/$/, '');
  },
  get supabaseAnonKey() {
    return required('VITE_SUPABASE_ANON_KEY');
  },
  microsoftSso: import.meta.env.VITE_ENABLE_MICROSOFT_SSO === 'true',
  /** Local demo mode (no Supabase). Never honoured in production builds. */
  demoMode: import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true',
};
