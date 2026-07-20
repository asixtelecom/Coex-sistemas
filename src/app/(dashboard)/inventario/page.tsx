"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  Search,
  Trash2,
  Printer,
  Pencil,
  X,
  UserCircle,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { generateInventarioPDF } from "@/components/inventario/inventario-pdf";

interface InventarioItem {
  id: string;
  name: string;
  qtd: number;
  cubagem: number;
  total_m3: number;
  valor: number;
}

interface Inventario {
  id: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_document: string | null;
  origin_address: string | null;
  destination_address: string | null;
  obs: string | null;
  items: InventarioItem[];
  cubagem_total: number;
  valor_total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return "-";
  return "R$ " + Number(value).toFixed(2).replace(".", ",");
}

const emptyItem = (): InventarioItem => ({
  id: crypto.randomUUID(),
  name: "",
  qtd: 1,
  cubagem: 0,
  total_m3: 0,
  valor: 0,
});

export default function InventarioPage() {
  const supabase = createClient();
  const { accountId, user, account } = useAuth();
  const [profilesMap, setProfilesMap] = useState<Record<string, { name: string | null; avatar_url: string | null; email: string | null }>>({});

  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [contactSearch, setContactSearch] = useState("");
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactDocument, setContactDocument] = useState("");
  const [originAddress, setOriginAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [obs, setObs] = useState("");
  const [items, setItems] = useState<InventarioItem[]>([emptyItem()]);
  const [masterResults, setMasterResults] = useState<{ id: number; item_name: string; default_m3: number }[]>([]);
  const [masterOpen, setMasterOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const fetchInventarios = async () => {
    if (!accountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("inventarios")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar inventários");
    } else {
      setInventarios((data ?? []) as Inventario[]);
    }
    setLoading(false);
  };

  // Fetch creator profiles whenever inventarios change
  const creatorIds = useMemo(() => [...new Set(inventarios.map(i => i.created_by).filter(Boolean) as string[])], [inventarios]);

  useEffect(() => {
    if (creatorIds.length === 0) return;
    supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, email')
      .in('user_id', creatorIds)
      .then(({ data }) => {
        if (!data) return;
        setProfilesMap(prev => ({
          ...prev,
          ...Object.fromEntries(data.map(p => [p.user_id, { name: p.full_name, avatar_url: p.avatar_url, email: p.email }])),
        }));
      });
  }, [creatorIds]);

  useEffect(() => {
    fetchInventarios();
  }, [accountId]);

  useEffect(() => {
    if (!formOpen) return;
    supabase
      .from("contacts")
      .select("id, name, phone, email, company")
      .order("name")
      .then(({ data }) => {
        setContacts((data ?? []) as Contact[]);
      });
  }, [formOpen, supabase]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

  const openNew = () => {
    setEditingId(null);
    setContactId("");
    setContactName("");
    setContactPhone("");
    setContactDocument("");
    setContactSearch("");
    setOriginAddress("");
    setDestinationAddress("");
    setObs("");
    setItems([emptyItem()]);
    setMasterResults([]);
    setMasterOpen(false);
    setActiveItemId(null);
    setDropdownStyle(null);
    setFormOpen(true);
  };

  const openEdit = async (inv: Inventario) => {
    setEditingId(inv.id);
    setContactId(inv.contact_id || "");
    setContactName(inv.contact_name || "");
    setContactPhone(inv.contact_phone || "");
    setContactDocument(inv.contact_document || "");
    setContactSearch(inv.contact_name || "");
    setOriginAddress(inv.origin_address || "");
    setDestinationAddress(inv.destination_address || "");
    setObs(inv.obs || "");
    setItems(inv.items.length > 0 ? inv.items : [emptyItem()]);
    setFormOpen(true);
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      return next.length === 0 ? [emptyItem()] : next;
    });
  };

  const updateItem = (id: string, field: keyof InventarioItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: field === "name" ? value : Number(value) || 0 };
        if (field === "qtd" || field === "cubagem") {
          updated.total_m3 = updated.qtd * updated.cubagem;
        }
        return updated;
      })
    );
  };

  const totals = useMemo(() => {
    let cubagem = 0;
    let valor = 0;
    for (const item of items) {
      cubagem += item.total_m3;
      valor += item.valor;
    }
    return { cubagem_total: cubagem, valor_total: valor };
  }, [items]);

  const searchMasterItems = useCallback((itemId: string, query: string, inputEl: HTMLInputElement | null) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setMasterResults([]);
      setMasterOpen(false);
      return;
    }
    const rect = inputEl?.getBoundingClientRect();
    if (rect) {
      setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cubagem/master-items?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data = await res.json();
        setMasterResults(data || []);
        setMasterOpen(true);
        setActiveItemId(itemId);
      } catch { /* ignore */ }
    }, 300);
  }, []);

  const selectMasterItem = (itemId: string, master: { id: number; item_name: string; default_m3: number }) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          name: master.item_name,
          cubagem: Number(master.default_m3) || 0,
          total_m3: item.qtd * (Number(master.default_m3) || 0),
        };
      })
    );
    setMasterOpen(false);
    setMasterResults([]);
    setActiveItemId(null);
  };

  const handleSave = async () => {
    if (!contactId) {
      toast.error("Selecione um contato");
      return;
    }
    if (items.length === 0 || !items[0].name) {
      toast.error("Adicione pelo menos um item");
      return;
    }
    setSaving(true);

    const payload: Record<string, any> = {
      account_id: accountId,
      contact_id: contactId,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_document: contactDocument,
      origin_address: originAddress || null,
      destination_address: destinationAddress || null,
      obs: obs || null,
      items: items.filter((i) => i.name),
      cubagem_total: totals.cubagem_total,
      valor_total: totals.valor_total,
    };

    if (!editingId) {
      payload.created_by = user?.id;
    }

    if (editingId) {
      const { error } = await supabase
        .from("inventarios")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        toast.error("Erro ao salvar inventário");
        setSaving(false);
        return;
      }
      toast.success("Inventário atualizado");
    } else {
      const { error } = await supabase
        .from("inventarios")
        .insert(payload);
      if (error) {
        toast.error("Erro ao criar inventário");
        setSaving(false);
        return;
      }
      toast.success("Inventário criado");
    }

    setSaving(false);
    setFormOpen(false);
    fetchInventarios();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este inventário?")) return;
    const { error } = await supabase.from("inventarios").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir inventário");
      return;
    }
    toast.success("Inventário excluído");
    fetchInventarios();
  };

  const handlePrint = async (inv: Inventario) => {
    let contactData: { email?: string | null; address?: string | null } | null = null;
    if (inv.contact_id) {
      const { data } = await supabase
        .from("contacts")
        .select("email, address")
        .eq("id", inv.contact_id)
        .maybeSingle();
      if (data) {
        contactData = data;
      }
    }

    const creator = inv.created_by
      ? {
          name: profilesMap[inv.created_by]?.name ?? null,
          avatar_url: profilesMap[inv.created_by]?.avatar_url ?? null,
          email: profilesMap[inv.created_by]?.email ?? null,
        }
      : null;

    generateInventarioPDF(inv, account, creator, contactData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventário</h1>
        <Button onClick={openNew}>
          <Plus className="size-4 mr-2" />
          Novo Inventário
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Buscar inventário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-left p-3 font-medium w-10"></th>
                <th className="text-left p-3 font-medium">Criado por</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Telefone</th>
                <th className="text-center p-3 font-medium">Itens</th>
                <th className="text-center p-3 font-medium">Total M³</th>
                <th className="text-right p-3 font-medium">Valor Total</th>
                <th className="text-right p-3 font-medium">Data</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {inventarios.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum inventário encontrado
                  </td>
                </tr>
              )}
              {inventarios.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-3">
                    <Avatar className="size-8">
                      {profilesMap[inv.created_by || ""]?.avatar_url ? (
                        <AvatarImage src={profilesMap[inv.created_by || ""]?.avatar_url || ""} alt={profilesMap[inv.created_by || ""]?.name || ""} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {(profilesMap[inv.created_by || ""]?.name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </td>
                  <td className="p-3 text-sm">{profilesMap[inv.created_by || ""]?.name || "-"}</td>
                  <td className="p-3">{inv.contact_name || "-"}</td>
                  <td className="p-3">{inv.contact_phone || "-"}</td>
                  <td className="p-3 text-center">{inv.items?.length || 0}</td>
                  <td className="p-3 text-center">
                    {inv.cubagem_total?.toFixed(3).replace(".", ",") || "0,000"}
                  </td>
                  <td className="p-3 text-right">{formatCurrency(inv.valor_total)}</td>
                  <td className="p-3 text-right text-sm text-muted-foreground">
                    {formatDate(inv.created_at)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handlePrint(inv)} title="Imprimir">
                        <Printer className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(inv)} title="Editar">
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)} title="Excluir">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Novo"} Inventário</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="relative">
                <Input
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    setContactDropdownOpen(true);
                    if (!e.target.value) {
                      setContactId("");
                      setContactName("");
                      setContactPhone("");
                      setContactDocument("");
                    }
                  }}
                  onFocus={() => setContactDropdownOpen(true)}
                  placeholder="Buscar contato existente..."
                />
                {contactDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setContactDropdownOpen(false)}
                    />
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredContacts.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          Nenhum contato encontrado
                        </div>
                      ) : (
                        filteredContacts.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3"
                            onClick={() => {
                              setContactId(c.id);
                              setContactName(c.name || "");
                              setContactPhone(c.phone || "");
                              setContactSearch(c.name || c.phone || "");
                              setContactDropdownOpen(false);
                            }}
                          >
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {(c.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{c.name || "Sem nome"}</div>
                              <div className="text-xs text-muted-foreground">
                                {c.phone || c.email || ""}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
              {contactPhone && (
                <p className="text-xs text-muted-foreground">Tel: {contactPhone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Endereço de Origem</Label>
              <Input
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
                placeholder="Endereço de origem..."
              />
            </div>

            <div className="space-y-2">
              <Label>Endereço de Destino</Label>
              <Input
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Endereço de destino..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-3 mr-1" /> Adicionar Item
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left p-2 font-medium min-w-[280px]">Item</th>
                      <th className="text-center p-2 font-medium w-20">Qtd</th>
                      <th className="text-center p-2 font-medium w-24">Cubagem (M³)</th>
                      <th className="text-center p-2 font-medium w-24">Total M³</th>
                      <th className="text-right p-2 font-medium w-28">Valor (R$)</th>
                      <th className="text-center p-2 font-medium w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="p-1">
                          <Input
                            ref={searchInputRef}
                            value={item.name}
                            onChange={(e) => {
                              updateItem(item.id, "name", e.target.value);
                              searchMasterItems(item.id, e.target.value, searchInputRef.current);
                            }}
                            onFocus={(e) => {
                              if (masterResults.length && activeItemId === item.id) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                                setMasterOpen(true);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setMasterOpen(false);
                              }, 200);
                            }}
                            placeholder="Nome do item..."
                            className="h-8 w-full"
                            maxLength={45}
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={item.qtd}
                            onChange={(e) => updateItem(item.id, "qtd", e.target.value)}
                            className="h-8 text-center"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={item.cubagem}
                            onChange={(e) => updateItem(item.id, "cubagem", e.target.value)}
                            className="h-8 text-center"
                            placeholder="0,000"
                          />
                        </td>
                        <td className="p-1 text-center font-medium">
                          {item.total_m3.toFixed(3).replace(".", ",")}
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valor}
                            onChange={(e) => updateItem(item.id, "valor", e.target.value)}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="p-1 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => removeItem(item.id)}
                          >
                            <X className="size-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-6 text-sm border-t pt-2">
                <div>
                  <span className="text-muted-foreground">Total M³: </span>
                  <strong>{totals.cubagem_total.toFixed(3).replace(".", ",")}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Total: </span>
                  <strong>{formatCurrency(totals.valor_total)}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Obs:</Label>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Observações..."
                  rows={3}
                  className="w-full bg-muted border border-border rounded-md p-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {masterOpen && dropdownStyle && activeItemId && masterResults.length > 0 && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setMasterOpen(false); setActiveItemId(null); }} />
          <div
            className="fixed z-50 bg-popover border rounded-md shadow-lg"
            style={{ top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width }}
          >
            {masterResults.map((m) => (
              <button
                key={m.id}
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-muted text-sm flex items-center justify-between"
                onMouseDown={() => selectMasterItem(activeItemId, m)}
              >
                <span>{m.item_name}</span>
                <span className="text-xs text-muted-foreground">{Number(m.default_m3).toFixed(3).replace(".", ",")} m³</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
