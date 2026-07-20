'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Copy, Eye, EyeOff, Loader2, Sparkles, UserPlus, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type AgentRole = 'admin' | 'agent' | 'vistoria' | 'viewer';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const ROLE_DESCRIPTIONS: Record<AgentRole, string> = {
  admin: 'Pode gerenciar membros, configurações e usar todas as funcionalidades.',
  agent: 'Pode usar caixa de entrada, contatos, transmissões e automações. Sem acesso a configurações.',
  vistoria: 'Pode criar e gerenciar vistorias. Acesso limitado a funcionalidades.',
  viewer: 'Acesso somente leitura. Não pode enviar ou editar nada.',
};

interface Mailbox {
  id: number;
  title: string;
  color: string;
}

export function CreateAgentDialog({ open, onOpenChange, onCreated }: CreateAgentDialogProps) {
  const [role, setRole] = useState<AgentRole>('agent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selectedMailboxes, setSelectedMailboxes] = useState<number[]>([]);
  const [result, setResult] = useState<{
    email: string;
    password: string;
    full_name: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from('mailboxes')
      .select('id, title, color')
      .eq('deleted', false)
      .order('title')
      .then(({ data }) => {
        if (data) setMailboxes(data);
      });
  }, [open]);

  function reset() {
    setRole('agent');
    setName('');
    setEmail('');
    setPassword('');
    setSelectedMailboxes([]);
    setResult(null);
    setSubmitting(false);
  }

  async function handleCreate() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { toast.error('Email é obrigatório'); return; }
    if (!password) { toast.error('Senha é obrigatória'); return; }
    if (password.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/account/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          full_name: trimmedName || undefined,
          role,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Erro ao criar agente');
        return;
      }

      const created = await res.json().catch(() => null) as { user?: { id?: string } } | null;

      if (selectedMailboxes.length > 0 && created?.user?.id) {
        await fetch('/api/account/agent-mailboxes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: created.user.id, mailbox_ids: selectedMailboxes }),
        });
      }

      setResult({ email: trimmedEmail, password, full_name: trimmedName, role });
      onCreated();
    } catch (err) {
      console.error('[CreateAgentDialog] error:', err);
      toast.error('Não foi possível contactar o servidor');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCreds(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label + ' copiado');
    } catch {
      toast.error('Área de transferência bloqueada - copie manualmente');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="bg-popover border-border sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <Sparkles className="size-4 text-primary" />
                Agente criado
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {result.full_name || 'O agente'} agora pode fazer login com essas credenciais.
                Compartilhe-as de forma segura.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">E-mail</Label>
                <div className="flex gap-2">
                  <Input readOnly value={result.email} className="bg-muted border-border text-foreground font-mono text-xs" />
                  <Button type="button" size="sm" onClick={() => copyCreds(result.email, 'E-mail')} className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Senha</Label>
                <div className="flex gap-2">
                  <Input readOnly value={result.password} type={showPassword ? 'text' : 'password'} className="bg-muted border-border text-foreground font-mono text-xs" />
                  <Button type="button" size="sm" onClick={() => setShowPassword(!showPassword)} variant="outline" className="shrink-0 border-border text-muted-foreground">
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <Button type="button" size="sm" onClick={() => copyCreds(result.password, 'Senha')} className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                <strong className="font-semibold text-amber-100">Salve essas credenciais agora.</strong>{' '}
                A senha é exibida apenas uma vez. Compartilhe-a de forma segura com o agente.
              </div>
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button onClick={() => onOpenChange(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground">Concluir</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <UserPlus className="size-4 text-primary" />
                Add agent
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Crie uma conta para um novo membro da equipe. Ele fará login com e-mail e senha.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nome completo <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input placeholder="Ex: Maria Silva" value={name} onChange={(e) => setName(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <Input type="email" placeholder="maria@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Senha</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Mín. 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Cargo</Label>
                <Select value={role} onValueChange={(v) => v && setRole(v as AgentRole)}>
                  <SelectTrigger className="w-full bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="vistoria">Vistoria</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              </div>

              {mailboxes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    Caixas de e-mail atribuídas
                  </Label>
                  <p className="text-xs text-muted-foreground">Selecione as caixas que este agente poderá usar para enviar e-mails.</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                    {mailboxes.map((mb) => (
                      <label key={mb.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedMailboxes.includes(mb.id)}
                          onChange={(e) => {
                            setSelectedMailboxes((prev) =>
                              e.target.checked ? [...prev, mb.id] : prev.filter((id) => id !== mb.id)
                            );
                          }}
                          className="size-3.5 rounded border-border"
                        />
                        <span
                          className="inline-block size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: mb.color }}
                        />
                        <span className="text-sm text-foreground">{mb.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border text-muted-foreground hover:bg-muted">Cancelar</Button>
              <Button onClick={handleCreate} disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Criando...</> : 'Criar agente'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}