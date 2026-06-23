"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { listSignatureDocuments } from "@/lib/channels/zapsign-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileSignature, ExternalLink } from "lucide-react"

interface SignatureDocument {
  id: string
  title: string
  description: string | null
  file_name: string | null
  signer_name: string | null
  signer_email: string | null
  status: string
  created_at: string
  signed_at: string | null
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  sent: { label: "Enviado", variant: "outline" },
  signed: { label: "Assinado", variant: "default" },
  expired: { label: "Expirado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
}

export default function AssinaturasPage() {
  const { accountId } = useAuth()
  const [documents, setDocuments] = useState<SignatureDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    listSignatureDocuments(accountId).then((data) => {
      setDocuments(data as SignatureDocument[])
      setLoading(false)
    })
  }, [accountId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Assinaturas Digitais</h1>
        <p className="mt-1 text-sm text-muted-foreground">Documentos enviados para assinatura via Zapsign</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum documento encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{doc.title}</CardTitle>
                  </div>
                  <Badge variant={statusMap[doc.status]?.variant || "outline"}>
                    {statusMap[doc.status]?.label || doc.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  {doc.description && <p>{doc.description}</p>}
                  {doc.file_name && <p>Arquivo: {doc.file_name}</p>}
                  {doc.signer_name && <p>Signatário: {doc.signer_name} ({doc.signer_email})</p>}
                  <p>Enviado em: {new Date(doc.created_at).toLocaleString("pt-BR")}</p>
                  {doc.signed_at && <p>Assinado em: {new Date(doc.signed_at).toLocaleString("pt-BR")}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
