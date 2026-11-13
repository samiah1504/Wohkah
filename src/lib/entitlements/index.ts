/**
 * Plan entitlements as resolved for a workspace (from the database, per
 * request). Labels, plans and prices come from the central catalogue
 * (src/lib/plans/catalog.ts). The database also enforces the important limits
 * itself, so these checks give clear messages; they are not the only guard.
 */
import {
  FEATURE_INFO,
  FEATURE_KEYS,
  PLANS,
  entitlement,
  lowestPlanWith,
  naira,
  type FeatureKey,
  type PlanCode,
} from "@/lib/plans/catalog";

export const FEATURES = FEATURE_KEYS;
export type Feature = FeatureKey;
export type FeatureState = { enabled: boolean; limit: number | null };
export type Entitlements = Partial<Record<Feature, FeatureState>>;
export type HasEntitlements = { features: Entitlements; plan: { code: string; name: string } };

export const FEATURE_LABELS: Record<Feature, string> = Object.fromEntries(
  FEATURE_KEYS.map((f) => [f, FEATURE_INFO[f].label]),
) as Record<Feature, string>;

export class EntitlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntitlementError";
  }
}

export function hasFeature(ctx: HasEntitlements, feature: Feature): boolean {
  return ctx.features[feature]?.enabled === true;
}

/** null = unlimited; 0 = not available on this plan. */
export function limitOf(ctx: HasEntitlements, feature: Feature): number | null {
  const f = ctx.features[feature];
  if (!f || !f.enabled) return 0;
  return f.limit;
}

export function assertFeature(ctx: HasEntitlements, feature: Feature): void {
  if (!hasFeature(ctx, feature)) {
    throw new EntitlementError(featureUpgradeMessage(feature, ctx.plan.name));
  }
}

/** Throws when adding one more would exceed the plan limit. */
export function assertLimit(ctx: HasEntitlements, feature: Feature, currentCount: number): void {
  const limit = limitOf(ctx, feature);
  if (limit !== null && currentCount + 1 > limit) {
    throw new EntitlementError(limitMessage(feature, limit, ctx.plan.name));
  }
}

/** Cheapest plan with a higher limit than `current` (for upgrade prompts). */
export function planWithMoreOf(feature: Feature, current: number) {
  return PLANS.find((p) => {
    const e = entitlement(p.code, feature);
    return e.enabled && (e.limit === null || e.limit > current);
  });
}

function label(feature: Feature, count: number) {
  const info = FEATURE_INFO[feature];
  return count === 1 && info.singular ? info.singular : info.label.toLowerCase();
}

function allowance(feature: Feature, code: PlanCode): string {
  const e = entitlement(code, feature);
  if (e.limit === null) return `unlimited ${FEATURE_INFO[feature].label.toLowerCase()}`;
  return `${e.limit} ${label(feature, e.limit)}`;
}

/**
 * Explains what was attempted, why it's unavailable, which plan includes more,
 * the price and how to proceed.
 */
export function limitMessage(feature: Feature, limit: number, planName?: string): string {
  const plan = planName ? `The ${planName} plan` : "Your plan";
  const next = planWithMoreOf(feature, limit);
  const upgrade = next
    ? ` ${next.name} includes ${allowance(feature, next.code)} for ${naira(next.monthlyMinor)} a month. Upgrade from Settings → Subscription.`
    : "";
  if (limit === 0) return `${FEATURE_INFO[feature].label} aren't included in your plan.${upgrade}`;
  return `${plan} allows up to ${limit} ${label(feature, limit)}.${upgrade}`;
}

export function featureUpgradeMessage(feature: Feature, planName: string): string {
  const plan = lowestPlanWith(feature);
  const what = FEATURE_INFO[feature].label;
  return plan
    ? `${what} isn't included in the ${planName} plan. It's available on ${plan.name} and higher, from ${naira(plan.monthlyMinor)} a month. Upgrade from Settings → Subscription.`
    : `${what} isn't included in the ${planName} plan.`;
}

export function isFeature(value: string): value is Feature {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}
