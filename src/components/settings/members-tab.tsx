'use client';

// ============================================================
// MembersTab — Settings → Members
//
// Two stacked sections:
//   1. Roster   — every member of the account. Admin+ can change a
//                 teammate's role inline and remove them. Owner row
//                 is non-editable everywhere (transfer is its own
//                 separate flow, deferred to a later PR).
//   2. Pending  — outstanding invite links. Admin+ can revoke. The
//                 plaintext URL is gone after the create dialog
//                 closes, so we surface a "revoke + new link" hint
//                 rather than pretending we can resurface it.
//
// Role-gating
//   The tab itself is reachable by any member, but mutation buttons
//   are wrapped in `<RequireRole min="admin">` / `useCan` so an
//   agent or viewer sees the roster read-only. The server-side
//   RPCs (set_member_role, remove_account_member) double-check
//   the role anyway.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Camera,
  Pencil,
  Square,
  CheckSquare,
  Loader2,
  Mail,
  MailX,
  Plus,
  Trash2,
  UsersRound,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RequireRole } from '@/components/auth/require-role';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { FEATURE_PERMISSIONS, type AccountRole, type FeaturePermission, type FeaturePermissions } from '@/lib/auth/roles';
import { CreateAgentDialog } from './create-agent-dialog';
import { SettingsPanelHead } from './settings-panel-head';
import { ROLE_META } from './role-meta';

const PERMISSION_LABELS: Record<FeaturePermission, string> = {
  broadcasts: 'Transmissões',
  automations: 'Automações',
  flows: 'Fluxos',
  pedidos: 'Fechamento',
  pagamentos: 'Pagamentos',
  assinaturas: 'Assinaturas',
  inventario: 'Inventário',
  dashboard: 'Painel',
  inbox: 'Caixa de Entrada',
  email: 'E-mail',
  agenda: 'Vistoria',
  contacts: 'Contatos',
  pipelines: 'Funil de Vendas',
  'guarda-volume': 'Storage',
  vistoria: 'Vistoria',
};

interface Member {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: AccountRole;
  joined_at: string;
  permissions: Record<string, boolean> | null;
}

interface Invitation {
  id: string;
  role: 'admin' | 'agent' | 'vistoria' | 'viewer';
  label: string | null;
  created_at: string;
  expires_at: string;
}

// Editable roles in the inline dropdown. Owner is never an option —
// promotions go through the (deferred) Transfer Ownership flow.
const EDITABLE_ROLES: { value: AccountRole; label: string; hint: string }[] = [
  { value: 'admin', label: 'Admin', hint: 'Gerenciar membros e todas as configurações' },
  { value: 'agent', label: 'Agente', hint: 'Usar funcionalidades; sem acesso a config' },
  { value: 'vistoria', label: 'Vistoria', hint: 'Criar e gerenciar vistorias; sem acesso a config' },
  { value: 'viewer', label: 'Visualizador', hint: 'Apenas leitura em todo o app' },
];

// Per-role chip metadata (icon / label / colour) lives in the shared
// ROLE_META module so this roster and the Overview identity chip can't
// drift. The colour scale runs amber (owner — scarce, immutable) →
// primary (admin) → muted (agent / viewer).

function fmtDate(iso: string): string {
  // Match the rest of the dashboard's locale-light formatting.
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtExpiresIn(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expirado';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `expira em ${days} dia${days === 1 ? '' : 's'}`;
  const hours = Math.max(1, Math.floor(ms / (60 * 60 * 1000)));
  return `expira em ${hours} hora${hours === 1 ? '' : 's'}`;
}

export function MembersTab() {
  const { user, canManageMembers } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<Member | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<string | null>(
    null,
  );
  const [editingPermissions, setEditingPermissions] = useState<{
    member: Member;
    perms: FeaturePermissions;
    saving: boolean;
  } | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
  const [avatarTargetMember, setAvatarTargetMember] = useState<Member | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [editingEmail, setEditingEmail] = useState<{
    member: Member;
    value: string;
    saving: boolean;
  } | null>(null);

  const [mailboxes, setMailboxes] = useState<{ id: number; title: string; color: string }[]>([]);
  const [agentMailboxes, setAgentMailboxes] = useState<Record<string, number[]>>({});
  const [editingMailboxes, setEditingMailboxes] = useState<{
    member: Member;
    selected: number[];
    saving: boolean;
  } | null>(null);

  const loadEverything = useCallback(async () => {
    try {
      const [mres, ires, mbres, amres] = await Promise.all([
        fetch('/api/account/members', { cache: 'no-store' }),
        canManageMembers
          ? fetch('/api/account/invitations', { cache: 'no-store' })
          : Promise.resolve(null),
        fetch('/api/account/mailboxes', { cache: 'no-store' }).catch(() => null),
        canManageMembers
          ? fetch('/api/account/agent-mailboxes', { cache: 'no-store' }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!mres.ok) {
        const payload = await mres.json().catch(() => ({}));
        toast.error(payload.error || 'Erro ao carregar membros');
        return;
      }
      const mdata = (await mres.json()) as { members: Member[] };
      setMembers(mdata.members);

      if (mbres && mbres.ok) {
        const mbData = await mbres.json() as { mailboxes: { id: number; title: string; color: string }[] };
        setMailboxes(mbData.mailboxes ?? []);
      }

      if (amres && amres.ok) {
        const amData = await amres.json() as { assignments: { user_id: string; mailbox_id: number }[] };
        const grouped: Record<string, number[]> = {};
        for (const a of amData.assignments ?? []) {
          if (!grouped[a.user_id]) grouped[a.user_id] = [];
          grouped[a.user_id].push(a.mailbox_id);
        }
        setAgentMailboxes(grouped);
      }

      if (ires) {
        if (!ires.ok) {
          const payload = await ires.json().catch(() => ({}));
          toast.error(payload.error || 'Erro ao carregar convites');
          return;
        }
        const idata = (await ires.json()) as { invitations: Invitation[] };
        setInvitations(idata.invitations);
      } else {
        setInvitations([]);
      }
    } catch (err) {
      console.error('[MembersTab] load error:', err);
      toast.error('Não foi possível contactar o servidor');
    } finally {
      setLoading(false);
    }
  }, [canManageMembers]);

  useEffect(() => {
    void loadEverything();
  }, [loadEverything]);

  async function handleRoleChange(member: Member, nextRole: AccountRole) {
    if (member.role === nextRole) return;
    // Optimistic update — flip the dropdown immediately so the UI
    // feels snappy. If the server PATCH fails we revert below so
    // the dropdown doesn't lie about the persisted state.
    const previousRole = member.role;
    setPendingMemberAction(member.user_id);
    setMembers((prev) =>
      prev.map((m) =>
        m.user_id === member.user_id ? { ...m, role: nextRole } : m,
      ),
    );
    try {
      const res = await fetch(`/api/account/members/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        // Revert the optimistic flip. The toast on its own wasn't
        // enough — the dropdown was left showing the new role
        // forever, so the next interaction operated on a wrong
        // baseline (re-trying the same change would no-op via the
        // `member.role === nextRole` guard at the top).
        setMembers((prev) =>
          prev.map((m) =>
            m.user_id === member.user_id ? { ...m, role: previousRole } : m,
          ),
        );
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Erro ao atualizar cargo');
        return;
      }
      toast.success(`${member.full_name || 'Membro'} atualizado para ${nextRole}`);
    } catch (err) {
      // Same revert on network failure.
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === member.user_id ? { ...m, role: previousRole } : m,
        ),
      );
      console.error('[MembersTab] role change error:', err);
      toast.error('Não foi possível contactar o servidor');
    } finally {
      setPendingMemberAction(null);
    }
  }

  async function handleRemove() {
    if (!removingMember) return;
    setPendingMemberAction(removingMember.user_id);
    try {
      const res = await fetch(
        `/api/account/members/${removingMember.user_id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Erro ao remover membro');
        return;
      }
      toast.success(`${removingMember.full_name || 'Membro'} removido`);
      setMembers((prev) =>
        prev.filter((m) => m.user_id !== removingMember.user_id),
      );
      setRemovingMember(null);
    } catch (err) {
      console.error('[MembersTab] remove error:', err);
      toast.error('Não foi possível contactar o servidor');
    } finally {
      setPendingMemberAction(null);
    }
  }

  async function handlePermissionsUpdate() {
    if (!editingPermissions) return;
    setEditingPermissions((prev) => prev ? { ...prev, saving: true } : null);
    try {
      const res = await fetch(
        `/api/account/members/${editingPermissions.member.user_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: editingPermissions.perms }),
        },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Erro ao atualizar permissões');
        return;
      }
      toast.success('Permissões atualizadas');
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === editingPermissions.member.user_id
            ? { ...m, permissions: { ...editingPermissions.perms } }
            : m,
        ),
      );
      setEditingPermissions(null);
    } catch (err) {
      console.error('[MembersTab] permissions update error:', err);
      toast.error('Não foi possível contactar o servidor');
    }
  }

  async function handleMailboxUpdate() {
    if (!editingMailboxes) return;
    setEditingMailboxes((prev) => prev ? { ...prev, saving: true } : null);
    try {
      const res = await fetch('/api/account/agent-mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: editingMailboxes.member.user_id,
          mailbox_ids: editingMailboxes.selected,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Erro ao atribuir caixas');
        return;
      }
      toast.success('Caixas de e-mail atualizadas');
      setAgentMailboxes((prev) => ({
        ...prev,
        [editingMailboxes.member.user_id]: [...editingMailboxes.selected],
      }));
      setEditingMailboxes(null);
    } catch (err) {
      console.error('[MembersTab] mailbox update error:', err);
      toast.error('Não foi possível contactar o servidor');
    }
  }

  async function handleRevoke(invite: Invitation) {
    try {
      const res = await fetch(`/api/account/invitations/${invite.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Erro ao revogar convite');
        return;
      }
      toast.success('Convite revogado');
      setInvitations((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      console.error('[MembersTab] revoke error:', err);
      toast.error('Não foi possível contactar o servidor');
    }
  }

  function handleAvatarPick(member: Member) {
    setAvatarTargetMember(member);
    avatarFileInputRef.current?.click();
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !avatarTargetMember) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter menos de 2 MB');
      return;
    }

    setUploadingAvatar(avatarTargetMember.user_id);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const res = await fetch(`/api/account/members/${avatarTargetMember.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: base64 }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Erro ao atualizar foto');
        return;
      }

      const data = await res.json() as { avatar_url: string | null };
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === avatarTargetMember.user_id
            ? { ...m, avatar_url: data.avatar_url }
            : m,
        ),
      );
      toast.success('Foto atualizada');
    } catch (err) {
      console.error('[MembersTab] avatar upload error:', err);
      toast.error('Não foi possível contactar o servidor');
    } finally {
      setUploadingAvatar(null);
      setAvatarTargetMember(null);
    }
  }

  function handleAvatarClick(member: Member) {
    if (!canManageMembers || member.role === 'owner' || member.user_id === user?.id) return;
    handleAvatarPick(member);
  }

  async function handleEmailUpdate() {
    if (!editingEmail) return;
    setEditingEmail((prev) => prev ? { ...prev, saving: true } : null);
    try {
      const res = await fetch(
        `/api/account/members/${editingEmail.member.user_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: editingEmail.value }),
        },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Erro ao atualizar e-mail');
        return;
      }
      toast.success('E-mail atualizado');
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === editingEmail.member.user_id
            ? { ...m, email: editingEmail.value }
            : m,
        ),
      );
      setEditingEmail(null);
    } catch (err) {
      console.error('[MembersTab] email update error:', err);
      toast.error('Não foi possível contactar o servidor');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="animate-in fade-in-50 space-y-6 duration-200">
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarUpload}
      />
      <SettingsPanelHead
        title="Membros da equipe"
        description="Pessoas com acesso a esta conta. Os cargos controlam o que cada membro pode fazer."
        action={
          <RequireRole min="admin">
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="size-4" />
              Adicionar agente
            </Button>
          </RequireRole>
        }
      />

      {/* Roster */}
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const roleMeta = ROLE_META[member.role];
              const RoleIcon = roleMeta.icon;
              const isSelf = member.user_id === user?.id;
              const isOwnerRow = member.role === 'owner';
              const isBusy = pendingMemberAction === member.user_id;

              return (
                <li
                  key={member.user_id}
                  // Mobile: stack identity (avatar+name+email) above the
                  // role/remove actions so the role dropdown's fixed
                  // 128px width doesn't force the name into a 50-pixel
                  // truncation. Desktop (sm+): everything inline as
                  // before.
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="group relative shrink-0">
                        <Avatar className="size-9">
                          {member.avatar_url ? (
                            <AvatarImage
                              src={member.avatar_url}
                              alt={member.full_name || 'Membro'}
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                            {(member.full_name || member.email || 'U')
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {canManageMembers && !isOwnerRow && !isSelf && (
                          <button
                            type="button"
                            onClick={() => handleAvatarPick(member)}
                            disabled={uploadingAvatar === member.user_id}
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100 disabled:opacity-100 group-hover:opacity-60"
                            title="Alterar foto"
                          >
                            {uploadingAvatar === member.user_id ? (
                              <Loader2 className="size-4 animate-spin text-white" />
                            ) : (
                              <Camera className="size-4 text-white" />
                            )}
                          </button>
                        )}
                      </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {member.full_name || 'Sem nome'}
                        </span>
                        {isSelf && (
                          <Badge className="bg-muted text-muted-foreground border-border text-[10px] uppercase tracking-wide">
                            Você
                          </Badge>
                        )}
                      </div>
                      {member.email && (
                        <div className="flex items-center gap-1">
                          <p className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </p>
                          {canManageMembers && !isOwnerRow && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingEmail({
                                  member,
                                  value: member.email || '',
                                  saving: false,
                                })
                              }
                              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                              title="Editar e-mail"
                            >
                              <Pencil className="size-3" />
                            </button>
                          )}
                        </div>
                      )}
                      {agentMailboxes[member.user_id]?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {agentMailboxes[member.user_id].map((mid) => {
                            const mb = mailboxes.find((m) => m.id === mid);
                            if (!mb) return null;
                            return (
                              <span
                                key={mid}
                                className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                              >
                                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: mb.color }} />
                                {mb.title}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Joined date stays desktop-only. The mobile row's
                      vertical density makes the joined date noise. */}
                  <div className="hidden sm:block text-right text-xs text-muted-foreground">
                    Entrou em {fmtDate(member.joined_at)}
                  </div>

                  {/* Actions cluster. On mobile this is its own row
                      below the identity block; on desktop it sits
                      inline. Items align to the start on mobile so the
                      role dropdown lines up under the avatar. */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Role display / editor. Inline Select is admin+
                        only AND not allowed on the owner row (owner
                        changes go through transfer, which lands later). */}
                    {canManageMembers && !isOwnerRow && !isSelf ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          // Base UI Select can emit null on clear. We
                          // don't expose a clear affordance, so the
                          // guard is defensive — but the typed
                          // signature requires it.
                          v && handleRoleChange(member, v as AccountRole)
                        }
                      >
                        <SelectTrigger
                          className="w-32 bg-muted border-border text-foreground"
                          disabled={isBusy}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EDITABLE_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${roleMeta.className}`}
                      >
                        <RoleIcon className="size-3.5" />
                        {roleMeta.label}
                      </span>
                    )}

                    {/* Remove. Admin+ only; never on the owner row;
                        never on yourself. Pre-polish styling was
                        neutral-default + red-on-hover — the
                        destructive intent was invisible until the
                        user moused over. Now red is the default
                        state with a darker shade on hover so the
                        affordance reads at-a-glance. */}
                    {canManageMembers && !isOwnerRow && !isSelf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRemovingMember(member)}
                        disabled={isBusy}
                        className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/60 hover:text-red-200"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}

                    {/* Permissions button — only for non-admin members */}
                    {canManageMembers && !isOwnerRow && !isSelf && member.role !== 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditingPermissions({
                            member,
                            perms: {
                              broadcasts: member.permissions?.broadcasts ?? false,
                              automations: member.permissions?.automations ?? false,
                              flows: member.permissions?.flows ?? false,
                              pedidos: member.permissions?.pedidos ?? false,
                              pagamentos: member.permissions?.pagamentos ?? false,
                              assinaturas: member.permissions?.assinaturas ?? false,
                              inventario: member.permissions?.inventario ?? false,
                              dashboard: member.permissions?.dashboard ?? false,
                              inbox: member.permissions?.inbox ?? false,
                              email: member.permissions?.email ?? false,
                              agenda: member.permissions?.agenda ?? false,
                              contacts: member.permissions?.contacts ?? false,
                              pipelines: member.permissions?.pipelines ?? false,
                              'guarda-volume': member.permissions?.['guarda-volume'] ?? false,
                              vistoria: member.permissions?.vistoria ?? false,
                            },
                            saving: false,
                          })
                        }
                        className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60"
                        title="Editar permissões"
                      >
                        <CheckSquare className="size-4" />
                      </Button>
                    )}

                    {/* Mailbox assignment button — admin+ only; never owner */}
                    {canManageMembers && !isOwnerRow && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditingMailboxes({
                            member,
                            selected: [...(agentMailboxes[member.user_id] ?? [])],
                            saving: false,
                          })
                        }
                        className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60"
                        title="Atribuir caixas de e-mail"
                      >
                        <Mail className="size-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Pending invitations — admin+ only */}
      <RequireRole min="admin">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <UsersRound className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Convites pendentes
            </h3>
            <Badge className="bg-muted text-muted-foreground border-border">
              {invitations.length}
            </Badge>
          </div>
          {/* P10 — make the no-resend design explicit. Admins were
              confused why the pending list shows roles + expiry but
              no "copy link again" button. Stating the constraint up
              front (rather than letting the user discover it by
              looking for a button) keeps it from feeling like a bug. */}
          {invitations.length > 0 ? (
            <p className="mb-3 text-xs text-muted-foreground">
              A URL do convite é mostrada apenas uma vez por segurança —
              para reenviar, revogue o convite abaixo e crie um novo.
            </p>
          ) : null}

          {invitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="size-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhum convite pendente.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Clique em <span className="text-muted-foreground">Adicionar agente</span>{' '}
                  acima para gerar um link.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {invitations.map((inv) => {
                    const inviteRoleMeta = ROLE_META[inv.role];
                    const InviteRoleIcon = inviteRoleMeta.icon;
                    return (
                    <li
                      key={inv.id}
                      className="flex items-center gap-4 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {inv.label || 'Convite sem título'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${inviteRoleMeta.className}`}
                          >
                            <InviteRoleIcon className="size-3" />
                            {inviteRoleMeta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Criado em {fmtDate(inv.created_at)} · {fmtExpiresIn(inv.expires_at)}
                        </p>
                      </div>

                      {/* Revoke: red default state, mirrors the
                          members-tab Remove button. Pre-polish version
                          read as a neutral secondary button until
                          hover. */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevoke(inv)}
                        className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/60 hover:text-red-200"
                      >
                        <MailX className="size-4" />
                        Revogar
                      </Button>
                    </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </RequireRole>

      <CreateAgentDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onCreated={loadEverything}
      />

      <Dialog
        open={removingMember !== null}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null);
        }}
      >
        <DialogContent className="bg-popover border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-popover-foreground">
              <AlertTriangle className="size-4 text-amber-400" />
              Remover membro
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Remover{' '}
              <span className="font-medium text-muted-foreground">
                {removingMember?.full_name || 'este membro'}
              </span>{' '}
              da conta? Ele será desconectado desta conta e receberá
              uma nova conta pessoal no próximo login. O login não é excluído.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-popover border-border">
            <Button
              variant="outline"
              onClick={() => setRemovingMember(null)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRemove}
              disabled={!!pendingMemberAction}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {pendingMemberAction ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover membro'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions dialog */}
      <Dialog
        open={editingPermissions !== null}
        onOpenChange={(open) => {
          if (!open) setEditingPermissions(null);
        }}
      >
        <DialogContent className="bg-popover border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-popover-foreground">
              <CheckSquare className="size-4 text-primary" />
              Permissões para {editingPermissions?.member.full_name || 'membro'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Ative as funcionalidades que este membro pode acessar. As alterações entram em vigor imediatamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {FEATURE_PERMISSIONS.map((key) => {
              const checked = editingPermissions?.perms[key] ?? false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setEditingPermissions((prev) =>
                      prev
                        ? { ...prev, perms: { ...prev.perms, [key]: !checked } }
                        : null,
                    )
                  }
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-card-2"
                >
                  {checked ? (
                    <CheckSquare className="size-5 shrink-0 text-primary" />
                  ) : (
                    <Square className="size-5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {PERMISSION_LABELS[key]}
                  </span>
                </button>
              );
            })}
          </div>

          <DialogFooter className="bg-popover border-border">
            <Button
              variant="outline"
              onClick={() => setEditingPermissions(null)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePermissionsUpdate}
              disabled={editingPermissions?.saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingPermissions?.saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar permissões'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mailbox assignment dialog */}
      <Dialog
        open={editingMailboxes !== null}
        onOpenChange={(open) => {
          if (!open) setEditingMailboxes(null);
        }}
      >
        <DialogContent className="bg-popover border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-popover-foreground">
              <Mail className="size-4 text-amber-400" />
              Caixas de e-mail — {editingMailboxes?.member.full_name || 'membro'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecione as caixas de e-mail que este agente pode usar para enviar mensagens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2 max-h-60 overflow-y-auto">
            {mailboxes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma caixa de e-mail disponível.</p>
            ) : (
              mailboxes.map((mb) => {
                const checked = editingMailboxes?.selected.includes(mb.id) ?? false;
                return (
                  <button
                    key={mb.id}
                    type="button"
                    onClick={() =>
                      setEditingMailboxes((prev) =>
                        prev
                          ? {
                              ...prev,
                              selected: checked
                                ? prev.selected.filter((id) => id !== mb.id)
                                : [...prev.selected, mb.id],
                            }
                          : null,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-card-2"
                  >
                    {checked ? (
                      <CheckSquare className="size-5 shrink-0 text-primary" />
                    ) : (
                      <Square className="size-5 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: mb.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{mb.title}</span>
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter className="bg-popover border-border">
            <Button
              variant="outline"
              onClick={() => setEditingMailboxes(null)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMailboxUpdate}
              disabled={editingMailboxes?.saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingMailboxes?.saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar atribuição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit email dialog */}
      <Dialog
        open={editingEmail !== null}
        onOpenChange={(open) => {
          if (!open) setEditingEmail(null);
        }}
      >
        <DialogContent className="bg-popover border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-popover-foreground">
              <Pencil className="size-4 text-primary" />
              Editar e-mail
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Altere o e-mail de <span className="font-medium text-muted-foreground">{editingEmail?.member.full_name || 'membro'}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              type="email"
              value={editingEmail?.value ?? ''}
              onChange={(e) =>
                setEditingEmail((prev) =>
                  prev ? { ...prev, value: e.target.value } : null,
                )
              }
              placeholder="novo@email.com"
              autoFocus
            />
          </div>

          <DialogFooter className="bg-popover border-border">
            <Button
              variant="outline"
              onClick={() => setEditingEmail(null)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEmailUpdate}
              disabled={editingEmail?.saving || !editingEmail?.value}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingEmail?.saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar e-mail'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
