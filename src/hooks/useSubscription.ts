import { useEffect, useState } from "react";
import { useCompanyContext } from "./useCompanyContext";

export type PlanTier = "bronze" | "prata" | "ouro" | null;
export type PlanStatus = "active" | "past_due" | "canceled" | "trialing" | "manual" | "incomplete" | null;

export type Feature =
  | "virtual_try_on"
  | "ai_insights"
  | "ai_import"
  | "crm"
  | "coupons"
  | "financial_dashboard";

const FEATURE_TIERS: Record<Feature, PlanTier[]> = {
  virtual_try_on: ["ouro"],
  ai_insights: ["prata", "ouro"],
  ai_import: ["prata", "ouro"],
  crm: ["prata", "ouro"],
  coupons: ["prata", "ouro"],
  financial_dashboard: ["prata", "ouro"],
};

interface SubscriptionState {
  planTier: PlanTier;
  planStatus: PlanStatus;
  planSource: "stripe" | "manual" | null;
  subscriptionEnd: string | null;
  isActive: boolean;
  loading: boolean;
  hasFeature: (feature: Feature) => boolean;
}

export function useSubscription(): SubscriptionState {
  const { company, loading } = useCompanyContext();
  const [state, setState] = useState<Omit<SubscriptionState, "hasFeature">>({
    planTier: null,
    planStatus: null,
    planSource: null,
    subscriptionEnd: null,
    isActive: false,
    loading: true,
  });

  useEffect(() => {
    if (loading) return;
    const c = company as any;
    const tier = (c?.plan_tier ?? null) as PlanTier;
    const status = (c?.plan_status ?? null) as PlanStatus;
    const source = (c?.plan_source ?? null) as "stripe" | "manual" | null;
    const end = c?.subscription_end ?? null;
    const isActive =
      status === "active" || status === "trialing" || status === "manual";
    setState({
      planTier: tier,
      planStatus: status,
      planSource: source,
      subscriptionEnd: end,
      isActive,
      loading: false,
    });
  }, [company, loading]);

  const hasFeature = (feature: Feature): boolean => {
    if (!state.isActive || !state.planTier) return false;
    return FEATURE_TIERS[feature].includes(state.planTier);
  };

  return { ...state, hasFeature };
}
