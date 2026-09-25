import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('shimmer rounded-ark-md', className)}
      aria-busy="true"
      aria-label="Loading..."
    />
  )
}

export function PRListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-ark-bg-secondary border border-ark-border rounded-ark-lg p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ReviewPanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-ark-bg-secondary border border-ark-border rounded-ark-lg p-6 space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <div className="flex gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-ark-bg-secondary border border-ark-border rounded-ark-lg p-4 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-ark-bg-secondary border border-ark-border rounded-ark-lg p-6 space-y-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
      <div className="col-span-full bg-ark-bg-secondary border border-ark-border rounded-ark-lg p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
