export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Spend Over Time</h2>
          <div className="h-64 flex items-center justify-center text-slate-400">
            Chart placeholder
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Spend by Agent</h2>
          <div className="h-64 flex items-center justify-center text-slate-400">
            Chart placeholder
          </div>
        </div>
      </div>
    </div>
  );
}

