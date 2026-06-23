"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { getPixSettings, savePixSettings } from "@/lib/channels/pix-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle } from "lucide-react"
import { toast } from "sonner"

const PIX_PROVIDERS = [
  { value: "generic", label: "Genérico (Copia e Cola)" },
  { value: "asaas", label: "Asaas" },
  { value: "gerencia_net", label: "GerenciaNet" },
  { value: "mercado_pago", label: "Mercado Pago" },
  { value: "picpay", label: "PicPay" },
]

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave aleatória" },
]

export function PixConfig() {
  const { accountId } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState("generic")
  const [apiKey, setApiKey] = useState("")
  const [apiUrl, setApiUrl] = useState("")
  const [pixKey, setPixKey] = useState("")
  const [pixKeyType, setPixKeyType] = useState("cpf")
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!accountId) return
    const fetch = async () => {
      const settings = await getPixSettings(accountId)
      if (settings) {
        setProvider(settings.provider)
        setApiKey(settings.api_key || "")
        setApiUrl(settings.api_url || "")
        setPixKey(settings.pix_key || "")
        setPixKeyType(settings.pix_key_type)
        setEnabled(settings.enabled)
      }
      setLoading(false)
    }
    fetch()
  }, [accountId])

  const handleSave = async () => {
    if (!accountId) return
    setSaving(true)
    const { error } = await savePixSettings(accountId, {
      provider,
      api_key: apiKey || null,
      api_url: apiUrl || null,
      pix_key: pixKey || null,
      pix_key_type: pixKeyType,
      enabled,
    })
    setSaving(false)
    if (error) {
      toast.error("Erro ao salvar: " + error.message)
    } else {
      toast.success("Configurações salvas!")
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Pagamentos PIX
        </CardTitle>
        <CardDescription>
          Configure a integração para receber pagamentos via PIX.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Ativar PIX</Label>
            <p className="text-xs text-muted-foreground">Habilita geração de cobranças PIX</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label>Provedor</Label>
          <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIX_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {provider !== "generic" && (
          <>
            <div className="space-y-2">
              <Label>API Key / Token</Label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Token de acesso da API"
                type="password"
              />
            </div>
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.asaas.com/v3"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Chave PIX</Label>
          <Input
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="Sua chave PIX"
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo da Chave</Label>
          <Select value={pixKeyType} onValueChange={(v) => v && setPixKeyType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIX_KEY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  )
}
