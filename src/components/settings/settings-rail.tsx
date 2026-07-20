'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  AGENT_SECTIONS,
  CHANNEL_SECTIONS,
  RAIL_GROUPS,
  SECTION_META,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from './settings-sections';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Radio } from 'lucide-react';

const RAIL_DESKTOP_MIN_PX = 1024;

export function SettingsRail({
  active,
  onSelect,
  hints,
}: {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
  hints?: Partial<Record<SettingsSection, ReactNode>>;
}) {
  const { canEditSettings } = useAuth();

  const visibleSections: readonly SettingsSection[] = canEditSettings
    ? SETTINGS_SECTIONS
    : AGENT_SECTIONS;

  const visibleGroups = RAIL_GROUPS.map(({ label, group }) => ({
    label,
    group,
    items: SETTINGS_SECTIONS.filter(
      (s) => SECTION_META[s].group === group && visibleSections.includes(s),
    ),
  })).filter((g) => g.items.length > 0);

  const channelItems = canEditSettings
    ? (CHANNEL_SECTIONS as readonly SettingsSection[]).filter(
        (s) => visibleSections.includes(s),
      )
    : [];
  const isChannelActive = (CHANNEL_SECTIONS as readonly string[]).includes(active);

  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia(`(min-width: ${RAIL_DESKTOP_MIN_PX}px)`).matches) return;
    activeRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [active]);

  return (
    <nav
      aria-label="Seções de configurações"
      className={cn(
        'flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'border-b border-border',
        'lg:sticky lg:top-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0',
      )}
    >
      {visibleGroups.map(({ label, group, items }) => {
        const channelSecs = new Set<string>(CHANNEL_SECTIONS);
        const regularItems = items.filter((s) => !channelSecs.has(s));
        const groupChannelItems = items.filter((s) => channelSecs.has(s));
        const showCanais = group === 'workspace' && groupChannelItems.length > 0;

        return (
          <div
            key={group}
            className="flex shrink-0 gap-1 lg:flex-col lg:gap-0.5"
          >
            {label ? (
              <div className="hidden px-3 pt-3.5 pb-1.5 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase lg:block">
                {label}
              </div>
            ) : null}

            {showCanais && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors',
                      'lg:w-full',
                      isChannelActive
                        ? 'bg-primary-soft text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    ref={isChannelActive ? activeRef : undefined}
                  >
                    <Radio className="size-4 shrink-0" />
                    <span className="flex-1">Canais</span>
                    <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="start"
                  sideOffset={4}
                  className="w-48"
                >
                  {groupChannelItems.map((s) => {
                    const meta = SECTION_META[s];
                    const Icon = meta.icon;
                    const isActive = s === active;
                    return (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => onSelect(s)}
                        className={cn(
                          'cursor-pointer gap-2.5',
                          isActive && 'bg-primary-soft text-primary',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{meta.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {regularItems.map((s) => {
              const meta = SECTION_META[s];
              const Icon = meta.icon;
              const isActive = s === active;
              return (
                <button
                  key={s}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  onClick={() => onSelect(s)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors',
                    'lg:w-full',
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{meta.label}</span>
                  {hints?.[s] != null ? (
                    <span
                      className={cn(
                        'hidden items-center gap-1.5 text-xs lg:inline-flex',
                        isActive ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {hints[s]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
