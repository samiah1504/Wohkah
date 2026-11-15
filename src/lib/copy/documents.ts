/**
 * Customer-facing wording for contracts, policies and job descriptions
 * (PRODUCT_LANGUAGE_AND_POSITIONING.md).
 */
import type { Database } from "@/lib/supabase/database.types";

export type ContractStatus = Database["public"]["Enums"]["contract_status"];
export type ContractKind = Database["public"]["Enums"]["contract_kind"];

export const CONTRACT_KIND: Record<ContractKind, { label: string; help: string }> = {
  contract: {
    label: "Contract",
    help: "Signed by the staff member and by someone signing for the business.",
  },
  policy: {
    label: "Policy to acknowledge",
    help: "The staff member confirms they have read it and will follow it.",
  },
};

export function contractStatusLabel(status: ContractStatus, kind: ContractKind): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "awaiting_signatures":
      return kind === "contract" ? "Waiting for signatures" : "Waiting for staff";
    case "completed":
      return kind === "contract" ? "Signed" : "Acknowledged";
    case "cancelled":
      return "Cancelled";
  }
}

export const CONTRACT_STATUS_TONE: Record<
  ContractStatus,
  "default" | "warning" | "success" | "neutral"
> = {
  draft: "default",
  awaiting_signatures: "warning",
  completed: "success",
  cancelled: "neutral",
};

/** Contract list filters. */
export const CONTRACT_FILTERS = [
  ["waiting", "Waiting", ["awaiting_signatures"]],
  ["signed", "Signed", ["completed"]],
  ["drafts", "Drafts", ["draft"]],
  ["cancelled", "Cancelled", ["cancelled"]],
] as const satisfies readonly (readonly [string, string, readonly ContractStatus[]])[];
export type ContractFilter = (typeof CONTRACT_FILTERS)[number][0];

export const CONTRACT_EVENT_LABEL: Record<string, string> = {
  created: "Draft created",
  sent: "Sent for signing",
  viewed: "Opened to read",
  code_sent: "Signing code emailed",
  signed: "Signed",
  completed: "All signatures complete",
  cancelled: "Cancelled",
  final_document: "Signed copy with signing certificate saved",
};

export const PARTY_LABEL = { staff: "Staff member", business: "For the business" } as const;
