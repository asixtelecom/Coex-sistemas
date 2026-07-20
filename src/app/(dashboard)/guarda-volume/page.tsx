"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Pipeline, PipelineStage, Deal, Contact } from "@/types";
import { PipelineBoard } from "@/components/pipelines/pipeline-board";
import { DealForm } from "@/components/pipelines/deal-form";
import { PipelineAnalytics } from "@/components/pipelines/pipeline-analytics";
import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const GV_DEFAULT_STAGES = [
  { name: "Novo Contrato", color: "#3b82f6", position: 0 },
  { name: "Depositado", color: "#eab308", position: 1 },
  { name: "Ativo", color: "#22c55e", position: 2 },
  { name: "Encerrado", color: "#6b7280", position: 3 },
];

export default function GuardaVolumePage() {
  const supabase = createClient();
  const { accountId, user } = useAuth();

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [defaultStageId, setDefaultStageId] = useState("");

  const seedAttempted = useRef(false);

  const ensurePipeline = useCallback(async () => {
    if (!user || !accountId) return null;

    let { data: existing } = await supabase
      .from("pipelines")
      .select("*")
      .eq("user_id", user.id)
      .eq("name", "Storage")
      .maybeSingle();

    if (existing) return existing as Pipeline;

    const { data: pipeline, error } = await supabase
      .from("pipelines")
      .insert({ user_id: user.id, account_id: accountId, name: "Storage" })
      .select()
      .single();

    if (error || !pipeline) return null;

    const stagesPayload = GV_DEFAULT_STAGES.map((s) => ({
      pipeline_id: pipeline.id,
      name: s.name,
      color: s.color,
      position: s.position,
    }));
    await supabase.from("pipeline_stages").insert(stagesPayload);

    return pipeline as Pipeline;
  }, [supabase, accountId, user]);

  const loadStages = useCallback(
    async (pipelineId: string) => {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("position");
      return data ?? [];
    },
    [supabase],
  );

  const loadDeals = useCallback(
    async (pipelineId: string) => {
      const { data } = await supabase
        .from("deals")
        .select("*, contact:contacts(*), assignee:profiles!deals_assigned_to_fkey(*)")
        .eq("pipeline_id", pipelineId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Deal[];
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let p = await ensurePipeline();
      if (!p && !seedAttempted.current) {
        seedAttempted.current = true;
        p = await ensurePipeline();
      }
      if (cancelled || !p) {
        setLoading(false);
        return;
      }
      setPipeline(p);
      const [s, d] = await Promise.all([loadStages(p.id), loadDeals(p.id)]);
      if (cancelled) return;
      setStages(s);
      setDeals(d);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ensurePipeline, loadStages, loadDeals]);

  const refreshDeals = useCallback(async () => {
    if (!pipeline) return;
    setDeals(await loadDeals(pipeline.id));
  }, [loadDeals, pipeline]);

  const handleDealMoved = useCallback(
    async (dealId: string, newStageId: string) => {
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)),
      );
      const { error } = await supabase
        .from("deals")
        .update({ stage_id: newStageId })
        .eq("id", dealId);
      if (error) {
        toast.error("Erro ao mover contrato");
        refreshDeals();
      }
    },
    [supabase, refreshDeals],
  );

  const handleAdd = useCallback(
    (stageId?: string) => {
      setEditingDeal(null);
      setDefaultStageId(stageId ?? stages[0]?.id ?? "");
      setDealFormOpen(true);
    },
    [stages],
  );

  const handleEdit = useCallback((deal: Deal) => {
    setEditingDeal(deal);
    setDefaultStageId(deal.stage_id);
    setDealFormOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 w-72 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Storage</h1>
        </div>
        <Button
          disabled={stages.length === 0}
          onClick={() => handleAdd()}
        >
          <Plus className="mr-1 h-4 w-4" />
          Adicionar Contrato
        </Button>
      </div>

      {!pipeline ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Package className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Nenhum pipeline de Storage
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie um para começar a gerenciar contratos
          </p>
        </div>
      ) : (
        <>
          <PipelineAnalytics stages={stages} deals={deals} />
          <PipelineBoard
            stages={stages}
            deals={deals}
            contacts={[]}
            onDealMoved={handleDealMoved}
            onAddDeal={handleAdd}
            onEditDeal={handleEdit}
          />
        </>
      )}

      <DealForm
        open={dealFormOpen}
        onOpenChange={setDealFormOpen}
        deal={editingDeal}
        pipelineId={pipeline?.id ?? ""}
        stages={stages}
        defaultStageId={defaultStageId}
        onSaved={refreshDeals}
      />
    </div>
  );
}

