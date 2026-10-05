import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api-client';
import type { Cycle } from '@/types/api';
import { useMe } from '../auth/AuthProvider';

interface CycleContextValue {
  cycles: Cycle[];
  /** The year being viewed (defaults to the current one). */
  cycle: Cycle | null;
  /** Value to send as ?cycleId= (undefined = server default, the current year). */
  cycleId: string | undefined;
  setCycleId(id: string | undefined): void;
}

const CycleContext = createContext<CycleContextValue | null>(null);

export const CYCLES_KEY = ['cycles'] as const;

export function useCyclesQuery() {
  return useQuery({ queryKey: CYCLES_KEY, queryFn: () => api.get<Cycle[]>('/cycles'), staleTime: 5 * 60_000 });
}

/** Which learning year every page shows; switching it refetches page data (cycleId is part of query keys). */
export function CycleProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const { data: cycles = [] } = useCyclesQuery();
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const value = useMemo(() => {
    const current = cycles.find((c) => c.isCurrent) ?? me.currentCycle;
    const cycle = (selected && cycles.find((c) => c.id === selected)) || current || null;
    return {
      cycles,
      cycle,
      cycleId: selected && selected !== current?.id ? selected : undefined,
      setCycleId: setSelected,
    };
  }, [cycles, selected, me.currentCycle]);

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>;
}

export function useCycle(): CycleContextValue {
  const ctx = useContext(CycleContext);
  if (!ctx) throw new Error('useCycle must be used inside CycleProvider');
  return ctx;
}
