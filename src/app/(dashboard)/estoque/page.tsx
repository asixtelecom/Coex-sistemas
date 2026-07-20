"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface AlmoxarifadoItem {
  id: string
  name: string
  quantity: number
  unit: string
  location: string | null
  min_stock: number | null
  cost: number | null
  obs: string | null
}

const DEFAULT_UNITS = [
  "UN", "PCT", "CX", "KG", "M", "L", "PC", "RL", "FD", "PAR",
]

export default function AlmoxarifadoPage() {
  const { account } = useAuth()
  const supabase = createClient()
  const [items, setItems] = useState<AlmoxarifadoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AlmoxarifadoItem | null>(null)
  const [form, setForm] = useState({
    name: "",
    quantity: 0,
    unit: "UN",
    location: "",
    min_stock: 0,
    cost: 0,
    obs: "",
  })

  async function loadItems() {
    if (!account?.id) return
    const { data } = await supabase
      .from("estoque_items")
      .select("*")
      .eq("account_id", account.id)
      .order("name")
    if (data) setItems(data)
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  }, [account?.id])

  function openNew() {
    setEditingItem(null)
    setForm({ name: "", quantity: 0, unit: "UN", location: "", min_stock: 0, cost: 0, obs: "" })
    setDialogOpen(true)
  }

  function openEdit(item: AlmoxarifadoItem) {
    setEditingItem(item)
    setForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location || "",
      min_stock: item.min_stock || 0,
      cost: item.cost || 0,
      obs: item.obs || "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!account?.id) return
    const payload = {
      account_id: account.id,
      name: form.name,
      quantity: form.quantity,
      unit: form.unit,
      location: form.location || null,
      min_stock: form.min_stock || null,
      cost: form.cost || null,
      obs: form.obs || null,
    }

    if (editingItem) {
      await supabase.from("almoxarifado_items").update(payload).eq("id", editingItem.id)
    } else {
      await supabase.from("almoxarifado_items").insert(payload)
    }

    setDialogOpen(false)
    loadItems()
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este item?")) return
    await supabase.from("almoxarifado_items").delete().eq("id", id)
    loadItems()
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button />}
            onClick={openNew}
          >
            <Plus className="mr-1 h-4 w-4" /> Novo Item
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <select
                    className="flex h-8 w-full min-w-0 rounded-lg border border-border bg-muted px-2.5 py-1 text-sm text-foreground"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Localização</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estoque Mínimo</Label>
                  <Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Valor Custo</Label>
                  <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Obs</Label>
                <Input value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">Nenhum item cadastrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Un</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Est. Mín</TableHead>
              <TableHead>Vlr Custo</TableHead>
              <TableHead>Obs</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>{item.location || "-"}</TableCell>
                <TableCell>{item.min_stock ?? "-"}</TableCell>
                <TableCell>{item.cost != null ? `R$ ${item.cost.toFixed(2)}` : "-"}</TableCell>
                <TableCell className="max-w-[150px] truncate">{item.obs || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <span className="text-destructive">X</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
