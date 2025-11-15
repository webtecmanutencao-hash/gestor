import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, Receipt, XCircle, Loader, AlertTriangle, Banknote } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CancelarDocumentoDialog({ onClose }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoDoc, setTipoDoc] = useState('nota');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [motivo, setMotivo] = useState('');
    
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me(),
    });

    const { data: notas = [] } = useQuery({
        queryKey: ['notasAtivas'],
        queryFn: () => base44.entities.NotaServico.filter({ status: 'ativa' }),
        enabled: tipoDoc === 'nota',
    });

    const { data: recibos = [] } = useQuery({
        queryKey: ['recibosAtivos'],
        queryFn: () => base44.entities.Recibo.filter({ status: 'ativo' }),
        enabled: tipoDoc === 'recibo',
    });

    const { data: boletos = [] } = useQuery({
        queryKey: ['boletosAtivos'],
        queryFn: () => base44.entities.Boleto.filter({ 
            status: { $in: ['pendente', 'vencido'] }
        }),
        enabled: tipoDoc === 'boleto',
    });

    const cancelarNotaMutation = useMutation({
        mutationFn: ({ id, motivo }) => base44.entities.NotaServico.update(id, {
            status: 'cancelada',
            motivo_cancelamento: motivo,
            data_cancelamento: new Date().toISOString(),
            cancelado_por: user?.email
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notas'] });
            queryClient.invalidateQueries({ queryKey: ['notasAtivas'] });
            toast({ 
                title: "✅ Nota Cancelada!", 
                description: "A nota foi cancelada com sucesso.",
                variant: "success" 
            });
            setSelectedDoc(null);
            setMotivo('');
            onClose();
        },
        onError: (error) => {
            toast({ 
                title: "❌ Erro ao cancelar", 
                description: error.message || "Ocorreu um erro ao cancelar a nota.",
                variant: "destructive" 
            });
        }
    });

    const cancelarReciboMutation = useMutation({
        mutationFn: ({ id, motivo }) => base44.entities.Recibo.update(id, {
            status: 'cancelado',
            motivo_cancelamento: motivo,
            data_cancelamento: new Date().toISOString(),
            cancelado_por: user?.email
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recibos'] });
            queryClient.invalidateQueries({ queryKey: ['recibosAtivos'] });
            toast({ 
                title: "✅ Recibo Cancelado!", 
                description: "O recibo foi cancelado com sucesso.",
                variant: "success" 
            });
            setSelectedDoc(null);
            setMotivo('');
            onClose();
        },
        onError: (error) => {
            toast({ 
                title: "❌ Erro ao cancelar", 
                description: error.message || "Ocorreu um erro ao cancelar o recibo.",
                variant: "destructive" 
            });
        }
    });

    const cancelarBoletoMutation = useMutation({
        mutationFn: ({ id, motivo }) => base44.entities.Boleto.update(id, {
            status: 'cancelado',
            motivo_cancelamento: motivo,
            data_cancelamento: new Date().toISOString(),
            cancelado_por: user?.email
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boletos'] });
            queryClient.invalidateQueries({ queryKey: ['boletosAtivos'] });
            toast({ 
                title: "✅ Boleto Cancelado!", 
                description: "O boleto foi cancelado com sucesso.",
                variant: "success" 
            });
            setSelectedDoc(null);
            setMotivo('');
            onClose();
        },
        onError: (error) => {
            toast({ 
                title: "❌ Erro ao cancelar", 
                description: error.message || "Ocorreu um erro ao cancelar o boleto.",
                variant: "destructive" 
            });
        }
    });

    const handleCancelar = () => {
        if (!selectedDoc) {
            toast({ 
                title: "⚠️ Selecione um documento", 
                description: "Escolha um documento para cancelar",
                variant: "warning" 
            });
            return;
        }
        if (!motivo.trim()) {
            toast({ 
                title: "⚠️ Digite o motivo", 
                description: "O motivo do cancelamento é obrigatório",
                variant: "warning" 
            });
            return;
        }

        if (tipoDoc === 'nota') {
            cancelarNotaMutation.mutate({ id: selectedDoc.id, motivo });
        } else if (tipoDoc === 'recibo') {
            cancelarReciboMutation.mutate({ id: selectedDoc.id, motivo });
        } else {
            cancelarBoletoMutation.mutate({ id: selectedDoc.id, motivo });
        }
    };

    const documentos = tipoDoc === 'nota' ? notas : tipoDoc === 'recibo' ? recibos : boletos;
    const filteredDocs = searchTerm 
        ? documentos.filter(doc => 
            doc.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tipoDoc === 'nota' ? doc.numero_nota : tipoDoc === 'recibo' ? doc.numero_recibo : doc.numero_boleto)?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : documentos;

    const isPending = cancelarNotaMutation.isPending || cancelarReciboMutation.isPending || cancelarBoletoMutation.isPending;

    const getDocLabel = () => {
        if (tipoDoc === 'nota') return { singular: 'nota', plural: 'Notas Fiscais Ativas', artigo: 'a' };
        if (tipoDoc === 'recibo') return { singular: 'recibo', plural: 'Recibos Ativos', artigo: '' };
        return { singular: 'boleto', plural: 'Boletos/Faturas Ativos', artigo: '' };
    };

    const docLabel = getDocLabel();

    return (
        <div className="space-y-6">
            <Card className="bg-yellow-50 border-yellow-300">
                <CardContent className="pt-6 flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-yellow-900">⚠️ Atenção Importante!</p>
                        <p className="text-sm text-yellow-800 mt-1">
                            O cancelamento de documentos fiscais é uma ação séria e deve ser realizada apenas quando necessário. 
                            O documento será marcado como cancelado permanentemente.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label>Tipo de Documento</Label>
                    <Select value={tipoDoc} onValueChange={(value) => {
                        setTipoDoc(value);
                        setSelectedDoc(null);
                        setSearchTerm('');
                    }}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nota">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Nota Fiscal
                                </div>
                            </SelectItem>
                            <SelectItem value="recibo">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4" />
                                    Recibo
                                </div>
                            </SelectItem>
                            <SelectItem value="boleto">
                                <div className="flex items-center gap-2">
                                    <Banknote className="w-4 h-4" />
                                    Boleto/Fatura
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Buscar Documento</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Cliente ou número..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>

            <div className="border rounded-lg p-4 bg-slate-50 max-h-80 overflow-y-auto">
                <h3 className="font-semibold mb-3 text-slate-900">
                    {docLabel.plural} ({filteredDocs.length})
                </h3>
                {filteredDocs.length > 0 ? (
                    <div className="space-y-2">
                        {filteredDocs.map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    selectedDoc?.id === doc.id 
                                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {tipoDoc === 'nota' ? `Nota Fiscal #${doc.numero_nota}` : 
                                             tipoDoc === 'recibo' ? `Recibo #${doc.numero_recibo}` : 
                                             `${doc.tipo === 'fatura' ? 'Fatura' : 'Boleto'} #${doc.numero_boleto}`}
                                        </p>
                                        <p className="text-sm text-slate-600">{doc.cliente_nome}</p>
                                        <p className="text-xs text-slate-500">
                                            {format(new Date(tipoDoc === 'nota' ? doc.data_emissao : tipoDoc === 'recibo' ? doc.data_pagamento : doc.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="success" className="mb-1">Ativo</Badge>
                                        <p className="text-sm font-semibold text-emerald-600">
                                            R$ {(tipoDoc === 'nota' ? doc.valor_total : tipoDoc === 'recibo' ? doc.valor_pago : doc.valor)?.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500">
                            {searchTerm 
                                ? 'Nenhum documento encontrado com essa busca.' 
                                : `Nenhum${docLabel.artigo} ${docLabel.singular} ativo${docLabel.artigo} encontrado${docLabel.artigo}.`
                            }
                        </p>
                    </div>
                )}
            </div>

            {selectedDoc && (
                <div className="space-y-2">
                    <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
                    <Textarea
                        id="motivo"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Descreva detalhadamente o motivo do cancelamento (ex: Erro na emissão, Cliente desistiu da compra, Dados incorretos, etc.)"
                        rows={4}
                        className="mt-1"
                    />
                    <p className="text-xs text-slate-500">
                        Este motivo será registrado permanentemente no documento
                    </p>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={isPending}>
                    Fechar
                </Button>
                <Button
                    variant="destructive"
                    onClick={handleCancelar}
                    disabled={!selectedDoc || !motivo.trim() || isPending}
                >
                    {isPending ? (
                        <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Cancelando...
                        </>
                    ) : (
                        <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Confirmar Cancelamento
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}