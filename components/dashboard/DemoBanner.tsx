"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function DemoBanner() {
  const [isDemo, setIsDemo] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we're in demo mode (no payment methods configured)
    async function checkDemoMode() {
      try {
        const res = await fetch("/api/internal/payment-methods");
        if (res.ok) {
          const data = await res.json();
          // Show demo banner if no payment methods are configured
          setIsDemo(!data.paymentMethods || data.paymentMethods.length === 0);
        }
      } catch {
        // If we can't check, assume demo mode
        setIsDemo(true);
      }
    }
    
    // Check if user has dismissed the banner this session
    const wasDismissed = sessionStorage.getItem("demo-banner-dismissed");
    if (wasDismissed) {
      setDismissed(true);
    } else {
      checkDemoMode();
    }
  }, []);

  if (!isDemo || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
            DEMO MODE
          </span>
          <p className="text-sm">
            Spending checks work fully. Virtual card creation requires{" "}
            <Link href="/dashboard/settings" className="underline hover:no-underline">
              payment method setup
            </Link>{" "}
            + Stripe Issuing approval.
          </p>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem("demo-banner-dismissed", "true");
          }}
          className="text-white/80 hover:text-white transition-colors ml-4"
          aria-label="Dismiss banner"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}


