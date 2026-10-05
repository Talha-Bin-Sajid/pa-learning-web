import { Skeleton } from '@mui/material';
import { errorMessage } from '@/lib/api-client';
import { Button } from './Button';
import { Panel } from './Panel';

/** Skeleton placeholders shaped like the page (stat row + panels). */
export function PageSkeleton({ stats = 4, panels = 2 }: { stats?: number; panels?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      {stats > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:gap-5">
          {Array.from({ length: stats }, (_, i) => (
            <Panel key={i}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="30%" height={48} />
              <Skeleton variant="text" width="60%" />
            </Panel>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: panels }, (_, i) => (
          <Panel key={i}>
            <Skeleton variant="text" width="35%" />
            {Array.from({ length: 5 }, (__, j) => (
              <Skeleton key={j} variant="rectangular" height={14} sx={{ my: 1.5 }} />
            ))}
          </Panel>
        ))}
      </div>
    </div>
  );
}

/** Inline error with retry, for failed queries. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Panel accentLeft="#ec4f3c" className="flex flex-wrap items-center justify-between gap-3" role="alert">
      <div>
        <div className="text-[14px] font-semibold text-ink">This could not be loaded</div>
        <div className="mt-0.5 text-[13px] text-muted">{errorMessage(error)}</div>
      </div>
      {onRetry ? (
        <Button onClick={onRetry} variant="outline">
          Try again
        </Button>
      ) : null}
    </Panel>
  );
}
