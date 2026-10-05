import { Drawer } from '@mui/material';
import { Suspense, useState } from 'react';
import { Outlet } from 'react-router';
import { PageSkeleton } from '@/components/ui/states';
import { Sidebar } from './Sidebar';

/** Fixed sidebar on desktop; top bar + slide-in drawer below 1024px. */
export function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen items-stretch">
      <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 lg:block">
        <Sidebar />
      </aside>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: { width: 270, borderRadius: 0, background: '#000' } } }}
        sx={{ display: { lg: 'none' } }}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white lg:hidden">
          <div className="flex items-center gap-2.5">
            <img src="/brand-mark.png" alt="" className="w-7" />
            <span className="text-[11px] font-semibold tracking-[1.3px]">PROJECT ACCOUNTANTS</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex size-9 cursor-pointer flex-col items-center justify-center gap-[5px] border border-white/25"
          >
            <span className="block h-[1.5px] w-4 bg-white" />
            <span className="block h-[1.5px] w-4 bg-white" />
            <span className="block h-[1.5px] w-4 bg-white" />
          </button>
        </div>
        <Suspense fallback={<div className="p-7"><PageSkeleton /></div>}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
