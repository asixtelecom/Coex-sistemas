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
  admin: 'Can manage members, settings, and use all features.',
  agent: 'Can use inbox, contacts, broadcasts, and automations. No settings.',
  viewer: 'Read-only access. Cannot send or edit anything.',
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
    if (!trimmedEmail) { toast.error('Email is required'); return; }
    if (!password) { toast.error('Password is required'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

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
        toast.error(payload.error || 'Failed to create agent');
        return;
      }

      setResult({ email: trimmedEmail, password, full_name: trimmedName, role });
      onCreated();
    } catch (err) {
      console.error('[CreateAgentDialog] error:', err);
      toast.error('Could not reach the server');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCreds(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label + ' copied');
    } catch {
      toast.error('Clipboard blocked - copy manually');
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
                Agent created
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {result.full_name || 'The agent'} can now log in with these credentials.
                Share them securely.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Email</Label>
                <div className="flex gap-2">
                  <Input readOnly value={result.email} className="bg-muted border-border text-foreground font-mono text-xs" />
                  <Button type="button" size="sm" onClick={() => copyCreds(result.email, 'Email')} className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Password</Label>
                <div className="flex gap-2">
                  <Input readOnly value={result.password} type={showPassword ? 'text' : 'password'} className="bg-muted border-border text-foreground font-mono text-xs" />
                  <Button type="button" size="sm" onClick={() => setShowPassword(!showPassword)} variant="outline" className="shrink-0 border-border text-muted-foreground">
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <Button type="button" size="sm" onClick={() => copyCreds(result.password, 'Password')} className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                <strong className="font-semibold text-amber-100">Save these credentials now.</strong>{' '}
                The password is shown only once. Share it securely with the agent.
              </div>
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button onClick={() => onOpenChange(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground">Done</Button>
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
                Create an account for a new teammate. They&apos;ll log in with email and password.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Full name <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input placeholder="e.g. Maria Silva" value={name} onChange={(e) => setName(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <Input type="email" placeholder="maria@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted border-border text-foreground placeholder:text-muted-foreground pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Role</Label>
                <Select value={role} onValueChange={(v) => v && setRole(v as AgentRole)}>
                  <SelectTrigger className="w-full bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border text-muted-foreground hover:bg-muted">Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Creating...</> : 'Create agent'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}