"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getZapsignSettings, saveZapsignSettings } from "@/lib/channels/zapsign-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSignature } from "lucide-react"
import { toast } from "sonner"

export function ZapsignConfig() {
  const { accountId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!accountId) return
    const fetch = async () => {
      const settings = await getZapsignSettings(accountId)
      if (settings) {
        setApiKey(settings.api_key || "")
        setEnabled(settings.enabled)
      }
      setLoading(false)
    }
    fetch()
  }, [accountId])

  const handleSave = async () => {
    if (!accountId) return
    setSaving(true)
    const { error } = await saveZapsignSettings(accountId, {
      api_key: apiKey || null,
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
          <FileSignature className="h-5 w-5" />
          Zapsign - Assinatura Digital
        </CardTitle>
        <CardDescription>
          Configure a API do Zapsign para enviar contratos para assinatura digital.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Ativar Zapsign</Label>
            <p className="text-xs text-muted-foreground">Habilita envio de documentos para assinatura</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label>API Key</Label>
          <Input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Sua chave de API do Zapsign"
            type="password"
          />
          <p className="text-xs text-muted-foreground">
            Encontre sua API Key em zapsign.com.br &gt; Configurações &gt; API
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  )
}
