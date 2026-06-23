'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SettingsPanelHead } from './settings-panel-head';

interface Mailbox {
  id: number;
  account_id: string;
  title: string;
  color: string;
  imap_authorized: boolean;
  smtp_authorized: boolean;
  imap_host: string | null;
  imap_port: number | null;
  imap_username: string | null;
  imap_password?: string | null;
  imap_ssl: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password?: string | null;
  smtp_ssl: boolean;
  signature: string | null;
  send_bcc_to: string | null;
  permitted_users: string | null;
  use_global_email: boolean;
  email_provider: string | null;
  imap_type: string | null;
}

interface MailboxTemplate {
  id: number;
  account_id: string;
  title: string;
  description: string | null;
  body: string | null;
  created_by: string | null;
  is_public: boolean;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

export function EmailConfig() {
  const supabase = createClient();
  const { accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [templates, setTemplates] = useState<MailboxTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [currentMailbox, setCurrentMailbox] = useState<Partial<Mailbox>>({
    title: '',
    color: '#2563eb',
    imap_type: 'general_imap',
    email_provider: 'mail',
    use_global_email: true,
    imap_ssl: true,
    smtp_ssl: true,
  });
  const [currentTemplate, setCurrentTemplate] = useState<Partial<MailboxTemplate>>({
    title: '',
    description: '',
    body: '',
    is_public: true,
  });
  const [activeTab, setActiveTab] = useState<'general' | 'imap' | 'smtp'>('general');
  const [activeSection, setActiveSection] = useState<'mailboxes' | 'templates'>('mailboxes');

  const fetchMailboxes = useCallback(async (acctId: string) => {
    try {
      const { data } = await supabase
        .from('mailboxes')
        .select('*')
        .eq('account_id', acctId)
        .eq('deleted', false)
        .order('id', { ascending: true });
      
      setMailboxes(data || []);
    } catch (err) {
      console.error('fetchMailboxes error:', err);
    }
  }, [supabase]);

  const fetchTemplates = useCallback(async (acctId: string) => {
    try {
      const { data } = await supabase
        .from('mailbox_templates')
        .select('*')
        .eq('account_id', acctId)
        .eq('deleted', false)
        .order('created_at', { ascending: false });
      
      setTemplates(data || []);
    } catch (err) {
      console.error('fetchTemplates error:', err);
    }
  }, [supabase]);

  const loadAllData = useCallback(async (acctId: string) => {
    setLoading(true);
    await Promise.all([
      fetchMailboxes(acctId),
      fetchTemplates(acctId)
    ]);
    setLoading(false);
  }, [fetchMailboxes, fetchTemplates]);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!accountId) { setLoading(false); return; }
    loadAllData(accountId);
  }, [authLoading, profileLoading, accountId, loadAllData]);

  async function handleSaveTemplate() {
    if (!accountId || !currentTemplate.title) {
      toast.error('Por favor, preencha o título');
      return;
    }

    setSaving(true);
    try {
      if (currentTemplate.id) {
        const { error } = await supabase
          .from('mailbox_templates')
          .update(currentTemplate)
          .eq('id', currentTemplate.id);
        if (error) throw error;
        toast.success('Template atualizado');
      } else {
        const { error } = await supabase
          .from('mailbox_templates')
          .insert({ ...currentTemplate, account_id: accountId });
        if (error) throw error;
        toast.success('Template criado');
      }
      setIsTemplateDialogOpen(false);
      setCurrentTemplate({
        title: '',
        description: '',
        body: '',
        is_public: true,
      });
      fetchTemplates(accountId);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(templateId: number) {
    if (!confirm('Tem certeza de que deseja excluir este template?')) return;
    if (!accountId) return;

    try {
      const { error } = await supabase
        .from('mailbox_templates')
        .update({ deleted: true })
        .eq('id', templateId);
      if (error) throw error;
      toast.success('Template excluído');
      fetchTemplates(accountId);
    } catch {
      toast.error('Falha ao excluir template');
    }
  }

  function handleEditTemplate(template: MailboxTemplate) {
    setCurrentTemplate(template);
    setIsTemplateDialogOpen(true);
  }

  async function handleSaveMailbox() {
    if (!accountId || !currentMailbox.title) {
      toast.error('Por favor, preencha o título');
      return;
    }

    setSaving(true);
    try {
      if (currentMailbox.id) {
        const { error } = await supabase
          .from('mailboxes')
          .update(currentMailbox)
          .eq('id', currentMailbox.id);
        if (error) throw error;
        toast.success('Caixa de e-mail atualizada');
      } else {
        const { error } = await supabase
          .from('mailboxes')
          .insert({ ...currentMailbox, account_id: accountId });
        if (error) throw error;
        toast.success('Caixa de e-mail criada');
      }
      setIsDialogOpen(false);
      setCurrentMailbox({
        title: '',
        color: '#2563eb',
        imap_type: 'general_imap',
        email_provider: 'mail',
        use_global_email: true,
        imap_ssl: true,
        smtp_ssl: true,
      });
      fetchMailboxes(accountId);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar caixa de e-mail');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMailbox(mailboxId: number) {
    if (!confirm('Tem certeza de que deseja excluir esta caixa de e-mail?')) return;
    if (!accountId) return;

    try {
      const { error } = await supabase
        .from('mailboxes')
        .update({ deleted: true })
        .eq('id', mailboxId);
      if (error) throw error;
      toast.success('Caixa de e-mail excluída');
      fetchMailboxes(accountId);
    } catch {
      toast.error('Falha ao excluir caixa de e-mail');
    }
  }

  function handleEditMailbox(mailbox: Mailbox) {
    setCurrentMailbox(mailbox);
    setIsDialogOpen(true);
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead title="E-mail" description="Configure suas caixas de e-mail para o CRM." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="E-mail"
        description="Configure suas contas de e-mail e templates para enviar e receber e-mails diretamente do CRM."
      />

      {/* Section Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveSection('mailboxes')}
          className={`pb-2 px-4 text-sm border-b-2 transition-colors ${
            activeSection === 'mailboxes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Caixas de E-mail
        </button>
        <button
          onClick={() => setActiveSection('templates')}
          className={`pb-2 px-4 text-sm border-b-2 transition-colors ${
            activeSection === 'templates'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Templates
        </button>
      </div>

      {/* Mailboxes Section */}
      {activeSection === 'mailboxes' && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Caixas de E-mail</CardTitle>
              <CardDescription className="text-muted-foreground">
                Gerencie suas caixas de e-mail.
              </CardDescription>
            </div>
            <Button onClick={() => {
              setCurrentMailbox({
                title: '',
                color: '#2563eb',
                imap_type: 'general_imap',
                email_provider: 'mail',
                use_global_email: true,
                imap_ssl: true,
                smtp_ssl: true,
              });
              setActiveTab('general');
              setIsDialogOpen(true);
            }}>
              <Plus className="size-4 mr-2" />
              Adicionar Caixa
            </Button>
          </CardHeader>
        <CardContent>
          {mailboxes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma caixa de e-mail ainda. Clique em "Adicionar Caixa" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Configuração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mailboxes.map(mailbox => (
                  <TableRow key={mailbox.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: mailbox.color }} />
                        {mailbox.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        IMAP: {mailbox.imap_host || 'Não configurado'} | SMTP: {mailbox.smtp_host || 'Não configurado'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {mailbox.imap_authorized && mailbox.smtp_authorized ? (
                        <span className="inline-flex items-center gap-1 text-green-500">
                          <CheckCircle2 className="size-4" />
                          Autorizada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <XCircle className="size-4" />
                          Não autorizada
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditMailbox(mailbox)}>
                          <Edit className="size-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteMailbox(mailbox.id)}>
                          <Trash2 className="size-3.5 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}

      {/* Templates Section */}
      {activeSection === 'templates' && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Templates de E-mail</CardTitle>
              <CardDescription className="text-muted-foreground">
                Gerencie seus templates de e-mail.
              </CardDescription>
            </div>
            <Button onClick={() => {
              setCurrentTemplate({
                title: '',
                description: '',
                body: '',
                is_public: true,
              });
              setIsTemplateDialogOpen(true);
            }}>
              <Plus className="size-4 mr-2" />
              Adicionar Template
            </Button>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum template ainda. Clique em "Adicionar Template" para começar ou use o botão "Dados de Exemplo" na página principal.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(template => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {template.description || 'Sem descrição'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>
                            <Edit className="size-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                            <Trash2 className="size-3.5 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mailbox Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{currentMailbox.id ? 'Editar Caixa de E-mail' : 'Adicionar Nova Caixa'}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes para configurar sua caixa de e-mail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2 border-b border-border">
              {(['general', 'imap', 'smtp'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 px-2 text-sm border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'general' ? 'Geral' : tab.toUpperCase()}
                </button>
              ))}
            </div>

            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="ex: Suporte"
                    value={currentMailbox.title}
                    onChange={e => setCurrentMailbox({ ...currentMailbox, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentMailbox.color}
                      onChange={e => setCurrentMailbox({ ...currentMailbox, color: e.target.value })}
                      className="h-9 w-10 rounded-lg border border-border bg-muted p-0.5"
                    />
                    <Input
                      value={currentMailbox.color}
                      onChange={e => setCurrentMailbox({ ...currentMailbox, color: e.target.value })}
                      className="bg-muted border-border text-foreground font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'imap' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de IMAP</Label>
                  <Select
                    value={currentMailbox.imap_type}
                    onValueChange={v => setCurrentMailbox({ ...currentMailbox, imap_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_imap">IMAP Geral</SelectItem>
                      <SelectItem value="gmail_imap">Gmail IMAP</SelectItem>
                      <SelectItem value="microsoft_outlook">Microsoft Outlook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Host IMAP</Label>
                  <Input
                    placeholder="imap.exemplo.com"
                    value={currentMailbox.imap_host || ''}
                    onChange={e => setCurrentMailbox({ ...currentMailbox, imap_host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Porta IMAP</Label>
                  <Input
                    type="number"
                    placeholder="993"
                    value={currentMailbox.imap_port || ''}
                    onChange={e => setCurrentMailbox({ ...currentMailbox, imap_port: parseInt(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input
                    placeholder="seu@email.com"
                    value={currentMailbox.imap_username || ''}
                    onChange={e => setCurrentMailbox({ ...currentMailbox, imap_username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    placeholder="********"
                    onChange={e => setCurrentMailbox({ ...currentMailbox, imap_password: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="imap_ssl"
                    checked={currentMailbox.imap_ssl}
                    onChange={e => setCurrentMailbox({ ...currentMailbox, imap_ssl: e.target.checked })}
                  />
                  <Label htmlFor="imap_ssl">Usar SSL</Label>
                </div>
              </div>
            )}

            {activeTab === 'smtp' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Provedor de E-mail</Label>
                  <Select
                    value={currentMailbox.email_provider}
                    onValueChange={v => setCurrentMailbox({ ...currentMailbox, email_provider: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mail">PHP Mail</SelectItem>
                      <SelectItem value="smtp">SMTP</SelectItem>
                      <SelectItem value="gmail_smtp">Gmail SMTP</SelectItem>
                      <SelectItem value="microsoft_outlook">Microsoft Outlook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Host SMTP</Label>
                  <Input
                    placeholder="smtp.exemplo.com"
                    value={currentMailbox.smtp_host || ''}
                    onChange={e => setCurrentMailbox({ ...currentMailbox, smtp_host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Porta SMTP</Label>
                  <Input
                    type="number"
                    placeholder="587"
                    value={currentMailbox.smtp_port || ''}
                    onChange={e => setCurrentMailbox({ ...currentMailbox, smtp_port: parseInt(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input
                    placeholder="seu@email.com"
                    value={currentMailbox.smtp_username || ''}
                    onChange={e => setCurrentMailbox({ ...currentMailbox, smtp_username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    placeholder="********"
                    onChange={e => setCurrentMailbox({ ...currentMailbox, smtp_password: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="smtp_ssl"
                    checked={currentMailbox.smtp_ssl}
                    onChange={e => setCurrentMailbox({ ...currentMailbox, smtp_ssl: e.target.checked })}
                  />
                  <Label htmlFor="smtp_ssl">Usar SSL</Label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMailbox} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Salvando...</> : 'Salvar Caixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentTemplate.id ? 'Editar Template' : 'Adicionar Novo Template'}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes para criar seu template de e-mail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="ex: Boas-vindas ao cliente"
                value={currentTemplate.title}
                onChange={e => setCurrentTemplate({ ...currentTemplate, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Breve descrição do template"
                value={currentTemplate.description || ''}
                onChange={e => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Corpo do E-mail (HTML)</Label>
              <textarea
                rows={10}
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="<p>Olá {nome},</p><p>Seja bem-vindo!</p>"
                value={currentTemplate.body || ''}
                onChange={e => setCurrentTemplate({ ...currentTemplate, body: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="template_public"
                checked={currentTemplate.is_public}
                onChange={e => setCurrentTemplate({ ...currentTemplate, is_public: e.target.checked })}
              />
              <Label htmlFor="template_public">Template público</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Salvando...</> : 'Salvar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
