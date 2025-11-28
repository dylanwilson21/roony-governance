export default function TransactionsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Transactions</h1>

      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">All Transactions</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Search..."
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
                Filter
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500">No transactions yet</p>
        </div>
      </div>
    </div>
  );
}

