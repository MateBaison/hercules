"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "./input";

/** Required numeric settings may be empty while editing without replacing the last valid value. */
export function NumericInput({
  value,
  onChange,
  onBlur,
  ...props
}: ComponentProps<typeof Input>) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      {...props}
      type="number"
      value={draft ?? value}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const number = Number(text);
        if (
          text !== "" &&
          Number.isFinite(number) &&
          (props.min == null || number >= Number(props.min)) &&
          (props.max == null || number <= Number(props.max))
        )
          onChange?.(event);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
