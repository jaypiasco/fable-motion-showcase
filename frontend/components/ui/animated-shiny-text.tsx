"use client";

import React, { ComponentPropsWithoutRef, FC } from "react";
import "@/components/shadcn-space/animated-text/animated-text-01.css";
import { cn } from "@/lib/utils";

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"p"> {
  shimmerWidth?: number;
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children = "Shiny Button Text",
  className,
  ...props
}) => {
  return (
    <p
      className={cn(
        "shiny inline-block bg-[linear-gradient(120deg,rgba(0,0,0,0)_40%,rgba(0,0,0,0.8)_50%,rgba(0,0,0,0)_60%)] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0)_40%,rgba(255,255,255,0.8)_50%,rgba(255,255,255,0)_60%)] bg-[length:200%_100%] bg-clip-text font-medium text-slate-300",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
};

export default AnimatedShinyText;
