"use client";

import { cn } from "@/lib/utils";
import { parseServices, getServiceColor } from "@/lib/services";

interface ServiceBadgesProps {
  title: string | null | undefined;
  className?: string;
  maxDisplay?: number;
}

export function ServiceBadges({ title, className, maxDisplay = 3 }: ServiceBadgesProps) {
  const services = parseServices(title);
  
  if (services.length === 0) return null;

  const displayed = services.slice(0, maxDisplay);
  const remaining = services.length - maxDisplay;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {displayed.map((service) => {
        const colors = getServiceColor(service);
        return (
          <span
            key={service}
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
              colors.bg,
              colors.text,
              colors.border
            )}
          >
            {service}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          +{remaining}
        </span>
      )}
    </div>
  );
}
