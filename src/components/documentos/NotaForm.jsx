import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Loader } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function NotaForm({ onSubmit, onCancel, isLoading }) {
  const [vendaId, setVendaId] = useState('');
  const [itens, setItens] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const { toast } = useToast();

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date'),
    initialData: [],
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    initialData: [],
  });

  const handleVendaSelect = (id) => {
    setVendaId(id);
    const venda = vendas.find(v => v.id === id);
    if (venda && venda.itens) {
      setItens(venda.itens.map(item => ({
        descricao: item.produto_nome || item.descricao || '',
        quantidade: item.quantidade || 1,
        valor_unitario: item.valor_unitario || 0,
        valor_total: (item.quantidade || 1) * (item.valor_unitario || 0)
      })));
    }
  };

  const addItem = () => {
    setItens([...itens, { descricao: '', quantidade: 1, valor_unitario: 0, valor_total: 0 }]);
  };

  const removeItem = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItens = [...itens];
    newItens[index][field] = value;

    if (field === 'quantidade' || field === 'valor_unitario') {
      const qtd = parseFloat(newItens[index].quantidade) || 0;
      const valor = parseFloat(newItens[index].valor_unitario) || 0;
      newItens[index].valor_total = qtd * valor;
    }

    setItens(newItens);
  };

  const valorTotal = itens.reduce((sum, item) => sum + (parseFloat(item.valor_total) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    const venda = vendas.find(v => v.id === vendaId);
    if (!venda) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione uma venda",
        variant: "warning"
      });
      return;
    }

    if (itens.length === 0) {
      toast({
        title: "Atenção",
        description: "Adicione pelo menos um item à nota",
        variant: "warning"
      });
      return;
    }

    // Buscar dados do cliente
    const cliente = clientes.find(c => c.id === venda.cliente_id);

    onSubmit({
      numero_nota: `NFS-${Date.now()}`,
      venda_id: vendaId,
      cliente_id: venda.cliente_id,
      cliente_nome: venda.cliente_nome,
      cliente_cpf_cnpj: cliente?.cpf_cnpj || '',
      cliente_endereco: cliente?.endereco || '',
      data_emissao: new Date().toISOString().split('T')[0],
      itens: itens.map(item => ({
        ...item,
        quantidade: parseFloat(item.quantidade) || 0,
        valor_unitario: parseFloat(item.valor_unitario) || 0,
        valor_total: parseFloat(item.valor_total) || 0,
      })),
      valor_total: valorTotal,
      observacoes: observacoes,
      status: 'ativa',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="venda">Selecionar Venda *</Label>
        <Select value={vendaId} onValueChange={handleVendaSelect} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma venda" />
          </SelectTrigger>
          <SelectContent>
            {vendas.map(venda => (
              <SelectItem key={venda.id} value={venda.id}>
                {venda.numero_venda} - {venda.cliente_nome} - R$ {venda.valor_total?.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-2 border-dashed">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Itens da Nota</h3>
            <Button type="button" onClick={addItem} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          </div>

          <div className="space-y-3">
            {itens.map((item, index) => (
              <div key={index} className="grid md:grid-cols-5 gap-3 items-end p-3 bg-slate-50 rounded-lg">
                <div className="md:col-span-2">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={item.descricao}
                    onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                    placeholder="Descrição do serviço"
                  />
                </div>

                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantidade}
                    onChange={(e) => updateItem(index, 'quantidade', e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs">Valor Unit.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.valor_unitario}
                    onChange={(e) => updateItem(index, 'valor_unitario', e.target.value)}
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Total</Label>
                    <Input
                      type="text"
                      value={`R$ ${item.valor_total.toFixed(2)}`}
                      disabled
                      className="bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {itens.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                Selecione uma venda para carregar os itens ou adicione manualmente
              </p>
            )}
          </div>

          {itens.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Valor Total:</span>
                <span className="text-2xl font-bold text-emerald-600">
                  R$ {valorTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          placeholder="Observações adicionais sobre a nota fiscal..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || itens.length === 0}>
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Emitindo...
            </>
          ) : (
            'Emitir Nota'
          )}
        </Button>
      </div>
    </form>
  );
}