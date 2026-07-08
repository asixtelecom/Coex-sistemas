'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SettingsPanelHead } from './settings-panel-head';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { WhatsAppConfig as WhatsAppConfigType } from '@/types';

const MASKED_TOKEN = '••••••••••••••••';

interface ConfigRow extends WhatsAppConfigType {
  connected?: boolean;
  phone_info?: { verified_name?: string } | null;
  channel_id?: string | null;
  failure_reason?: string | null;
  webhook_url?: string | null;
}

type ModalMode = 'create' | 'edit';

export function WhatsAppConfig() {
  const { user, accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editId, setEditId] = useState<string | null>(null);
  const [formPhoneNumberId, setFormPhoneNumberId] = useState('');
  const [formWabaId, setFormWabaId] = useState('');
  const [formAccessToken, setFormAccessToken] = useState('');
  const [formVerifyToken, setFormVerifyToken] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formDisplayPhone, setFormDisplayPhone] = useState('');
  const [formName, setFormName] = useState('');
  const [formShowToken, setFormShowToken] = useState(false);
  const [formTokenEdited, setFormTokenEdited] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/config', { method: 'GET' });
      const data = await res.json();
      setConfigs(data.configs ?? []);
    } catch (err) {
      console.error('fetchConfigs error:', err);
      toast.error('Failed to load WhatsApp configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !accountId) {
      setLoading(false);
      return;
    }
    fetchConfigs();
  }, [authLoading, profileLoading, user, accountId, fetchConfigs]);

  function openCreateModal() {
    setModalMode('create');
    setEditId(null);
    setFormPhoneNumberId('');
    setFormWabaId('');
    setFormAccessToken('');
    setFormVerifyToken('');
    setFormPin('');
    setFormDisplayPhone('');
    setFormName('');
    setFormShowToken(false);
    setFormTokenEdited(false);
    setModalOpen(true);
  }

  function openEditModal(cfg: ConfigRow) {
    setModalMode('edit');
    setEditId(cfg.id);
    setFormPhoneNumberId(cfg.phone_number_id);
    setFormWabaId(cfg.waba_id || '');
    setFormAccessToken(MASKED_TOKEN);
    setFormVerifyToken('');
    setFormPin('');
    setFormDisplayPhone(cfg.display_phone || '');
    setFormName(cfg.name || '');
    setFormShowToken(false);
    setFormTokenEdited(false);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formPhoneNumberId.trim()) {
      toast.error('Phone Number ID is required');
      return;
    }
    if (modalMode === 'create' && (!formAccessToken.trim() || !formTokenEdited)) {
      toast.error('Access Token is required for initial setup');
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        phone_number_id: formPhoneNumberId.trim(),
        waba_id: formWabaId.trim() || null,
        pin: formPin.trim() || null,
        display_phone: formDisplayPhone.trim() || null,
        name: formName.trim() || null,
      };

      if (formVerifyToken.trim()) {
        payload.verify_token = formVerifyToken.trim()
      }

      if (modalMode === 'edit') {
        payload.id = editId;
      }

      if (formTokenEdited && formAccessToken !== MASKED_TOKEN && formAccessToken.trim()) {
        payload.access_token = formAccessToken.trim();
      } else if (modalMode === 'edit') {
        toast.error('Please re-enter the Access Token to save changes');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to save configuration');
        setSaving(false);
        return;
      }

      if (data.registered === false && data.registration_error) {
        toast.error(
          `Saved, but Meta couldn't register the number: ${data.registration_error}`,
          { duration: 12000 },
        );
      } else if (data.registration_skipped) {
        toast.success(
          'Credentials saved and verified. Inbound registration was skipped (no PIN) — see status below.',
          { duration: 10000 },
        );
      } else {
        toast.success(
          data.phone_info?.verified_name
            ? `Live — ${data.phone_info.verified_name} can now receive events.`
            : 'WhatsApp connected.',
        );
      }

      setModalOpen(false);
      await fetchConfigs();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this WhatsApp number configuration? This cannot be undone.')) return;

    setDeletingId(id);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete configuration');
        return;
      }

      toast.success('Configuration deleted');
      await fetchConfigs();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete configuration');
    } finally {
      setDeletingId(null);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="WhatsApp connection"
          description="Manage your WhatsApp Business API numbers."
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="WhatsApp connection"
        description="Manage your WhatsApp Business API numbers. Each number appears as a separate channel in the inbox."
      />

      {/* Webhook Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Webhook Configuration</CardTitle>
          <CardDescription className="text-muted-foreground">
            Use these URLs in your Meta App webhook settings. Each number has its own webhook URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a WhatsApp number below to see its webhook URL.
            </p>
          ) : (
            <div className="space-y-3">
              {configs.map((cfg) => {
                const digits = cfg.display_phone
                  ? cfg.display_phone.replace(/\D/g, '').slice(-2)
                  : cfg.phone_number_id.slice(-2);
                const rawUrl = cfg.webhook_url || (
                  typeof window !== 'undefined'
                    ? '/api/whatsapp/webhook/' + cfg.channel_token
                    : ''
                );
                const wh = rawUrl && rawUrl.startsWith('/') && typeof window !== 'undefined'
                  ? window.location.origin + rawUrl
                  : rawUrl;
                return (
                  <div key={cfg.id} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {cfg.display_phone || cfg.phone_number_id}
                    </Label>
                    <div className="flex gap-1">
                      <Input
                        readOnly
                        value={wh}
                        className="bg-muted border-border text-muted-foreground font-mono text-[11px] h-7"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-7 w-7"
                        onClick={() => handleCopy(wh)}
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Connected Numbers List */}
          {configs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No WhatsApp numbers configured yet.
                </p>
                <Button onClick={openCreateModal}>
                  <Plus className="size-4 mr-2" />
                  Add your first number
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {configs.length} number{configs.length !== 1 ? 's' : ''} connected
                </p>
                <Button size="sm" onClick={openCreateModal}>
                  <Plus className="size-4 mr-1" />
                  Add number
                </Button>
              </div>

              {configs.map((cfg) => (
                <ConfigCard
                  key={cfg.id}
                  config={cfg}
                  onEdit={() => openEditModal(cfg)}
                  onDelete={() => handleDelete(cfg.id)}
                  onCopy={handleCopy}
                  deleting={deletingId === cfg.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Setup Instructions Sidebar */}
        <SidebarInstructions />
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'Add WhatsApp number' : 'Edit WhatsApp number'}
            </DialogTitle>
            <DialogDescription>
              Enter your Meta WhatsApp Business API credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Name</Label>
                <Input
                  placeholder="e.g. Alphaville"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Display phone</Label>
                <Input
                  placeholder="e.g. 11 99999-0009"
                  value={formDisplayPhone}
                  onChange={(e) => setFormDisplayPhone(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Phone Number ID</Label>
              <Input
                placeholder="e.g. 100234567890123"
                value={formPhoneNumberId}
                onChange={(e) => setFormPhoneNumberId(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">WhatsApp Business Account ID</Label>
              <Input
                placeholder="e.g. 100234567890456"
                value={formWabaId}
                onChange={(e) => setFormWabaId(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Permanent Access Token</Label>
              <div className="relative">
                <Input
                  type={formShowToken ? 'text' : 'password'}
                  placeholder="Enter your access token"
                  value={formAccessToken}
                  onChange={(e) => {
                    setFormAccessToken(e.target.value);
                    setFormTokenEdited(true);
                  }}
                  onFocus={() => {
                    if (formAccessToken === MASKED_TOKEN) {
                      setFormAccessToken('');
                      setFormTokenEdited(true);
                    }
                  }}
                  className="bg-muted border-border text-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setFormShowToken(!formShowToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {formShowToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Webhook Verify Token</Label>
              <Input
                placeholder="Create a custom verify token"
                value={formVerifyToken}
                onChange={(e) => setFormVerifyToken(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Must match the token you set in Meta webhook settings for this number.
                {modalMode === 'edit' && ' Leave empty to keep the existing token.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Two-step verification PIN <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit PIN"
                value={formPin}
                onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-muted border-border text-foreground tracking-widest"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ConfigCard({
  config,
  onEdit,
  onDelete,
  onCopy,
  deleting,
}: {
  config: ConfigRow;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: (text: string) => void;
  deleting: boolean;
}) {
  const digits = config.display_phone
    ? config.display_phone.replace(/\D/g, '').slice(-2)
    : config.phone_number_id.slice(-2);

  const rawWebhookUrl = config.webhook_url || (
    typeof window !== 'undefined'
      ? `/api/whatsapp/webhook/${config.channel_token}`
      : ''
  );
  const webhookUrl = rawWebhookUrl && rawWebhookUrl.startsWith('/') && typeof window !== 'undefined'
    ? window.location.origin + rawWebhookUrl
    : rawWebhookUrl;

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {digits}
            </div>
            <div>
              <CardTitle className="text-foreground text-base">
                {config.name || config.display_phone || `WhatsApp #${digits}`}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {config.display_phone || config.phone_number_id}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {config.connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-700/30">
                <CheckCircle2 className="size-3" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/30 px-2.5 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-700/30">
                <XCircle className="size-3" />
                Offline
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Registration status */}
        {config.registered_at && (
          <div className="flex items-center gap-2 text-xs text-emerald-400/80">
            <CheckCircle2 className="size-3" />
            Registered — receiving events
          </div>
        )}
        {config.last_registration_error && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="size-3" />
            {config.last_registration_error}
          </div>
        )}
        {!config.registered_at && !config.last_registration_error && (
          <div className="flex items-center gap-2 text-xs text-amber-400/60">
            <AlertTriangle className="size-3" />
            Not registered — events may not arrive
          </div>
        )}

        {/* Failure reason */}
        {config.failure_reason === 'token_corrupted' && (
          <Alert className="bg-amber-950/40 border-amber-600/40 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-400 shrink-0" />
              <AlertDescription className="text-amber-100/80 text-xs">
                Token cannot be decrypted. Edit and re-save.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Webhook URL */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Webhook URL</Label>
          <div className="flex gap-1">
            <Input
              readOnly
              value={webhookUrl}
              className="bg-muted border-border text-muted-foreground font-mono text-[11px] h-7"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-7 w-7"
              onClick={() => onCopy(webhookUrl)}
            >
              <Copy className="size-3" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onEdit} className="h-7 text-xs">
            <Pencil className="size-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="h-7 text-xs border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950/40"
          >
            {deleting ? (
              <Loader2 className="size-3 animate-spin mr-1" />
            ) : (
              <Trash2 className="size-3 mr-1" />
            )}
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SidebarInstructions() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-base">Setup Instructions</CardTitle>
          <CardDescription className="text-muted-foreground">
            Each WhatsApp number gets its own webhook URL with a unique token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion>
            <AccordionItem className="border-border">
              <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                  Create a Meta App
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to <span className="text-primary">developers.facebook.com</span></li>
                  <li>Click &quot;My Apps&quot; and then &quot;Create App&quot;</li>
                  <li>Select &quot;Business&quot; as the app type</li>
                  <li>Fill in app details and create</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem className="border-border">
              <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                  Add WhatsApp Product
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>In your app dashboard, click &quot;Add Product&quot;</li>
                  <li>Find &quot;WhatsApp&quot; and click &quot;Set Up&quot;</li>
                  <li>Follow the setup wizard to link your business</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem className="border-border">
              <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                  Get API Credentials
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to WhatsApp &gt; API Setup</li>
                  <li>Copy your <strong className="text-foreground">Phone Number ID</strong></li>
                  <li>Copy your <strong className="text-foreground">WhatsApp Business Account ID</strong></li>
                  <li>Generate a <strong className="text-foreground">Permanent Access Token</strong></li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem className="border-border">
              <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</span>
                  Configure Webhook per number
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Copy the <strong className="text-foreground">Webhook URL</strong> from the number card above</li>
                  <li>Go to WhatsApp &gt; Configuration in Meta App Dashboard</li>
                  <li>Click &quot;Edit&quot; and paste the URL as the Callback URL</li>
                  <li>Enter the same <strong className="text-foreground">Verify Token</strong></li>
                  <li>Subscribe to &quot;messages&quot; webhook field</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-4 pt-4 border-t border-border">
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="size-3.5" />
              Meta WhatsApp API Documentation
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
