"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES } from "@/lib/currency";
import type {
  Contact,
  Conversation,
  Deal,
  DealStatus,
  PipelineStage,
  Profile,
} from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  X,
  Trash2,
  MessageSquare,
  DollarSign,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  pipelineId: string;
  stages: PipelineStage[];
  defaultStageId?: string;
  onSaved: () => void;
}

export function DealForm({
  open,
  onOpenChange,
  deal,
  pipelineId,
  stages,
  defaultStageId,
  onSaved,
}: DealFormProps) {
  const supabase = createClient();
  const { accountId, defaultCurrency } = useAuth();

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [contactId, setContactId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactDocument, setContactDocument] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [stageId, setStageId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [originAddress, setOriginAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [linkedConversation, setLinkedConversation] =
    useState<Conversation | null>(null);

  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<DealStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset the form fields every time the sheet opens or its input
  // props change. This is a legitimate prop-driven sync; the rule is
  // over-cautious here, hence the block-level disable.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (deal) {
      setTitle(deal.title);
      setValue(String(deal.value ?? ""));
      setCurrency(deal.currency || defaultCurrency);
      // contact_id is nullable when the contact has been deleted
      // (migration 004: ON DELETE SET NULL). "" means "no selection".
      setContactId(deal.contact_id ?? "");
      setContactName(deal.contact?.name ?? "");
      setContactDocument(deal.contact?.document ?? "");
      setContactPhone(deal.contact?.phone ?? "");
      setContactEmail(deal.contact?.email ?? "");
      setContactCompany(deal.contact?.company ?? "");
      setContactSearch(deal.contact?.name ?? "");
      setStageId(deal.stage_id);
      setAssignedTo(deal.assigned_to ?? "");
      setExpectedCloseDate(deal.expected_close_date ?? "");
      setEndDate(deal.end_date ?? "");
      setPropertyType(deal.property_type ?? "");
      setOriginAddress(deal.origin_address ?? "");
      setDestinationAddress(deal.destination_address ?? "");
      setNotes(deal.notes ?? "");
    } else {
      setTitle("");
      setValue("");
      setCurrency(defaultCurrency);
      setContactId("");
      setContactName("");
      setContactDocument("");
      setContactPhone("");
      setContactEmail("");
      setContactCompany("");
      setContactSearch("");
      setStageId(defaultStageId || stages[0]?.id || "");
      setAssignedTo("");
      setExpectedCloseDate("");
      setEndDate("");
      setPropertyType("");
      setOriginAddress("");
      setDestinationAddress("");
      setNotes("");
    }
  }, [open, deal, defaultStageId, stages, defaultCurrency]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load supporting data once the sheet is open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("contacts").select("*").order("name"),
        supabase.from("profiles").select("*").order("full_name"),
      ]);
      if (cancelled) return;
      setContacts((c.data ?? []) as Contact[]);
      setProfiles((p.data ?? []) as Profile[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  // Fetch linked conversation for the selected contact (newest open one).
  // Clearing on no-selection is sync with prop state; the populated
  // case runs setLinkedConversation inside the async fetch callback.
  useEffect(() => {
    if (!open || !contactId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinkedConversation(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contactId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setLinkedConversation((data as Conversation | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, contactId, supabase]);

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function handleSave() {
    if (!title.trim() || !contactPhone.trim() || !stageId) {
      toast.error("Serviço, telefone e estágio são obrigatórios");
      return;
    }
    setSaving(true);

    // Save/update contact data first
    const contactPayload = {
      name: contactName.trim() || null,
      phone: contactPhone.trim(),
      document: contactDocument.trim() || null,
      email: contactEmail.trim() || null,
      company: contactCompany.trim() || null,
    };

    if (contactId) {
      const { error: contactError } = await supabase
        .from("contacts")
        .update({ ...contactPayload, updated_at: new Date().toISOString() })
        .eq("id", contactId);
      if (contactError) {
        toast.error("Falha ao salvar contato");
        setSaving(false);
        return;
      }
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !accountId) {
        toast.error("Não autenticado");
        setSaving(false);
        return;
      }
      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert({ ...contactPayload, user_id: user.id, account_id: accountId })
        .select("id")
        .single();
      if (contactError) {
        toast.error("Falha ao criar contato");
        setSaving(false);
        return;
      }
      setContactId(newContact.id);
    }

    const payload = {
      title: title.trim(),
      value: parseFloat(value) || 0,
      currency,
      contact_id: contactId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      assigned_to: assignedTo || null,
      notes: notes.trim() || null,
      expected_close_date: expectedCloseDate || null,
      end_date: endDate || null,
      property_type: propertyType || null,
      origin_address: originAddress.trim() || null,
      destination_address: destinationAddress.trim() || null,
    };

    if (deal) {
      await supabase
        .from("deals")
        .update(payload)
        .eq("id", deal.id);
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        toast.error("Não está logado");
        setSaving(false);
        return;
      }
      if (!accountId) {
        toast.error("Seu perfil não está vinculado a uma conta.");
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("deals")
        .insert({ ...payload, user_id: user.id, account_id: accountId, status: "open" });
      if (error) {
        toast.error("Falha ao criar negócio");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast.success(deal ? "Negócio atualizado" : "Negócio criado");
    onOpenChange(false);
    onSaved();
  }

  async function handleStatusChange(status: DealStatus) {
    if (!deal) return;
    setStatusAction(status);
    const { error } = await supabase
      .from("deals")
      .update({ status })
      .eq("id", deal.id);
    setStatusAction(null);
    if (error) {
      toast.error("Falha ao atualizar status do negócio");
      return;
    }
    toast.success(
      status === "won" ? "Marcado como ganho" : status === "lost" ? "Marcado como perdido" : "Negócio reaberto",
    );
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!deal) return;
    setDeleting(true);
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    setDeleting(false);
    if (error) {
      toast.error("Falha ao excluir negócio");
      return;
    }
    toast.success("Negócio excluído");
    setConfirmDelete(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-popover border-border text-popover-foreground sm:max-w-lg w-full p-0"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/50 p-4">
            <SheetTitle className="text-popover-foreground">
              {deal ? "Editar Negócio" : "Tipo de Serviços"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Serviços</Label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Selecione um tipo de serviço</option>
                <option value="Mudança residencial">Mudança residencial</option>
                <option value="Mudança Comercial">Mudança Comercial</option>
                <option value="Mudança Iterestadual">Mudança Iterestadual</option>
                <option value="Içamento">Içamento</option>
                <option value="Guarda Volume">Guarda Volume</option>
                <option value="Transportes de Cargas">Transportes de Cargas</option>
                <option value="Montagem + Desmontagem">Montagem + Desmontagem</option>
                <option value="Montagem">Montagem</option>
                <option value="Desmontagem">Desmontagem</option>
                <option value="armazenamento">armazenamento</option>
                <option value="Transporte">Transporte</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Buscar contato existente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value)
                    setContactDropdownOpen(true)
                    if (!e.target.value) {
                      setContactId("")
                      setContactName("")
                      setContactDocument("")
                      setContactPhone("")
                      setContactEmail("")
                      setContactCompany("")
                    }
                  }}
                  onFocus={() => setContactDropdownOpen(true)}
                  placeholder="Pesquisar por nome ou telefone..."
                  className="h-9 w-full rounded-lg border border-border bg-muted pl-9 pr-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {contactDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setContactDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                      {(() => {
                        const filteredContacts = contactSearch.trim()
                          ? contacts.filter(c =>
                              (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
                              (c.phone || '').toLowerCase().includes(contactSearch.toLowerCase())
                            )
                          : contacts;
                        if (filteredContacts.length === 0) {
                          return (
                            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                              Nenhum contato encontrado
                            </div>
                          );
                        }
                        return filteredContacts.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setContactId(c.id)
                              setContactName(c.name || "")
                              setContactDocument(c.document || "")
                              setContactPhone(c.phone || "")
                              setContactEmail(c.email || "")
                              setContactCompany(c.company || "")
                              setContactSearch(c.name || c.phone || "")
                              setContactDropdownOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${
                              c.id === contactId ? 'bg-primary/10' : ''
                            }`}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                              {(c.name || c.phone || '?').charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground/80">
                                {c.name || 'Sem nome'}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground/60">
                                {[c.phone, c.email, c.company].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="df-name" className="text-muted-foreground">Nome</Label>
              <Input
                id="df-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nome do contato"
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="df-document" className="text-muted-foreground">CNPJ</Label>
              <Input
                id="df-document"
                value={contactDocument}
                onChange={(e) => setContactDocument(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="df-phone" className="text-muted-foreground">Telefone</Label>
              <Input
                id="df-phone"
                value={formatPhone(contactPhone)}
                onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="(11) 99999-9999"
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="df-email" className="text-muted-foreground">E-mail</Label>
              <Input
                id="df-email"
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value)
                  setContactId("")
                  setContactSearch("")
                }}
                placeholder="email@exemplo.com"
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="df-company" className="text-muted-foreground">Empresa</Label>
              <Input
                id="df-company"
                value={contactCompany}
                onChange={(e) => {
                  setContactCompany(e.target.value)
                  setContactId("")
                  setContactSearch("")
                }}
                placeholder="Empresa Ltda."
                className="border-border bg-muted text-foreground"
              />
            </div>

            {linkedConversation && (
                <Link
                  href="/inbox"
                  className="mt-1 inline-flex items-center gap-1.5 self-start rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
                >
                  <MessageSquare className="h-3 w-3" />
                  Vincular à Conversa
                </Link>
              )}

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Endereço de origem</Label>
              <Input
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade"
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Endereço de destino</Label>
              <Input
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade"
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Valor</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className="border-border bg-muted pl-7 text-foreground"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Data de início</Label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Data término</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-border bg-muted text-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Tipo de imóvel</Label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Selecione...</option>
                <option value="Residencia terrea">Residencia terrea</option>
                <option value="Apto c/ Elevador">Apto c/ Elevador</option>
                <option value="apto s/ elevador">apto s/ elevador</option>
                <option value="galpao">galpao</option>
                <option value="industria">industria</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Estágio</Label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Responsável</Label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Não atribuído</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicionar observações..."
                className="min-h-[100px] border-border bg-muted text-foreground"
              />
            </div>

            {deal && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Situação
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => handleStatusChange("won")}
                    disabled={!!statusAction || deal.status === "won"}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {statusAction === "won" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        Marcar como Ganho
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleStatusChange("lost")}
                    disabled={!!statusAction || deal.status === "lost"}
                    className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {statusAction === "lost" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="mr-1 h-4 w-4" />
                        Marcar como Perdido
                      </>
                    )}
                  </Button>
                </div>
                {deal.status && deal.status !== "open" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleStatusChange("open")}
                    disabled={!!statusAction}
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    Reabrir negócio
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border/50 bg-popover/80 p-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-border bg-transparent text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !title.trim() || !contactPhone.trim() || !stageId}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? "Salvando..." : deal ? "Salvar Alterações" : "Criar Negócio"}
              </Button>
            </div>

            {deal &&
              (confirmDelete ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs">
                  <span className="text-red-300">Excluir este negócio?</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="rounded px-2 py-1 text-muted-foreground hover:bg-muted"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? "Excluindo..." : "Confirmar"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  Excluir Negócio
                </button>
              ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
