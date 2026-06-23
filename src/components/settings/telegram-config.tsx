'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Copy, CheckCircle2, XCircle, Loader2, ExternalLink, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SettingsPanelHead } from './settings-panel-head';

const MASKED_TOKEN = '••••••••••••••••';

export function TelegramConfig() {
  const supabase = createClient();
  const { accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/telegram/webhook`
    : '';

  const fetchConfig = useCallback(async (acctId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('account_id', acctId)
        .eq('type', 'telegram')
        .maybeSingle();

      if (data) {
        setChannelId(data.id);
        setBotToken(MASKED_TOKEN);
        setBotUsername(data.config?.bot_username || '');
        setConnected(data.status === 'connected');
        setTokenEdited(false);
      } else {
        setChannelId(null);
        setBotToken('');
        setBotUsername('');
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
    if (!botToken.trim()) {
      toast.error('Bot Token is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        bot_token: tokenEdited ? botToken.trim() : undefined,
        bot_username: botUsername.trim() || undefined,
      };

      const res = await fetch('/api/channels', {
        method: channelId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'telegram', config: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
        return;
      }

      toast.success('Telegram channel configured');
      if (accountId) await fetchConfig(accountId);

      // Set webhook via Telegram API
      try {
        const token = tokenEdited ? botToken.trim() : botToken;
        if (token && token !== MASKED_TOKEN) {
          const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl }),
          });
          const setData = await setRes.json();
          if (setData.ok) {
            toast.success('Webhook registered with Telegram');
          } else {
            toast.error(`Telegram webhook error: ${setData.description}`);
          }
        }
      } catch {
        toast.error('Failed to set Telegram webhook');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    const token = tokenEdited ? botToken.trim() : botToken;
    if (!token || token === MASKED_TOKEN) {
      toast.error('Enter a bot token to test');
      return;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();
      if (data.ok) {
        setBotUsername(data.result.username);
        toast.success(`Connected as @${data.result.username}`);
      } else {
        toast.error(data.description || 'Invalid token');
      }
    } catch {
      toast.error('Failed to connect to Telegram');
    }
  }

  async function handleReset() {
    if (!confirm('Reset Telegram configuration?')) return;
    try {
      await fetch('/api/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'telegram' }),
      });
      setChannelId(null);
      setBotToken('');
      setBotUsername('');
      setConnected(false);
      toast.success('Configuration cleared');
    } catch {
      toast.error('Failed to reset');
    }
  }

  function handleCopyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied');
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead title="Telegram connection" description="Connect your Telegram bot." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Telegram connection"
        description="Connect a Telegram bot to receive and reply to messages from your customers."
      />

      <Alert className="bg-card border-border mb-6">
        <div className="flex items-center gap-2">
          {connected ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-red-500" />}
          <AlertTitle className="text-foreground mb-0">{connected ? 'Connected' : 'Not connected'}</AlertTitle>
        </div>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Bot Credentials</CardTitle>
          <CardDescription className="text-muted-foreground">
            Create a bot with <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@BotFather</a> on Telegram and paste the token below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Bot Token</Label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="e.g. 1234567890:ABCdefGHIjklmNOPqrSTUvwxYZ"
                value={botToken}
                onChange={e => { setBotToken(e.target.value); setTokenEdited(true); }}
                onFocus={() => { if (botToken === MASKED_TOKEN) { setBotToken(''); setTokenEdited(true); } }}
                className="bg-muted border-border text-foreground pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {botUsername && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Bot Username</Label>
              <Input readOnly value={`@${botUsername}`} className="bg-muted/50 border-border text-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Webhook Configuration</CardTitle>
          <CardDescription className="text-muted-foreground">
            This URL will receive updates from Telegram. It is automatically set when you save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl} className="bg-muted border-border text-muted-foreground font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={handleCopyWebhookUrl} className="shrink-0 border-border">
              <Copy className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : 'Save Configuration'}
        </Button>
        <Button variant="outline" onClick={handleTestConnection} className="border-border">
          <CheckCircle2 className="size-4" /> Test Connection
        </Button>
        {channelId && (
          <Button variant="outline" onClick={handleReset} className="border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950/40">
            <RotateCcw className="size-4" /> Reset
          </Button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <a href="https://core.telegram.org/bots/api" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
          <ExternalLink className="size-3.5" /> Telegram Bot API Documentation
        </a>
      </div>
    </section>
  );
}
