'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Eye, EyeOff, Loader2, Sparkles, UserPlus } from 'lucide-react';

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

type AgentRole = 'admin' | 'agent' | 'viewer';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const ROLE_DESCRIPTIONS: Record<AgentRole, string> = {
  admin: 'Pode gerenciar membros, configurações e usar todas as funcionalidades.',
  agent: 'Pode usar caixa de entrada, contatos, transmissões e automações. Sem acesso a configurações.',
  viewer: 'Acesso somente leitura. Não pode enviar ou editar nada.',
};

export function CreateAgentDialog({ open, onOpenChange, onCreated }: CreateAgentDialogProps) {
  const [role, setRole] = useState<AgentRole>('agent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    email: string;
    password: string;
    full_name: string;
    role: string;
  } | null>(null);

  function reset() {
    setRole('agent');
    setName('');
    setEmail('');
    setPassword('');
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
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
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