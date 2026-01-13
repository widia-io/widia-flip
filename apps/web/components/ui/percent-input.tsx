"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNumber, parseFormattedNumber } from "@/lib/format";

interface PercentInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number | null; // stored as decimal (0.20 = 20%)
  onChange: (value: number | null) => void;
  decimalPlaces?: number; // decimals in display (default 0 for "20%", 2 for "20.50%")
}

const PercentInput = React.forwardRef<HTMLInputElement, PercentInputProps>(
  ({ className, value, onChange, decimalPlaces = 0, onBlur, onFocus, ...props }, ref) => {
    // Convert decimal to percentage for display (0.20 → 20)
    const formatValue = (val: number | null | undefined) => {
      if (val === null || val === undefined) return "";
      return formatNumber(val * 100, decimalPlaces);
    };

    const [displayValue, setDisplayValue] = React.useState(() => formatValue(value));
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatValue(value));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, isFocused, decimalPlaces]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);

      const parsed = parseFormattedNumber(raw);
      // Convert percentage to decimal for storage (20 → 0.20)
      onChange(parsed !== null ? parsed / 100 : null);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setDisplayValue(formatValue(value));
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const parsed = parseFormattedNumber(displayValue);
      onChange(parsed !== null ? parsed / 100 : null);
      setDisplayValue(parsed !== null ? formatNumber(parsed, decimalPlaces) : "");
      onBlur?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      const parsed = parseFormattedNumber(pasted);
      if (parsed !== null) {
        onChange(parsed / 100);
        setDisplayValue(formatNumber(parsed, decimalPlaces));
      }
    };

    return (
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-8",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
          %
        </span>
      </div>
    );
  }
);
PercentInput.displayName = "PercentInput";

export { PercentInput };
export type { PercentInputProps };
