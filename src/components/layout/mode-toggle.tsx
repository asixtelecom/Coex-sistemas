"use client";

import { Moon, Sun, SunMoon, MessageCircle, Check } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { Mode } from "@/lib/themes";

const modes: { key: Mode; label: string; icon: typeof Moon }[] = [
  { key: "dark", label: "Escuro", icon: Moon },
  { key: "lite", label: "Lite", icon: SunMoon },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "light", label: "Claro", icon: Sun },
];

export function ModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const current = modes.find((m) => m.key === mode) ?? modes[0];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mudar tema"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Icon className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tema</DropdownMenuLabel>
          {modes.map((m) => {
            const ModeIcon = m.icon;
            const isActive = m.key === mode;
            return (
              <DropdownMenuItem
                key={m.key}
                onClick={() => setMode(m.key)}
                className="gap-2"
              >
                <ModeIcon className="h-4 w-4" />
                <span className="flex-1">{m.label}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
