"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { ActionError, check, workspaceAction } from "@/lib/tenancy/actions";
import { initializeTransaction, isPaystackConfigured } from "@/lib/payments";

const planCode = z.enum(["free", "starter", "growth", "business"]);
const paidPlan = z.enum(["starter", "growth", "business"]);

export async function startTrial(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "subscription.manage",
    schema: z.object({ plan: paidPlan }),
    successMessage: "Your free trial has started. No card needed.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase.rpc("start_trial", {
        p_company: ctx.company.id,
        p_plan_code: data.plan,
      });
      check(error, "start trial");
    },
  });
}

export async function changeToLowerPlan(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "subscription.manage",
    schema: z.object({ plan: planCode }),
    run: async ({ ctx, data, supabase }) => {
      const { data: result, error } = await supabase.rpc("change_to_lower_plan", {
        p_company: ctx.company.id,
        p_plan_code: data.plan,
      });
      check(error, "change plan");
      return {
        status: "success",
        message:
          result === "scheduled"
            ? "Your plan will change at the end of the period you've paid for."
            : "Your plan has been changed.",
      };
    },
  });
}

export async function cancelScheduledChange(_prev: FormState, formData: FormData) {
  return workspaceAction({
    formData,
    permission: "subscription.manage",
    schema: z.object({}),
    successMessage: "The scheduled plan change has been cancelled.",
    run: async ({ ctx, supabase }) => {
      const { error } = await supabase.rpc("cancel_scheduled_change", {
        p_company: ctx.company.id,
      });
      check(error, "cancel change");
    },
  });
}

const checkoutSchema = z.object({
  plan: planCode,
  interval: z.enum(["monthly", "annual"]),
  extraStaff: z.coerce.number().int().min(0).max(10000),
  extraLocations: z.coerce.number().int().min(0).max(1000),
});

export type CheckoutState = FormState & { reference?: string };

/**
 * Prepares an invoice priced by the database, then sends the customer to
 * Paystack. Entitlements change only after the payment is verified on the
 * server. Without Paystack credentials this environment can't take payments
 * and says so (no simulated success).
 */
export async function proceedToPayment(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  let paymentUrl: string | null = null;
  let reference: string | undefined;
  const result = await workspaceAction({
    formData,
    permission: "subscription.manage",
    schema: checkoutSchema,
    run: async ({ ctx, data, supabase }) => {
      const { data: invoiceId, error } = await supabase.rpc("create_checkout_invoice", {
        p_company: ctx.company.id,
        p_plan_code: data.plan,
        p_interval: data.interval,
        p_extra_staff: data.extraStaff,
        p_extra_locations: data.extraLocations,
      });
      check(error, "create invoice");
      const { data: invoice, error: readError } = await supabase
        .from("billing_invoices")
        .select("reference, total_minor")
        .eq("id", invoiceId!)
        .single();
      check(readError, "read invoice");
      reference = invoice!.reference;

      if (!isPaystackConfigured()) {
        return {
          status: "error",
          message: `Online payment isn't connected in this environment yet, so this payment can't be completed here. Invoice ${invoice!.reference} has been prepared and nothing has been charged.`,
        };
      }
      const init = await initializeTransaction({
        reference: invoice!.reference,
        amountMinor: Number(invoice!.total_minor),
        email: ctx.user.email,
        callbackUrl: `${env.appUrl}/api/billing/paystack/callback?next=${encodeURIComponent(
          `/w/${ctx.company.slug}/settings/subscription`,
        )}`,
        metadata: { company_id: ctx.company.id, invoice_id: String(invoiceId) },
      });
      if (init.status !== "redirect") {
        throw new ActionError(
          init.status === "error" ? init.message : "Online payment isn't connected yet.",
        );
      }
      paymentUrl = init.url;
    },
  });
  if (paymentUrl) redirect(paymentUrl);
  return { ...result, reference };
}

export async function markNotificationRead(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return workspaceAction({
    formData,
    schema: z.object({ id: z.coerce.number().int().positive() }),
    successMessage: "Marked as read.",
    run: async ({ ctx, data, supabase }) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", ctx.user.id);
      check(error, "mark notification");
    },
  });
}
