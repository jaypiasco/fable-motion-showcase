"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, defaultChecked, onChange, onCheckedChange, id, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked || false);
    const isChecked = checked !== undefined ? checked : internalChecked;

    return (
      <label className="relative inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          id={id}
          ref={ref}
          checked={isChecked}
          onChange={(e) => {
            if (checked === undefined) setInternalChecked(e.target.checked);
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded border border-outline-variant/50 ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring flex items-center justify-center",
            isChecked ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest",
            className
          )}
        >
          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
        </div>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
