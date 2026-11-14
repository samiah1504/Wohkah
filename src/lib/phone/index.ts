/**
 * Phone numbers: one country list for the form and one parser for the server,
 * both from libphonenumber-js. Numbers are stored in E.164 (+2348031234567).
 */
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

export const DEFAULT_COUNTRY: CountryCode = "NG";

/** Shown first, in this order; every other country follows alphabetically. */
const PINNED: CountryCode[] = ["NG", "GH", "KE", "ZA", "GB", "US", "CA"];

export type CountryOption = { code: CountryCode; name: string; dial: string; flag: string };

function flag(code: string) {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function countryOptions(): CountryOption[] {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const all = getCountries().map((code) => ({
    code,
    name: names.of(code) ?? code,
    dial: `+${getCountryCallingCode(code)}`,
    flag: flag(code),
  }));
  const pinned = PINNED.map((c) => all.find((o) => o.code === c)!).filter(Boolean);
  const rest = all
    .filter((o) => !PINNED.includes(o.code))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...pinned, ...rest];
}

export function isCountryCode(value: string): value is CountryCode {
  return (getCountries() as string[]).includes(value);
}

/** A valid number for that country in E.164, or null. Accepts local formats like 0803 123 4567. */
export function toE164(country: string, input: string): string | null {
  if (!isCountryCode(country)) return null;
  const parsed = parsePhoneNumberFromString(input.trim(), country);
  return parsed && parsed.isValid() ? parsed.number : null;
}

/** "+234 803 123 4567" for display; anything unparseable is shown as stored. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = parsePhoneNumberFromString(value);
  return parsed ? parsed.formatInternational() : value;
}
