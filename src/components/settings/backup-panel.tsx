"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, Database, Trash2, Clock, HardDrive, Loader2, Plus, MessageSquare, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { SettingsPanelHead } from "./settings-panel-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BackupFile {
  name: string;
  size: number;
  created: string;
}

interface ChannelInfo {
  id: string;
  type: string;
  name: string;
  status: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Clear conversations state
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [channelCounts, setChannelCounts] = useState<Record<string, number>>({});
  const [totalConversations, setTotalConversations] = useState(0);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "confirm" | "password">("select");

  async function loadBackups() {
    setLoading(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBackups(data.backups || []);
    } catch {
      toast.error("Erro ao listar backups");
    } finally {
      setLoading(false);
    }
  }

  async function loadChannels() {
    try {
      const res = await fetch("/api/clear-conversations");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChannels(data.channels || []);
      setChannelCounts(data.channelCounts || {});
      setTotalConversations(data.totalConversations || 0);
    } catch {
      console.error("Erro ao carregar canais");
    }
  }

  useEffect(() => { loadBackups(); }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success("Backup criado: " + data.filename);
      loadBackups();
    } catch {
      toast.error("Erro ao criar backup");
    } finally {
      setCreating(false);
    }
  }

  function handleDownload(filename: string) {
    window.open(`/api/backup?file=${encodeURIComponent(filename)}`, "_blank");
  }

  async function handleDelete(filename: string) {
    try {
      await fetch(`/api/backup?file=${encodeURIComponent(filename)}`, { method: "DELETE" });
      toast.success("Backup removido");
      loadBackups();
    } catch {
      toast.error("Erro ao remover backup");
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/backup", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      toast.success("Backup restaurado com sucesso!");
    } catch {
      toast.error("Erro ao restaurar backup");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openClearDialog() {
    loadChannels();
    setSelectedChannels([]);
    setPassword("");
    setStep("select");
    setClearDialogOpen(true);
  }

  function toggleChannel(channelId: string) {
    setSelectedChannels(prev =>
      prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId]
    );
  }

  function selectAllChannels() {
    const whatsappChannels = channels.filter(c => c.type === "whatsapp").map(c => c.id);
    setSelectedChannels(whatsappChannels);
  }

  function handleNextStep() {
    if (step === "select") {
      if (selectedChannels.length === 0) {
        toast.error("Selecione pelo menos um canal");
        return;
      }
      setStep("confirm");
    } else if (step === "confirm") {
      setStep("password");
    }
  }

  async function handleClearConversations() {
    if (password !== "010101aa") {
      toast.error("Senha incorreta!");
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/clear-conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          channelIds: selectedChannels,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao limpar conversas");
        return;
      }

      toast.success(`${data.deleted} conversa(s) limpa(s) com sucesso!`);
      setClearDialogOpen(false);
      setPassword("");
      setSelectedChannels([]);
      setStep("select");
    } catch {
      toast.error("Erro ao limpar conversas");
    } finally {
      setClearing(false);
    }
  }

  const whatsappChannels = channels.filter(c => c.type === "whatsapp");
  const selectedCount = selectedChannels.length;
  const totalWhatsappConversations = whatsappChannels.reduce((sum, ch) => sum + (channelCounts[ch.id] || 0), 0);

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Backup e Restauração"
        description="Crie, baixe ou restaure backups dos dados da sua conta."
      />

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {creating ? "Criando..." : "Criar Backup"}
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {uploading ? "Restaurando..." : "Restaurar de Arquivo"}
        </Button>
        <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleRestore} />
      </div>

      {/* Clear Conversations Section */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <MessageSquare className="h-4 w-4 text-destructive" />
            <h3 className="font-semibold text-sm">Limpar Conversas</h3>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Remova todas as conversas e mensagens dos canais conectados.
              Esta ação é irreversível.
            </p>
            <Button variant="destructive" onClick={openClearDialog}>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Conversas
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Backups Salvos no Servidor</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum backup encontrado. Crie um para começar.
            </div>
          ) : (
            <div className="divide-y">
              {backups.map((b) => (
                <div key={b.name} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(b.created).toLocaleString("pt-BR")} — {formatSize(b.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(b.name)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(b.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear Conversations Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Limpar Conversas
            </DialogTitle>
            <DialogDescription>
              {step === "select" && "Selecione os canais que deseja limpar."}
              {step === "confirm" && "Confirme a limpeza das conversas selecionadas."}
              {step === "password" && "Digite a senha para confirmar a limpeza."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {step === "select" && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Canais WhatsApp ({whatsappChannels.length})
                  </p>
                  <Button variant="link" size="sm" onClick={selectAllChannels} className="h-auto p-0 text-xs">
                    Selecionar todos
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {whatsappChannels.map((channel) => {
                    const count = channelCounts[channel.id] || 0;
                    const isSelected = selectedChannels.includes(channel.id);
                    return (
                      <label
                        key={channel.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleChannel(channel.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{channel.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {count} conversa{count === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className={`text-xs ${channel.status === "connected" ? "text-green-500" : "text-muted-foreground"}`}>
                          {channel.status === "connected" ? "Conectado" : "Desconectado"}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {selectedCount > 0 && (
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">
                      <strong>{selectedCount}</strong> canal(is) selecionado(s) com{" "}
                      <strong>{totalWhatsappConversations}</strong> conversa(s) serão limpas.
                    </p>
                  </div>
                )}
              </>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-semibold text-destructive">Atenção!</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Você está prestes a limpar <strong>{selectedCount}</strong> canal(is) WhatsApp
                    com um total de <strong>{totalWhatsappConversations}</strong> conversa(s).
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Esta ação é <strong>irreversível</strong>. Todas as mensagens e conversas serão
                    permanentemente removidas.
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium mb-2">Canais selecionados:</p>
                  {selectedChannels.map(chId => {
                    const ch = channels.find(c => c.id === chId);
                    if (!ch) return null;
                    return (
                      <p key={chId} className="text-sm text-muted-foreground">
                        • {ch.name} ({channelCounts[ch.id] || 0} conversas)
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {step === "password" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">
                    Digite a senha de confirmação para proceder com a limpeza de{" "}
                    <strong>{totalWhatsappConversations}</strong> conversa(s).
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Senha de confirmação</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite a senha"
                      className="pr-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && password) {
                          handleClearConversations();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (step === "password") setStep("confirm");
              else if (step === "confirm") setStep("select");
              else setClearDialogOpen(false);
            }}>
              {step === "select" ? "Cancelar" : "Voltar"}
            </Button>

            {step === "select" && (
              <Button onClick={handleNextStep} disabled={selectedCount === 0}>
                Próximo
              </Button>
            )}

            {step === "confirm" && (
              <Button variant="destructive" onClick={handleNextStep}>
                Confirmar
              </Button>
            )}

            {step === "password" && (
              <Button
                variant="destructive"
                onClick={handleClearConversations}
                disabled={!password || clearing}
              >
                {clearing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar Agora
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
