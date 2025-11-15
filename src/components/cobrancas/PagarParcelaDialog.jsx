import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Loader, CheckCircle, Calendar, DollarSign, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PagarParcelaDialog({ parcela, onConfirm, onCancel, isLoading }) {
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [observacoes, setObservacoes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar data de pagamento
    if (!dataPagamento) {
      alert("Por favor, informe a data do pagamento.");
      return;
    }
    
    onConfirm({
      data_pagamento: dataPagamento,
      observacoes: observacoes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações da Parcela */}
      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-5 h-5 text-blue-600" />
          <p className="text-sm text-slate-600">Cliente</p>
        </div>
        <p className="font-bold text-lg text-slate-900 mb-4">{parcela.cliente_nome}</p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-slate-600">Valor da Parcela</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              R$ {parcela.valor?.toFixed(2)}
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-slate-600">Vencimento</p>
            </div>
            <p className="text-lg font-semibold text-slate-900">
              {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>

        {parcela.numero_venda && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-slate-600">
              Venda: <Badge variant="outline">#{parcela.numero_venda}</Badge>
              {' '}| Parcela: <Badge variant="outline">{parcela.numero_parcela}</Badge>
            </p>
          </div>
        )}
      </div>

      {/* Formulário de Pagamento */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="data_pagamento" className="text-sm font-semibold">
            Data do Pagamento *
          </Label>
          <Input
            id="data_pagamento"
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            required
            max={format(new Date(), 'yyyy-MM-dd')} // Não permite datas futuras
            className="w-full"
          />
          <p className="text-xs text-slate-500">
            Informe a data em que o pagamento foi realizado
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacoes" className="text-sm font-semibold">
            Observações
          </Label>
          <Textarea
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            placeholder="Ex: Pago via PIX, comprovante nº 12345..."
            className="w-full"
          />
          <p className="text-xs text-slate-500">
            Forma de pagamento, notas adicionais, número do comprovante, etc.
          </p>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Pagamento
            </>
          )}
        </Button>
      </div>

      {/* Aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-800">
          <strong>Atenção:</strong> Após confirmar o pagamento, a parcela será marcada como paga e esta ação não poderá ser desfeita facilmente.
        </p>
      </div>
    </form>
  );
}