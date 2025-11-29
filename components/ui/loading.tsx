export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-block ${className}`}>
      <div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
      <div className="h-8 bg-slate-200 rounded w-1/2"></div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner className="w-8 h-8" />
    </div>
  );
}

