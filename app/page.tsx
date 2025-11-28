import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-5xl font-bold text-primary mb-4">
          Roony Governance
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          Financial Firewall for AI Agents
        </p>
        <p className="text-slate-500 mb-8 max-w-2xl mx-auto">
          Control and monitor AI agent spending with real-time policy evaluation 
          and just-in-time virtual cards.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/docs/ARCHITECTURE.md"
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            View Documentation
          </Link>
        </div>
      </div>
    </main>
  );
}

