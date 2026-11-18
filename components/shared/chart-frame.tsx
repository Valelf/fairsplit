"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartFrameProps {
  children: ReactNode;
  /** Sizing classes for the frame; must give it a definite height. */
  className?: string;
  /** Accessible label describing the chart. */
  label?: string;
}

/**
 * Sized, client-only wrapper for Recharts' ResponsiveContainer.
 *
 * ResponsiveContainer measures its parent in the browser; during SSR (and the
 * first client render) it has no size and logs "width(-1) and height(-1)".
 * The frame reserves the space with a fixed height and only mounts the chart
 * after hydration, so there is no warning and no layout shift.
 */
export function ChartFrame({ children, className, label }: ChartFrameProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={cn("h-64 w-full min-w-0 sm:h-72", className)}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {mounted ? children : null}
    </div>
  );
}
