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
import { ServiceSelector } from "@/components/ui/service-selector"
import { servicesToString } from "@/lib/services"

interface DealCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactName: string
  onSubmit: (data: DealFormData) => void
  onSave?: (data: DealFormData) => void
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
  onSave,
}: DealCreateDialogProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [originAddress, setOriginAddress] = useState("")
  const [destinationAddress, setDestinationAddress] = useState("")
  const [movingDate, setMovingDate] = useState("")

  const handleSubmit = () => {
    onSubmit({ serviceType: servicesToString(selectedServices), originAddress, destinationAddress, movingDate })
    setOriginAddress("")
    setDestinationAddress("")
    setMovingDate("")
    setSelectedServices([])
    onOpenChange(false)
  }

  const handleSave = () => {
    if (onSave) {
      onSave({ serviceType, originAddress, destinationAddress, movingDate })
    }
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
            <Label>Tipo de Serviço</Label>
            <ServiceSelector
              value={selectedServices}
              onChange={setSelectedServices}
            />
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
          <Button onClick={handleSubmit} disabled={selectedServices.length === 0}>Criar Negócio</Button>
          {onSave && (
            <Button variant="secondary" onClick={handleSave}>
              Salvar
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!serviceType}>Criar Negócio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
