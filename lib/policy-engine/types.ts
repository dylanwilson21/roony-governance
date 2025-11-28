export interface PolicyRule {
  budget?: {
    perTransactionLimit?: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    monthlyLimit?: number;
    lifetimeLimit?: number;
  };
  merchant?: {
    allowlist?: string[];
    blocklist?: string[];
    newVendorThreshold?: number;
    newVendorRequiresApproval?: boolean;
  };
  mcc?: {
    allowed?: string[];
    blocked?: string[];
  };
  time?: {
    businessHours?: {
      start: string; // HH:mm format
      end: string;
      timezone: string;
      days: string[]; // ["monday", "tuesday", etc.]
    };
  };
  risk?: {
    maxVelocity?: number; // max requests per hour
    unusualAmountThreshold?: number; // percentage above average
  };
}

export interface Policy {
  id: string;
  name: string;
  scopeType: "agent" | "team" | "project" | "org";
  scopeIds: string[];
  rules: PolicyRule;
  action: "approve" | "reject" | "require_approval";
  priority: number;
  enabled: boolean;
}

export interface PurchaseRequest {
  agentId: string;
  amount: number;
  currency: string;
  description: string;
  merchant: {
    name: string;
    url?: string;
  };
  metadata?: Record<string, string>;
}

export interface PolicyEvaluationResult {
  status: "approved" | "rejected" | "pending_approval";
  reasonCode?: string;
  reasonMessage?: string;
  policyId?: string;
}

