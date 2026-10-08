"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextType {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedLabel: React.ReactNode;
  setSelectedLabel: (label: React.ReactNode) => void;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

export function Select({
  defaultValue = "",
  value,
  onValueChange,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  const [internalVal, setInternalVal] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState<React.ReactNode>(null);

  const currentVal = value !== undefined ? value : internalVal;
  const handleValueChange = (v: string) => {
    if (value === undefined) setInternalVal(v);
    onValueChange?.(v);
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: currentVal,
        onValueChange: handleValueChange,
        open,
        setOpen,
        selectedLabel,
        setSelectedLabel,
      }}
    >
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(SelectContext);
  return (
    <button
      type="button"
      id={id}
      onClick={() => ctx?.setOpen(!ctx?.open)}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext);
  return (
    <span className="truncate">
      {ctx?.selectedLabel || placeholder || "Select..."}
    </span>
  );
}

export function SelectContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(SelectContext);
  if (!ctx?.open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={() => ctx.setOpen(false)} />
      <div
        className={cn(
          "absolute top-full left-0 mt-1.5 w-full z-50 min-w-[8rem] overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-high p-1 text-foreground shadow-xl animate-in fade-in-80",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

export function SelectItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(SelectContext);
  const isSelected = ctx?.value === value;

  React.useEffect(() => {
    if (isSelected && ctx?.setSelectedLabel) {
      ctx.setSelectedLabel(children);
    }
  }, [isSelected, children, ctx]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => ctx?.onValueChange(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 px-2 text-sm outline-none hover:bg-surface-container-highest transition-colors",
        isSelected && "bg-surface-container-highest font-medium text-primary",
        className
      )}
    >
      {children}
    </div>
  );
}
