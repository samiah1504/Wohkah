/**
 * Reference lists for workspace setup. Nigeria first; others are offered for
 * company profile purposes only. Statutory payroll support per country is a
 * separate, versioned configuration (Phase 5, ADR-0004).
 */
export const COUNTRIES = [
  { code: "NG", name: "Nigeria", currency: "NGN", timezone: "Africa/Lagos" },
  { code: "GH", name: "Ghana", currency: "GHS", timezone: "Africa/Accra" },
  { code: "KE", name: "Kenya", currency: "KES", timezone: "Africa/Nairobi" },
  { code: "ZA", name: "South Africa", currency: "ZAR", timezone: "Africa/Johannesburg" },
  { code: "GB", name: "United Kingdom", currency: "GBP", timezone: "Europe/London" },
  { code: "US", name: "United States", currency: "USD", timezone: "America/New_York" },
] as const;

export const CURRENCIES = ["NGN", "GHS", "KES", "ZAR", "GBP", "USD", "EUR"] as const;

export const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "UTC",
] as const;

export const SIZE_BANDS = ["1-10", "11-25", "26-50", "51-100", "101+"] as const;

export const INDUSTRIES = [
  "Retail",
  "Hospitality",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Logistics",
  "Construction",
  "Professional services",
  "Technology",
  "Financial services",
  "Agriculture",
  "Non-profit",
  "Other",
] as const;

/** 0 = Sunday … 6 = Saturday (matches the database). */
export const WEEKDAYS = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
] as const;
