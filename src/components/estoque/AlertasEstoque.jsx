import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, PackageX, CheckCircle, X, Loader } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AlertasEstoque() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: alertas = [], isLoading } = useQuery({
        queryKey: ['alertasEstoque'],
        queryFn: () => base44.entities.AlertaEstoque.filter({ status: 'pendente' }),
        refetchInterval: 30000, // Atualiza a cada 30 segundos
    });

    const resolverAlertaMutation = useMutation({
        mutationFn: (id) => base44.entities.AlertaEstoque.update(id, { status: 'resolvido' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alertasEstoque'] });
            toast({ title: "Alerta marcado como resolvido!", variant: "success" });
        },
    });

    const ignorarAlertaMutation = useMutation({
        mutationFn: (id) => base44.entities.AlertaEstoque.update(id, { status: 'ignorado' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alertasEstoque'] });
            toast({ title: "Alerta ignorado.", variant: "default" });
        },
    });

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-8 flex justify-center">
                    <Loader className="w-6 h-6 animate-spin text-blue-600" />
                </CardContent>
            </Card>
        );
    }

    if (alertas.length === 0) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 flex items-center justify-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <p className="text-green-800 font-semibold">Todos os produtos com estoque adequado!</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                    <AlertTriangle className="w-6 h-6" />
                    Alertas de Estoque ({alertas.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {alertas.map((alerta) => (
                    <div
                        key={alerta.id}
                        className="p-4 bg-white rounded-lg border-2 border-orange-200 flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3">
                            {alerta.quantidade_atual <= 0 ? (
                                <PackageX className="w-8 h-8 text-red-600" />
                            ) : (
                                <AlertTriangle className="w-8 h-8 text-orange-600" />
                            )}
                            <div>
                                <p className="font-bold text-lg text-slate-900">{alerta.produto_nome}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <Badge variant={alerta.quantidade_atual <= 0 ? "destructive" : "warning"}>
                                        Estoque: {alerta.quantidade_atual} un.
                                    </Badge>
                                    <span className="text-sm text-slate-600">
                                        Mínimo: {alerta.estoque_minimo} un.
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {formatDistanceToNow(new Date(alerta.created_date), { addSuffix: true, locale: ptBR })}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resolverAlertaMutation.mutate(alerta.id)}
                                disabled={resolverAlertaMutation.isPending}
                            >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Resolvido
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => ignorarAlertaMutation.mutate(alerta.id)}
                                disabled={ignorarAlertaMutation.isPending}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}