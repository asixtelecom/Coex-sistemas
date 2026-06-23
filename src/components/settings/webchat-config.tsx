'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Copy, CheckCircle2, XCircle, Loader2, ExternalLink, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SettingsPanelHead } from './settings-panel-head';

const MASKED_TOKEN = '••••••••••••••••';

export function WebchatConfig() {
  const supabase = createClient();
  const { accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [webhookToken, setWebhookToken] = useState('');
  const [webhookTokenEdited, setWebhookTokenEdited] = useState(false);

  // Webchat customization
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [companyName, setCompanyName] = useState('');
  const [welcomeTitle, setWelcomeTitle] = useState('');
  const [welcomeSubtitle, setWelcomeSubtitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [position, setPosition] = useState<'right' | 'left'>('right');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchConfig = useCallback(async (acctId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('account_id', acctId)
        .eq('type', 'webchat')
        .maybeSingle();

      if (data) {
        setChannelId(data.id);
        const cfg = data.config as Record<string, unknown> | undefined;
        setPrimaryColor((cfg?.primary_color as string) || '#2563eb');
        setCompanyName((cfg?.company_name as string) || '');
        setWelcomeTitle((cfg?.welcome_title as string) || '');
        setWelcomeSubtitle((cfg?.welcome_subtitle as string) || '');
        setAvatarUrl((cfg?.avatar_url as string) || '');
        setPosition((cfg?.position as 'right' | 'left') || 'right');
        setWebhookToken(MASKED_TOKEN);
        setConnected(true);
      } else {
        setChannelId(null);
        setPrimaryColor('#2563eb');
        setCompanyName('');
        setWelcomeTitle('');
        setWelcomeSubtitle('');
        setAvatarUrl('');
        setPosition('right');
        setWebhookToken('');
        setConnected(false);
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!accountId) { setLoading(false); return; }
    fetchConfig(accountId);
  }, [authLoading, profileLoading, accountId, fetchConfig]);

  async function handleSave() {
    setSaving(true);
    try {
      const config: Record<string, unknown> = {
        primary_color: primaryColor,
        company_name: companyName.trim(),
        welcome_title: welcomeTitle.trim(),
        welcome_subtitle: welcomeSubtitle.trim(),
        avatar_url: avatarUrl.trim(),
        position,
      };

      const res = await fetch('/api/channels', {
        method: channelId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'webchat', config }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
        return;
      }

      const result = await res.json();
      toast.success('Webchat configured');
      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reset Webchat configuration?')) return;
    try {
      await fetch('/api/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'webchat' }),
      });
      setChannelId(null);
      setPrimaryColor('#2563eb');
      setCompanyName('');
      setWelcomeTitle('');
      setWelcomeSubtitle('');
      setAvatarUrl('');
      setPosition('right');
      setConnected(false);
      toast.success('Configuration cleared');
    } catch {
      toast.error('Failed to reset');
    }
  }

  const embedCode = channelId
    ? `<script src="${origin}/api/webchat/widget?token=${channelId}"></script>`
    : '<p class="text-sm text-muted-foreground">Save the configuration first to generate the embed code.</p>';

  function handleCopyEmbed() {
    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied');
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead title="Webchat" description="Configure the chat widget for your website." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Webchat widget"
        description="Add an interactive chat widget to your website. Configure the look and feel for your moving company."
      />

      <Alert className="bg-card border-border mb-6">
        <div className="flex items-center gap-2">
          {connected ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-muted-foreground" />}
          <AlertTitle className="text-foreground mb-0">{connected ? 'Active' : 'Not configured'}</AlertTitle>
        </div>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Appearance</CardTitle>
          <CardDescription className="text-muted-foreground">
            Customize the widget to match your brand.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Primary Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="h-9 w-10 rounded-lg border border-border bg-muted p-0.5"
                />
                <Input
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="bg-muted border-border text-foreground font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Position</Label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value as 'right' | 'left')}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="right">Bottom Right</option>
                <option value="left">Bottom Left</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Company Name</Label>
            <Input
              placeholder="e.g. Super Mudanças"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Company Logo URL (optional)</Label>
            <Input
              placeholder="https://example.com/logo.png"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Welcome Title</Label>
            <Input
              placeholder="e.g. Olá! Precisa de ajuda com sua mudança?"
              value={welcomeTitle}
              onChange={e => setWelcomeTitle(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Welcome Subtitle</Label>
            <Input
              placeholder="e.g. Estamos aqui para responder suas dúvidas"
              value={welcomeSubtitle}
              onChange={e => setWelcomeSubtitle(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Preview</CardTitle>
          <CardDescription className="text-muted-foreground">
            This is how the widget will appear on your website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative flex h-64 items-end justify-end rounded-lg border border-border bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            {position === 'left' && (
              <div
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-lg"
                style={{ maxWidth: 280 }}
              >
                {avatarUrl && (
                  <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{companyName || 'Sua Empresa'}</p>
                  <p className="text-xs text-gray-500">{welcomeTitle || 'Olá! Como podemos ajudar?'}</p>
                </div>
              </div>
            )}
            <button
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            {position === 'right' && (
              <div
                className="absolute bottom-20 right-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-lg"
                style={{ maxWidth: 280 }}
              >
                {avatarUrl && (
                  <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{companyName || 'Sua Empresa'}</p>
                  <p className="text-xs text-gray-500">{welcomeTitle || 'Olá! Como podemos ajudar?'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Embed Code</CardTitle>
          <CardDescription className="text-muted-foreground">
            Copy and paste this code into your website&#39;s HTML, just before the closing <code>&lt;/body&gt;</code> tag.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted p-4 text-xs text-muted-foreground">
              <code>{embedCode}</code>
            </pre>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyEmbed}
              className="absolute right-2 top-2 border-border"
            >
              <Copy className="size-3.5" /> Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : 'Save Configuration'}
        </Button>
        {channelId && (
          <Button variant="outline" onClick={handleReset} className="border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950/40">
            <RotateCcw className="size-4" /> Reset
          </Button>
        )}
      </div>
    </section>
  );
}
