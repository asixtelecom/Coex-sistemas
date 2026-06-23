'use client';

import { useMemo, type ReactNode } from 'react';
import { SettingsGate } from '@/components/settings/settings-gate';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { SettingsRail } from '@/components/settings/settings-rail';
import { SettingsOverview } from '@/components/settings/settings-overview';
import { ProfileForm } from '@/components/settings/profile-form';
import { SecurityPanel } from '@/components/settings/security-panel';
import { AppearancePanel } from '@/components/settings/appearance-panel';
import { WhatsAppConfig } from '@/components/settings/whatsapp-config';
import { InstagramConfig } from '@/components/settings/instagram-config';
import { MessengerConfig } from '@/components/settings/messenger-config';
import { TelegramConfig } from '@/components/settings/telegram-config';
import { WebchatConfig } from '@/components/settings/webchat-config';
import { LinkedInConfig } from '@/components/settings/linkedin-config';
import { EmailConfig } from '@/components/settings/email-config';
import { TemplateManager } from '@/components/settings/template-manager';
import { FieldsAndTagsPanel } from '@/components/settings/fields-and-tags-panel';
import { DealsSettings } from '@/components/settings/deals-settings';
import { MembersTab } from '@/components/settings/members-tab';
import { PixConfig } from "@/components/settings/pix-config"
import { ZapsignConfig } from "@/components/settings/zapsign-config"
import {
  AGENT_SECTIONS,
  resolveSection,
  type SettingsSection,
} from '@/components/settings/settings-sections';

export default function SettingsPage() {
  return <SettingsGate><SettingsPageInner /></SettingsGate>;
}

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { defaultCurrency, canEditSettings } = useAuth();
  const { mode } = useTheme();

  // The URL (`?tab=`) is the single source of truth for the active
  // section — deep-linkable, and it keeps the existing links in the
  // app sidebar/header working. Legacy tab values (tags, custom-fields)
  // resolve onto their new home; unknown/empty → the Overview landing.
  const rawTab = searchParams.get('tab');
  const resolved = resolveSection(rawTab);
  // Agents can only access personal sections; redirect to overview
  // if they try to reach an admin-only tab directly.
  const section: SettingsSection =
    !canEditSettings && resolved !== 'overview' && !AGENT_SECTIONS.includes(resolved)
      ? 'overview'
      : resolved;

  const go = (next: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  // Cheap, fetch-free rail hints. The Overview landing carries the
  // full live status/counts; the rail just surfaces the two that are
  // already in context.
  const hints: Partial<Record<SettingsSection, ReactNode>> = useMemo(
    () => ({
      appearance: mode.charAt(0).toUpperCase() + mode.slice(1),
      deals: defaultCurrency,
    }),
    [mode, defaultCurrency],
  );

  const adminPanels: Partial<Record<SettingsSection, ReactNode>> = canEditSettings
    ? {
        whatsapp: <WhatsAppConfig />,
        instagram: <InstagramConfig />,
        messenger: <MessengerConfig />,
        telegram: <TelegramConfig />,
        webchat: <WebchatConfig />,
        linkedin: <LinkedInConfig />,
        email: <EmailConfig />,
        pix: <PixConfig />,
        zapsign: <ZapsignConfig />,
        templates: <TemplateManager />,
        fields: <FieldsAndTagsPanel />,
        deals: <DealsSettings />,
        members: <MembersTab />,
      }
    : {};

  const panel: Partial<Record<SettingsSection, ReactNode>> = {
    overview: <SettingsOverview onSelect={go} />,
    profile: <ProfileForm />,
    security: <SecurityPanel />,
    appearance: <AppearancePanel />,
    ...adminPanels,
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything in one place — your account and your workspace. Pick a
          section to manage it.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)] lg:items-start">
        <SettingsRail active={section} onSelect={go} hints={hints} />
        <div className="min-w-0">{panel[section]}</div>
      </div>
    </div>
  );
}
