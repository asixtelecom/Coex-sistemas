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

export function LinkedInConfig() {
  const supabase = createClient();
  const { accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/linkedin/webhook`
    : '';

  const fetchConfig = useCallback(async (acctId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('account_id', acctId)
        .eq('type', 'linkedin')
        .maybeSingle();

      if (data) {
        setChannelId(data.id);
        setOrganizationId(data.config?.organization_id || '');
        setAccessToken(MASKED_TOKEN);
        setVerifyToken('');
        setConnected(data.status === 'connected');
        setTokenEdited(false);
      } else {
        setChannelId(null);
        setOrganizationId('');
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
    if (!organizationId.trim()) {
      toast.error('LinkedIn Organization ID is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        organization_id: organizationId.trim(),
        access_token: tokenEdited ? accessToken.trim() : undefined,
        verify_token: verifyToken.trim() || undefined,
      };

      const res = await fetch('/api/channels', {
        method: channelId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'linkedin', config: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
        return;
      }

      toast.success('LinkedIn channel configured');
      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reset LinkedIn configuration?')) return;
    try {
      await fetch('/api/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'linkedin' }),
      });
      setChannelId(null);
      setOrganizationId('');
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
        <SettingsPanelHead title="LinkedIn connection" description="Connect your LinkedIn organization account." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="LinkedIn connection"
        description="Connect your LinkedIn organization account to receive and reply to messages from your customers."
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
          <CardDescription className="text-muted-foreground">Enter your LinkedIn Marketing API credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">LinkedIn Organization ID</Label>
            <Input placeholder="e.g. 12345678" value={organizationId} onChange={e => setOrganizationId(e.target.value)} className="bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Access Token</Label>
            <div className="relative">
              <Input type={showToken ? 'text' : 'password'} placeholder="Enter your Access Token" value={accessToken} onChange={e => { setAccessToken(e.target.value); setTokenEdited(true); }} onFocus={() => { if (accessToken === MASKED_TOKEN) { setAccessToken(''); setTokenEdited(true); } }} className="bg-muted border-border text-foreground pr-10" />
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
          <CardDescription className="text-muted-foreground">Use this URL in your LinkedIn App webhook settings.</CardDescription>
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
        <a href="https://learn.microsoft.com/en-us/linkedin/marketing/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
          <ExternalLink className="size-3.5" /> LinkedIn Marketing API Documentation
        </a>
      </div>
    </section>
  );
}
