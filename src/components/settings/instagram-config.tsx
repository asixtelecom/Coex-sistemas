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

export function InstagramConfig() {
  const supabase = createClient();
  const { accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [igUserId, setIgUserId] = useState('');
  const [pageId, setPageId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/instagram/webhook`
    : '';

  const fetchConfig = useCallback(async (acctId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('account_id', acctId)
        .eq('type', 'instagram')
        .maybeSingle();

      if (data) {
        setChannelId(data.id);
        setIgUserId(data.config?.ig_user_id || '');
        setPageId(data.config?.page_id || '');
        setAccessToken(MASKED_TOKEN);
        setVerifyToken('');
        setConnected(data.status === 'connected');
        setTokenEdited(false);
      } else {
        setChannelId(null);
        setIgUserId('');
        setPageId('');
        setAccessToken('');
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
    if (!igUserId.trim() || !pageId.trim()) {
      toast.error('Instagram Business Account ID and Page ID are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ig_user_id: igUserId.trim(),
        page_id: pageId.trim(),
        access_token: tokenEdited ? accessToken.trim() : undefined,
        verify_token: verifyToken.trim() || undefined,
      };

      const res = await fetch('/api/channels', {
        method: channelId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'instagram', config: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
        return;
      }

      toast.success('Instagram channel configured');
      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reset Instagram configuration?')) return;
    try {
      await fetch('/api/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'instagram' }),
      });
      setChannelId(null);
      setIgUserId('');
      setPageId('');
      setAccessToken('');
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
        <SettingsPanelHead title="Instagram connection" description="Connect your Instagram Business Account." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Instagram connection"
        description="Connect your Instagram Business Account. Requires a Facebook Page linked to your Instagram."
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
          <CardDescription className="text-muted-foreground">Enter your Instagram Graph API credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Instagram Business Account ID</Label>
            <Input placeholder="e.g. 17841400000000000" value={igUserId} onChange={e => setIgUserId(e.target.value)} className="bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Facebook Page ID</Label>
            <Input placeholder="e.g. 100234567890123" value={pageId} onChange={e => setPageId(e.target.value)} className="bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Page Access Token</Label>
            <div className="relative">
              <Input type={showToken ? 'text' : 'password'} placeholder="Enter your Page Access Token" value={accessToken} onChange={e => { setAccessToken(e.target.value); setTokenEdited(true); }} onFocus={() => { if (accessToken === MASKED_TOKEN) { setAccessToken(''); setTokenEdited(true); } }} className="bg-muted border-border text-foreground pr-10" />
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
          <CardDescription className="text-muted-foreground">Use this URL in your Meta App webhook settings.</CardDescription>
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
        <a href="https://developers.facebook.com/docs/instagram-api/getting-started" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
          <ExternalLink className="size-3.5" /> Instagram Graph API Documentation
        </a>
      </div>
    </section>
  );
}