"use client";

import React, { useEffect, useRef } from "react";
import { createRenderer } from "./fluid-utils/renderer";

export interface FluidProps {
  className?: string;
  style?: React.CSSProperties;
  showStirHint?: boolean;
  transparent?: boolean;
  hostRef?: React.RefObject<HTMLElement | null>;
}

export function Fluid({
  className = "",
  style = {},
  showStirHint = false,
  transparent = true,
  hostRef,
}: FluidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const hostElement = hostRef?.current || containerRef.current || canvas;
    const renderer = createRenderer({
      canvas,
      hostElement,
      transparent,
    });
    void renderer.ready;
    return () => renderer.dispose();
  }, [hostRef, transparent]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={style}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none pointer-events-none"
      />
      {showStirHint && (
        <div className="pointer-events-none absolute bottom-[18px] left-1/2 z-[2] -translate-x-1/2 text-xs font-medium uppercase tracking-[.08em] text-white/80">
          move cursor to stir
        </div>
      )}
    </div>
  );
}

export function Example() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createRenderer({ canvas, transparent: false });
    void renderer.ready;
    return () => renderer.dispose();
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      <div className="pointer-events-none absolute bottom-[18px] left-1/2 z-[2] -translate-x-1/2 text-xs font-medium uppercase tracking-[.08em] text-white/80">
        move cursor to stir
      </div>
    </div>
  );
}

export default Fluid;
