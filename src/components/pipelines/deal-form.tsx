"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  MapPin,
} from "lucide-react";
import { ServiceSelector } from "@/components/ui/service-selector";
import { parseServices, servicesToString } from "@/lib/services";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const MapPopup = dynamic(() => import("./map-popup").then((m) => m.MapPopup), { ssr: false });

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  pipelineId: string;
  stages: PipelineStage[];
  defaultStageId?: string;
  onSaved: () => void;
  dismissible?: boolean;
  initialContact?: Contact | null;
  conversationId?: string;
  hideOverlay?: boolean;
  inline?: boolean;
}

export function DealForm({
  open,
  onOpenChange,
  deal,
  pipelineId,
  stages,
  defaultStageId: defaultStageIdProp,
  onSaved,
  dismissible = true,
  initialContact,
  conversationId,
  hideOverlay,
  inline,
}: DealFormProps) {
  const supabase = createClient();
  const { accountId, defaultCurrency } = useAuth();

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
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
  const [boxNumber, setBoxNumber] = useState("");
  const [originAddress, setOriginAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [showOriginMap, setShowOriginMap] = useState(false);
  const [showDestMap, setShowDestMap] = useState(false);
  const [notes, setNotes] = useState("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [linkedConversation, setLinkedConversation] =
    useState<Conversation | null>(null);

  const [saving, setSaving] = useState(false);
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const lastCnpjRef = useRef('');
  const [statusAction, setStatusAction] = useState<DealStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const formMode = selectedServices.includes("Storage") ? "guarda-volume" : "lead";

  const [hasVistoria, setHasVistoria] = useState(false);
  const [vistoriaList, setVistoriaList] = useState<any[]>([]);
  const [selectedVistoriaId, setSelectedVistoriaId] = useState("");
  const [vistoriaLoading, setVistoriaLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  // Reset the form fields every time the sheet opens or its input
  // props change. This is a legitimate prop-driven sync; the rule is
  // over-cautious here, hence the block-level disable.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (deal) {
      setSelectedServices(parseServices(deal.title));
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
      setBoxNumber(deal.property_type ?? "");
      setOriginAddress(deal.origin_address ?? "");
      setDestinationAddress(deal.destination_address ?? "");
      setNotes(deal.notes ?? "");
      setHasVistoria(!!deal.vistoria_id);
      setSelectedVistoriaId(deal.vistoria_id ?? "");
    } else {
      setSelectedServices([]);
      setValue("");
      setCurrency(defaultCurrency);
      setContactId(initialContact?.id ?? "");
      setContactName(initialContact?.name ?? "");
      setContactDocument(initialContact?.document ?? "");
      setContactPhone(initialContact?.phone ?? "");
      setContactEmail(initialContact?.email ?? "");
      setContactCompany(initialContact?.company ?? "");
      setContactSearch(initialContact?.name ?? "");
      setStageId(defaultStageIdProp || stages[0]?.id || "");
      setAssignedTo("");
      setExpectedCloseDate("");
      setEndDate("");
      setPropertyType("");
      setBoxNumber("");
      setOriginAddress("");
      setDestinationAddress("");
      setNotes("");
      setHasVistoria(false);
      setSelectedVistoriaId("");
      setVistoriaList([]);
    }
  }, [open, deal, defaultStageIdProp, stages, defaultCurrency, initialContact]);
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

  const qualifyingServices = ["Mudança residencial", "Mudança Comercial", "Mudança Iterestadual", "Storage"];

  useEffect(() => {
    const isQualifying = selectedServices.some(s => qualifyingServices.includes(s));
    if (!open || !isQualifying) {
      setVistoriaList([]);
      setSelectedVistoriaId("");
      setHasVistoria(false);
      return;
    }
    if (!hasVistoria) {
      setVistoriaList([]);
      setSelectedVistoriaId("");
      return;
    }
    let cancelled = false;
    setVistoriaLoading(true);
    (async () => {
      const nameFilter = contactName.trim();
      if (!contactId && !nameFilter) {
        setVistoriaList([]);
        setVistoriaLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams();
        if (contactId) params.set("contact_id", contactId);
        if (nameFilter) params.set("contact_name", nameFilter);
        const res = await fetch(`/api/vistoria/search?${params.toString()}`);
        if (!res.ok) {
          setVistoriaList([]);
          setVistoriaLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setVistoriaList(data ?? []);
      } catch {
        setVistoriaList([]);
      } finally {
        setVistoriaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, contactId, contactName, selectedServices, hasVistoria]);

  const fetchCnpjData = useCallback(async (cnpjDigits: string) => {
    if (lastCnpjRef.current === cnpjDigits) return;
    lastCnpjRef.current = cnpjDigits;
    setFetchingCnpj(true);
    try {
      const res = await fetch(`/api/cnpj/lookup?cnpj=${cnpjDigits}`);
      if (!res.ok) {
        const err = await res.json();
        if (res.status !== 404) toast.error(err.error || 'Erro ao consultar CNPJ');
        return;
      }
      const data = await res.json();
      setContactName(prev => data.name || prev || '');
      setContactEmail(prev => data.email || prev || '');
      setContactPhone(prev => data.phone ? data.phone.replace(/\D/g, '') : prev || '');
      setContactCompany(prev => data.name || prev || '');
      setOriginAddress(prev => data.address || prev || '');
    } catch {
      toast.error('Erro ao consultar CNPJ');
    } finally {
      setFetchingCnpj(false);
    }
  }, []);

  useEffect(() => {
    if (deal) return;
    const digits = contactDocument.replace(/\D/g, '');
    if (digits.length === 14) {
      fetchCnpjData(digits);
    }
  }, [contactDocument, fetchCnpjData, deal]);

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

  function formatDocument(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
        .slice(0, 14);
    }
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
      .slice(0, 18);
  }

  async function handleSave() {
    if (selectedServices.length === 0 || !contactPhone.trim() || !stageId) {
      toast.error("Serviço, telefone e estágio são obrigatórios");
      return;
    }
    setSaving(true);

    // Save/update contact data first
    let resolvedContactId = contactId;
    const contactPayload = {
      name: contactName.trim() || null,
      phone: contactPhone.trim(),
      document: contactDocument.trim() || null,
      email: contactEmail.trim() || null,
      company: contactCompany.trim() || null,
    };

    if (resolvedContactId) {
      const { error: contactError } = await supabase
        .from("contacts")
        .update({ ...contactPayload, updated_at: new Date().toISOString() })
        .eq("id", resolvedContactId);
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
        .maybeSingle();
      if (contactError && contactError.code === "23505") {
        // Contact with this phone already exists — find it
        const normalizedPhone = contactPhone.replace(/\D/g, '');
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("account_id", accountId)
          .eq("phone_normalized", normalizedPhone)
          .maybeSingle();
        if (existing) {
          resolvedContactId = existing.id;
          setContactId(resolvedContactId);
        } else {
          console.error("Erro ao criar contato:", contactError);
          toast.error("Falha ao criar contato");
          setSaving(false);
          return;
        }
      } else if (contactError) {
        console.error("Erro ao criar contato:", contactError);
        toast.error("Falha ao criar contato");
        setSaving(false);
        return;
      } else {
        resolvedContactId = newContact!.id;
        setContactId(resolvedContactId);
      }
    }

    const payload = {
      title: servicesToString(selectedServices),
      value: parseFloat(value) || 0,
      currency,
      contact_id: resolvedContactId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      assigned_to: assignedTo || null,
      notes: notes.trim() || null,
      expected_close_date: expectedCloseDate || null,
      end_date: endDate || null,
      property_type: formMode === "guarda-volume" ? boxNumber.trim() || null : propertyType.trim() || null,
      origin_address: originAddress.trim() || null,
      destination_address: destinationAddress.trim() || null,
      conversation_id: conversationId || null,
      vistoria_id: hasVistoria && selectedVistoriaId ? selectedVistoriaId : null,
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
      const insertPayload = { ...payload, user_id: user.id, account_id: accountId, status: "open" };
      console.log("Insert deal payload:", JSON.stringify(insertPayload));
      const { error: insertError } = await supabase
        .from("deals")
        .insert(insertPayload);
      if (insertError) {
        console.error("Erro ao inserir deal:", insertError);
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

  const formContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <h2 className="text-base font-medium text-popover-foreground">
          {deal ? (formMode === "guarda-volume" ? "Editar Contrato" : "Editar Lead") : (formMode === "guarda-volume" ? "Novo Contrato Storage" : "Novo Lead")}
        </h2>
        {inline && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Serviços</Label>
              <ServiceSelector
                value={selectedServices}
                onChange={setSelectedServices}
              />
            </div>

            {formMode === "guarda-volume" && (
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Número do Box</Label>
                <Input
                  value={boxNumber}
                  onChange={(e) => setBoxNumber(e.target.value)}
                  placeholder="Ex: 03"
                />
              </div>
            )}

            {qualifyingServices.some(s => selectedServices.includes(s)) && (
              <div className="grid gap-2 rounded-md border border-border p-3">
                <Label className="text-muted-foreground">Tem vistoria?</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={hasVistoria ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHasVistoria(true)}
                    className="flex-1"
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={!hasVistoria ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setHasVistoria(false); setSelectedVistoriaId(""); setVistoriaList([]); }}
                    className="flex-1"
                  >
                    Não
                  </Button>
                </div>
                {hasVistoria && (
                  <div className="space-y-2 mt-1">
                    {vistoriaLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Buscando vistorias...
                      </div>
                    ) : vistoriaList.length === 0 && !selectedVistoriaId ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Nenhuma vistoria encontrada para este contato.</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const params = new URLSearchParams();
                            if (contactId) params.set("contact_id", contactId);
                            if (contactName.trim()) params.set("contact_name", contactName.trim());
                            if (contactPhone.trim()) params.set("contact_phone", contactPhone.trim());
                            router.push(`/vistoria?${params.toString()}`);
                          }}
                        >
                          Criar nova vistoria
                        </Button>
                      </div>
                    ) : (
                      <>
                        {vistoriaList.length > 0 ? (
                          <select
                            value={selectedVistoriaId}
                            onChange={(e) => setSelectedVistoriaId(e.target.value)}
                            className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                          >
                            <option value="">Selecione uma vistoria...</option>
                            {vistoriaList.map((v: any) => (
                            <option key={v.id} value={v.id}>
                              {v.data_vistoria} — {Number(v.total_cubagem).toFixed(3)} m³
                            </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs text-muted-foreground">Vistoria vinculada a este negócio.</p>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs text-muted-foreground"
                          onClick={() => {
                            const params = new URLSearchParams();
                            if (contactId) params.set("contact_id", contactId);
                            if (contactName.trim()) params.set("contact_name", contactName.trim());
                            if (contactPhone.trim()) params.set("contact_phone", contactPhone.trim());
                            router.push(`/vistoria?${params.toString()}`);
                          }}
                        >
                          + Criar nova vistoria
                        </Button>
                      </>
                    )}
                    {selectedVistoriaId && (() => {
                      const v = vistoriaList.find((x: any) => x.id === selectedVistoriaId);
                      if (!v) return null;
                      return (
                        <div className="rounded-md border border-border bg-muted/50 p-2 text-xs space-y-1">
                          <p><span className="text-muted-foreground">Data:</span> {v.data_vistoria}</p>
                          <p><span className="text-muted-foreground">Cubagem total:</span> {Number(v.total_cubagem).toFixed(3)} m³</p>
                          <p><span className="text-muted-foreground">Vistoriador:</span> —</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

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
              <Label htmlFor="df-document" className="text-muted-foreground">CPF / CNPJ</Label>
              <div className="relative">
                <Input
                  id="df-document"
                  value={formatDocument(contactDocument)}
                  onChange={(e) => setContactDocument(e.target.value.replace(/\D/g, ''))}
                  placeholder="Informe"
                  className="border-border bg-muted text-foreground"
                />
                {fetchingCnpj && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
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
              <div className="relative">
                <Input
                  value={originAddress}
                  onChange={(e) => setOriginAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                  className="border-border bg-muted text-foreground pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowOriginMap(true)}
                  disabled={!originAddress.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Ver no mapa"
                >
                  <MapPin className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">Endereço de destino</Label>
              <div className="relative">
                <Input
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                  className="border-border bg-muted text-foreground pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowDestMap(true)}
                  disabled={!destinationAddress.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Ver no mapa"
                >
                  <MapPin className="size-3.5" />
                </button>
              </div>
            </div>

            <MapPopup
              open={showOriginMap}
              onOpenChange={setShowOriginMap}
              address={originAddress}
              label="Endereço de origem"
            />
            <MapPopup
              open={showDestMap}
              onOpenChange={setShowDestMap}
              address={destinationAddress}
              label="Endereço de destino"
            />

            <div className="grid gap-2">
              <Label className="text-muted-foreground">{formMode === "guarda-volume" ? "Valor Mensal" : "Valor"}</Label>
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
              <Label className="text-muted-foreground">{formMode === "guarda-volume" ? "Observações do Contrato" : "Dados da Mudança"}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicionar observações..."
                className="min-h-[100px] border-border bg-muted text-foreground"
              />
            </div>

            {formMode !== "guarda-volume" && deal && (
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
                disabled={saving || selectedServices.length === 0 || !contactPhone.trim() || !stageId}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? "Salvando..." : deal ? "Salvar Alterações" : formMode === "guarda-volume" ? "Criar Contrato" : "Criar Negócio"}

              </Button>
            </div>

            {deal &&
              (confirmDelete ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs">
                  <span className="text-red-300">Excluir este contrato?</span>
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
                  Excluir Contrato
                </button>
              ))}
          </div>
    </div>
  );

  if (inline) {
    return open ? (
      <div className="flex h-full w-96 flex-shrink-0 flex-col overflow-hidden border-l border-border bg-popover">
        {formContent}
      </div>
    ) : null;
  }

  return (
    <Sheet
      open={open}
      modal={!hideOverlay}
      onOpenChange={(nextOpen, event) => {
        if (!dismissible && !nextOpen && event) {
          const reason = (event as any).reason;
          if (reason === "outsidePress" || reason === "escapeKey") return;
        }
        onOpenChange(nextOpen);
      }}
      disablePointerDismissal={!dismissible}
    >
      <SheetContent
        side="right"
        hideOverlay={hideOverlay}
        className="bg-popover border-border text-popover-foreground sm:max-w-lg w-full p-0"
      >
        {formContent}
      </SheetContent>
    </Sheet>
  );
}
