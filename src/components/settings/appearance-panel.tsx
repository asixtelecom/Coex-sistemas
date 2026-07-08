"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Contrast, Loader2, Moon, Palette, SunMoon, Sun, Upload, Trash2, Building2, FileText, MapPin, CreditCard, Phone, Pencil } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { MODES, THEMES, type Mode, type ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsPanelHead } from "./settings-panel-head";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export function AppearancePanel() {
  const { theme, setTheme, mode, setMode } = useTheme();
  const { account, accountId, canEditSettings, refreshProfile } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [footerText, setFooterText] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account) return;
    setCompanyName(account.name ?? "");
    setFooterText(account.footer_text ?? "");
    setEndereco(account.endereco ?? "");
    setCnpj(account.cnpj ?? "");

    // Fetch phone separately — column may not exist yet
    if (accountId) {
      ;(async () => {
        try {
          const { data: phoneData } = await supabase
            .from("accounts")
            .select("phone")
            .eq("id", accountId)
            .maybeSingle();
          if (phoneData) {
            const ph = phoneData.phone ?? "";
            setPhone(ph);
            setOriginalPhone(ph);
          }
        } catch {
          // column may not exist yet
        }
      })();
    }
  }, [account, accountId, supabase]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const currentLogo =
    logoPreview ?? (!removeLogo ? account?.logo_url ?? null : null);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_MIME.has(file.type)) {
      toast.error("Tipo de imagem não suportado", {
        description: "Use PNG, JPG, WebP ou GIF.",
      });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Imagem muito grande", {
        description: "Máximo 2 MB.",
      });
      return;
    }

    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const onRemoveLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  async function handleSaveBranding() {
    if (!accountId) return;
    setSaving(true);
    try {
      let nextLogoUrl: string | null = account?.logo_url ?? null;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${accountId}/logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(path, logoFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: logoFile.type,
          });
        if (uploadError) {
          throw new Error(`Upload falhou: ${uploadError.message}`);
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("logos").getPublicUrl(path);
        nextLogoUrl = publicUrl;
      } else if (removeLogo) {
        nextLogoUrl = null;
      }

      const { error: updateError } = await supabase
        .from("accounts")
        .update({
          logo_url: nextLogoUrl,
          name: companyName.trim() || account?.name,
          footer_text: footerText.trim() || null,
          endereco: endereco.trim() || null,
          cnpj: cnpj.trim() || null,
          phone: phone.trim() || null,
        })
        .eq("id", accountId);

      if (updateError) {
        throw new Error(`Falha ao salvar: ${updateError.message}`);
      }

      setLogoFile(null);
      setLogoPreview(null);
      setRemoveLogo(false);
      await refreshProfile();

      toast.success("Marca salva com sucesso");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const brandingDirty =
    !!account &&
    (logoFile !== null ||
      removeLogo ||
      companyName.trim() !== (account.name ?? "") ||
      footerText.trim() !== (account.footer_text ?? "") ||
      endereco.trim() !== (account.endereco ?? "") ||
      cnpj.trim() !== (account.cnpj ?? "") ||
      phone.trim() !== originalPhone);

  return (
    <section className="max-w-3xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Aparência"
        description="Defina o modo e a cor de destaque usados no aplicativo. Salvo neste dispositivo — experimente, as alterações são imediatas."
      />

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SunMoon className="size-4 text-muted-foreground" />
          Modo
        </h3>

        <div
          role="radiogroup"
          aria-label="Modo de cor"
          className="grid max-w-2xl grid-cols-3 gap-3"
        >
          {MODES.map((m) => (
            <ModeCard
              key={m}
              mode={m}
              isActive={m === mode}
              onPick={() => setMode(m)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Palette className="size-4 text-muted-foreground" />
          Cor de destaque
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => (
            <ThemeCard
              key={t.id}
              id={t.id}
              name={t.name}
              tagline={t.tagline}
              swatch={t.swatch}
              isActive={t.id === theme}
              onPick={() => setTheme(t.id)}
            />
          ))}
        </div>
      </div>

      {canEditSettings && (
        <div className="mt-10 space-y-6">
          <div className="border-t border-border pt-8">
            <SettingsPanelHead
              title="Marca da empresa"
              description="Personalize a logo e as informações da sua empresa. Elas aparecerão na sidebar, rodapé e documentos."
            />

            <Card>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-muted overflow-hidden">
                    {currentLogo ? (
                      <img
                        src={currentLogo}
                        alt={companyName || "Logo da empresa"}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <Building2 className="size-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {companyName || "Nome da empresa"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentLogo ? "Clique em Alterar logo para trocar a imagem" : "Faça upload da logo da sua empresa"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={onPickFile}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                    >
                      <Upload className="size-4" />
                      {currentLogo ? "Alterar logo" : "Upload"}
                    </Button>
                    {currentLogo && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={onRemoveLogo}
                        disabled={saving}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="size-4" />
                        Remover
                      </Button>
                    )}
                    <p className="w-full text-xs text-muted-foreground">
                      PNG, JPG, WebP ou GIF. Até 2 MB.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-foreground">
                    <Building2 className="size-3.5 inline mr-1.5 text-muted-foreground" />
                    Nome da empresa
                  </Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Coex Sistemas"
                    maxLength={120}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-foreground">
                    <CreditCard className="size-3.5 inline mr-1.5 text-muted-foreground" />
                    CNPJ
                  </Label>
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-phone" className="text-foreground">
                    <Phone className="size-3.5 inline mr-1.5 text-muted-foreground" />
                    Telefone da empresa
                  </Label>
                  <Input
                    id="company-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    maxLength={20}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer-text" className="text-foreground">
                    <FileText className="size-3.5 inline mr-1.5 text-muted-foreground" />
                    Texto do rodapé
                  </Label>
                  <Input
                    id="footer-text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Ex: Coex Sistemas © 2026"
                    maxLength={200}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco" className="text-foreground">
                    <MapPin className="size-3.5 inline mr-1.5 text-muted-foreground" />
                    Endereço
                  </Label>
                  <Textarea
                    id="endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro, cidade, estado, CEP"
                    maxLength={300}
                    disabled={saving}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSaveBranding}
                disabled={saving || !brandingDirty}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar marca"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ModeCard({
  mode,
  isActive,
  onPick,
}: {
  mode: Mode;
  isActive: boolean;
  onPick: () => void;
}) {
  const Icon = mode === "light" ? Sun : mode === "graphite" ? Contrast : Moon;
  const label = mode === "graphite" ? "Grafite" : mode;
  return (
    <button
      type="button"
      role="radio"
      onClick={onPick}
      aria-checked={isActive}
      aria-label={`Usar modo ${mode}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors",
        isActive
          ? "border-primary/60 ring-2 ring-primary/40"
          : "border-border hover:border-border hover:bg-muted/40",
      )}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-semibold capitalize text-foreground">
        {label}
      </span>
      {isActive && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
          <Check className="h-3 w-3" />
          Ativo
        </span>
      )}
    </button>
  );
}

function ThemeCard({
  id,
  name,
  tagline,
  swatch,
  isActive,
  onPick,
}: {
  id: ThemeId;
  name: string;
  tagline: string;
  swatch: string;
  isActive: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={isActive}
      aria-label={`Usar tema ${name}`}
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors",
        isActive
          ? "border-primary/60 ring-2 ring-primary/40"
          : "border-border hover:border-border hover:bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          aria-hidden
          className="h-8 w-8 shrink-0 rounded-full"
          style={{
            background: swatch,
            boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.15)",
          }}
        />
        {isActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
            <Check className="h-3 w-3" />
            Active
          </span>
        )}
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{name}</div>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {tagline}
        </div>
      </div>
      <div
        className="mt-1 flex h-2 overflow-hidden rounded-full"
        aria-hidden
      >
        <span className="flex-1" style={{ background: swatch }} />
        <span className="w-3 bg-muted-foreground/60" />
        <span className="w-3 bg-muted" />
        <span className="w-3 bg-card" />
      </div>
      <span className="sr-only">ID do tema: {id}</span>
    </button>
  );
}
