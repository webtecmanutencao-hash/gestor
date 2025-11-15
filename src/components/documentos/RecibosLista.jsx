import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Receipt, Plus, Search, Eye, Calendar, Loader } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

import ReciboForm from "./ReciboForm";
import ReciboDetalhes from "./ReciboDetalhes";
import CupomFiscalDialog from "./CupomFiscalDialog";

export default function RecibosLista() {
  const [showForm, setShowForm] = useState(false);
  const [selectedRecibo, setSelectedRecibo] = useState(null);
  const [showCupomDialog, setShowCupomDialog] = useState(false);
  const [reciboParaCupom, setReciboParaCupom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recibos = [], isLoading } = useQuery({
    queryKey: ['recibos'],
    queryFn: () => base44.entities.Recibo.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Recibo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recibos'] });
      toast({
        title: "✅ Recibo Gerado!",
        description: "O recibo foi criado com sucesso.",
        variant: "success"
      });
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "❌ Erro ao gerar recibo",
        description: error.message || "Ocorreu um erro ao criar o recibo.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data) => {
    createMutation.mutate(data);
  };

  const handleImprimirCupom = (recibo) => {
    setReciboParaCupom(recibo);
    setShowCupomDialog(true);
  };

  const filteredRecibos = recibos.filter(recibo => {
    const isCanceled = recibo.status === 'cancelado';
    const matchesSearch = (recibo.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           recibo.numero_recibo?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (searchTerm) {
      return matchesSearch;
    } else {
      return !isCanceled;
    }
  });

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Recibos de Pagamento</h2>
        <Button 
          onClick={() => setShowForm(true)} 
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Gerar Recibo
        </Button>
      </div>

      <Card className="mb-6 shadow-lg">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Buscar por cliente ou número do recibo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-slate-500">Carregando recibos...</p>
            </CardContent>
          </Card>
        ) : filteredRecibos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">
                {searchTerm ? 'Nenhum recibo encontrado' : 'Nenhum recibo gerado ainda'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)}>
                  Gerar Primeiro Recibo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredRecibos.map((recibo) => (
            <Card key={recibo.id} className={`shadow-md hover:shadow-lg transition-shadow ${recibo.status === 'cancelado' ? 'opacity-60' : ''}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Recibo #{recibo.numero_recibo}
                        </h3>
                        <p className="text-slate-600">{recibo.cliente_nome}</p>
                      </div>
                      <Badge variant={recibo.status === 'cancelado' ? 'destructive' : 'success'}>
                        {recibo.status === 'cancelado' ? 'Cancelado' : 'Emitido'}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-600" />
                        <span>
                          {format(new Date(recibo.data_pagamento), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Valor:</span>{' '}
                        <span className={`font-bold ${recibo.status === 'cancelado' ? 'line-through text-slate-500' : 'text-emerald-600'}`}>
                          R$ {recibo.valor_pago?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {recibo.status === 'cancelado' && recibo.motivo_cancelamento && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <p className="font-semibold text-red-900">Motivo do Cancelamento:</p>
                        <p className="text-red-800">{recibo.motivo_cancelamento}</p>
                        {recibo.data_cancelamento && (
                          <p className="text-xs text-red-600 mt-1">
                            Cancelado em: {format(new Date(recibo.data_cancelamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRecibo(recibo)}
                      className="flex-1 md:flex-none"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                    {recibo.status !== 'cancelado' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImprimirCupom(recibo)}
                        className="flex-1 md:flex-none text-purple-600 border-purple-600 hover:bg-purple-50"
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Cupom
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Gerar Recibo */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Novo Recibo</DialogTitle>
          </DialogHeader>
          <ReciboForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={!!selectedRecibo} onOpenChange={() => setSelectedRecibo(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Recibo</DialogTitle>
          </DialogHeader>
          {selectedRecibo && <ReciboDetalhes recibo={selectedRecibo} />}
        </DialogContent>
      </Dialog>

      {/* Dialog Cupom Fiscal */}
      <Dialog open={showCupomDialog} onOpenChange={setShowCupomDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cupom Fiscal - Impressora Térmica</DialogTitle>
          </DialogHeader>
          {reciboParaCupom && (
            <CupomFiscalDialog 
              documento={reciboParaCupom} 
              tipo="recibo"
              empresa={user}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}