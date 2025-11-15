import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader
} from "lucide-react";
import { format, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import CobrancaCard from "../components/cobrancas/CobrancaCard";
import PagarParcelaDialog from "../components/cobrancas/PagarParcelaDialog";

// Hook de debounce para otimizar buscas
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function Cobrancas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [showPagarDialog, setShowPagarDialog] = useState(false);
  const [selectedParcela, setSelectedParcela] = useState(null);
  
  const queryClient = useQueryClient();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Buscar usuário atual
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  // Buscar todas as parcelas do usuário
  const { data: todasParcelas = [], isLoading: isLoadingParcelas } = useQuery({
    queryKey: ['parcelas', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Parcela.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
    initialData: [],
  });

  // Mutation para atualizar parcela (pagamento)
  const updateParcelaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Parcela.update(id, data),
    onSuccess: () => {
      // Invalida todas as queries relacionadas para atualização em cascata
      queryClient.invalidateQueries({ queryKey: ['parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['todasAsParcelasParaStats'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['todasAsVendas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['allClientes'] });
      
      setShowPagarDialog(false);
      setSelectedParcela(null);
    },
  });

  // Handler para abrir dialog de pagamento
  const handlePagarParcela = (parcela) => {
    setSelectedParcela(parcela);
    setShowPagarDialog(true);
  };

  // Handler para confirmar pagamento
  const handleConfirmPagamento = async (pagamentoInfo) => {
    if (selectedParcela) {
      await updateParcelaMutation.mutateAsync({
        id: selectedParcela.id,
        data: {
          status: 'pago',
          data_pagamento: pagamentoInfo.data_pagamento,
          observacoes: pagamentoInfo.observacoes || selectedParcela.observacoes,
        },
      });
    }
  };

  // Calcular estatísticas em tempo real
  const stats = useMemo(() => {
    const hoje = startOfDay(new Date());
    const todayString = format(hoje, 'yyyy-MM-dd');

    // Filtrar apenas parcelas pendentes
    const parcelasPendentes = todasParcelas.filter(p => p.status === 'pendente');

    // Parcelas atrasadas (vencimento < hoje)
    const atrasadas = parcelasPendentes.filter(p => p.data_vencimento < todayString);
    
    // Parcelas que vencem hoje
    const vencemHoje = parcelasPendentes.filter(p => p.data_vencimento === todayString);
    
    return {
      atrasadas: {
        count: atrasadas.length,
        total: atrasadas.reduce((sum, p) => sum + (p.valor || 0), 0)
      },
      hoje: {
        count: vencemHoje.length,
        total: vencemHoje.reduce((sum, p) => sum + (p.valor || 0), 0)
      },
      pendentes: {
        count: parcelasPendentes.length,
        total: parcelasPendentes.reduce((sum, p) => sum + (p.valor || 0), 0)
      }
    };
  }, [todasParcelas]);

  // Filtrar e processar parcelas para exibição
  const displayedParcelas = useMemo(() => {
    const hoje = startOfDay(new Date());
    const todayString = format(hoje, 'yyyy-MM-dd');
    
    let filtered = [...todasParcelas];

    // Aplicar filtro de busca
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        (p.cliente_nome && p.cliente_nome.toLowerCase().includes(term)) ||
        (p.numero_venda && p.numero_venda.toLowerCase().includes(term))
      );
    }

    // Aplicar filtro de status
    if (filterStatus === 'pendente') {
      filtered = filtered.filter(p => p.status === 'pendente' && p.data_vencimento > todayString);
    } else if (filterStatus === 'atrasado') {
      filtered = filtered.filter(p => p.status === 'pendente' && p.data_vencimento < todayString);
    } else if (filterStatus === 'hoje') {
      filtered = filtered.filter(p => p.status === 'pendente' && p.data_vencimento === todayString);
    } else if (filterStatus === 'pagas') {
      filtered = filtered.filter(p => p.status === 'pago');
    } else {
      // "todos" = todas pendentes (não pagas)
      filtered = filtered.filter(p => p.status === 'pendente');
    }

    // Adicionar status derivado e dias de atraso
    const processed = filtered.map(p => {
      const parcelaCopy = { ...p };
      if (parcelaCopy.status === 'pendente') {
        const dataVenc = startOfDay(parseISO(parcelaCopy.data_vencimento));
        if (isBefore(dataVenc, hoje)) {
          parcelaCopy.statusDerived = 'atrasado';
          parcelaCopy.dias_atraso = Math.ceil((hoje.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          parcelaCopy.statusDerived = 'pendente';
        }
      } else {
        parcelaCopy.statusDerived = 'pago';
      }
      return parcelaCopy;
    });

    // Ordenar: atrasadas primeiro, depois pendentes, depois pagas
    processed.sort((a, b) => {
      const order = { 'atrasado': 1, 'pendente': 2, 'pago': 3 };
      const orderA = order[a.statusDerived] || 4;
      const orderB = order[b.statusDerived] || 4;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Mesma prioridade: ordenar por data de vencimento
      return new Date(a.data_vencimento) - new Date(b.data_vencimento);
    });

    return processed;
  }, [todasParcelas, debouncedSearchTerm, filterStatus]);

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto"> 
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-blue-600" />
            Cobranças
          </h1>
          <p className="text-slate-600 mt-1">Gerencie parcelas e recebimentos</p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-red-500 shadow-lg">
            <CardContent className="pt-6">
              {isLoadingParcelas ? (
                <div className="flex justify-center">
                  <Loader className="animate-spin w-6 h-6 text-red-600"/>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Atrasadas</p>
                    <p className="text-2xl font-bold text-red-600">{stats.atrasadas.count}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      R$ {stats.atrasadas.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 shadow-lg">
            <CardContent className="pt-6">
              {isLoadingParcelas ? (
                <div className="flex justify-center">
                  <Loader className="animate-spin w-6 h-6 text-orange-600"/>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Vencem Hoje</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.hoje.count}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      R$ {stats.hoje.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-lg">
            <CardContent className="pt-6">
              {isLoadingParcelas ? (
                <div className="flex justify-center">
                  <Loader className="animate-spin w-6 h-6 text-blue-600"/>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Pendente</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.pendentes.count}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      R$ {stats.pendentes.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filtros de Busca e Status */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Buscar por cliente ou número da venda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Pendentes</SelectItem>
                  <SelectItem value="atrasado">Atrasadas</SelectItem>
                  <SelectItem value="hoje">Vencem Hoje</SelectItem>
                  <SelectItem value="pendente">A Vencer</SelectItem>
                  <SelectItem value="pagas">Pagas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Cobranças */}
        <div className="grid gap-4">
          {isLoadingParcelas ? (
            <Card>
              <CardContent className="p-8 text-center flex justify-center items-center">
                <Loader className="w-6 h-6 mr-2 animate-spin text-blue-600" />
                <p className="text-slate-500">Carregando cobranças...</p>
              </CardContent>
            </Card>
          ) : displayedParcelas.length > 0 ? (
            displayedParcelas.map((parcela) => (
              <CobrancaCard
                key={parcela.id}
                parcela={parcela}
                onPagar={handlePagarParcela}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {debouncedSearchTerm || filterStatus !== 'todos' 
                    ? 'Nenhuma cobrança encontrada para os filtros selecionados.' 
                    : 'Nenhuma cobrança registrada.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog de Pagamento */}
        <Dialog open={showPagarDialog} onOpenChange={setShowPagarDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Pagamento</DialogTitle>
            </DialogHeader>
            {selectedParcela && (
              <PagarParcelaDialog
                parcela={selectedParcela}
                onConfirm={handleConfirmPagamento}
                onCancel={() => setShowPagarDialog(false)}
                isLoading={updateParcelaMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}