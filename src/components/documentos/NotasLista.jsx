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
import { FileCheck, Plus, Search, Eye, Calendar, ExternalLink, Receipt, Loader } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

import NotaForm from "./NotaForm";
import NotaDetalhes from "./NotaDetalhes";
import CupomFiscalDialog from "./CupomFiscalDialog";

export default function NotasLista() {
  const [showForm, setShowForm] = useState(false);
  const [selectedNota, setSelectedNota] = useState(null);
  const [showCupomDialog, setShowCupomDialog] = useState(false);
  const [notaParaCupom, setNotaParaCupom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ['notas'],
    queryFn: () => base44.entities.NotaServico.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NotaServico.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] });
      toast({
        title: "✅ Nota Emitida!",
        description: "A nota de serviço foi criada com sucesso.",
        variant: "success"
      });
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "❌ Erro ao emitir nota",
        description: error.message || "Ocorreu um erro ao criar a nota.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data) => {
    createMutation.mutate(data);
  };

  const handleImprimirCupom = (nota) => {
    setNotaParaCupom(nota);
    setShowCupomDialog(true);
  };

  const filteredNotas = notas.filter(nota => {
    const isCanceled = nota.status === 'cancelada';
    const matchesSearch = (nota.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           nota.numero_nota?.toString().toLowerCase().includes(searchTerm.toLowerCase()));

    if (searchTerm) {
      return matchesSearch;
    } else {
      return !isCanceled;
    }
  });

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Notas Fiscais de Serviço</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            onClick={() => setShowForm(true)}
            className="flex-1 md:flex-none gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white"
          >
            <Plus className="w-4 h-4" />
            Emitir Nota
          </Button>
          <a 
            href="https://www.nfse.gov.br/EmissorNacional"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white">
              <ExternalLink className="w-4 h-4" />
              SEFAZ
            </Button>
          </a>
        </div>
      </div>

      <Card className="mb-6 shadow-lg">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Buscar por cliente ou número da nota..."
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
              <p className="text-slate-500">Carregando notas...</p>
            </CardContent>
          </Card>
        ) : filteredNotas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">
                {searchTerm ? 'Nenhuma nota encontrada' : 'Nenhuma nota fiscal emitida ainda'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white"
                >
                  Emitir Primeira Nota
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredNotas.map((nota) => (
            <Card key={nota.id} className={`shadow-md hover:shadow-lg transition-shadow ${nota.status === 'cancelada' ? 'opacity-60' : ''}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Nota Fiscal #{nota.numero_nota}
                        </h3>
                        <p className="text-slate-600">{nota.cliente_nome}</p>
                      </div>
                      <Badge variant={nota.status === 'cancelada' ? 'destructive' : 'success'}>
                        {nota.status === 'cancelada' ? 'Cancelada' : 'Emitida'}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-600" />
                        <span>
                          {format(new Date(nota.data_emissao), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Valor:</span>{' '}
                        <span className={`font-bold ${nota.status === 'cancelada' ? 'line-through text-slate-500' : 'text-emerald-600'}`}>
                          R$ {nota.valor_total?.toFixed(2)}
                        </span>
                      </div>
                      {nota.cliente_cpf_cnpj && (
                        <div>
                          <span className="text-slate-600">CPF/CNPJ:</span>{' '}
                          <span className="font-medium">{nota.cliente_cpf_cnpj}</span>
                        </div>
                      )}
                    </div>

                    {nota.status === 'cancelada' && nota.motivo_cancelamento && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <p className="font-semibold text-red-900">Motivo do Cancelamento:</p>
                        <p className="text-red-800">{nota.motivo_cancelamento}</p>
                        {nota.data_cancelamento && (
                          <p className="text-xs text-red-600 mt-1">
                            Cancelada em: {format(new Date(nota.data_cancelamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedNota(nota)}
                      className="flex-1 md:flex-none"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                    {nota.status !== 'cancelada' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImprimirCupom(nota)}
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

      {/* Dialog Emitir Nota */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir Nota Fiscal de Serviço</DialogTitle>
          </DialogHeader>
          <NotaForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={!!selectedNota} onOpenChange={() => setSelectedNota(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nota Fiscal de Serviço</DialogTitle>
          </DialogHeader>
          {selectedNota && <NotaDetalhes nota={selectedNota} />}
        </DialogContent>
      </Dialog>

      {/* Dialog Cupom Fiscal */}
      <Dialog open={showCupomDialog} onOpenChange={setShowCupomDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cupom Fiscal - Impressora Térmica</DialogTitle>
          </DialogHeader>
          {notaParaCupom && (
            <CupomFiscalDialog 
              documento={notaParaCupom} 
              tipo="nota"
              empresa={user}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}