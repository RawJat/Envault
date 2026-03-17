"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  viewMargin?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.8,
  className = "",
  viewMargin = "-50px",
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration, delay, ease: "easeOut" }}
      viewport={{ once: true, margin: viewMargin }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
