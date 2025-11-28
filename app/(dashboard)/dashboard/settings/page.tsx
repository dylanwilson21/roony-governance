export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Stripe Connection</h2>
          <p className="text-sm text-slate-500 mb-4">
            Connect your Stripe account to enable virtual card creation.
          </p>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            Connect Stripe
          </button>
        </div>

        <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Organization</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="My Organization"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

