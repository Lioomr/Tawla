'use client';

interface ShimmerProps {
  rows?: number;
  columns?: number;
  variant?: 'table' | 'card' | 'stat';
  className?: string;
}

function ShimmerLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <div className={`${width} ${height} bg-stone-200 rounded-md animate-pulse`} />
  );
}

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 bg-stone-200 rounded-xl animate-pulse" />
        <ShimmerLine width="w-16" height="h-3" />
      </div>
      <ShimmerLine width="w-24" height="h-8" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-stone-200 rounded-xl animate-pulse" />
        <div className="flex-1 space-y-2">
          <ShimmerLine width="w-32" height="h-4" />
          <ShimmerLine width="w-20" height="h-3" />
        </div>
      </div>
      <ShimmerLine width="w-full" height="h-3" />
    </div>
  );
}

function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="px-6 py-4 flex items-center gap-6">
      {Array.from({ length: columns }).map((_, i) => (
        <ShimmerLine
          key={i}
          width={i === 0 ? 'w-32' : i === columns - 1 ? 'w-16' : 'w-24'}
          height="h-4"
        />
      ))}
    </div>
  );
}

export default function ShimmerSkeleton({ rows = 4, columns = 4, variant = 'table', className = '' }: ShimmerProps) {
  if (variant === 'stat') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={`divide-y divide-stone-100 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
}
