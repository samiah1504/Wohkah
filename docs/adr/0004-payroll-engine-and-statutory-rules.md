# ADR-0004: Payroll engine with versioned statutory rules

**Status:** Proposed. **Date:** 2026-11-07

## Context
Payroll must be a real calculation engine. Its results must be reproducible for historical periods,
calculated identically on every plan, and correct for Nigeria first, with other countries to follow.
Nigerian statutory rules change: personal income tax was reformed by the Nigeria Tax Act 2025, effective
2026, and pension and NHF apply only under certain conditions. Rates must never be hardcoded.

## Decision
1. **Rules are data.** `statutory_rule_versions (jurisdiction, effective_from, effective_to, rules jsonb,
   checksum, source_reference, approved_by, approved_at)`. The `rules` document follows a typed,
   zod-validated schema: tax bands, reliefs and exemptions, pension (employee and employer rates,
   pensionable components, eligibility thresholds), NHF (rate, eligibility), and rounding rules.
2. **Rule versions are immutable** once approved. A correction is a new version.
3. **The calculator is pure:** `calculatePayroll(input: PayrollInput, rules: RuleSet): PayrollResult`. It has
   no I/O and uses integer kobo arithmetic with explicit, documented rounding at defined steps. Every line
   records *how* it was derived (an explanation trace shown on payslips and to auditors).
4. **Jurisdiction plug-ins:** `jurisdictions/ng/` interprets the rules document for Nigeria. A new
   country adds a plug-in and rule data.
5. **Each payroll run snapshots** its resolved inputs and the `rule_version_id`. Re-running a historical
   period reproduces the same result, and a test asserts this.
6. **State machine:** `draft → calculated → approved → locked`. Payment is tracked separately for each
   item (`payroll_payments`). A trigger makes locked data immutable. Corrections go through
   `payroll_adjustments` or reversals in a later run.
7. **Idempotency:** a unique `(company_id, period_id, run_type)` for active runs, plus an idempotency key on
   calculate and approve actions.
8. **Verification:** golden-file test scenarios prepared and **signed off by a qualified Nigerian payroll
   or tax professional** before commercial launch. Until then, Nigeria rule data stays marked
   `unverified` and the UI shows a warning.

## Consequences
- Rule updates need no deploy. They do need an approval workflow (platform admin).
- More up-front design, but this is the only defensible approach for financial accuracy.

## Alternatives considered
- Hardcoded tax tables in code: forbidden by the master prompt, and they can't reproduce history.
- A third-party payroll API: limited Nigerian coverage and a loss of control. It can be added later as a
  cross-check.
