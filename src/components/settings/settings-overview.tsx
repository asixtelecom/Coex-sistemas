'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { THEMES } from '@/lib/themes';
import { CURRENCIES } from '@/lib/currency';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { SECTION_META, type SettingsSection } from './settings-sections';
import { SettingsChip, StatusDot } from './settings-chip';
import { ROLE_META } from './role-meta';

interface OverviewCounts {
  members: number | null;
  pendingInvites: number | null;
  templates: number | null;
  templatesPending: number | null;
  tags: number | null;
  customFields: number | null;
}

interface ChannelStatus {
  configured: boolean;
}

export function SettingsOverview({
  onSelect,
}: {
  onSelect: (section: SettingsSection) => void;
}) {
  const { user, profile, accountId, accountRole, defaultCurrency, canManageMembers, canEditSettings } =
    useAuth();
  const { mode, theme } = useTheme();

  const [counts, setCounts] = useState<OverviewCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  // Channel statuses
  const [whatsapp, setWhatsapp] = useState<ChannelStatus | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(true);
  const [instagram, setInstagram] = useState<ChannelStatus | null>(null);
  const [instagramLoading, setInstagramLoading] = useState(true);
  const [messenger, setMessenger] = useState<ChannelStatus | null>(null);
  const [messengerLoading, setMessengerLoading] = useState(true);
  const [telegram, setTelegram] = useState<ChannelStatus | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [webchat, setWebchat] = useState<ChannelStatus | null>(null);
  const [webchatLoading, setWebchatLoading] = useState(true);
  const [linkedin, setLinkedin] = useState<ChannelStatus | null>(null);
  const [linkedinLoading, setLinkedinLoading] = useState(true);

  useEffect(() => {
    if (!user || !accountId) return;
    let cancelled = false;
    const supabase = createClient();
    const userId = user.id;
    const acctId = accountId;

    // Cheap counts — resolve fast, render immediately.
    (async () => {
      setCountsLoading(true);
      const [membersRes, invitesRes, templatesTotal, templatesPending, tagsRes, fieldsRes] =
        await Promise.allSettled([
          fetch('/api/account/members', { cache: 'no-store' }).then((r) => r.json()),
          canManageMembers
            ? fetch('/api/account/invitations', { cache: 'no-store' }).then((r) =>
                r.json(),
              )
            : Promise.resolve(null),
          supabase
            .from('message_templates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('message_templates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'PENDING'),
          supabase
            .from('tags')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase.from('custom_fields').select('id', { count: 'exact', head: true }),
        ]);

      if (cancelled) return;

      const members =
        membersRes.status === 'fulfilled' && Array.isArray(membersRes.value?.members)
          ? membersRes.value.members.length
          : null;
      const pendingInvites =
        invitesRes.status === 'fulfilled' &&
        invitesRes.value &&
        Array.isArray(invitesRes.value.invitations)
          ? invitesRes.value.invitations.length
          : null;

      setCounts({
        members,
        pendingInvites,
        templates:
          templatesTotal.status === 'fulfilled'
            ? templatesTotal.value.count ?? null
            : null,
        templatesPending:
          templatesPending.status === 'fulfilled'
            ? templatesPending.value.count ?? null
            : null,
        tags: tagsRes.status === 'fulfilled' ? tagsRes.value.count ?? null : null,
        customFields:
          fieldsRes.status === 'fulfilled' ? fieldsRes.value.count ?? null : null,
      });
      setCountsLoading(false);
    })();

    // Check all channel configurations
    (async () => {
      setWhatsappLoading(true);
      setInstagramLoading(true);
      setMessengerLoading(true);
      setTelegramLoading(true);
      setWebchatLoading(true);
      setLinkedinLoading(true);
      
      const [whatsappRow, instagramRow, messengerRow, telegramRow, webchatRow] = 
        await Promise.allSettled([
          supabase
            .from('whatsapp_config')
            .select('phone_number_id')
            .eq('account_id', acctId)
            .maybeSingle(),
          supabase
            .from('instagram_config')
            .select('page_id')
            .eq('account_id', acctId)
            .maybeSingle(),
          supabase
            .from('messenger_config')
            .select('page_id')
            .eq('account_id', acctId)
            .maybeSingle(),
          supabase
            .from('telegram_config')
            .select('bot_token')
            .eq('account_id', acctId)
            .maybeSingle(),
          supabase
            .from('webchat_config')
            .select('token')
            .eq('account_id', acctId)
            .maybeSingle(),
        ]);
      
      if (cancelled) return;

      setWhatsapp({
        configured: whatsappRow.status === 'fulfilled' && !!whatsappRow.value.data?.phone_number_id,
      });
      setWhatsappLoading(false);

      setInstagram({
        configured: instagramRow.status === 'fulfilled' && !!instagramRow.value.data?.page_id,
      });
      setInstagramLoading(false);

      setMessenger({
        configured: messengerRow.status === 'fulfilled' && !!messengerRow.value.data?.page_id,
      });
      setMessengerLoading(false);

      setTelegram({
        configured: telegramRow.status === 'fulfilled' && !!telegramRow.value.data?.bot_token,
      });
      setTelegramLoading(false);

      setWebchat({
        configured: webchatRow.status === 'fulfilled' && !!webchatRow.value.data?.token,
      });
      setWebchatLoading(false);

      // LinkedIn doesn't have a config table yet, so always show "Not set up yet"
      setLinkedin({ configured: false });
      setLinkedinLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, accountId, canManageMembers]);

  const displayName = profile?.full_name || profile?.email || 'Your account';
  const initial = (profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase();
  const roleMeta = accountRole ? ROLE_META[accountRole] : null;
  const RoleIcon = roleMeta?.icon;

  const currencyLabel =
    CURRENCIES.find((c) => c.code === defaultCurrency)?.label ?? defaultCurrency;
  const themeName = THEMES.find((t) => t.id === theme)?.name ?? theme;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Helper to get channel subtitle
  const getChannelSubtitle = (status: ChannelStatus | null) => {
    if (!status?.configured) {
      return 'Not set up yet';
    }
    return (
      <>
        <StatusDot tone="ok" /> Configured
      </>
    );
  };

  // Per-tile loading + subtitle. `null` counts render as a graceful
  // fallback so a single failed query never blanks a tile.
  const tiles: {
    section: SettingsSection;
    loading: boolean;
    subtitle: ReactNode;
  }[] = [
    {
      section: 'whatsapp',
      loading: whatsappLoading,
      subtitle: whatsappLoading ? null : getChannelSubtitle(whatsapp),
    },
    {
      section: 'instagram',
      loading: instagramLoading,
      subtitle: instagramLoading ? null : getChannelSubtitle(instagram),
    },
    {
      section: 'messenger',
      loading: messengerLoading,
      subtitle: messengerLoading ? null : getChannelSubtitle(messenger),
    },
    {
      section: 'telegram',
      loading: telegramLoading,
      subtitle: telegramLoading ? null : getChannelSubtitle(telegram),
    },
    {
      section: 'webchat',
      loading: webchatLoading,
      subtitle: webchatLoading ? null : getChannelSubtitle(webchat),
    },
    {
      section: 'linkedin',
      loading: linkedinLoading,
      subtitle: linkedinLoading ? null : getChannelSubtitle(linkedin),
    },
    {
      section: 'members',
      loading: countsLoading,
      subtitle:
        counts?.members == null
          ? 'View team members'
          : `${counts.members} member${counts.members === 1 ? '' : 's'}${
              counts.pendingInvites
                ? ` · ${counts.pendingInvites} pending invite${
                    counts.pendingInvites === 1 ? '' : 's'
                  }`
                : ''
            }`,
    },
    {
      section: 'templates',
      loading: countsLoading,
      subtitle:
        counts?.templates == null
          ? 'Manage message templates'
          : `${counts.templates} template${counts.templates === 1 ? '' : 's'}${
              counts.templatesPending
                ? ` · ${counts.templatesPending} pending review`
                : ''
            }`,
    },
    {
      section: 'deals',
      loading: false,
      subtitle: `${defaultCurrency} — ${currencyLabel}`,
    },
    {
      section: 'fields',
      loading: countsLoading,
      subtitle:
        counts?.tags == null && counts?.customFields == null
          ? 'Tags and custom fields'
          : `${counts?.tags ?? 0} tag${counts?.tags === 1 ? '' : 's'} · ${
              counts?.customFields ?? 0
            } custom field${counts?.customFields === 1 ? '' : 's'}`,
    },
    {
      section: 'appearance',
      loading: false,
      subtitle: `${cap(mode)} mode · ${themeName} accent`,
    },
  ];

  return (
    <section className="animate-in fade-in-50 duration-200">
      {/* Identity */}
      <Card className="flex-row items-center gap-4 px-5 py-5">
        <Avatar size="lg" className="size-14">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={displayName} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-xl text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-foreground">
            {displayName}
          </div>
          {profile?.email ? (
            <div className="truncate text-sm text-muted-foreground">
              {profile.email}
            </div>
          ) : null}
        </div>
        {roleMeta && RoleIcon ? (
          <SettingsChip variant={roleMeta.variant}>
            <RoleIcon />
            {roleMeta.label}
          </SettingsChip>
        ) : null}
      </Card>

      {/* Status tiles — only workspace tiles for admin+ */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles
          .filter((t) => {
            if (canEditSettings) return true;
            return t.section === 'appearance';
          })
          .map(({ section, loading, subtitle }) => {
          const meta = SECTION_META[section];
          const Icon = meta.icon;
          return (
            <button
              key={section}
              type="button"
              onClick={() => onSelect(section)}
              className={cn(
                'group flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 text-left transition-colors',
                'hover:border-primary-soft-2 hover:bg-card-2',
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {meta.label}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {loading ? (
                    <>
                      <Loader2 className="size-3 animate-spin" /> Loading…
                    </>
                  ) : (
                    subtitle
                  )}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
