"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export type TextMorphProps = {
  words?: string[];
  interval?: number;
  className?: string;
};

const defaultWords = ["blocks", "components", "templates"];

export function TextMorph({
  words = defaultWords,
  interval = 2500,
  className,
}: TextMorphProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!words.length) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [words, interval]);

  if (!words.length) return null;

  return (
    <div className="relative overflow-hidden w-full flex items-center min-h-[22px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className={cn("w-full truncate leading-relaxed select-none", className)}
          initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
          transition={{ duration: 0.32, ease: "easeInOut" }}
        >
          {words[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export const TextMorphMotion = () => {
  return (
    <TextMorph
      words={["blocks", "components", "templates"]}
      className="text-xl sm:text-2xl text-primary"
    />
  );
};

export default TextMorph;
