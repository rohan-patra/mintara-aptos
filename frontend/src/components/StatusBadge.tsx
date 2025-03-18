"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  online: boolean;
  className?: string;
}

export function StatusBadge({ online, className }: StatusBadgeProps) {
  return (
    <div className={cn("inline-flex items-center space-x-1.5", className)}>
      <div
        className={cn(
          "relative flex h-2 w-2 items-center justify-center rounded-full",
          online ? "bg-green-500" : "bg-red-500",
        )}
      >
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            online ? "bg-green-500" : "bg-red-500",
          )}
        />
      </div>
      <span className="text-xs font-medium">
        {online ? "Agent Online" : "Agent Offline"}
      </span>
    </div>
  );
}
