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

export function YoutubeConfig() {
  const supabase = createClient();
  const { accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [youtubeChannelId, setYoutubeChannelId] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  const [apiKeyEdited, setApiKeyEdited] = useState(false);
  const [clientSecretEdited, setClientSecretEdited] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/youtube/webhook`
    : '';

  const fetchConfig = useCallback(async (acctId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('account_id', acctId)
        .eq('type', 'youtube')
        .maybeSingle();

      if (data) {
        setChannelId(data.id);
        setApiKey(MASKED_TOKEN);
        setClientId(data.config?.client_id || '');
        setClientSecret(MASKED_TOKEN);
        setYoutubeChannelId(data.config?.youtube_channel_id || '');
        setVerifyToken('');
        setConnected(data.status === 'connected');
        setApiKeyEdited(false);
        setClientSecretEdited(false);
      } else {
        setChannelId(null);
        setApiKey('');
        setClientId('');
        setClientSecret('');
        setYoutubeChannelId('');
        setVerifyToken('');
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
    if (!youtubeChannelId.trim()) {
      toast.error('YouTube Channel ID is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        youtube_channel_id: youtubeChannelId.trim(),
        client_id: clientId.trim() || undefined,
        verify_token: verifyToken.trim() || undefined,
      };
      if (apiKeyEdited) payload.api_key = apiKey.trim();
      if (clientSecretEdited) payload.client_secret = clientSecret.trim();

      const res = await fetch('/api/channels', {
        method: channelId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'youtube', config: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
        return;
      }

      toast.success('YouTube channel configured');
      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reset YouTube configuration?')) return;
    try {
      await fetch('/api/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'youtube' }),
      });
      setChannelId(null);
      setApiKey('');
      setClientId('');
      setClientSecret('');
      setYoutubeChannelId('');
      setVerifyToken('');
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
        <SettingsPanelHead title="YouTube connection" description="Connect your YouTube channel." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="YouTube connection"
        description="Connect your YouTube channel to monitor comments and respond to your audience."
      />

      <Alert className="bg-card border-border mb-6">
        <div className="flex items-center gap-2">
          {connected ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-red-500" />}
          <AlertTitle className="text-foreground mb-0">{connected ? 'Connected' : 'Not connected'}</AlertTitle>
        </div>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">API Credentials</CardTitle>
          <CardDescription className="text-muted-foreground">Enter your YouTube Data API v3 credentials from Google Cloud Console.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">YouTube Channel ID</Label>
            <Input placeholder="e.g. UCxxxxxxxxxxxxxxxx" value={youtubeChannelId} onChange={e => setYoutubeChannelId(e.target.value)} className="bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">API Key</Label>
            <div className="relative">
              <Input type={showToken ? 'text' : 'password'} placeholder="Enter your YouTube Data API Key" value={apiKey} onChange={e => { setApiKey(e.target.value); setApiKeyEdited(true); }} onFocus={() => { if (apiKey === MASKED_TOKEN) { setApiKey(''); setApiKeyEdited(true); } }} className="bg-muted border-border text-foreground pr-10" />
              <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">OAuth Client ID</Label>
            <Input placeholder="xxxx.apps.googleusercontent.com" value={clientId} onChange={e => setClientId(e.target.value)} className="bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">OAuth Client Secret</Label>
            <div className="relative">
              <Input type={showToken ? 'text' : 'password'} placeholder="Enter your Client Secret" value={clientSecret} onChange={e => { setClientSecret(e.target.value); setClientSecretEdited(true); }} onFocus={() => { if (clientSecret === MASKED_TOKEN) { setClientSecret(''); setClientSecretEdited(true); } }} className="bg-muted border-border text-foreground pr-10" />
              <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Webhook Verify Token</Label>
            <Input placeholder="Create a custom verify token" value={verifyToken} onChange={e => setVerifyToken(e.target.value)} className="bg-muted border-border text-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Webhook Configuration</CardTitle>
          <CardDescription className="text-muted-foreground">Use this URL in your Google Cloud Pub/Sub push subscription for comment notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl} className="bg-muted border-border text-muted-foreground font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={handleCopyWebhookUrl} className="shrink-0 border-border"><Copy className="size-4" /></Button>
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

      <div className="mt-4 pt-4 border-t border-border">
        <a href="https://developers.google.com/youtube/v3/getting-started" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
          <ExternalLink className="size-3.5" /> YouTube Data API v3 Documentation
        </a>
      </div>
    </section>
  );
}
