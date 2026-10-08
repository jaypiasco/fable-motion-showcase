'use client';

import React, { ReactNode } from 'react';
import { motion, Variants } from 'motion/react';
import { cn } from '@/lib/utils';

export type PresetType = 'fade' | 'slide' | 'scale' | 'blur' | 'blur-slide';

export interface AnimatedGroupProps {
  children: ReactNode;
  className?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  preset?: PresetType;
  as?: string;
}

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: {
    opacity: 0,
    filter: 'blur(12px)',
    y: 16,
  },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: {
      type: 'spring',
      bounce: 0.25,
      duration: 1.2,
    },
  },
};

const presetVariants: Record<PresetType, { container?: Variants; item?: Variants }> = {
  fade: {
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.6 } },
    },
  },
  slide: {
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.3, duration: 1.2 } },
    },
  },
  scale: {
    item: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1, transition: { type: 'spring', bounce: 0.3, duration: 1.2 } },
    },
  },
  blur: {
    item: {
      hidden: { opacity: 0, filter: 'blur(12px)' },
      visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 1 } },
    },
  },
  'blur-slide': {
    item: {
      hidden: { opacity: 0, filter: 'blur(12px)', y: 16 },
      visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { type: 'spring', bounce: 0.3, duration: 1.5 } },
    },
  },
};

export function AnimatedGroup({
  children,
  className,
  variants,
  preset,
}: AnimatedGroupProps) {
  const presetConfig = preset ? presetVariants[preset] : {};
  const containerVariants = variants?.container || presetConfig.container || defaultContainerVariants;
  const itemVariants = variants?.item || presetConfig.item || defaultItemVariants;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={cn(className)}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <motion.div key={child.key ?? index} variants={itemVariants}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default AnimatedGroup;
