import type { Policy, PurchaseRequest, PolicyEvaluationResult } from "./types";
import { db } from "@/lib/database";
import { policies, budgetTracking, blockedAttempts } from "@/lib/database/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export class PolicyEvaluator {
  /**
   * Evaluate a purchase request against all applicable policies
   */
  async evaluate(
    request: PurchaseRequest,
    agentId: string,
    organizationId: string,
    teamId?: string,
    projectId?: string
  ): Promise<PolicyEvaluationResult> {
    // Load applicable policies
    const applicablePolicies = await this.getApplicablePolicies(
      agentId,
      organizationId,
      teamId,
      projectId
    );

    if (applicablePolicies.length === 0) {
      // No policies = default reject for safety
      return {
        status: "rejected",
        reasonCode: "NO_POLICY",
        reasonMessage: "No policy found for this agent. Please configure a policy first.",
      };
    }

    // Sort by priority (higher priority first)
    applicablePolicies.sort((a, b) => b.priority - a.priority);

    // Evaluate each policy
    for (const policy of applicablePolicies) {
      if (!policy.enabled) continue;

      const result = await this.evaluatePolicy(policy, request, agentId, organizationId, teamId, projectId);
      
      if (result.status === "rejected") {
        return result;
      }
      
      if (result.status === "pending_approval") {
        return result;
      }
    }

    // All policies passed
    return { status: "approved" };
  }

  /**
   * Get all policies applicable to this request
   */
  private async getApplicablePolicies(
    agentId: string,
    organizationId: string,
    teamId?: string,
    projectId?: string
  ): Promise<Policy[]> {
    const allPolicies = await db
      .select()
      .from(policies)
      .where(eq(policies.organizationId, organizationId));

    return allPolicies
      .filter((p) => {
        const scopeIds = JSON.parse(p.scopeIds) as string[];
        
        switch (p.scopeType) {
          case "agent":
            return scopeIds.includes(agentId);
          case "team":
            return teamId && scopeIds.includes(teamId);
          case "project":
            return projectId && scopeIds.includes(projectId);
          case "org":
            return true;
          default:
            return false;
        }
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        scopeType: p.scopeType as Policy["scopeType"],
        scopeIds: JSON.parse(p.scopeIds) as string[],
        rules: JSON.parse(p.rules),
        action: p.action as Policy["action"],
        priority: p.priority,
        enabled: p.enabled,
      }));
  }

  /**
   * Evaluate a single policy
   */
  private async evaluatePolicy(
    policy: Policy,
    request: PurchaseRequest,
    agentId: string,
    organizationId: string,
    teamId?: string,
    projectId?: string
  ): Promise<PolicyEvaluationResult> {
    const rules = policy.rules;

    // Check budget limits
    if (rules.budget) {
      const budgetCheck = await this.checkBudget(
        rules.budget,
        request,
        agentId,
        organizationId,
        teamId,
        projectId
      );
      if (!budgetCheck.allowed) {
        return {
          status: "rejected",
          reasonCode: budgetCheck.reasonCode,
          reasonMessage: budgetCheck.message,
          policyId: policy.id,
        };
      }
    }

    // Check merchant rules
    if (rules.merchant) {
      const merchantCheck = this.checkMerchant(rules.merchant, request);
      if (!merchantCheck.allowed) {
        return {
          status: "rejected",
          reasonCode: merchantCheck.reasonCode,
          reasonMessage: merchantCheck.message,
          policyId: policy.id,
        };
      }
    }

    // Check MCC rules (would need merchant MCC lookup)
    // For now, we'll skip this as it requires external data

    // Check time-based rules
    if (rules.time) {
      const timeCheck = this.checkTime(rules.time);
      if (!timeCheck.allowed) {
        return {
          status: "rejected",
          reasonCode: "TIME_RESTRICTED",
          reasonMessage: timeCheck.message,
          policyId: policy.id,
        };
      }
    }

    // If policy action is reject, reject
    if (policy.action === "reject") {
      return {
        status: "rejected",
        reasonCode: "POLICY_REJECT",
        reasonMessage: `Policy "${policy.name}" rejects this request`,
        policyId: policy.id,
      };
    }

    // If policy action is require_approval, require approval
    if (policy.action === "require_approval") {
      return {
        status: "pending_approval",
        reasonCode: "HUMAN_APPROVAL_REQUIRED",
        reasonMessage: `Policy "${policy.name}" requires human approval`,
        policyId: policy.id,
      };
    }

    // Policy allows
    return { status: "approved" };
  }

  /**
   * Check budget limits
   */
  private async checkBudget(
    budgetRules: NonNullable<Policy["rules"]["budget"]>,
    request: PurchaseRequest,
    agentId: string,
    organizationId: string,
    teamId?: string,
    projectId?: string
  ): Promise<{ allowed: boolean; reasonCode?: string; message?: string }> {
    // Check per-transaction limit
    if (budgetRules.perTransactionLimit && request.amount > budgetRules.perTransactionLimit) {
      return {
        allowed: false,
        reasonCode: "AMOUNT_TOO_HIGH",
        message: `Transaction amount exceeds per-transaction limit of ${budgetRules.perTransactionLimit}`,
      };
    }

    // Check period-based limits (simplified - would need proper period calculation)
    // This is a placeholder - full implementation would query budget_tracking table

    return { allowed: true };
  }

  /**
   * Check merchant rules
   */
  private checkMerchant(
    merchantRules: NonNullable<Policy["rules"]["merchant"]>,
    request: PurchaseRequest
  ): { allowed: boolean; reasonCode?: string; message?: string } {
    const merchantName = request.merchant.name.toLowerCase();

    // Check blocklist
    if (merchantRules.blocklist) {
      for (const blocked of merchantRules.blocklist) {
        if (merchantName.includes(blocked.toLowerCase())) {
          return {
            allowed: false,
            reasonCode: "MERCHANT_NOT_ALLOWED",
            message: `Merchant "${request.merchant.name}" is in the blocklist`,
          };
        }
      }
    }

    // Check allowlist
    if (merchantRules.allowlist && merchantRules.allowlist.length > 0) {
      const isAllowed = merchantRules.allowlist.some((allowed) =>
        merchantName.includes(allowed.toLowerCase())
      );
      if (!isAllowed) {
        return {
          allowed: false,
          reasonCode: "MERCHANT_NOT_ALLOWED",
          message: `Merchant "${request.merchant.name}" is not in the allowlist`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check time-based rules
   */
  private checkTime(
    timeRules: NonNullable<Policy["rules"]["time"]>
  ): { allowed: boolean; message?: string } {
    if (!timeRules.businessHours) {
      return { allowed: true };
    }

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase(); // "mon", "tue", etc.
    
    // Check if current day is allowed
    const daysMap: Record<string, string> = {
      mon: "monday",
      tue: "tuesday",
      wed: "wednesday",
      thu: "thursday",
      fri: "friday",
      sat: "saturday",
      sun: "sunday",
    };

    const currentDay = daysMap[dayName];
    if (!timeRules.businessHours.days.includes(currentDay)) {
      return {
        allowed: false,
        message: `Purchases are only allowed on ${timeRules.businessHours.days.join(", ")}`,
      };
    }

    // Check time (simplified - would need timezone handling)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [startHour, startMinute] = timeRules.businessHours.start.split(":").map(Number);
    const [endHour, endMinute] = timeRules.businessHours.end.split(":").map(Number);

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (currentTime < startTime || currentTime > endTime) {
      return {
        allowed: false,
        message: `Purchases are only allowed between ${timeRules.businessHours.start} and ${timeRules.businessHours.end}`,
      };
    }

    return { allowed: true };
  }
}

