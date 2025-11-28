export default function AgentsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Agents</h1>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          Create Agent
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="p-6">
          <p className="text-sm text-slate-500">No agents yet. Create your first agent to get started.</p>
        </div>
      </div>
    </div>
  );
}

