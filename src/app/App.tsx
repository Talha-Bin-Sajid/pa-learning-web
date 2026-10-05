import { CircularProgress, CssBaseline, GlobalStyles, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { DrillDownProvider } from '@/components/shared/DrillDown';
import { ToastProvider } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { AuthProvider, useAuth, usePermissions } from '@/features/auth/AuthProvider';
import { SignInPage } from '@/features/auth/SignInPage';
import { CycleProvider } from '@/features/cycles/CycleProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { can, landingPath, type Capability } from './navigation';
import { theme } from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

/** Hides a route from people without the capability (the API enforces it too). */
function Guard({ requires, children }: { requires?: Capability; children: ReactNode }) {
  const permissions = usePermissions();
  return can(permissions, requires) ? children : <Navigate to={landingPath(permissions)} replace />;
}

function Landing() {
  return <Navigate to={landingPath(usePermissions())} replace />;
}

/** Lazy route helper: each page is its own chunk. */
function page(path: string, load: () => Promise<{ default: () => ReactNode }>, requires?: Capability): RouteObject {
  return {
    path,
    lazy: async () => {
      const { default: Page } = await load();
      return { Component: () => <Guard requires={requires}><Page /></Guard> };
    },
  };
}

const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Landing /> },
      page('dashboard', () => import('@/features/dashboard/DashboardPage'), 'viewTeam'),
      page('template', () => import('@/features/learning-items/TemplatePage'), 'manageItems'),
      page('template/import', () => import('@/features/learning-items/BulkUploadPage'), 'manageItems'),
      page('team', () => import('@/features/team/TeamProgressPage'), 'viewTeam'),
      page('team/:profileId', () => import('@/features/team/TeamProgressPage'), 'viewTeam'),
      page('evidence', () => import('@/features/team/EvidenceReviewPage'), 'reviewEvidence'),
      page('users', () => import('@/features/users/UsersPage'), 'manageUsers'),
      page('reminders', () => import('@/features/reminders/RemindersPage'), 'manageReminders'),
      page('reports', () => import('@/features/team/ReportsPage'), 'viewTeam'),
      page('years', () => import('@/features/cycles/YearsPage'), 'manageCycles'),
      page('my', () => import('@/features/my-learning/MyDashboardPage')),
      page('my/plan', () => import('@/features/my-learning/MyPlanPage')),
      page('my/evidence', () => import('@/features/my-learning/MyEvidencePage')),
      page('my/reports', () => import('@/features/my-learning/MyReportsPage')),
      { path: '*', element: <Landing /> },
    ],
  },
];

const router = createBrowserRouter(routes);

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-panel" aria-busy="true" aria-label="Loading">
      <CircularProgress size={28} />
    </div>
  );
}

function BlockedScreen({ reason }: { reason: string }) {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-panel p-6">
      <div className="max-w-md bg-white p-8 shadow-card" style={{ borderTop: '3px solid #ec4f3c' }}>
        <h1 className="text-[20px] font-semibold text-ink">Access not available</h1>
        <p className="mt-2 text-[13px] leading-[22px] text-muted">{reason}</p>
        <Button variant="dark" size="lg" className="mt-5" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

function AuthGate() {
  const { status, blockedReason } = useAuth();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'signed-out') return <SignInPage />;
  if (status === 'blocked') return <BlockedScreen reason={blockedReason ?? 'Your account cannot use the platform.'} />;
  return (
    <CycleProvider>
      <DrillDownProvider>
        <RouterProvider router={router} />
      </DrillDownProvider>
    </CycleProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <StyledEngineProvider enableCssLayer>
        {/* Must be first: MUI prepends its styles to <head>, so the layer order is declared here,
            making Tailwind utilities > MUI > Tailwind reset. */}
        <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
        <ThemeProvider theme={theme}>
          <CssBaseline enableColorScheme={false} />
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <AuthProvider>
                <AuthGate />
              </AuthProvider>
            </ToastProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </StyledEngineProvider>
    </ErrorBoundary>
  );
}
