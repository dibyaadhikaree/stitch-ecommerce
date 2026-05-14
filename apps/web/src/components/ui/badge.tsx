import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        accent: "border-accent/30 bg-accent/15 text-accent",
        soft: "border-border/70 bg-background/70 text-muted-foreground",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-gold/30 bg-gold/10 text-gold",
        danger: "border-danger/30 bg-danger/10 text-danger",
        pink: "border-accent-pink/30 bg-accent-pink/10 text-accent-pink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
