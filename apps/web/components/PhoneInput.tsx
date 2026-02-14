"use client";

import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function unformatPhone(value: string): string {
  return value.replace(/\D/g, "");
}

interface PhoneInputProps {
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput({ id, name, placeholder, defaultValue = "", className }, ref) {
    const [display, setDisplay] = useState(() => formatPhone(defaultValue));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      setDisplay(formatted);
    };

    return (
      <>
        <Input
          ref={ref}
          id={id}
          type="tel"
          placeholder={placeholder}
          value={display}
          onChange={handleChange}
          className={className}
        />
        {/* Hidden input with raw digits for form submission */}
        <input type="hidden" name={name} value={unformatPhone(display)} />
      </>
    );
  }
);
