"use client";

import type { Deal } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Calendar, DollarSign, FileText, User, Eye, Printer, Pencil } from "lucide-react";

interface PedidoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  onEdit: () => void;
  onPrintPDF: () => void;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return "-";
  return "R$ " + value.toFixed(2).replace(".", ",");
}

export function PedidoDetailSheet({ open, onOpenChange, deal, onEdit, onPrintPDF }: PedidoDetailSheetProps) {
  if (!deal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-popover border-border text-popover-foreground sm:max-w-lg w-full p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/50 p-4">
            <SheetTitle className="text-popover-foreground">Detalhes do Pedido</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Client + Agent row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  {deal.contact?.avatar_url ? <AvatarImage src={deal.contact.avatar_url} alt={deal.contact.name ?? ""} /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {deal.contact?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{deal.contact?.name ?? "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Responsável</span>
                <Avatar className="size-8">
                  {deal.assignee?.avatar_url ? <AvatarImage src={deal.assignee.avatar_url} alt={deal.assignee.full_name ?? ""} /> : null}
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {deal.assignee?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{deal.assignee?.full_name ?? "N/A"}</span>
              </div>
            </div>

            {/* Origin / Destination */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3 w-3" />
                  Origem
                </div>
                <p className="text-sm text-foreground">{deal.origin_address ?? "-"}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3 w-3" />
                  Destino
                </div>
                <p className="text-sm text-foreground">{deal.destination_address ?? "-"}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Início
                </div>
                <p className="text-sm text-foreground">{formatDate(deal.created_at)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Término
                </div>
                <p className="text-sm text-foreground">{formatDate(deal.end_date)}</p>
              </div>
            </div>

            {/* Service + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <FileText className="h-3 w-3" />
                  Serviço
                </div>
                <p className="text-sm font-medium text-foreground">{deal.title}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3" />
                  Valor
                </div>
                <p className="text-sm font-semibold text-primary">{formatCurrency(deal.value)}</p>
              </div>
            </div>

            {/* Observations */}
            {deal.notes && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <FileText className="h-3 w-3" />
                  Observações
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{deal.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-border/50 bg-popover/80 p-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onEdit}
                className="flex-1 border-border bg-transparent text-muted-foreground hover:bg-muted"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                onClick={onPrintPDF}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimir PDF
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
