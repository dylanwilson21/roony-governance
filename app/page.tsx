import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 leading-none">Roony</p>
              <p className="text-xs text-slate-500 leading-none mt-1">Financial Firewall for AI Agents</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/docs/API.md" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Docs
            </Link>
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors shadow-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -right-24 top-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-70 animate-pulse" />
          <div className="absolute -left-10 top-1/3 w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-70 animate-pulse" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Financial-grade governance for AI spend
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-slate-900">
              Control every purchase your agents make.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Roony sits between your AI agents and your money. Real-time spending checks, human approvals, and
              just-in-time virtual cards—so agents can move fast without putting funds at risk.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/25"
              >
                Launch Roony
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-white text-slate-900 rounded-lg text-sm font-semibold border border-slate-200 hover:border-slate-300 transition-colors shadow-sm"
              >
                View demo dashboard
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4">
              <Stat label="Spend governed" value="$10k/mo" />
              <Stat label="Blocked attempts" value="6 critical" />
              <Stat label="Decision latency" value="<150ms" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-blue-50 via-white to-slate-50 rounded-2xl blur-2xl" />
            <div className="relative rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Live Decision</p>
                  <p className="text-sm font-semibold text-slate-900">Agent Purchase Request</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Approved
                </span>
              </div>
              <div className="p-6 space-y-4">
                <Row label="Agent" value="Research Bot" />
                <Row label="Merchant" value="GitHub" />
                <Row label="Description" value="GitHub Copilot — Monthly" />
                <Row label="Amount" value="$20.00" />
                <Row label="Checks" value="Per-tx limit • Daily budget • Org max tx" />
                <Row label="Decision" value="Within limits → Virtual card issued" highlight />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Just-in-time virtual card created</p>
                  <p className="text-xs text-slate-500">
                    Hard limit set to $20.00 • Expires after first use • Tied to this intent
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-6">
          <TrustCard title="Agent-safe by design" description="Per-agent limits, org guardrails, human approvals." />
          <TrustCard title="Financial-grade controls" description="Single-use virtual cards, audit trails, allow/block lists." />
          <TrustCard title="Fast to integrate" description="REST + MCP endpoints. Add a card, get governance in minutes." />
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3">The risk</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Agents can spend faster than you can react.</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Runaway loops, prompt injection, or simply vague instructions can translate into expensive mistakes. With no
              guardrails, a single bug can rack up thousands in minutes.
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li>• Looping agents buying 10,000 API calls</li>
              <li>• Prompt injection convincing agents to spend</li>
              <li>• No audit trail of what was purchased and why</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Spending Check</p>
                <p className="text-lg font-semibold text-slate-900">Outcome: Blocked</p>
              </div>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-100">
                Rejected
              </span>
            </div>
            <div className="space-y-3 text-sm text-slate-800">
              <p className="flex justify-between"><span>Reason:</span><span className="font-semibold text-red-600">Category blocked (gambling)</span></p>
              <p className="flex justify-between"><span>Amount:</span><span className="font-semibold">$450.00</span></p>
              <p className="flex justify-between"><span>Agent:</span><span className="font-semibold">Marketing Agent</span></p>
              <p className="flex justify-between"><span>Guardrail:</span><span className="font-semibold">Org blocked category</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-16 space-y-10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">The platform</p>
              <h2 className="text-3xl font-bold text-slate-900">Built for finance teams, friendly to developers.</h2>
              <p className="text-slate-600 mt-2 max-w-2xl">
                Real-time checks, human approvals, and just-in-time cards—exposed via a clean API and a professional dashboard.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              title="Spending controls"
              description="Per-transaction, daily, monthly limits on every agent. Org budgets and max transaction caps."
            />
            <FeatureCard
              title="Approvals that work"
              description="Route large or first-time vendor purchases to human review. Keep velocity, add oversight."
            />
            <FeatureCard
              title="Virtual cards, safely"
              description="Single-use, amount-limited, expires after first use. No shared cards floating around."
            />
            <FeatureCard
              title="Merchant governance"
              description="Block categories, allow specific vendors, detect new merchants automatically."
            />
            <FeatureCard
              title="Full audit trail"
              description="Every decision logged with reasons. Know what was bought, by which agent, and why."
            />
            <FeatureCard
              title="Fast integration"
              description="REST + MCP endpoints. Works with ChatGPT, Claude, and your own agent stack."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-3xl font-bold text-slate-900">Ready to trust your agents with a card?</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Add a payment method, set your guardrails, and give your agents their API keys. Roony handles the financial
            controls—so you stay in control.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/25"
            >
              Get started free
            </Link>
            <Link
              href="/docs/API.md"
              className="px-6 py-3 bg-white text-slate-900 rounded-lg text-sm font-semibold border border-slate-200 hover:border-slate-300 transition-colors shadow-sm"
            >
              Read the API docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-base font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-emerald-600" : "text-slate-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

function TrustCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:-translate-y-1 hover:shadow-lg transition-transform transition-shadow">
      <p className="text-base font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}


