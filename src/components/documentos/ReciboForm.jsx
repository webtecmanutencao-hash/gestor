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
import { format } from "date-fns";
import { Loader, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function ReciboForm({ onSubmit, onCancel, isLoading }) {
  const [clienteId, setClienteId] = useState('');
  const [parcelaId, setParcelaId] = useState('');
  const [formData, setFormData] = useState({
    valor_pago: 0,
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    forma_pagamento: 'Dinheiro',
    referente_a: '',
    observacoes: ''
  });
  const { toast } = useToast();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    initialData: [],
  });

  const { data: parcelas = [] } = useQuery({
    queryKey: ['parcelasPagas'],
    queryFn: () => base44.entities.Parcela.filter({ status: 'pago' }),
    initialData: [],
  });

  // Filtrar parcelas do cliente selecionado
  const parcelasDoCliente = clienteId 
    ? parcelas.filter(p => p.cliente_id === clienteId)
    : parcelas;

  const handleClienteSelect = (id) => {
    setClienteId(id);
    setParcelaId(''); // Limpa parcela ao trocar cliente
    
    const cliente = clientes.find(c => c.id === id);
    if (cliente) {
      setFormData({
        ...formData,
        referente_a: `Pagamento recebido de ${cliente.name}`
      });
    }
  };

  const handleParcelaSelect = (id) => {
    setParcelaId(id);
    const parcela = parcelas.find(p => p.id === id);
    if (parcela) {
      setFormData({
        ...formData,
        valor_pago: parcela.valor || 0,
        data_pagamento: parcela.data_pagamento || format(new Date(), 'yyyy-MM-dd'),
        referente_a: `Pagamento da parcela ${parcela.numero_parcela} da venda #${parcela.numero_venda}`
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!clienteId) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione um cliente",
        variant: "warning"
      });
      return;
    }

    if (!formData.valor_pago || parseFloat(formData.valor_pago) <= 0) {
      toast({
        title: "Atenção",
        description: "Por favor, informe o valor pago",
        variant: "warning"
      });
      return;
    }

    // Buscar dados do cliente
    const cliente = clientes.find(c => c.id === clienteId);

    onSubmit({
      numero_recibo: `REC-${Date.now()}`,
      venda_id: parcelaId ? parcelas.find(p => p.id === parcelaId)?.venda_id : null,
      parcela_id: parcelaId || null,
      cliente_id: clienteId,
      cliente_nome: cliente?.name || '',
      cliente_cpf_cnpj: cliente?.cpf_cnpj || '',
      data_pagamento: formData.data_pagamento,
      valor_pago: parseFloat(formData.valor_pago) || 0,
      forma_pagamento: formData.forma_pagamento,
      referente_a: formData.referente_a,
      observacoes: formData.observacoes,
      status: 'ativo',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seleção de Cliente */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-blue-600" />
            <Label className="text-base font-semibold">Selecionar Cliente *</Label>
          </div>
          <Select value={clienteId} onValueChange={handleClienteSelect} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  Nenhum cliente cadastrado
                </div>
              ) : (
                clientes.map(cliente => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.name} {cliente.cpf_cnpj ? `- ${cliente.cpf_cnpj}` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-600 mt-2">
            Selecione o cliente que realizou o pagamento
          </p>
        </CardContent>
      </Card>

      {/* Seleção de Parcela (Opcional) */}
      {clienteId && (
        <div className="space-y-2">
          <Label htmlFor="parcela">Vincular a Parcela Paga (Opcional)</Label>
          <Select value={parcelaId} onValueChange={handleParcelaSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma parcela (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {parcelasDoCliente.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  Nenhuma parcela paga encontrada para este cliente
                </div>
              ) : (
                parcelasDoCliente.map(parcela => (
                  <SelectItem key={parcela.id} value={parcela.id}>
                    Venda #{parcela.numero_venda} - Parcela {parcela.numero_parcela} - R$ {parcela.valor?.toFixed(2)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Se o recibo for para uma parcela específica, selecione aqui. Caso contrário, deixe em branco.
          </p>
        </div>
      )}

      {/* Dados do Pagamento */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="valor_pago">Valor Pago (R$) *</Label>
          <Input
            id="valor_pago"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.valor_pago}
            onChange={(e) => setFormData({...formData, valor_pago: e.target.value})}
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_pagamento">Data do Pagamento *</Label>
          <Input
            id="data_pagamento"
            type="date"
            value={formData.data_pagamento}
            onChange={(e) => setFormData({...formData, data_pagamento: e.target.value})}
            required
            max={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
        <Select 
          value={formData.forma_pagamento} 
          onValueChange={(v) => setFormData({...formData, forma_pagamento: v})}
        >
          <SelectTrigger id="forma_pagamento">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
            <SelectItem value="PIX">PIX</SelectItem>
            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
            <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
            <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
            <SelectItem value="Boleto">Boleto</SelectItem>
            <SelectItem value="Cheque">Cheque</SelectItem>
            <SelectItem value="Outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="referente_a">Referente a *</Label>
        <Input
          id="referente_a"
          value={formData.referente_a}
          onChange={(e) => setFormData({...formData, referente_a: e.target.value})}
          placeholder="Ex: Pagamento de produto, serviço, parcela..."
          required
        />
        <p className="text-xs text-slate-500">
          Descreva o motivo do pagamento
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
          rows={3}
          placeholder="Observações adicionais..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !clienteId}>
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Emitindo...
            </>
          ) : (
            'Emitir Recibo'
          )}
        </Button>
      </div>
    </form>
  );
}