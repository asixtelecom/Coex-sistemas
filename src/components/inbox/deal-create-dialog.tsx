"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SERVICE_TYPES = [
  "Mudança residencial",
  "Mudança Comercial",
  "Mudança Iterestadual",
  "Içamento",
  "Guarda Volume",
  "Transportes de Cargas",
  "Montagem + Desmontagem",
  "Montagem",
  "Desmontagem",
  "armazenamento",
  "Transporte",
]

interface DealCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactName: string
  onSubmit: (data: DealFormData) => void
}

export interface DealFormData {
  serviceType: string
  originAddress: string
  destinationAddress: string
  movingDate: string
}

export function DealCreateDialog({
  open,
  onOpenChange,
  contactName,
  onSubmit,
}: DealCreateDialogProps) {
  const [serviceType, setServiceType] = useState("")
  const [originAddress, setOriginAddress] = useState("")
  const [destinationAddress, setDestinationAddress] = useState("")
  const [movingDate, setMovingDate] = useState("")

  const handleSubmit = () => {
    onSubmit({ serviceType, originAddress, destinationAddress, movingDate })
    setOriginAddress("")
    setDestinationAddress("")
    setMovingDate("")
    setServiceType("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tipo de Serviços</DialogTitle>
          <DialogDescription>
            Preencha os dados para {contactName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="serviceType">Tipo de Serviço</Label>
            <select
              id="serviceType"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecione um tipo de serviço</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="originAddress">Endereço de Origem</Label>
            <Input
              id="originAddress"
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationAddress">Destino</Label>
            <Input
              id="destinationAddress"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movingDate">Data da Mudança</Label>
            <Input
              id="movingDate"
              type="date"
              value={movingDate}
              onChange={(e) => setMovingDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!serviceType}>Criar Negócio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
