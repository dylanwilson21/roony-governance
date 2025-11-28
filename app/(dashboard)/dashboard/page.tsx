export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Total Spend</h3>
          <p className="text-3xl font-bold text-slate-900">$0.00</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Active Agents</h3>
          <p className="text-3xl font-bold text-slate-900">0</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Transactions Today</h3>
          <p className="text-3xl font-bold text-slate-900">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500">No transactions yet</p>
        </div>
      </div>
    </div>
  );
}

