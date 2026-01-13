"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNumber, parseFormattedNumber } from "@/lib/format";

interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number | null;
  onChange: (value: number | null) => void;
  prefix?: string;
  suffix?: string;
  allowDecimals?: boolean;
  decimalPlaces?: number;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value,
      onChange,
      prefix = "",
      suffix = "",
      allowDecimals = false,
      decimalPlaces = 2,
      onBlur,
      onFocus,
      ...props
    },
    ref
  ) => {
    const formatValue = (val: number | null | undefined) => {
      if (val === null || val === undefined) return "";
      const decimals = allowDecimals ? decimalPlaces : 0;
      return formatNumber(val, decimals);
    };

    const [displayValue, setDisplayValue] = React.useState(() => formatValue(value));
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatValue(value));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, isFocused, allowDecimals, decimalPlaces]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);

      const parsed = parseFormattedNumber(raw);
      onChange(parsed);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setDisplayValue(formatValue(value));
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const parsed = parseFormattedNumber(displayValue);
      onChange(parsed);
      setDisplayValue(formatValue(parsed));
      onBlur?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      const parsed = parseFormattedNumber(pasted);
      if (parsed !== null) {
        onChange(parsed);
        setDisplayValue(formatValue(parsed));
      }
    };

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            prefix && "pl-10",
            suffix && "pr-8",
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
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
export type { NumberInputProps };
