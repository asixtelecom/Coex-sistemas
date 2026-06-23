"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { listPixPayments, createPixPayment } from "@/lib/channels/pix-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Copy, Check, QrCode, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface PixPayment {
  id: string
  amount: number
  description: string | null
  status: string
  qr_code: string | null
  qr_code_url: string | null
  copy_paste_key: string | null
  created_at: string
  paid_at: string | null
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  paid: { label: "Pago", variant: "default" },
  expired: { label: "Expirado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
}

export default function PagamentosPage() {
  const { accountId } = useAuth()
  const supabase = createClient()
  const [payments, setPayments] = useState<PixPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    listPixPayments(accountId).then((data) => {
      setPayments(data as PixPayment[])
      setLoading(false)
    })
  }, [accountId])

  const handleCreate = async () => {
    if (!accountId || !amount) return
    setCreating(true)
    try {
      const payment = await createPixPayment({
        account_id: accountId,
        amount: parseFloat(amount),
        description: description || undefined,
      })
      setPayments((prev) => [payment as PixPayment, ...prev])
      setOpen(false)
      setAmount("")
      setDescription("")
      toast.success("Cobrança criada!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cobranças via PIX</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Nova Cobrança
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Cobrança PIX</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  type="number"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do pagamento"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !amount} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Criar Cobrança
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma cobrança encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{formatCurrency(p.amount)}</CardTitle>
                  <Badge variant={statusMap[p.status]?.variant || "outline"}>
                    {statusMap[p.status]?.label || p.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  {p.description && <p>{p.description}</p>}
                  <p>Criado em: {new Date(p.created_at).toLocaleString("pt-BR")}</p>
                  {p.paid_at && <p>Pago em: {new Date(p.paid_at).toLocaleString("pt-BR")}</p>}
                </div>
                {p.copy_paste_key && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <code className="text-xs flex-1 truncate">{p.copy_paste_key}</code>
                    <button
                      onClick={() => copyToClipboard(p.copy_paste_key!, p.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === p.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
