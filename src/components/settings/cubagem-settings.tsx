'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Search, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingsPanelHead } from './settings-panel-head';

interface MasterItem {
  id: number;
  item_name: string;
  default_m3: number;
  item_value: number;
}

export function CubagemSettings() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editM3, setEditM3] = useState('');
  const [editValor, setEditValor] = useState('');
  const [newName, setNewName] = useState('');
  const [newM3, setNewM3] = useState('');
  const [newValor, setNewValor] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cubagem/master-items');
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      }
    } catch {
      toast.error('Erro ao carregar itens');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = search.trim()
    ? items.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const startEdit = (item: MasterItem) => {
    setEditingId(item.id);
    setEditName(item.item_name);
    setEditM3(String(item.default_m3));
    setEditValor(String(item.item_value));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditM3('');
    setEditValor('');
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) {
      toast.error('Nome do item é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/cubagem/master-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: editName.trim(),
          default_m3: Number(editM3) || 0,
          item_value: Number(editValor) || 0,
        }),
      });
      if (!res.ok) {
        toast.error('Erro ao atualizar item');
        return;
      }
      toast.success('Item atualizado');
      cancelEdit();
      fetchItems();
    } catch {
      toast.error('Erro ao atualizar item');
    }
    setSaving(false);
  };

  const deleteItem = async (id: number, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    try {
      const res = await fetch(`/api/cubagem/master-items/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Erro ao excluir item');
        return;
      }
      toast.success('Item excluído');
      fetchItems();
    } catch {
      toast.error('Erro ao excluir item');
    }
  };

  const addItem = async () => {
    if (!newName.trim()) {
      toast.error('Nome do item é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/cubagem/master-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: newName.trim(),
          default_m3: Number(newM3) || 0,
          item_value: Number(newValor) || 0,
        }),
      });
      if (!res.ok) {
        toast.error('Erro ao adicionar item');
        return;
      }
      toast.success('Item adicionado');
      setNewName('');
      setNewM3('');
      setNewValor('');
      setAdding(false);
      fetchItems();
    } catch {
      toast.error('Erro ao adicionar item');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <SettingsPanelHead
        title="Itens de Inventário"
        description="Gerencie os itens e suas cubagens (m³) usados no cadastro de inventários."
      />

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="size-4 mr-2" />
          Novo Item
        </Button>
      </div>

      {adding && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label>Nome do item</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Sofá 3 lugares"
              />
            </div>
            <div className="space-y-1">
              <Label>Cubagem (m³)</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={newM3}
                onChange={(e) => setNewM3(e.target.value)}
                placeholder="0,000"
              />
            </div>
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newValor}
                onChange={(e) => setNewValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewName(''); setNewM3(''); setNewValor(''); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={addItem} disabled={saving}>
              {saving && <Loader2 className="size-3 mr-1 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'Nenhum item encontrado' : 'Nenhum item cadastrado. Clique em "Novo Item" para adicionar.'}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-center p-3 font-medium w-32">Cubagem (m³)</th>
                <th className="text-center p-3 font-medium w-32">Valor (R$)</th>
                <th className="text-right p-3 font-medium w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                  {editingId === item.id ? (
                    <>
                      <td className="p-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={editM3}
                          onChange={(e) => setEditM3(e.target.value)}
                          className="h-8 text-center"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editValor}
                          onChange={(e) => setEditValor(e.target.value)}
                          className="h-8 text-center"
                        />
                      </td>
                      <td className="p-1 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => saveEdit(item.id)} disabled={saving}>
                            <Check className="size-3.5 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7" onClick={cancelEdit}>
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">{item.item_name}</td>
                      <td className="p-3 text-center">{Number(item.default_m3).toFixed(3).replace('.', ',')}</td>
                      <td className="p-3 text-center">R$ {Number(item.item_value).toFixed(2).replace('.', ',')}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => startEdit(item)} title="Editar">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => deleteItem(item.id, item.item_name)} title="Excluir">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
