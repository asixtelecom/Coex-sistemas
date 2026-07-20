"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVICE_TYPES, getServiceColor } from "@/lib/services";

interface ServiceSelectorProps {
  value: string[];
  onChange: (services: string[]) => void;
  className?: string;
}

export function ServiceSelector({ value, onChange, className }: ServiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(service: string) {
    if (value.includes(service)) {
      onChange(value.filter((s) => s !== service));
    } else {
      onChange([...value, service]);
    }
  }

  function remove(service: string) {
    onChange(value.filter((s) => s !== service));
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none",
          "focus:border-primary",
          open && "border-primary"
        )}
      >
        <span className="truncate">
          {value.length === 0
            ? "Selecione os serviços"
            : `${value.length} serviço(s) selecionado(s)`}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50", open && "rotate-180")} />
      </button>

      {/* Dropdown com checkboxes */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-background shadow-md">
          {SERVICE_TYPES.map((service) => {
            const isSelected = value.includes(service);
            const colors = getServiceColor(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => toggle(service)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                  isSelected && "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", colors.bg, colors.text)}>
                  {service}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tags dos serviços selecionados */}
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((service) => {
            const colors = getServiceColor(service);
            return (
              <span
                key={service}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                  colors.bg,
                  colors.text,
                  colors.border
                )}
              >
                {service}
                <button
                  type="button"
                  onClick={() => remove(service)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
