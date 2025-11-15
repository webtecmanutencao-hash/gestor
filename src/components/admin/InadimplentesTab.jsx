import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserX, Mail, Phone, AlertTriangle, Loader, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function InadimplentesTab() {
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['allUsersAdmin'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
    initialData: []
  });

  const { data: allPayments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['allPaymentsAdmin'],
    queryFn: () => base44.entities.Pagamento.list('-created_date', 1000),
    initialData: []
  });

  const isLoading = isLoadingUsers || isLoadingPayments;

  const inadimplentes = useMemo(() => {
    if (isLoading) return [];
    
    const hoje = new Date();
    const mesAtualRef = format(hoje, 'MM/yyyy');
    
    // Filtrar apenas clientes (não admins)
    const clientes = allUsers.filter(u => u.role !== 'admin');
    
    // IDs dos clientes que pagaram ou estão aguardando verificação no mês atual
    const idsPagantesMesAtual = new Set(
      allPayments
        .filter(p => p.mes_referencia === mesAtualRef && (p.status === 'aprovado' || p.status === 'aguardando_verificacao'))
        .map(p => p.empresa_id)
    );

    // Clientes que NÃO pagaram o mês atual
    const clientesInadimplentes = clientes.filter(cliente => !idsPagantesMesAtual.has(cliente.id));

    // Enriquecer com informações de pagamentos anteriores
    return clientesInadimplentes.map(cliente => {
      const pagamentosCliente = allPayments.filter(p => p.empresa_id === cliente.id);
      const ultimoPagamento = pagamentosCliente
        .filter(p => p.status === 'aprovado')
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      
      const totalPago = pagamentosCliente
        .filter(p => p.status === 'aprovado')
        .reduce((sum, p) => sum + (p.valor || 0), 0);

      return {
        ...cliente,
        ultimoPagamento: ultimoPagamento ? ultimoPagamento.mes_referencia : 'Nunca pagou',
        dataUltimoPagamento: ultimoPagamento ? ultimoPagamento.created_date : null,
        totalPago,
        totalMesesPagos: pagamentosCliente.filter(p => p.status === 'aprovado').length
      };
    });
  }, [allUsers, allPayments, isLoading]);

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-8 text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-slate-500">Carregando dados de inadimplência...</p>
        </CardContent>
      </Card>
    );
  }

  if (inadimplentes.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <UserX className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Tudo em Dia! 🎉</h3>
              <p className="text-slate-500 max-w-md">
                Nenhum cliente está com a mensalidade deste mês pendente. Todos os clientes estão em dia com os pagamentos.
              </p>
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card de Alerta */}
      <Card className="bg-red-50 border-red-300 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-900 text-lg mb-2">
                {inadimplentes.length} Cliente{inadimplentes.length > 1 ? 's' : ''} com Pagamento Pendente
              </h3>
              <p className="text-red-800 text-sm">
                Os clientes abaixo não realizaram o pagamento da mensalidade do mês atual. 
                Entre em contato para regularizar a situação e evitar bloqueios automáticos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Inadimplentes */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600"/>
              <div>
                  <CardTitle>Clientes com Pagamento Pendente ({inadimplentes.length})</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Lista de clientes que ainda não pagaram a mensalidade do mês atual
                  </p>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Pagamento</TableHead>
                  <TableHead>Total Pago</TableHead>
                  <TableHead>Meses Pagos</TableHead>
                  <TableHead>Membro Desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inadimplentes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.full_name || 'Nome não definido'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        {cliente.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="font-bold">
                        Pendente
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">
                          {cliente.dataUltimoPagamento 
                            ? format(new Date(cliente.dataUltimoPagamento), 'dd/MM/yyyy')
                            : 'Nunca pagou'
                          }
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Ref: {cliente.ultimoPagamento}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-700">
                          R$ {cliente.totalPago.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {cliente.totalMesesPagos} {cliente.totalMesesPagos === 1 ? 'mês' : 'meses'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(cliente.created_date), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Clientes Inadimplentes</p>
                <p className="text-2xl font-bold text-red-600">{inadimplentes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Receita Perdida (mês)</p>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {(inadimplentes.length * 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total já Recebido</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {inadimplentes.reduce((sum, c) => sum + c.totalPago, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}