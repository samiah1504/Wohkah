import { FEATURE_COPY } from "@/lib/copy/terms";

/**
 * Plan entitlements, resolved server-side per request from the database
 * (plans and features are data: ARCHITECTURE.md §7). The database also
 * enforces the important limits itself (RLS + triggers), so these checks give
 * clear messages and hide unavailable features; they are not the only guard.
 */
export const FEATURES = [
  "admins",
  "branches",
  "work_locations",
  "storage_mb",
  "custom_domains",
  "custom_roles",
  "advanced_onboarding",
  "job_descriptions",
  "digital_contracts",
  "advanced_approvals",
  "advanced_reporting",
  "advanced_analytics",
] as const;

export type Feature = (typeof FEATURES)[number];
export type FeatureState = { enabled: boolean; limit: number | null };
export type Entitlements = Partial<Record<Feature, FeatureState>>;
export type HasEntitlements = { features: Entitlements; plan: { code: string; name: string } };

/** Customer-facing labels live in the shared copy dictionary. */
export const FEATURE_LABELS: Record<Feature, string> = Object.fromEntries(
  FEATURES.map((f) => [f, FEATURE_COPY[f].label]),
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
    throw new EntitlementError(
      `${FEATURE_LABELS[feature]} isn't included in the ${ctx.plan.name} plan. Upgrade to use it.`,
    );
  }
}

/** Throws when adding one more would exceed the plan limit. */
export function assertLimit(ctx: HasEntitlements, feature: Feature, currentCount: number): void {
  const limit = limitOf(ctx, feature);
  if (limit !== null && currentCount + 1 > limit) {
    throw new EntitlementError(limitMessage(feature, limit, ctx.plan.name));
  }
}

export function limitMessage(feature: Feature, limit: number, planName?: string): string {
  const label =
    limit === 1 && FEATURE_COPY[feature].singular
      ? FEATURE_COPY[feature].singular
      : FEATURE_LABELS[feature].toLowerCase();
  const plan = planName ? `The ${planName} plan` : "Your plan";
  return limit === 0
    ? `${FEATURE_LABELS[feature]} aren't included in your plan. Upgrade to add them.`
    : `${plan} allows up to ${limit} ${label}. Upgrade your plan to add more.`;
}

export function isFeature(value: string): value is Feature {
  return (FEATURES as readonly string[]).includes(value);
}
