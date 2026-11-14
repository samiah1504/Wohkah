"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { DEFAULT_COUNTRY, countryOptions } from "@/lib/phone";
import { cn } from "@/lib/utils";

/**
 * Country picker (flag and calling code) plus number. A native select sits
 * invisibly over the flag so it's easy on phones and fully accessible.
 * Submits `phoneCountry` and `phone`; the server converts them to E.164.
 */
export function PhoneInput({
  id = "phone",
  defaultCountry = DEFAULT_COUNTRY,
  defaultValue,
  invalid,
  required,
  onChange,
}: {
  id?: string;
  defaultCountry?: string;
  defaultValue?: string;
  invalid?: boolean;
  required?: boolean;
  onChange?: () => void;
}) {
  const countries = useMemo(() => countryOptions(), []);
  const [country, setCountry] = useState<string>(defaultCountry);
  const selected = countries.find((c) => c.code === country) ?? countries[0]!;
  return (
    <div
      className={cn(
        "border-input bg-surface focus-within:border-ring focus-within:ring-ring/30 flex h-10 items-stretch overflow-hidden rounded-md border shadow-xs focus-within:ring-2",
        invalid && "border-destructive",
      )}
    >
      <div className="relative flex shrink-0 items-center gap-1 border-r px-3 text-sm">
        <span aria-hidden className="text-base leading-none">
          {selected.flag}
        </span>
        <span aria-hidden className="tabular-nums">
          {selected.dial}
        </span>
        <ChevronDownIcon aria-hidden className="text-muted-foreground size-3.5" />
        <select
          name="phoneCountry"
          aria-label="Country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            onChange?.();
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name} ({c.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={country === "NG" ? "803 123 4567" : "Phone number"}
        required={required}
        defaultValue={defaultValue}
        onChange={onChange}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
      />
    </div>
  );
}
