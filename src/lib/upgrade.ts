/**
 * Upgrade prompts. Each one says: what the customer tried to do, why it isn't
 * available on their plan, which plan or add-on includes it, the price, and
 * how to proceed. Built from the central catalogue only.
 */
import {
  FEATURE_INFO,
  PLANS,
  entitlement,
  getPlan,
  lowestPlanWith,
  naira,
  type FeatureKey,
} from "@/lib/plans/catalog";
import { planWithMoreOf } from "@/lib/entitlements";

export type UpgradePromptContent = {
  title: string;
  body: string;
  actionLabel: string;
  href: string;
};

const subscriptionHref = (slug: string, query = "") =>
  `/w/${slug}/settings/subscription${query ? `?${query}` : ""}`;
/** Add-ons are bought on the checkout page, on top of what's already paid for. */
const checkoutHref = (slug: string, query: string) =>
  `/w/${slug}/settings/subscription/checkout?${query}`;

export function featurePrompt(
  slug: string,
  planCode: string,
  feature: FeatureKey,
): UpgradePromptContent {
  const current = getPlan(planCode);
  const target = lowestPlanWith(feature);
  const what = FEATURE_INFO[feature].label;
  return {
    title: target
      ? `Upgrade to ${target.name} for ${what.toLowerCase()}`
      : `${what} is not on your plan`,
    body: target
      ? `You're on ${current?.name ?? "your current plan"}. ${what} is available on ${target.name} and higher plans, from ${naira(target.monthlyMinor)} a month.`
      : `${what} isn't available on your plan.`,
    actionLabel: target ? `See ${target.name}` : "See plans",
    href: subscriptionHref(slug, target ? `plan=${target.code}` : ""),
  };
}

export function limitPrompt(
  slug: string,
  planCode: string,
  feature: FeatureKey,
  limit: number,
): UpgradePromptContent {
  const current = getPlan(planCode);
  const info = FEATURE_INFO[feature];
  const next = planWithMoreOf(feature, limit);
  const nextAllowance = next ? entitlement(next.code, feature).limit : null;
  const unit = limit === 1 && info.singular ? info.singular : info.label.toLowerCase();
  return {
    title: `You've reached your plan's limit of ${limit} ${unit}`,
    body: next
      ? `The ${current?.name ?? "current"} plan includes ${limit} ${unit}. ${next.name} includes ${
          nextAllowance === null ? "unlimited" : nextAllowance
        } for ${naira(next.monthlyMinor)} a month.`
      : `The ${current?.name ?? "current"} plan includes ${limit} ${unit}.`,
    actionLabel: next ? `Upgrade to ${next.name}` : "See plans",
    href: subscriptionHref(slug, next ? `plan=${next.code}` : ""),
  };
}

export function staffPrompt(
  slug: string,
  planCode: string,
  active: number,
  allowance: number,
): UpgradePromptContent {
  const plan = getPlan(planCode);
  const next = PLANS.find((p) => p.includedStaff > allowance);
  if (plan && plan.extraStaff.allowed) {
    return {
      title: `All ${allowance} active staff places are in use`,
      body: `Your ${plan.name} plan covers ${allowance} active staff (${active} active now). Add extra staff for ${naira(plan.extraStaff.monthlyMinor)} a month each${
        next
          ? `, or upgrade to ${next.name}, which includes ${next.includedStaff} staff for ${naira(next.monthlyMinor)} a month`
          : ""
      }.`,
      actionLabel: "Add staff places",
      href: checkoutHref(slug, `plan=${plan.code}&addStaff=1`),
    };
  }
  return {
    title: `The ${plan?.name ?? "Free"} plan includes ${allowance} active staff`,
    body: `You have ${active} active staff. To manage more, upgrade to a paid plan${
      next
        ? `: ${next.name} includes ${next.includedStaff} staff for ${naira(next.monthlyMinor)} a month`
        : ""
    }. Extra staff can then be added for ${naira(PLANS[1]!.extraStaff.monthlyMinor)} a month each.`,
    actionLabel: next ? `Upgrade to ${next.name}` : "See plans",
    href: subscriptionHref(slug, next ? `plan=${next.code}` : ""),
  };
}

export function workLocationPrompt(
  slug: string,
  planCode: string,
  used: number,
  allowance: number,
): UpgradePromptContent {
  const plan = getPlan(planCode);
  const price = plan?.extraWorkLocation.monthlyMinor ?? 100_000;
  return {
    title: `You're using all ${allowance} work locations on your subscription`,
    body: `Your ${plan?.name ?? "current"} plan includes ${entitlement(plan?.code ?? "free", "work_locations").limit} work location${
      allowance === 1 ? "" : "s"
    } (${used} in use). Add another work location for ${naira(price)} a month.`,
    actionLabel: `Add a work location (${naira(price)}/month)`,
    href: checkoutHref(slug, `plan=${plan?.code ?? "free"}&addLocations=1`),
  };
}
