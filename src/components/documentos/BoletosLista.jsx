import React, { useState, useMemo } from "react";
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
import { FileText, Plus, Search, Eye, Calendar, Loader, AlertCircle, CheckCircle } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

import BoletoForm from "./BoletoForm";
import BoletoDetalhes from "./BoletoDetalhes";

export default function BoletosLista() {
  const [showForm, setShowForm] = useState(false);
  const [selectedBoleto, setSelectedBoleto] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: boletos = [], isLoading } = useQuery({
    queryKey: ['boletos'],
    queryFn: () => base44.entities.Boleto.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Boleto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      toast({
        title: "✅ Boleto Gerado!",
        description: "O boleto foi criado com sucesso.",
        variant: "success"
      });
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "❌ Erro ao gerar boleto",
        description: error.message || "Ocorreu um erro ao criar o boleto.",
        variant: "destructive"
      });
    }
  });

  const marcarPagoMutation = useMutation({
    mutationFn: ({ id, valor_pago }) => base44.entities.Boleto.update(id, {
      status: 'pago',
      data_pagamento: new Date().toISOString().split('T')[0],
      valor_pago: valor_pago
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      toast({
        title: "✅ Pagamento Registrado!",
        description: "O boleto foi marcado como pago.",
        variant: "success"
      });
    },
  });

  const handleSubmit = (data) => {
    createMutation.mutate(data);
  };

  const handleMarcarPago = (boleto) => {
    if (confirm(`Confirma o pagamento de R$ ${boleto.valor.toFixed(2)}?`)) {
      marcarPagoMutation.mutate({ id: boleto.id, valor_pago: boleto.valor });
    }
  };

  // Processar boletos com status atualizado
  const boletosProcessados = useMemo(() => {
    return boletos.map(boleto => {
      const boletoProcessado = { ...boleto };
      
      // Verificar se está vencido
      if (boleto.status === 'pendente' && boleto.data_vencimento) {
        const vencimento = parseISO(boleto.data_vencimento);
        if (isPast(vencimento) && !isToday(vencimento)) {
          boletoProcessado.statusDerived = 'vencido';
        } else {
          boletoProcessado.statusDerived = 'pendente';
        }
      } else {
        boletoProcessado.statusDerived = boleto.status;
      }
      
      return boletoProcessado;
    });
  }, [boletos]);

  function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  const filteredBoletos = boletosProcessados.filter(boleto => {
    const isCanceled = boleto.status === 'cancelado';
    const matchesSearch = (boleto.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           boleto.numero_boleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           boleto.descricao?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (searchTerm) {
      return matchesSearch;
    } else {
      return !isCanceled;
    }
  });

  const getStatusBadge = (status) => {
    const badges = {
      pendente: { label: 'Pendente', variant: 'secondary' },
      vencido: { label: 'Vencido', variant: 'destructive' },
      pago: { label: 'Pago', variant: 'success' },
      cancelado: { label: 'Cancelado', variant: 'outline' }
    };
    return badges[status] || badges.pendente;
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Boletos e Faturas</h2>
        <Button 
          onClick={() => setShowForm(true)}
          className="flex-1 md:flex-none gap-2 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white"
        >
          <Plus className="w-4 h-4" />
          Gerar Boleto/Fatura
        </Button>
      </div>

      <Card className="mb-6 shadow-lg">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Buscar por cliente, número ou descrição..."
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
              <Loader className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
              <p className="text-slate-500">Carregando boletos...</p>
            </CardContent>
          </Card>
        ) : filteredBoletos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">
                {searchTerm ? 'Nenhum boleto encontrado' : 'Nenhum boleto gerado ainda'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white"
                >
                  Gerar Primeiro Boleto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredBoletos.map((boleto) => {
            const statusBadge = getStatusBadge(boleto.statusDerived);
            
            return (
              <Card key={boleto.id} className={`shadow-md hover:shadow-lg transition-shadow ${boleto.status === 'cancelado' ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">
                              {boleto.tipo === 'fatura' ? 'Fatura' : 'Boleto'} #{boleto.numero_boleto}
                            </h3>
                            {boleto.tipo === 'fatura' && (
                              <Badge variant="outline" className="text-purple-600 border-purple-600">
                                Fatura
                              </Badge>
                            )}
                          </div>
                          <p className="text-slate-600">{boleto.cliente_nome}</p>
                          {boleto.descricao && (
                            <p className="text-sm text-slate-500 mt-1">{boleto.descricao}</p>
                          )}
                        </div>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-600" />
                          <div>
                            <span className="text-slate-500">Vencimento:</span>{' '}
                            <span className={`font-medium ${boleto.statusDerived === 'vencido' ? 'text-red-600' : ''}`}>
                              {format(new Date(boleto.data_vencimento), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-600">Valor:</span>{' '}
                          <span className={`font-bold ${
                            boleto.status === 'pago' ? 'text-green-600' : 
                            boleto.statusDerived === 'vencido' ? 'text-red-600' : 
                            'text-slate-900'
                          }`}>
                            R$ {boleto.valor?.toFixed(2)}
                          </span>
                        </div>
                        {boleto.status === 'pago' && boleto.data_pagamento && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">
                              Pago em {format(new Date(boleto.data_pagamento), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        )}
                      </div>

                      {boleto.status === 'cancelado' && boleto.motivo_cancelamento && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <p className="font-semibold text-red-900">Motivo do Cancelamento:</p>
                          <p className="text-red-800">{boleto.motivo_cancelamento}</p>
                          {boleto.data_cancelamento && (
                            <p className="text-xs text-red-600 mt-1">
                              Cancelado em: {format(new Date(boleto.data_cancelamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBoleto(boleto)}
                        className="flex-1 md:flex-none"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                      {boleto.status === 'pendente' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarcarPago(boleto)}
                          className="flex-1 md:flex-none text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marcar Pago
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog Gerar Boleto */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Boleto ou Fatura</DialogTitle>
          </DialogHeader>
          <BoletoForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={!!selectedBoleto} onOpenChange={() => setSelectedBoleto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBoleto?.tipo === 'fatura' ? 'Fatura' : 'Boleto Bancário'}
            </DialogTitle>
          </DialogHeader>
          {selectedBoleto && <BoletoDetalhes boleto={selectedBoleto} empresa={user} />}
        </DialogContent>
      </Dialog>
    </>
  );
}