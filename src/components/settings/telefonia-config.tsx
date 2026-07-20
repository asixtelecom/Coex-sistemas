import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Phone, PhoneOff, Save, Loader2, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingsPanelHead } from "./settings-panel-head";

export function TelefoniaConfig() {
  const { accountId, canEditSettings } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [dialerScript, setDialerScript] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    const supabase = createClient();
    supabase
      .from("accounts")
      .select("dialer_enabled, dialer_script")
      .eq("id", accountId)
      .single()
      .then(({ data }) => {
        setEnabled(data?.dialer_enabled ?? false);
        setDialerScript(data?.dialer_script ?? "");
        setLoading(false);
      });
  }, [accountId]);

  const handleSave = useCallback(async () => {
    if (!accountId) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("accounts")
      .update({ dialer_enabled: enabled, dialer_script: dialerScript })
      .eq("id", accountId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Configuração salva!");
    }
  }, [accountId, enabled, dialerScript]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Telefonia"
        description="Configure o discador integrado para realizar ligações direto pelo CRM."
      />

      <div className="rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Discador ASIX</Label>
            <p className="text-xs text-muted-foreground">
              Ative para carregar o widget de discagem no painel. Quando ativo,
              o discador aparece na página inicial.
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {enabled ? (
            <Phone className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <PhoneOff className="h-3.5 w-3.5" />
          )}
          <span>{enabled ? "Discador ativo" : "Discador inativo"}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Código do discador</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Cole aqui o código de embed/widget do discador. Este código será
            carregado automaticamente quando o discador estiver ativo.
          </p>
        </div>

        <Textarea
          placeholder='Cole aqui o código do discador, por exemplo:
<script src="https://exemplo.com/widget.js" data-key="sua-chave"></script>'
          value={dialerScript}
          onChange={(e) => setDialerScript(e.target.value)}
          className="min-h-[200px] font-mono text-xs bg-muted border-border text-foreground resize-y"
        />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
