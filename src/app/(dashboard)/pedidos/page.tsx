"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Deal, PipelineStage } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PedidoDetailSheet } from "@/components/pedidos/pedido-detail-sheet";
import { DealForm } from "@/components/pipelines/deal-form";
import { generatePedidoPDF } from "@/components/pedidos/pedido-pdf";
import { Eye, Edit, Printer, Loader2, Search, X, ChevronDown, ChevronUp } from "lucide-react";

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return "-";
  return "R$ " + Number(value).toFixed(2).replace(".", ",");
}

const statusLabels: Record<string, string> = {
  open: "Em Andamento",
  won: "Ganho",
  lost: "Perdido",
};

const statusColors: Record<string, string> = {
  open: "text-amber-600 bg-amber-50",
  won: "text-emerald-600 bg-emerald-50",
  lost: "text-red-600 bg-red-50",
};

export default function PedidosPage() {
  const supabase = createClient();
  const { accountId } = useAuth();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string; avatar_url: string | null }[]>([]);
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [searchDateStart, setSearchDateStart] = useState("");
  const [searchDateEnd, setSearchDateEnd] = useState("");
  const [searchValueMin, setSearchValueMin] = useState("");
  const [searchValueMax, setSearchValueMax] = useState("");
  const [searchEmployee, setSearchEmployee] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [pipelineId, setPipelineId] = useState("");
  const [showEmployees, setShowEmployees] = useState(true);

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);

    const [dealsRes, profilesRes, pipelinesRes, stagesRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, contact:contacts(*), assignee:profiles(*)")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, avatar_url").eq("account_id", accountId),
      supabase.from("pipelines").select("id, name").eq("account_id", accountId),
      supabase.from("pipeline_stages").select("*"),
    ]);

    setDeals((dealsRes.data ?? []) as Deal[]);
    setProfiles(profilesRes.data ?? []);
    setPipelines(pipelinesRes.data ?? []);
    setStages((stagesRes.data ?? []) as PipelineStage[]);

    if (pipelinesRes.data && pipelinesRes.data.length > 0) {
      setPipelineId(pipelinesRes.data[0].id);
    }

    setLoading(false);
  }, [accountId, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredDeals = deals.filter((d) => {
    if (searchName) {
      const name = (d.contact?.name ?? "").toLowerCase();
      if (!name.includes(searchName.toLowerCase())) return false;
    }
    if (searchDateStart && d.created_at) {
      if (new Date(d.created_at) < new Date(searchDateStart)) return false;
    }
    if (searchDateEnd && d.created_at) {
      const end = new Date(searchDateEnd);
      end.setDate(end.getDate() + 1);
      if (new Date(d.created_at) > end) return false;
    }
    if (searchValueMin && d.value != null) {
      if (Number(d.value) < Number(searchValueMin)) return false;
    }
    if (searchValueMax && d.value != null) {
      if (Number(d.value) > Number(searchValueMax)) return false;
    }
    if (searchEmployee) {
      if (d.assignee?.user_id !== searchEmployee) return false;
    }
    return true;
  });

  const totalClients = new Set(filteredDeals.map((d) => d.contact?.id)).size;
  const totalDeals = filteredDeals.length;
  const totalValue = filteredDeals.reduce((acc, d) => acc + (d.value ?? 0), 0);
  const wonDeals = filteredDeals.filter((d) => d.status === "won");
  const wonValue = wonDeals.reduce((acc, d) => acc + (d.value ?? 0), 0);

  const employeeTotals = profiles.map((p) => {
    const empDeals = filteredDeals.filter((d) => d.assignee?.user_id === p.user_id);
    const empWonDeals = empDeals.filter((d) => d.status === "won");
    return {
      ...p,
      total: empDeals.length,
      totalValue: empDeals.reduce((acc, d) => acc + (d.value ?? 0), 0),
      wonCount: empWonDeals.length,
      wonValue: empWonDeals.reduce((acc, d) => acc + (d.value ?? 0), 0),
    };
  }).filter((e) => e.total > 0).sort((a, b) => b.totalValue - a.totalValue);

  const handleView = useCallback((deal: Deal) => {
    setSelectedDeal(deal);
    setDetailOpen(true);
  }, []);

  const handleEdit = useCallback((deal: Deal) => {
    setEditDeal(deal);
    setFormOpen(true);
  }, []);

  const handleEditFromSheet = useCallback(() => {
    setDetailOpen(false);
    if (selectedDeal) {
      setEditDeal(selectedDeal);
      setFormOpen(true);
    }
  }, [selectedDeal]);

  const handlePrint = useCallback((deal: Deal) => {
    generatePedidoPDF(deal);
  }, []);

  const handlePrintFromSheet = useCallback(() => {
    if (selectedDeal) generatePedidoPDF(selectedDeal);
  }, [selectedDeal]);

  const handleFormSaved = useCallback(() => {
    setFormOpen(false);
    setEditDeal(null);
    loadData();
  }, [loadData]);

  const clearFilters = useCallback(() => {
    setSearchName("");
    setSearchDateStart("");
    setSearchDateEnd("");
    setSearchValueMin("");
    setSearchValueMax("");
    setSearchEmployee("");
  }, []);

  const hasFilters = searchName || searchDateStart || searchDateEnd || searchValueMin || searchValueMax || searchEmployee;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Todos os pedidos</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Clientes</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalClients}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de Pedidos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalDeals}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Em Andamento</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{filteredDeals.filter((d) => d.status === "open").length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Ganhos</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{filteredDeals.filter((d) => d.status === "won").length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Perdidos</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{filteredDeals.filter((d) => d.status === "lost").length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor Total</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalValue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Comissão (3%)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(wonValue * 0.03)}</p>
        </div>
      </div>

      {/* Employee totals */}
      <div className="rounded-lg border border-border bg-card">
        <button
          onClick={() => setShowEmployees(!showEmployees)}
          className="flex w-full items-center justify-between p-3 text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Resumo por Funcionário
          </span>
          {showEmployees ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showEmployees && (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funcionário</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedidos</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ganhos</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor Total</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor Ganho</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comissão (3%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employeeTotals.map((emp) => (
                  <tr key={emp.user_id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          {emp.avatar_url ? <AvatarImage src={emp.avatar_url} /> : null}
                          <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                            {emp.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-foreground">{emp.total}</td>
                    <td className="px-3 py-2 text-sm text-emerald-600 font-medium">{emp.wonCount}</td>
                    <td className="px-3 py-2 text-sm text-foreground">{formatCurrency(emp.totalValue)}</td>
                    <td className="px-3 py-2 text-sm text-primary font-medium">{formatCurrency(emp.wonValue)}</td>
                    <td className="px-3 py-2 text-sm text-emerald-600 font-medium">{formatCurrency(emp.wonValue * 0.03)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-muted/30">
                <tr>
                  <td className="px-3 py-2 text-sm font-semibold text-foreground">Total</td>
                  <td className="px-3 py-2 text-sm font-semibold text-foreground">{totalDeals}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-emerald-600">{filteredDeals.filter((d) => d.status === "won").length}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-foreground">{formatCurrency(totalValue)}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-primary">{formatCurrency(wonValue)}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-emerald-600">{formatCurrency(wonValue * 0.03)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Nome"
              className="h-9 w-full rounded-lg border border-border bg-muted pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <input
            type="date"
            value={searchDateStart}
            onChange={(e) => setSearchDateStart(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <input
            type="date"
            value={searchDateEnd}
            onChange={(e) => setSearchDateEnd(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <input
            type="number"
            value={searchValueMin}
            onChange={(e) => setSearchValueMin(e.target.value)}
            placeholder="Valor min"
            className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <input
            type="number"
            value={searchValueMax}
            onChange={(e) => setSearchValueMax(e.target.value)}
            placeholder="Valor max"
            className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <select
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">Funcionário</option>
            {profiles.map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsável</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destino</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Início</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Término</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Serviço</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDeals.map((deal) => (
                <tr key={deal.id} className="group transition-colors hover:bg-muted/30">
                  <td className="px-3 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight ${statusColors[deal.status ?? "open"]}`}>
                      {statusLabels[deal.status ?? "open"]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7 shrink-0">
                        {deal.contact?.avatar_url ? <AvatarImage src={deal.contact.avatar_url} alt={deal.contact.name ?? ""} /> : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          {deal.contact?.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium text-foreground max-w-[140px]">{deal.contact?.name ?? "Sem nome"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Avatar className="size-6">
                      {deal.assignee?.avatar_url ? <AvatarImage src={deal.assignee.avatar_url} alt={deal.assignee.full_name ?? ""} /> : null}
                      <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">
                        {deal.assignee?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-sm text-foreground">{deal.origin_address ?? "-"}</td>
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-sm text-foreground">{deal.destination_address ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-foreground">{formatDate(deal.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-foreground">{formatDate(deal.end_date)}</td>
                  <td className="max-w-[140px] truncate px-3 py-2.5 text-sm text-foreground">{deal.title}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-primary">{formatCurrency(deal.value)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleView(deal)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Visualizar">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleEdit(deal)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar">
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handlePrint(deal)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Imprimir PDF">
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PedidoDetailSheet open={detailOpen} onOpenChange={setDetailOpen} deal={selectedDeal} onEdit={handleEditFromSheet} onPrintPDF={handlePrintFromSheet} />

      <DealForm open={formOpen} onOpenChange={setFormOpen} deal={editDeal} pipelineId={pipelineId} stages={stages} onSaved={handleFormSaved} />
    </div>
  );
}
