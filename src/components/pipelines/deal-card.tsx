"use client";

import { useState } from "react";
import type { Deal, PipelineStage } from "@/types";
import { Calendar, Check, X, MoreVertical, User, Phone, DollarSign, Tag, CalendarDays, Clock, BarChart3, ClipboardCheck } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ServiceBadges } from "@/components/ui/service-badges";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DealCardProps {
  deal: Deal;
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
  stages?: PipelineStage[];
  onMoveStage?: (dealId: string, newStageId: string) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name?: string, fallback?: string) {
  const source = (name || fallback || "?").trim();
  if (!source) return "?";
  return source.charAt(0).toUpperCase();
}

export function DealCard({ deal, stage, onEdit, isOverlay, stages, onMoveStage }: DealCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const contactLabel = deal.contact?.name || deal.contact?.phone || "Sem contato";
  const assigneeLabel = deal.assignee?.full_name || null;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isOverlay) return;
    e.stopPropagation();
    onEdit(deal);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleCardClick}
        className={`group relative w-full cursor-pointer rounded-xl border border-border/50 bg-muted/70 pl-4 pr-3 py-3 text-left shadow-sm transition-all ${
          isOverlay
            ? "shadow-xl"
            : "hover:-translate-y-0.5 hover:border-border hover:bg-muted hover:shadow-lg"
        }`}
      >
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
          style={{ backgroundColor: stage?.color ?? "#94a3b8" }}
        />

        <div className="flex items-start justify-between gap-2">
          <h4 className="flex-1 text-sm font-semibold leading-snug text-foreground break-words">
            <ServiceBadges title={deal.title} maxDisplay={2} />
            {deal.property_type && <span className="font-bold text-xs">&nbsp;Box&nbsp;{deal.property_type}</span>}
          </h4>
          <div className="flex items-center gap-0.5 shrink-0">
            {deal.vistoria_id && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400" title="Tem vistoria">
                <ClipboardCheck className="h-3 w-3" />
              </span>
            )}
            {deal.status === "won" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Check className="h-3 w-3" />
                Ganho
              </span>
            )}
            {deal.status === "lost" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                <X className="h-3 w-3" />
                Lost
              </span>
            )}
            {!isOverlay && (
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-muted hover:text-foreground">
                  <MoreVertical className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem onClick={() => setDetailOpen(true)}>
                    <span className="text-sm">Visualizar</span>
                  </DropdownMenuItem>
                  {stages && stages.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {stages.map((s) => (
                        <DropdownMenuItem
                          key={s.id}
                          disabled={s.id === deal.stage_id}
                          onClick={() => onMoveStage?.(deal.id, s.id)}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: s.color }}
                            />
                            {s.name}
                            {s.id === deal.stage_id && (
                              <span className="text-xs text-muted-foreground ml-auto">atual</span>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
            {initials(deal.contact?.name, deal.contact?.phone)}
          </span>
          <span className="truncate text-xs text-muted-foreground">{contactLabel}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-primary">
            {formatCurrency(deal.value, deal.currency)}
          </span>
          {deal.expected_close_date && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(deal.expected_close_date)}
            </span>
          )}
        </div>

        {assigneeLabel && (
          <div className="mt-2 flex items-center justify-end">
            <Avatar className="size-5" title={assigneeLabel}>
              {deal.assignee?.avatar_url && (
                <AvatarImage src={deal.assignee.avatar_url} alt={assigneeLabel} />
              )}
              <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                {initials(assigneeLabel)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </button>

      {/* Details dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              <ServiceBadges title={deal.title} maxDisplay={5} />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> Estagio
                  </td>
                  <td className="py-2.5 text-right font-medium">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs"
                      style={{ backgroundColor: stage?.color ? `${stage.color}20` : undefined, color: stage?.color ?? undefined }}
                    >
                      {stage?.name ?? "Sem estagio"}
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" /> Valor
                  </td>
                  <td className="py-2.5 text-right font-medium">{formatCurrency(deal.value, deal.currency)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Contato
                  </td>
                  <td className="py-2.5 text-right font-medium">{contactLabel}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> Telefone
                  </td>
                  <td className="py-2.5 text-right font-medium">{deal.contact?.phone || "-"}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> CNPJ
                  </td>
                  <td className="py-2.5 text-right font-medium">{deal.contact?.document || "-"}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Responsavel
                  </td>
                  <td className="py-2.5 text-right font-medium">{assigneeLabel || "-"}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <BarChart3 className="h-3.5 w-3.5" /> Status
                  </td>
                  <td className="py-2.5 text-right font-medium">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      deal.status === "won" ? "bg-primary/15 text-primary" :
                      deal.status === "lost" ? "bg-red-500/15 text-red-400" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {deal.status === "won" ? "Ganho" : deal.status === "lost" ? "Perdido" : "Em andamento"}
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Vistoria
                  </td>
                  <td className="py-2.5 text-right font-medium">{deal.vistoria_id ? "Sim" : "Não"}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" /> Fechamento previsto
                  </td>
                  <td className="py-2.5 text-right font-medium">{deal.expected_close_date ? formatDate(deal.expected_close_date) : "-"}</td>
                </tr>
                <tr>
                  <td className="flex items-center gap-2 py-2.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Criado em
                  </td>
                  <td className="py-2.5 text-right font-medium">{deal.created_at ? formatDateTime(deal.created_at) : "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
