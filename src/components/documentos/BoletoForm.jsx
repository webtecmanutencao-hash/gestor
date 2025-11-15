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
import { Loader, User, FileText, Banknote } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format, addDays } from "date-fns";

export default function BoletoForm({ onSubmit, onCancel, isLoading }) {
  const [clienteId, setClienteId] = useState('');
  const [parcelaId, setParcelaId] = useState('');
  const [formData, setFormData] = useState({
    tipo: 'boleto',
    data_emissao: format(new Date(), 'yyyy-MM-dd'),
    data_vencimento: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    valor: 0,
    valor_multa: 0,
    valor_juros_dia: 0,
    descricao: '',
    instrucoes: 'Não receber após o vencimento',
    observacoes: ''
  });
  
  const { toast } = useToast();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    initialData: [],
  });

  const { data: parcelas = [] } = useQuery({
    queryKey: ['parcelasPendentes'],
    queryFn: () => base44.entities.Parcela.filter({ status: 'pendente' }),
    initialData: [],
  });

  // Filtrar parcelas do cliente selecionado
  const parcelasDoCliente = clienteId 
    ? parcelas.filter(p => p.cliente_id === clienteId)
    : parcelas;

  const handleClienteSelect = (id) => {
    setClienteId(id);
    setParcelaId('');
    
    const cliente = clientes.find(c => c.id === id);
    if (cliente) {
      setFormData({
        ...formData,
        descricao: `Cobrança - ${cliente.name}`
      });
    }
  };

  const handleParcelaSelect = (id) => {
    setParcelaId(id);
    const parcela = parcelas.find(p => p.id === id);
    if (parcela) {
      setFormData({
        ...formData,
        valor: parcela.valor || 0,
        data_vencimento: parcela.data_vencimento || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        descricao: `Parcela ${parcela.numero_parcela} da venda #${parcela.numero_venda}`
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

    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast({
        title: "Atenção",
        description: "Por favor, informe o valor",
        variant: "warning"
      });
      return;
    }

    const cliente = clientes.find(c => c.id === clienteId);

    onSubmit({
      numero_boleto: `${formData.tipo === 'boleto' ? 'BOL' : 'FAT'}-${Date.now()}`,
      tipo: formData.tipo,
      venda_id: parcelaId ? parcelas.find(p => p.id === parcelaId)?.venda_id : null,
      parcela_id: parcelaId || null,
      cliente_id: clienteId,
      cliente_nome: cliente?.name || '',
      cliente_cpf_cnpj: cliente?.cpf_cnpj || '',
      cliente_endereco: cliente?.endereco || '',
      data_emissao: formData.data_emissao,
      data_vencimento: formData.data_vencimento,
      valor: parseFloat(formData.valor) || 0,
      valor_multa: parseFloat(formData.valor_multa) || 0,
      valor_juros_dia: parseFloat(formData.valor_juros_dia) || 0,
      descricao: formData.descricao,
      instrucoes: formData.instrucoes,
      observacoes: formData.observacoes,
      status: 'pendente',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de Documento */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-purple-600" />
            <Label className="text-base font-semibold">Tipo de Documento</Label>
          </div>
          <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boleto">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Boleto Bancário
                </div>
              </SelectItem>
              <SelectItem value="fatura">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Fatura
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-600 mt-2">
            {formData.tipo === 'boleto' 
              ? 'Boleto bancário para pagamento em banco/lotérica' 
              : 'Fatura para pagamento por transferência/PIX'}
          </p>
        </CardContent>
      </Card>

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
        </CardContent>
      </Card>

      {/* Vincular Parcela (Opcional) */}
      {clienteId && (
        <div className="space-y-2">
          <Label htmlFor="parcela">Vincular a Parcela Pendente (Opcional)</Label>
          <Select value={parcelaId} onValueChange={handleParcelaSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma parcela (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {parcelasDoCliente.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  Nenhuma parcela pendente para este cliente
                </div>
              ) : (
                parcelasDoCliente.map(parcela => (
                  <SelectItem key={parcela.id} value={parcela.id}>
                    Venda #{parcela.numero_venda} - Parcela {parcela.numero_parcela} - R$ {parcela.valor?.toFixed(2)} - Venc: {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy')}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Se for para uma parcela específica, selecione aqui para preencher automaticamente
          </p>
        </div>
      )}

      {/* Datas */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_emissao">Data de Emissão *</Label>
          <Input
            id="data_emissao"
            type="date"
            value={formData.data_emissao}
            onChange={(e) => setFormData({...formData, data_emissao: e.target.value})}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
          <Input
            id="data_vencimento"
            type="date"
            value={formData.data_vencimento}
            onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
            required
            min={formData.data_emissao}
          />
        </div>
      </div>

      {/* Valores */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="valor">Valor (R$) *</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({...formData, valor: e.target.value})}
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_multa">Multa após venc. (R$)</Label>
          <Input
            id="valor_multa"
            type="number"
            step="0.01"
            min="0"
            value={formData.valor_multa}
            onChange={(e) => setFormData({...formData, valor_multa: e.target.value})}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_juros_dia">Juros/dia (R$)</Label>
          <Input
            id="valor_juros_dia"
            type="number"
            step="0.01"
            min="0"
            value={formData.valor_juros_dia}
            onChange={(e) => setFormData({...formData, valor_juros_dia: e.target.value})}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Input
          id="descricao"
          value={formData.descricao}
          onChange={(e) => setFormData({...formData, descricao: e.target.value})}
          placeholder="Ex: Mensalidade de Janeiro, Parcela 1/3..."
          required
        />
      </div>

      {/* Instruções */}
      <div className="space-y-2">
        <Label htmlFor="instrucoes">Instruções de Pagamento</Label>
        <Textarea
          id="instrucoes"
          value={formData.instrucoes}
          onChange={(e) => setFormData({...formData, instrucoes: e.target.value})}
          rows={2}
          placeholder="Ex: Não receber após o vencimento, Pagamento aceito até..."
        />
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
          rows={2}
          placeholder="Observações adicionais..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !clienteId} className="bg-purple-600 hover:bg-purple-700">
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            `Gerar ${formData.tipo === 'boleto' ? 'Boleto' : 'Fatura'}`
          )}
        </Button>
      </div>
    </form>
  );
}